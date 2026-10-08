# ADR 0002: Self-host at home, reach it over HTTPS through a tunnel

Status: accepted
Date: 2026-10-08

## Context

Phones currently reach the app over plain HTTP on the home Wi-Fi, served from the laptop. That blocks three planned features: installing the app as a PWA (#13), the offline queue (#14) and any access from outside the house. Browsers only run service workers on HTTPS (or `localhost`), and a phone reaching the laptop by its LAN address is neither.

Constraints:

- This is a side project and a portfolio piece. If it goes down for a day, nothing bad happens.
- The developer is between roles, so spend must stay near zero and must not be able to run away.
- The data is low-sensitivity puppy logs shared by a few family members.
- The infrastructure should be reproducible and should show transferable skills (IaC, TLS, backups, monitoring), not just one provider's console.

Hardware: the laptop (WSL2) today, a new PC arriving in about six weeks, and a spare four-year-old Raspberry Pi.

## Decision

1. **Host at home.** Run the stack in Docker on the laptop for now, then on the new PC when it arrives. The Pi is the fallback. Laptop and PC both run Docker, and the Pi may need arm64 images, so the Docker image and compose file must not assume a CPU type.
2. **Use Caddy as the reverse proxy.** It serves the built app and forwards `/api` to PocketBase, replacing the Vite dev proxy outside development (#22).
3. **Use Tailscale Serve for HTTPS.** It gives an HTTPS address on the tailnet's `*.ts.net` name, with no domain to buy and no router ports open. Family members install the Tailscale app on their phones. The free plan covers up to 6 users, which is enough for this family. A Cloudflare Tunnel with a domain (about $10–12 a year) stays an option if someone cannot or will not install the app, and would be recorded in a new ADR.
4. **Keep admin access private.** Because the whole app is only reachable over the tailnet, so is the PocketBase admin UI (`/_/`). If a public hostname is ever added, `/_/` must be blocked on it.
5. **Plan an AWS migration as a documented exercise, in a later ADR.** Restore a backup into a short-lived AWS environment built with OpenTofu, switch over, record the steps and downtime, then destroy it. This depends on tested backups (#23) and is the proof that the setup is portable.

## Consequences

Good:

- Recurring cost is about $0 until a domain is needed, and then about $10–12 a year. There is no server bill that can grow.
- No router ports are opened, and the app is not on the public internet, so the home network is not directly exposed.
- The Caddy, Docker and backup work is the same on any host, so it carries over to AWS.

Costs:

- **The host is a home machine.** The laptop sleeps and moves, so the app goes away when it does. This is acceptable for now. The PC or the Pi should become the always-on host.
- **Every family phone needs the Tailscale app**, and the free plan is limited to 6 users. Nobody outside the tailnet can use the app.
- **A third party sits in the path.** Tailscale outages or policy changes affect access. Free-tier terms can change.
- **Backups matter more at home**, since a dead disk takes the data with it. Off-machine backups (#23) are a requirement, not a nice-to-have.
- **No cloud-provider experience yet.** The AWS migration exercise is how this gap is closed.

## Alternatives considered

- **A VPS (for example Hetzner) with Caddy.** The strongest portfolio story for IaC and a live URL, with a predictable fixed price. Rejected for now because even the cheapest option is a recurring bill, for little benefit while the user base is a handful of family members. It stays a valid later option, since the Caddy and Ansible work would carry straight over.
- **AWS, Azure or GCP for always-on hosting.** Strong for job-market relevance, but none of them has a hard spending cap, and they cost more than a small VPS. Rejected for always-on use, kept for a short-lived migration exercise.
- **Oracle Cloud free tier.** Rejected because Oracle cut the free allowance in 2026 and the overage terms for pay-as-you-go accounts are unclear.
- **A Cloudflare Tunnel with a domain.** Relatives would only need a link, but it costs a domain each year and puts a third party in front of the app. Kept as a later option, not needed yet.
- **Port forwarding with dynamic DNS.** Rejected because it exposes the home network and depends on the router and the ISP.
- **A hosted platform such as Fly.io.** Rejected because it hides the infrastructure this project is meant to show.

## Related

- #12: this decision. #13, #14: blocked on HTTPS.
- #21, #22, #23: provisioning the host, the reverse proxy and backups, now aimed at a home machine.
- ADR 0001: the data model this stack serves.
