# Local development

## Verified baseline

On 2026-07-24, commit `672955bcedac32f792cf21fbe4f13ad96f88a808`
(Habitica 5.48.7) was verified with Node 20.20.2, npm 10.8.2, and MongoDB 7:

- dependency install completed;
- lint completed with upstream warnings and zero errors;
- production client build completed;
- sanity suite: 2 passing;
- client unit suite: 204 passing, 5 skipped;
- API `/api/v3/status` returned `up`;
- API `/api/v4/ready` returned `ready`;
- Vite client loaded and proxied the API successfully.

The root and client production dependency audits currently report significant
upstream debt (including critical findings). Do not run automated audit fixes;
triage advisories against pinned runtime reachability first.

## Prerequisites

- `fnm` with Node 20
- npm 10
- Docker with Compose
- build-essential, Python 3, and Kerberos development headers

## Bootstrap

```bash
cd /opt/GITProjects/habitica
./scripts/verify-workspace.sh
./scripts/bootstrap-dev-config.sh
cd habitica
/home/ktadmin/.local/share/fnm/fnm exec --using 20 npm ci
git submodule update --init habitica-images
```

`config.json` is ignored and contains development-only placeholder credentials.
The bootstrap script refuses to overwrite it unless `--force` is supplied.

## Run

Terminal 1:

```bash
cd habitica
sudo docker compose -f docker-compose.mongo-only.yml up -d
```

Terminal 2:

```bash
cd habitica
/home/ktadmin/.local/share/fnm/fnm exec --using 20 npm start
```

Terminal 3:

```bash
cd habitica
/home/ktadmin/.local/share/fnm/fnm exec --using 20 npm run client:dev
```

Open `http://localhost:5173`. API health is
`http://localhost:3000/api/v3/status`; readiness is
`http://localhost:3000/api/v4/ready`.

Stop the Node processes with Ctrl-C, then:

```bash
sudo docker compose -f docker-compose.mongo-only.yml down
```

Do not add `-v` unless deliberately deleting local development data.

## Checks

```bash
/home/ktadmin/.local/share/fnm/fnm exec --using 20 npm run lint-no-fix
/home/ktadmin/.local/share/fnm/fnm exec --using 20 npm run client:build
/home/ktadmin/.local/share/fnm/fnm exec --using 20 npm run test:sanity
/home/ktadmin/.local/share/fnm/fnm exec --using 20 npm run client:unit
```

