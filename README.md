# Habitica self-host workspace

This is the control plane for a private, developable Habitica deployment. It
keeps the upstream application checkout and documentation checkout independent
while versioning our operating rules, research, agents, and runbooks.

## Current state

- `habitica/` is the `keislij/habitica` fork on upstream `develop`.
- `habitica-wiki/` is a local clone of the official GitHub wiki.
- Node 20/npm 10 dependencies, MongoDB 7, API, client, build, lint, sanity tests,
  and client unit tests have been exercised locally.
- Production is **live** at `https://chores.tekeis.net` on dedicated CT1290,
  deployed from the `private/selfhost-production-v5.48.7` branch through
  `kt-gitops` as immutable image digests. Stage 3 acceptance (accounts, mail,
  team cron, restore drill, mobile, Home Assistant) is still open — see
  [status](docs/STATUS.md).
- Home Assistant's native Habitica integration supports custom instances. That
  is the first integration path; custom bridge code is a later gap-driven option.

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

