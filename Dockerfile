# syntax=docker/dockerfile:1.7

ARG NODE_BUILD_IMAGE=node:20.20.2-bookworm@sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5
ARG NODE_RUNTIME_IMAGE=node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0
ARG CADDY_IMAGE=caddy:2.10.2-alpine@sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d

FROM ${NODE_BUILD_IMAGE} AS build

ENV CI=true
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm pkg set scripts.postinstall="echo skipping repository postinstall during image build" \
  && npm ci --no-audit --no-fund

COPY website/client/package.json website/client/package-lock.json ./website/client/
RUN cd website/client \
  && npm pkg set scripts.postinstall="echo skipping client postinstall during image build" \
  && npm ci --no-audit --no-fund

COPY . .
COPY config.selfhost-build.json ./config.json

ARG PUBLIC_BASE_URL=https://chores.tekeis.net
ARG TRUSTED_DOMAINS=https://chores.tekeis.net
# Private self-host unlock: compiled into the client bundle so upsell UI is
# hidden and unlocked features render. See common/script/libs/selfhostUnlock.js.
ARG SELF_HOST_UNLOCK_ALL=false
ENV NODE_ENV=production \
  BASE_URL=${PUBLIC_BASE_URL} \
  TRUSTED_DOMAINS=${TRUSTED_DOMAINS} \
  SELF_HOST_UNLOCK_ALL=${SELF_HOST_UNLOCK_ALL} \
  EXTERNAL_ANALYTICS_ENABLED=false \
  PAYMENTS_ENABLED=false \
  LOGGLY_CLIENT_TOKEN="" \
  AMPLITUDE_KEY="" \
  AMAZON_PAYMENTS_CLIENT_ID="" \
  AMAZON_PAYMENTS_SELLER_ID="" \
  APPLE_AUTH_CLIENT_ID="" \
  GOOGLE_CLIENT_ID="" \
  STRIPE_PUB_KEY=""

RUN npm pkg set scripts.postinstall="echo skipping repository postinstall during image build" \
  && ./node_modules/.bin/gulp build:prod \
  && npm run client:build \
  && npm prune --omit=dev --no-audit --no-fund \
  && npm cache clean --force \
  && rm -f config.json

FROM ${NODE_RUNTIME_IMAGE} AS server

ARG BUILD_DATE
ARG VERSION=5.48.7-selfhost.4
ARG VCS_REF
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
  org.opencontainers.image.description="Private self-hosted Habitica application server" \
  org.opencontainers.image.revision="${VCS_REF}" \
  org.opencontainers.image.source="https://github.com/keislij/habitica" \
  org.opencontainers.image.title="habitica-server" \
  org.opencontainers.image.version="${VERSION}"

ENV NODE_ENV=production \
  PORT=3000 \
  SELF_HOST_REGISTRATION_ENABLED=false \
  WEB_CONCURRENCY=0
WORKDIR /var/lib/habitica

COPY --from=build --chown=node:node /build/node_modules ./node_modules
COPY --from=build --chown=node:node /build/package.json ./package.json
COPY --chown=node:node config.selfhost-runtime.json ./config.json
COPY --from=build --chown=node:node /build/content_cache ./content_cache
COPY --from=build --chown=node:node /build/i18n_cache ./i18n_cache
COPY --from=build --chown=node:node /build/website/common ./website/common
COPY --from=build --chown=node:node /build/website/client/dist ./website/client/dist
COPY --from=build --chown=node:node /build/website/transpiled-babel ./website/transpiled-babel

USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["node", "-e", "const http=require('http');const base=new URL(process.env.BASE_URL||require('./config.json').BASE_URL);const req=http.get({hostname:'127.0.0.1',port:3000,path:'/api/v3/status',headers:{Host:base.host,'X-Forwarded-Host':base.host,'X-Forwarded-Proto':'https'}},res=>process.exit(res.statusCode===200?0:1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});req.on('error',()=>process.exit(1));"]
CMD ["node", "website/transpiled-babel/index.js"]

FROM ${CADDY_IMAGE} AS web

ARG BUILD_DATE
ARG VERSION=5.48.7-selfhost.4
ARG VCS_REF
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
  org.opencontainers.image.description="Private self-hosted Habitica web frontend" \
  org.opencontainers.image.revision="${VCS_REF}" \
  org.opencontainers.image.source="https://github.com/keislij/habitica" \
  org.opencontainers.image.title="habitica-web" \
  org.opencontainers.image.version="${VERSION}"

ENV BACKEND_SERVER=habitica-server:3000 \
  EDGE_PROXY_IP=10.10.3.150 \
  HOME=/tmp \
  XDG_CONFIG_HOME=/tmp/caddy-config \
  XDG_DATA_HOME=/tmp/caddy-data

RUN setcap -r /usr/bin/caddy

COPY ops/Caddyfile /etc/caddy/Caddyfile
COPY --from=build --chown=65532:65532 /build/website/client/dist /srv

USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "--quiet", "--spider", "http://127.0.0.1:8080/healthz"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
