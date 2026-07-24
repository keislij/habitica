# Self-hosting plan

Upstream's development environment is proven locally, but it is explicitly not
a production distribution. Production work proceeds through gated stages.

## Stage 0 — onboarded

- Fork, upstream remote, self-host reference remote, wiki, and image submodule
- Reproducible Node/Mongo development setup
- Lint/build/test/live API and client proof
- Source register, architecture baseline, agents, and operating rules

## Stage 1 — product and platform decisions

- Decide private-only versus internet/mobile access and final FQDN
  (`habitica.tekeis.net` is a candidate, not a fact).
- Decide which self-host policy changes are wanted: subscriptions, gems,
  payments, groups, admin bootstrap, invites, email, and analytics.
- Confirm coexistence/migration boundaries with Alchemy.
- Select a dedicated/resized LXC and measure sustained CPU, memory, storage,
  IOPS, and backup capacity. The current custom-apps host is too constrained to
  accept this silently.

## Stage 2 — production candidate

- Build our reviewed fork into immutable images pinned by digest.
- Add GitOps stack, external secrets, internal networks, least exposure, and
  Traefik file-provider routing.
- Assign web, migrations, worker/queue, team/group cron, and email processes.
- Configure authenticated Mongo replica-set operation and indexes.
- Add health, metrics/logs, alerts, resource limits, and maintenance controls.
- Implement encrypted backup retention and prove a clean restore with RPO/RTO.
- Exercise upgrade, rollback, and disaster recovery.

## Stage 3 — acceptance

- New-user/admin bootstrap, household workflows, parties, tasks, rewards, mail
- Browser plus intended native/mobile clients against the self-host URL
- Home Assistant native integration and API rate behavior
- Security/adversarial review, dependency triage, and routed TLS proof
- Knowledge-base service manifest/README only after target facts exist

## Deployment rules

Production state belongs in `kt-gitops`; operational truth belongs in
`knowledge_base`. Use guarded reconcile and routed proof. Do not add a second
Traefik source through Compose labels. Do not use the currently failing generic
sensitive-data backup path as Habitica's backup contract.

