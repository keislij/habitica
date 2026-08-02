# Habitica workspace — full operating rules

Deep content preserved from the pre-2026-08 `AGENTS.md`. The short rules live in
`AGENTS.md`; this file holds the complete versions.

## Read order

Before material work, read:

1. `AGENTS.md` and `docs/STATUS.md`;
2. the relevant document in `docs/`;
3. the target repository's `README.md`, instructions, and pinned manifests;
4. current official source documentation listed in `docs/SOURCES.md`;
5. `/opt/GITProjects/knowledge_base` and `/opt/GITProjects/kt-gitops`
   contracts for estate or deployment work.

Do not treat Fandom's older Node/Docker instructions as current when they
conflict with the application repository or official GitHub wiki.

## Hard boundaries (full list)

- Never submit AI-generated code, tests, docs, or assets upstream to Habitica.
- Never push to `upstream` or `selfhost`; their push URLs are intentionally
  disabled. Push private-fork changes only when explicitly requested.
- Never commit secrets, API tokens, populated environment files, database
  dumps, or `habitica/config.json`.
- Stay out of wall-tablet repositories and environments unless explicitly
  re-included.
- Do not replace or disrupt the existing Alchemy chore/reward system without an
  explicit migration decision and rollback plan.
- Do not deploy from upstream development Compose files.

## Development

Use Node 20 and npm 10 through `fnm`; follow the committed npm lockfiles. Start
MongoDB with `habitica/docker-compose.mongo-only.yml`. Use focused tests first,
then lint, build, sanity, and client unit checks as proportional validation.
Record meaningful verification evidence in `docs/STATUS.md`.

The ignored local config is development-only. Do not convert placeholder
payment/social keys into real credentials unless the corresponding feature is
being deliberately configured.

## Self-hosting and estate integration

Production changes belong in `kt-gitops`, use immutable image digests, external
secret management, health checks, routed verification, and guarded reconcile.
Traefik file-provider configuration is authoritative; do not add container
labels as a second source of truth. A dedicated or resized LXC is preferred over
silently crowding the current custom-apps host (production runs on dedicated
CT1290, deployed from the `private/selfhost-production-v5.48.7` branch).

No service is production-ready until restore testing, Mongo replica consistency,
workers/cron, mail behavior, observability, upgrade/rollback, and native/mobile
client behavior are proven.

## Home Assistant

Validate Home Assistant's native Habitica integration against the self-host URL
first. Use a dedicated least-privilege Habitica account/token. Respect API rate
limits and identify every automated client. Add a bridge only for confirmed
event, identity, or workflow gaps; it must authenticate, queue, deduplicate, and
avoid feedback loops.

## Agent use

Delegate bounded parallel work to the specialists in `.codex/agents/`. Agents
must return evidence, distinguish facts from proposals, and respect all hard
boundaries. The primary agent owns synthesis and any cross-repository mutation.
Start Codex from the workspace root so project agents are available.
