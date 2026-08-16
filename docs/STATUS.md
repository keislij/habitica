# Onboarding status

Last updated: 2026-07-27. **Frozen 2026-08-11 — see decommission banner below; nothing on this page reflects live state after that date.**

> **DECOMMISSIONED (2026-08-11).** Production CT1290 was destroyed, the
> `chores.tekeis.net` Traefik route and authentik app were removed, and the
> `kt-gitops` declarations were merged out on `main`. Data was preserved to
> NAS `Project-Planning/claude-reports/habitica-decommission-20260811/`
> (mongodump, final CT vzdump, fork branch git bundle). See the repo
> [README](../README.md) for the full decommission record. Everything below
> this line is a historical record of the onboarding/production stand-up as
> it existed through 2026-08-11 — it is not current state.

## Complete

- GitHub fork `keislij/habitica` cloned on `develop`
- Fetch-only official upstream and self-host reference remotes
- Official GitHub wiki cloned; `habitica-images` submodule initialized
- Node 20/npm 10 dependencies and native build prerequisites installed
- Ignored local development configuration bootstrapped
- MongoDB 7 health, API status/readiness, Vite client, and proxy verified live
- Lint, production client build, sanity, and client unit checks passed
- Sources, architecture, self-host stages, HA path, and specialist agents defined

## Deployed (Stage 2 complete) — historical, decommissioned 2026-08-11

Production was live as **`5.48.7-selfhost.21`** from the
`private/selfhost-patches-v5.48.7` branch (source commit `bbad6850`), built into
immutable Forgejo image digests and deployed through the guarded `kt-gitops`
reconcile.

**The base changed on 2026-07-27.** This fork now sits on
`awinterstein/habitica releases/v5.48.7` -- the same upstream version plus a
maintained 23-commit self-host stack -- rather than on upstream directly. Our
own work is a short ordered stack of single-purpose commits replayed on top;
see `PATCH-STACK.md` for what each one is and, more usefully, the condition
under which it should be deleted rather than carried forward. Four of our
commits died that way in the rebase because awinterstein implements them better.
`ops/rebase-onto-upstream.sh` replays the stack onto a newer release branch.

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
- Source durability: fork pushed to `keislij/habitica`, releases tagged
  `selfhost-v5.48.7.1` … `.7`; every commit referenced by the kt-gitops
  provenance ledger resolves from a clean clone

## Stage 3 acceptance — closed 2026-07-25

- Accounts: `ktadmin` (Dad), `mandy` (Mom), `kai`, `xavier`, plus a dedicated
  `ha-integration` service account, created via
  the documented registration flip (re-locked; HTTP 403 re-verified);
  "Keisling Family" party formed; credentials in AKV `HABITICA-ACCOUNT-*`
- Mail: Proton Bridge SMTP proven end-to-end (awaited reset-password 200 plus
  a test message received in an external mailbox)
- Team cron: fixed in `5.48.7-selfhost.5` (`ONE_SHOT_PROCESS` gates Blocker
  change streams, the NewsPost refresh interval, and mongoose autoIndex);
  enabled and green in production (kt-gitops #130)
- Restore: disposable authenticated rs0 drill run `20260725T032829Z` passed
  every plan check (oplogReplay, counts, ready, login, task, daily reset,
  team cron, web ingress; production untouched) — see knowledge_base
  `services/habitica/restore-evidence/20260725T032829Z.md`
- Home Assistant: three native config entries loaded (ha-integration, kai,
  xavier) against https://chores.tekeis.net
- Skill/KB: `habitica` skill generated (grade A) and live; manifest active +
  drift-monitored; kb-rag ingested; marketplace plugin published

## Single sign-on (2026-07-25)

Native OIDC against authentik shipped as `5.48.7-selfhost.6` and is
verified end-to-end in a browser (SSO button -> authentik -> signed in):

- Login matches only the immutable subject; email/username claims are
  never used to select an account. Subjects bind through an
  authenticated link action, so SSO can sign in to existing accounts but
  never creates or re-binds one — registration stays fail-closed.
- `jesse`, `kai`, and `xavier` authentik identities are pre-linked to the
  `ktadmin`, `kai`, and `xavier` Habitica accounts.
- Local passwords, API tokens, and the Home Assistant integration are
  unaffected; Settings > Login Methods has a Keistech SSO row for
  connect/remove.

## Remaining open items

- Native mobile client proof
- Browser QA cosmetic findings: signup visible while registration disabled;
  /register overflows at mobile width
- NAS encryption at rest and NFS transport encryption unverified
