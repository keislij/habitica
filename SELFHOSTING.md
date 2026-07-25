# Private self-hosting contract

This branch is for the private Habitica fork only. Never submit AI-generated
code, tests, documentation, or assets from it upstream to Habitica, and never
push it to the configured `upstream` or `selfhost` remotes.

## Build

Use Node 20/npm 10 for source validation. The production Dockerfile exposes two
linux/amd64 targets:

```sh
docker buildx build --platform linux/amd64 --target server \
  --build-arg VERSION=5.48.7-selfhost.3 \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  -t habitica-server:5.48.7-selfhost.3 .

docker buildx build --platform linux/amd64 --target web \
  --build-arg VERSION=5.48.7-selfhost.3 \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  -t habitica-web:5.48.7-selfhost.3 .
```

`config.selfhost-build.json` contains public client-build values only.
`config.selfhost-runtime.json` is copied into the server image as safe,
non-secret defaults. Runtime environment variables have higher precedence.
Publish by immutable digest and retain a separately tested rollback digest.

The server runs directly as the unprivileged `node` user on port 3000. The web
target runs Caddy as its unprivileged user on port 8080 and uses
`BACKEND_SERVER` for the server address. `EDGE_PROXY_IP` defaults to
`10.10.3.150`; Caddy returns 403 to any non-loopback peer other than that edge
proxy so direct LAN access cannot bypass ingress policy. Browser assets still
require access to the Habitica S3 asset hosts allowed by `ops/Caddyfile`.

## Required production configuration

The server fails fast unless these values are supplied:

- `BASE_URL`: public HTTPS origin.
- `NODE_DB_URI`: MongoDB replica-set URI.
- `SESSION_SECRET`: random value of at least 32 characters.
- `SESSION_SECRET_KEY`: exactly 64 random hexadecimal characters.
- `SELF_HOST_REGISTRATION_ENABLED`: explicit `true` or `false`.
- `EMAIL_DELIVERY`: `disabled`, `smtp`, or `worker`.

Keep `PAYMENTS_ENABLED=false` and `DISABLE_LOCAL_ANALYTICS=true` unless those
features are deliberately implemented. If `EMAIL_DELIVERY=worker`,
`WORKER_REDIS_URL` is required. The API rate limiter uses `REDIS_HOST`,
`REDIS_PORT`, and optional `REDIS_PASSWORD` when
`RATE_LIMITER_ENABLED=true`.

## Registration bootstrap

Anonymous local registration is fail-closed in production and applies to both
v3 and v4 APIs. Bootstrap the first owner as a controlled maintenance action:

1. Set `SELF_HOST_REGISTRATION_ENABLED=true` and restart the server.
2. Register the owner account through the normal UI.
3. Set `SELF_HOST_REGISTRATION_ENABLED=false` and restart again.
4. Confirm a new anonymous registration receives HTTP 403 with
   `Registration is disabled on this server.`

Authenticated social users may still attach local credentials. Do not leave the
bootstrap flag enabled after creating intended household accounts.

## SMTP with pinned TLS

For direct SMTP delivery set:

```text
EMAIL_DELIVERY=smtp
EMAIL_SERVER_HOST=<SMTP host or IP>
EMAIL_SERVER_PORT=<port>
EMAIL_SERVER_AUTH_USER=<user>
EMAIL_SERVER_AUTH_PASSWORD=<secret>
EMAIL_SERVER_FROM=Habitica <homelab@tekeis.net>
EMAIL_SERVER_SECURE=false
EMAIL_SERVER_REQUIRE_TLS=true
EMAIL_SERVER_REJECT_UNAUTHORIZED=true
EMAIL_SERVER_CA_FILE=/run/config/smtp-ca.pem
EMAIL_SERVER_TLS_SERVERNAME=<certificate DNS name or IP SAN>
```

`EMAIL_SERVER_CA_FILE` must point to a mounted PEM certificate/CA bundle.
`EMAIL_SERVER_URL` is retained only as a legacy hostname alias; it is not a URI.
Password-reset delivery is awaited before success is returned. Welcome-message
failures are caught and logged so they cannot become unhandled rejections.

## Cron

Run the cron as a one-shot process from the same immutable server image:

```sh
node /var/lib/habitica/website/transpiled-babel/teamCron.js
```

It uses the same runtime config and MongoDB URI, exits nonzero on failure, and
must not run concurrently.

## Source validation

From a clean checkout with Node 20 and committed lockfiles:

```sh
npm ci
./node_modules/.bin/eslint website/server test/api/unit
NODE_ENV=test ./node_modules/.bin/mocha \
  --require @babel/register \
  --require ./test/helpers/globals.helper \
  test/api/unit/libs/emailSmtp.test.js \
  test/api/unit/libs/worker.test.js \
  test/api/unit/libs/auth/registration.test.js \
  test/api/unit/libs/selfhostConfig.test.js \
  test/api/unit/libs/user/deleteAccount.test.js \
  test/api/unit/middlewares/paymentGate.test.js
./node_modules/.bin/gulp build:prod
npm run client:build
```

Before publication, validate both image configs, start the server far enough to
load the transpiled application with temporary non-production secrets and
`MAINTENANCE_MODE=true`, and verify `/api/v3/status`. Validate the web Caddyfile
and `/healthz` independently.
