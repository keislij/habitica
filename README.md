# Habitica self-host workspace

> **DECOMMISSIONED (2026-08-11).** The household moved to `alchemy` +
> `hearthguard-app`. Production CT1290 was `pct destroy --purge`'d, the
> Traefik route (`chores.tekeis.net`) was archived and now returns nothing,
> the authentik app + OAuth provider were deleted, and the `kt-gitops`
> declarations (stack, fleet-map, immutable-image contract, provenance
> ledger) were removed and merged to `main`.
> `knowledge_base/services/habitica/` is `status: decommissioned`.
> Data was preserved on NAS
> `Project-Planning/claude-reports/habitica-decommission-20260811/`: a
> mongodump of the prod DB (5 users, 33 tasks, 3 groups, 2 challenges), the
> final CT1290 `vzdump` backup, and the 27-commit self-host patch branch as a
> verified `git bundle`. Rollback path: restore the mongo dump (or the CT
> vzdump) and re-add the Traefik route + authentik app.
>
> This repo is retained as a **historical control-plane archive** — its git
> history, research, agent docs, and runbooks stay on disk for reference, but
> it is not an active deployment target. Everything below describes the
> workspace as it operated while Habitica was in production.

This was the control plane for a private, developable Habitica deployment. It
kept the upstream application checkout and documentation checkout independent
while versioning our operating rules, research, agents, and runbooks.

## State as of decommission (2026-08-11)

- `habitica/` is the `keislij/habitica` fork on upstream `develop`.
- `habitica-wiki/` is a local clone of the official GitHub wiki.
- Node 20/npm 10 dependencies, MongoDB 7, API, client, build, lint, sanity tests,
  and client unit tests were exercised locally.
- Production **was live** at `https://chores.tekeis.net` on dedicated CT1290,
  deployed from the `private/selfhost-production-v5.48.7` branch through
  `kt-gitops` as immutable image digests, until the 2026-08-11 decommission
  (see banner above). Stage 3 acceptance (accounts, mail, team cron, restore
  drill, mobile, Home Assistant) had closed 2026-07-25 — see
  [status](docs/STATUS.md) for the historical record.
- Home Assistant's native Habitica integration supports custom instances; it
  was the integration path used while the service was live.

See [status](docs/STATUS.md), [development](docs/DEVELOPMENT.md), and
[self-hosting](docs/SELF_HOSTING.md).

## Start here

Run Codex from this directory so it loads `AGENTS.md` and the project-scoped
specialists in `.codex/agents/`.

```bash
cd /opt/GITProjects/habitica
./scripts/verify-workspace.sh
./scripts/sync-upstreams.sh
```

The nested repositories retain their own histories. Never run a workspace-wide
commit or dependency command across them.

## Guardrail

Habitica explicitly prohibits AI-generated code in upstream contributions.
Codex may help operate and develop our private fork, but AI-generated changes
must never be offered upstream.

