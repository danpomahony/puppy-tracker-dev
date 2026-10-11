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
