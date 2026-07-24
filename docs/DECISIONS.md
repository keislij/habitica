# Decision record

## Accepted

- Track official `develop` in the private fork; preserve `upstream` as fetch-only.
- Treat `awinterstein/self-host` as a reviewed patch source, not the base branch.
- Keep application, wiki, and workspace-control histories independent.
- Use Node 20/npm 10 and MongoDB 7 for development.
- Keep AI-generated work private; never submit it upstream.
- Validate Home Assistant's native custom-instance integration before building.
- Preserve Alchemy until a deliberate coexistence/migration decision.
- Prefer dedicated/resized capacity and canonical GitOps over ad hoc deployment.

## Open

- Private/LAN/VPN-only versus public/native-mobile access
- Final FQDN and deployment LXC
- Desired payment/subscription/gem/group/admin/invite policy
- SMTP provider and email feature scope
- Redis/worker topology and cron ownership
- Backup target, retention, RPO, and RTO
- Alchemy coexistence duration and migration outcome

