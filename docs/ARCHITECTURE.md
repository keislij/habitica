# Architecture baseline

## Application

Habitica is a Node/Express application with a Vue 2/Vite client. The server
serves the API and static/application routes. MongoDB is the primary state
store and must run as a replica set. User records include long-lived API
credentials, so database access and backups are security-sensitive.

The repository also contains content, shared modules, migrations, cron logic,
email flows, webhooks, analytics/payment integrations, and optional BullMQ/Redis
worker paths. A production topology must explicitly assign every background
job; running only web and Mongo is incomplete.

## Proposed production shape

```text
clients / Home Assistant
          |
       Traefik TLS
          |
     Habitica web/API
       |      | \
       |      |  outbound mail
       |      +-- worker/cron ownership
       |
   MongoDB replica set
          |
 encrypted backup target + restore proof
```

Only Traefik should expose the application. MongoDB, Redis if adopted, and
worker interfaces remain internal. Readiness must include database connectivity;
liveness must not create dependency restart loops.

## Trust boundaries

- Browser/mobile/HA clients to the public API
- Reverse proxy to application
- Application/workers to MongoDB, Redis, SMTP, and external providers
- Backup operator to encrypted data and restore environment
- GitOps/secret manager to runtime configuration

Habitica webhooks are not a trusted event bus by default. Any future receiver
must authenticate requests at our boundary, validate destinations, queue and
deduplicate work, and constrain outbound network access.

