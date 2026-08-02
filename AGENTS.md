# habitica

Meta-workspace (control plane) for a private, self-hosted Habitica deployment. It versions
operating rules, runbooks (`docs/`), and helper scripts around two git-ignored, independent
checkouts: `habitica/` (the `keislij/habitica` fork on upstream `develop`) and `habitica-wiki/`
(clone of the official GitHub wiki). Production deploys happen from `kt-gitops`, never from here.

## Stack & commands

Bash workspace scripts only. The nested app checkout uses Node 20 + npm 10 via `fnm` and
MongoDB (started from `habitica/docker-compose.mongo-only.yml`). No workspace-level build or
test suite — app builds/tests run inside `habitica/` per its own instructions.

    ./scripts/verify-workspace.sh      # verify nested repos, remotes, push guards, fnm/Node 20
    ./scripts/sync-upstreams.sh        # fetch --prune all remotes; never merges or checks out
    ./scripts/bootstrap-dev-config.sh  # seed habitica/config.json from config.json.example
    ./scripts/index-fandom-docs.sh     # regenerate docs/generated/ wiki index

## Conventions (not tooling-enforced)

- Never submit AI-generated code, tests, docs, or assets upstream to Habitica (upstream policy).
- Never push to the `upstream` or `selfhost` remotes — their push URLs are intentionally
  `DISABLED`. Push the private fork (`origin`) only when explicitly requested.
- Identify the target repository before editing; never run a workspace-wide commit or
  dependency command across the nested checkouts.
- Never commit secrets, API tokens, populated env files, DB dumps, or `habitica/config.json`.
- Read `docs/STATUS.md` before material work; record verification evidence there afterwards.
- Production changes belong in `kt-gitops` (immutable digests, guarded reconcile); do not
  deploy from upstream development Compose files.
- Prefer the wiki checkout / official GitHub docs over Fandom's older Node/Docker
  instructions when they conflict.

## Deeper docs

- `agent_docs/workspace-rules.md` — full read order, hard boundaries, self-hosting/estate
  rules, Home Assistant integration rules, agent-use policy.
- `docs/` — STATUS, DEVELOPMENT, SELF_HOSTING, ARCHITECTURE, HOME_ASSISTANT, SOURCES, DECISIONS.
