# Onboarding status

Last updated: 2026-07-25.

## Complete

- GitHub fork `keislij/habitica` cloned on `develop`
- Fetch-only official upstream and self-host reference remotes
- Official GitHub wiki cloned; `habitica-images` submodule initialized
- Node 20/npm 10 dependencies and native build prerequisites installed
- Ignored local development configuration bootstrapped
- MongoDB 7 health, API status/readiness, Vite client, and proxy verified live
- Lint, production client build, sanity, and client unit checks passed
- Sources, architecture, self-host stages, HA path, and specialist agents defined

## Deployed (Stage 2 complete)

Production is live from the `private/selfhost-production-v5.48.7` branch
(source commit `cb3409b`), built into immutable Forgejo image digests and
deployed through the guarded `kt-gitops` reconcile:

- Dedicated LXC CT1290 (`habitica`, 10.10.3.98, pmve2, 6 cores / 12 GiB)
- `https://chores.tekeis.net` via Traefik file-provider route, Let's Encrypt
  TLS, LAN + Tailscale allowlist only; direct backend rejects non-Traefik peers
- MongoDB 7.0.39 authenticated single-member replica set `rs0`, internal-only
- Monitoring registered: Beszel agent (host `habitica`) and Uptime Kuma
  keyword monitor on `/api/v4/ready`
- Backups: PVE replication 1290-0 (pmve2→pmve1, 15 min), nightly vzdump, and
  native authenticated `mongodump --oplog` timers to NAS with a passing
  integrity catalog
- kt-gitops PRs #124–#129 and keistech PRs #97–#102 merged; knowledge_base
  service record merged (PR #105)

## Open acceptance gates (Stage 3)

- Owner and household accounts (registration currently fail-closed, HTTP 403)
- Mail delivery proof through Proton Bridge STARTTLS
- Team cron: fail-closed behind `HABITICA_TEAM_CRON_ENABLED=false` pending the
  private-image fix for `MongoClientClosedError` in the Blocker watcher
- Disposable restore drill (`restore_proven: 0` in the backup catalog)
- Native mobile client proof; browser QA passed with two open findings
  (signup visible while registration disabled; /register overflows at
  mobile width)
- Home Assistant native integration config entry (dedicated account pending)

## Next milestone

Close the Stage 3 acceptance gates above, then flip the knowledge-base
deployment_state from `deployed-acceptance-incomplete` to accepted.
