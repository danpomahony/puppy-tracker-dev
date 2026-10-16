# ADR 0005: Deploy from CI over Tailscale

Status: accepted
Date: 2026-10-15

## Context

ADR 0003 says a version tag (`v1.2.3`) builds, publishes and deploys, and that nothing reaches prod without one. The images are published to GHCR (#80) and the prod VM runs them through `compose.prod.yaml` (#22). What is missing is the step that puts a tagged version on the VM, and the choices that step forces:

- A GitHub-hosted runner cannot reach a VM inside WSL's NAT.
- The GHCR images are private until the repo goes public, so the VM must be able to pull them.
- The VM's firewall rate-limits SSH, so a deploy that opens many connections gets refused.
- Backups (#23) and encrypted secrets (#25) are not done yet.

## Decision

1. **CI reaches the VM as an ephemeral Tailscale node.**
   - The workflow joins the tailnet with `tailscale/github-action`, using an OAuth client and the tag `tag:ci`.
   - The node disappears when the job ends.
   - The tailnet ACL lets `tag:ci` reach only the prod node (`puppy`), and only over SSH.
2. **The connection is Tailscale SSH,** enabled on the VM with `tailscale up --ssh`. It needs no deploy keys, and it does not go through port 22, so the ufw rate limit does not apply. The workflow still reuses one connection (`ControlMaster`), so a deploy stays cheap.
3. **The VM logs in to GHCR with the workflow's `GITHUB_TOKEN`.** The workflow pipes the token over SSH to `docker login`, in a temporary `DOCKER_CONFIG` that is deleted afterwards. The token expires when the job ends. Nothing is stored on the VM, and no personal access token exists.
4. **The deploy logic is a script in the repo,** `scripts/deploy.sh`. CI copies it and `compose.prod.yaml` to the VM at the tagged commit, so the compose file always matches the version it deploys. The script:
   1. records the version now running,
   2. takes a backup,
   3. pulls both images,
   4. runs `docker compose up -d`,
   5. waits for the healthchecks,
   6. checks that the running images are the tag requested,
   7. on any failure after the backup, redeploys the previous version and exits non-zero.

   It can also be run by hand on the VM.
5. **Rollback is a deploy of an earlier tag.** The workflow has a manual trigger (`workflow_dispatch`) that takes a tag. "Add, never change" (ADR 0001) is what makes this safe, since an older version tolerates fields a newer one added.
6. **After a deploy: a health check and a version check, not the smoke test.** The smoke test creates users and a dog, so it stays dev-only (ADR 0003).
7. **A minimal backup comes with this work.** `scripts/backup-prod.sh` copies the PocketBase data into `/opt/puppy/backups` and keeps the latest few. #23 later adds a schedule, an off-machine copy and a tested restore, and reuses this script.
8. **The secrets are GitHub Environment secrets,** in an environment called `production`: the Tailscale OAuth client ID and secret. Nothing needs to be stored on the VM, so #25 does not block this. The environment can require approval before a deploy if that turns out to be wanted.
9. **The deploy runs under its own user** on the VM, in the `docker` group, with a directory `/opt/puppy` that Ansible creates.
10. **The first release's data move is separate.** Moving the family's dev data into prod (ADR 0003, decision 9) is a cutover done once backup and restore (#23) exist. A deploy does not do it.

## Consequences

Good:

- No inbound ports, no deploy keys and no long-lived registry credential.
- A release is one `git tag` and `git push`, and a rollback is one manual workflow run.
- The same script works from CI or by hand, and is shellchecked in CI.
- The approach carries over to any host that can run Tailscale.

Costs:

- **Tailscale is a dependency of deploys as well as of access** (ADR 0004). If it is down, nothing deploys, though the app keeps running.
- **A one-time setup in the Tailscale admin console:** the ACL tag, the OAuth client and SSH permission. It cannot be done from the repo, so it is documented in `infra/README.md`.
- **A bad migration is not undone by a rollback.** The old image runs against already-migrated data. The backup is the way back, which is why it is taken first.
- **The laptop must be on** for CI to reach the VM, the same limit as ADR 0003.
- **The backup is on the same VM** until #23 adds a copy elsewhere.

## Alternatives considered

- **A self-hosted runner on the VM or laptop.** It works, but an always-on process that takes jobs from GitHub needs hardening, and it would run on the machine being deployed to.
- **The VM pulls new tags itself** (a timer or a webhook). No inbound access is needed, but a failure is invisible to CI, so "a failed health check is reported" would need a second channel.
- **Plain SSH with a deploy key.** A key to store and rotate, and it hits the ufw rate limit.
- **A personal access token on the VM** (encrypted with sops, #25). It works, but it is a long-lived credential on the machine, and it ties this work to #25.
- **Deploy on every merge to `main`.** Rejected in ADR 0003.
- **Wait for #23 first.** Would delay the first deploy. A minimal backup now, with #23 building on it, avoids that.

## Related

- #26: this decision. #80: the images. #22: the VM and its access. #23: backups. #25: secrets.
- ADR 0001: "add, never change" makes rollback safe. ADR 0003: tags, prod data and the cutover. ADR 0004: Tailscale on the VM.
