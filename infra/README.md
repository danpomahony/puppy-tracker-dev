# Infrastructure

OpenTofu code that creates the VMs described in [ADR 0003](../docs/adr/0003-develop-locally-release-to-a-production-vm.md). Set up the tools first with [the setup guide](../docs/infra-setup.md).

```
infra/
  modules/vm/   one Ubuntu VM: storage pool, disks, cloud-init and the VM itself
  scratch/      a disposable VM for testing provisioning changes (192.168.122.10)
  prod/         the production VM, same module (192.168.122.20)
  ansible/      configures a host that already exists
```

## Scratch VM

```sh
cd infra/scratch
tofu init
tofu apply        # about a minute, mostly the image download
ssh -i ~/.ssh/puppy_vm_ed25519 deploy@192.168.122.10
tofu destroy      # removes the VM, its disks and its storage pool
```

The VM gets a fixed address on libvirt's `default` network, the `deploy` user with your key and passwordless sudo, key-only SSH, and nothing else. Ansible does the rest.

Scratch does not start by itself and should not stay on. Start it when you need it and shut it off when you stop working on infrastructure, which gives its 2 GB of memory back. Its disk is kept, so this takes seconds:

```sh
virsh -c qemu:///system start puppy-scratch      # begin work
virsh -c qemu:///system shutdown puppy-scratch   # done for the day
virsh -c qemu:///system list --all               # what is running
```

Use `tofu destroy` instead when you want a clean slate. A shut-off VM keeps whatever state it had, so rebuild before the test that counts. Running `tofu apply` also starts it, because the module sets the VM to running.

After a rebuild the VM has a new host key, so ssh refuses the old one. Run `ssh-keygen -R 192.168.122.10` first.

State files stay on this machine (they are ignored by git). The provider lock file `.terraform.lock.hcl` is committed so everyone uses the same provider build.

## Configuring a host with Ansible

```sh
cd infra/ansible
ansible vms -m ping           # can we reach it?
ansible-playbook site.yml     # configure it
```

The `baseline` role hardens SSH (key-only, no root login), turns on the firewall (ufw, SSH only, rate limited) and enables automatic security updates. The `docker` role installs Docker Engine and the Compose plugin from Docker's apt repository, picking amd64 or arm64 from the host.

The playbook is idempotent: a second run should report `changed=0`. Hosts live in `inventory/`. To configure another Ubuntu host, add an inventory file with its address.

The default inventory is the scratch VM only, so a plain `ansible-playbook site.yml` can never touch prod. Prod is always chosen on purpose:

```sh
ansible-playbook -i inventory/prod.yml site.yml
```

Ports that Docker publishes bypass ufw, because Docker writes its own firewall rules. Services that sit behind the reverse proxy should bind to `127.0.0.1` (#22).

Before merging a change to provisioning or to the playbook, test it on a fresh scratch VM: `tofu destroy`, `tofu apply`, then run the playbook against the new machine.

## Container images

`.github/workflows/images.yml` publishes two images to GitHub Container Registry, each for amd64 and arm64:

- `ghcr.io/danpomahony/puppy-tracker-dev/backend`: PocketBase with the migrations inside.
- `ghcr.io/danpomahony/puppy-tracker-dev/app`: the built app, served by Caddy on port 80.

A merge to `main` publishes `sha-<commit>`. Pushing a version tag such as `v1.2.3` adds that tag to the image already built for the commit, without rebuilding. Tag a commit after its Images run has finished, or the tag job fails and can be re-run.

New GHCR packages are private. Before the prod VM can pull them, either make each package public in its settings (the images hold no secrets) or run `docker login ghcr.io` on the VM with a token that has `read:packages`.

## Production VM

```sh
cd infra/prod
tofu init
tofu apply        # same module as scratch, with autostart on
cd ../ansible
ansible-playbook -i inventory/prod.yml site.yml
```

Prod will hold the family's data, so treat `tofu destroy` here as a restore drill (#23), not a casual command. Test every provisioning change on a fresh scratch VM first.

The OpenTofu state for each environment is a file on this machine (`terraform.tfstate`, ignored by git). Losing prod's state file would leave OpenTofu unaware of the VM. Back it up with the rest of the machine's files until remote state is set up.

## Running the app stack on a VM by hand

Deploys to prod are automatic (see "Deploying a release" below). To try a build on scratch by hand instead: the images are private in GHCR, so a VM cannot pull them without a login. Copy a local build over:

```sh
# build locally, tagged "local"
R=ghcr.io/danpomahony/puppy-tracker-dev
docker build -t $R/backend:local --build-arg PB_VERSION=0.40.4 backend
docker build -t $R/app:local app

# copy to the VM and start it
docker save $R/backend:local $R/app:local | gzip | ssh deploy@192.168.122.10 'gunzip | sudo docker load'
scp compose.prod.yaml deploy@192.168.122.10:
ssh deploy@192.168.122.10 'APP_VERSION=local sudo -E docker compose -f compose.prod.yaml up -d'
```

The app listens on `127.0.0.1:8080` inside the VM only. From the VM, `curl http://127.0.0.1:8080/api/health` should answer. From this machine it should not connect at all. Tailscale Serve is what exposes it (ADR 0004).

The firewall rate-limits SSH: six connections within 30 seconds from one address get refused for a while. A script that makes many `ssh` or `scp` calls in a row will hit it. Reuse one connection with `-o ControlMaster=auto -o ControlPath=/tmp/cm-%C -o ControlPersist=60`, or wait half a minute.

## Joining a VM to the tailnet

The `tailscale` role installs Tailscale and, once the host has joined, serves the app over HTTPS (ADR 0004). The join is a manual step the first time, because it needs a login:

```sh
ssh deploy@<vm-address> 'sudo tailscale up --ssh --hostname=<node-name>'   # prints a sign-in link
# open the link in a browser where you are signed in to Tailscale, and approve
ansible-playbook site.yml    # again, now that it has joined: turns on `tailscale serve`
```

The node name becomes the address, `https://<node-name>.<tailnet>.ts.net`:

| VM | Node name |
|---|---|
| prod | `puppy` (set by the role's default) |
| scratch | `puppy-scratch` (set in `inventory/scratch.yml`) |

Prod keeps the plain name so its address survives a move to another host. If a machine takes over the name, remove the old node in the Tailscale admin console first, or the new one is called `puppy-1`.

Scratch is rebuilt often, and every rebuild is a new device that needs approving again. When you are finished with a scratch node, delete it in the admin console (Machines, then the node, then Delete). Shutting the VM down only marks it offline. Automatic joining with an auth key waits for encrypted secrets (#25).

## Deploying a release

Pushing a version tag runs `.github/workflows/deploy.yml`, which joins the tailnet for the length of the job, copies `compose.prod.yaml` and the scripts to `/opt/puppy` on `puppy`, and runs `deploy.sh` (ADR 0005). The script backs up the data, starts the new version, checks health and version, and goes back to the previous version if a check fails.

```sh
git tag v0.1.0 <commit-on-main>   # after that commit's Images run has finished
git push origin v0.1.0
```

To roll back, run the Deploy workflow by hand (Actions, Deploy, Run workflow) with an earlier tag. To deploy from the VM itself, log in to GHCR there, then run `/opt/puppy/deploy.sh v0.1.0`.

### One-time setup

This part cannot be done from the repo.

1. **Join the VM with SSH enabled.** `sudo tailscale up --ssh --hostname=puppy`. If it joined earlier without `--ssh`, run `sudo tailscale set --ssh`. Then run the Ansible playbook so `deploy` is in the `docker` group and `/opt/puppy` exists.
2. **Add the tag and rules to the tailnet policy** (admin console, Access controls):

   ```json
   "tagOwners": { "tag:ci": ["autogroup:admin"], "tag:prod": ["autogroup:admin"] },
   "grants": [
     { "src": ["tag:ci"], "dst": ["tag:prod"], "ip": ["22"] }
   ],
   "ssh": [
     { "action": "accept", "src": ["tag:ci"], "dst": ["tag:prod"], "users": ["deploy"] }
   ]
   ```

   Tag the prod node `tag:prod` (Machines, `puppy`, Edit ACL tags). Keep your own access rules as they are. Tagging a node removes it from your user, so check your devices can still reach it.
3. **Create an OAuth client** (Settings, OAuth clients) with the `auth_keys` write scope and the tag `tag:ci`.
4. **Create the `production` environment** on GitHub (Settings, Environments) and add two secrets to it: `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`. Optionally require your approval before a deploy.
