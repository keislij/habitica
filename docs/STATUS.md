# Onboarding status

Last updated: 2026-07-24.

## Complete

- GitHub fork `keislij/habitica` cloned on `develop`
- Fetch-only official upstream and self-host reference remotes
- Official GitHub wiki cloned; `habitica-images` submodule initialized
- Node 20/npm 10 dependencies and native build prerequisites installed
- Ignored local development configuration bootstrapped
- MongoDB 7 health, API status/readiness, Vite client, and proxy verified live
- Lint, production client build, sanity, and client unit checks passed
- Sources, architecture, self-host stages, HA path, and specialist agents defined
- Temporary development processes and Mongo container stopped cleanly

## Not deployed

There is no production Habitica service, DNS, TLS route, GitOps stack, secret,
backup, monitoring, Home Assistant config entry, or knowledge-base service
record yet. These remain intentionally gated by the open decisions.

## Next milestone

Approve the Stage 1 product policy and placement decisions in
`docs/SELF_HOSTING.md`, then build a production candidate through `kt-gitops`.

