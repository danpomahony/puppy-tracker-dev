# ADR 0003: Develop locally, release to a production VM

Status: accepted
Date: 2026-10-11

## Context

ADR 0002 puts the app on a machine at home, with Caddy as the reverse proxy and Tailscale for HTTPS, and keeps recurring spend at about zero. The "Production infra" milestone (#21 provisioning, #22 TLS, #23 backups, #24 monitoring, #26 deploys) needs a production host to build against.

Today there is one environment: the dev server on the laptop (WSL2), which the family also uses day to day. That blurs two jobs. The dev server breaks while features are built, and a production service should not.

The production host is not chosen yet. It could be the new PC, the Raspberry Pi (possibly arm64) or a short-lived cloud environment for the AWS migration exercise in ADR 0002. The provisioning code should not care which.

Checked on this machine: `/dev/kvm` exists in WSL2, the CPU exposes virtualization extensions, and systemd is enabled, so nested virtualization works here.

## Decision

1. **Two environments.**
   - **dev** is what runs today: the Vite dev server and PocketBase in Docker on the laptop, started with `docker compose up` and `npm run dev`. Features are built and tried here.
   - **prod** is a local Ubuntu VM that stands in for the real home server. The family uses it. It changes only when a release is deployed.
2. **Release when something is worth shipping.** A release is a version tag (`v1.2.3`) on `main`, cut when a milestone is reached, a must-have feature is finished and tested, or a bug fix needs to go out. Patch versions are for fixes, minor versions for features. There is no fixed schedule. Nothing deploys to prod without a tag.
3. **A tag builds an image and deploys it.** CI builds the container image (#80), publishes it, and rolls it out to prod (#26). Prod runs the published image, never a local build. A GitHub-hosted runner cannot reach a VM inside WSL, so #26 must pick how CI gets there: an ephemeral Tailscale node in the workflow, a self-hosted runner, or the VM pulling new tags itself. That choice is made in #26 and recorded there.
4. **Prod data is separate and backed up before every deploy.** Prod has its own PocketBase data, apart from dev. A deploy takes a backup first (#23), runs a health check afterwards, and rolls back by redeploying the previous tag. "Add, never change" (ADR 0001) is what makes a rollback safe, since an older version tolerates newer fields.
5. **Schema changes reach prod only as migrations.** In dev, the dashboard writes migration files into the repo. In prod, the migrations ship inside the image and the admin UI is not used to change the schema, because such a change would not be in git. The same migrations apply at startup in both.
6. **The VM is created with OpenTofu and configured with Ansible.**
   - KVM and libvirt run inside WSL2, so everything stays in bash and git.
   - OpenTofu (#21) creates the VM from an Ubuntu cloud image, with an SSH key installed by cloud-init.
   - Ansible installs Docker, creates a non-root deploy user, sets a firewall and enables unattended upgrades. It targets "an Ubuntu host over SSH" through an inventory file, so the PC, the Pi or a cloud server only needs a new inventory entry.
   - Only the OpenTofu step that creates the machine is specific to libvirt.
7. **Test provisioning on a scratch VM, not on prod.** The same OpenTofu code can create a disposable second VM. Any change to provisioning is applied to a fresh scratch VM first and then destroyed. Rebuilding prod itself is a restore from backup, and doing that on purpose is the restore drill in #23.
8. **Phone access.** Prod gets its own Tailscale node and name, so the family uses one stable address. Dev keeps Tailscale Serve on the Windows host as in ADR 0002. Putting Tailscale on the VM is the end-to-end check of the real arrangement, to be worked out in #22.
9. **The first release moves the real data.** Today's family data lives on dev. The first deploy restores a backup of it into prod and switches the phones over. After that dev runs on throwaway or seed data.
10. **Real-host and cloud deployment come later,** each with its own ADR.

## Consequences

Good:

- The family gets a stable app, and development can break things freely.
- Deploying is a deliberate, recorded step. The git history, tags and release notes read as a release process, and so does the pipeline.
- It costs nothing and nothing can run up a bill.
- The Ansible, Caddy and backup work carries over to any Ubuntu host. The OpenTofu step that creates the machine is the only piece replaced.
- Rollback and restore are exercised for real, not just documented.

Costs:

- **Two environments to look after,** and a release process to keep working. This is the point of the exercise, but it is more than one dev server.
- **Nested virtualization is slower** than real hardware. A small Ubuntu VM running PocketBase and Caddy should be fine.
- **The VM is reachable from WSL only,** and phones reach it through Tailscale on the VM itself.
- **The laptop must be on for prod to be up,** until the real host exists. This is the same limit ADR 0002 accepted for the laptop.
- **Setup work:** libvirt, QEMU, OpenTofu and Ansible must be installed in WSL, and the steps documented.
- **The architecture may differ.** The laptop and likely the new PC are amd64, while the Pi may be arm64. Container images must not assume a CPU type, as ADR 0002 already requires, and an arm64 build is not tested by this VM.
- **The existing smoke test is for dev.** It creates throwaway users and a dog, which is not something to do on prod. Prod gets a health check and a version check after each deploy instead.
- **libvirt in WSL2 might prove unreliable.** If it does, the fallback is Multipass or Hyper-V on the Windows side with the same Ansible playbook, and this ADR gets updated.

## Alternatives considered

- **Keep one environment.** The simplest, but development and the family's data would stay entangled, and there would be no release process to show.
- **Deploy prod straight into WSL.** It shares a kernel and network with the dev environment, cannot be rebuilt cleanly, and does not look like a separate server.
- **Deploy to prod on every merge to `main`.** Fully automatic, but every merged change would reach the family immediately. Tagged releases keep the decision in human hands.
- **A paid VPS.** The strongest live-URL story, but ADR 0002 rejected recurring cost for now. It remains a valid later target for the same Ansible code.
- **Multipass or Hyper-V on Windows.** Easy to start, but driven from the Windows side, and WSL's mirrored networking makes reaching the VM awkward. It is the fallback.
- **Vagrant with VirtualBox.** Familiar, but the Vagrantfile does not carry over to other hosts the way OpenTofu plus Ansible does.
- **A second WSL distribution.** Cheap, but it shares WSL's kernel, so it is not a real test of a separate server.
- **Kubernetes (for example k3s).** Rejected for now. A single PocketBase container does not need an orchestrator.

## Related

- #21: provisioning the host. #22, #23, #24, #26, #80: later work that runs against it.
- ADR 0001: "add, never change" makes rollback safe.
- ADR 0002: where the app is hosted and how phones reach it.
