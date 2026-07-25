import { readFileSync } from 'fs';
import path from 'path';

const repositoryRoot = path.resolve(__dirname, '../../../..');
const caddyfile = readFileSync(path.join(repositoryRoot, 'ops/Caddyfile'), 'utf8');
const dockerfile = readFileSync(path.join(repositoryRoot, 'Dockerfile'), 'utf8');

describe('self-host production contracts', () => {
  it('tells Express that trusted Caddy requests arrived over HTTPS', () => {
    expect(caddyfile).to.include('header_up Host {http.request.host}');
    expect(caddyfile).to.include('header_up X-Forwarded-Host {http.request.host}');
    expect(caddyfile).to.include('header_up X-Forwarded-Proto https');
  });

  it('orders the peer gate and local health before static files and the backend proxy', () => {
    const peerGateHandler = caddyfile.indexOf('handle @untrusted {');
    const healthMatcher = caddyfile.indexOf('@health path /healthz');
    const healthHandler = caddyfile.indexOf('handle @health {');
    const staticHandler = caddyfile.indexOf('handle @static {');
    const backendHandler = caddyfile.lastIndexOf('\n\thandle {');

    expect(caddyfile).to.match(
      /@untrusted \{[\s\S]+?\}\s+handle @untrusted \{\s+respond 403\s+\}/,
    );
    expect(caddyfile).to.match(
      /@health path \/healthz\s+handle @health \{\s+respond 200\s+\}/,
    );
    expect(peerGateHandler).to.be.greaterThan(-1);
    expect(healthMatcher).to.be.greaterThan(-1);
    expect(healthMatcher).to.be.greaterThan(peerGateHandler);
    expect(healthHandler).to.be.greaterThan(healthMatcher);
    expect(staticHandler).to.be.greaterThan(healthHandler);
    expect(backendHandler).to.be.greaterThan(staticHandler);
    expect(caddyfile).not.to.include('respond @untrusted 403');
    expect(caddyfile).not.to.include('respond /healthz 200');
  });

  it('checks the server locally without following an HTTPS redirect', () => {
    expect(dockerfile).to.include("path:'/api/v3/status'");
    expect(dockerfile).to.include("'X-Forwarded-Proto':'https'");
    expect(dockerfile).to.include('res.statusCode===200');
    expect(dockerfile).not.to.include("fetch('http://127.0.0.1:3000/api/v3/status')");
  });

  it('runs the web image with a stable numeric non-root identity', () => {
    expect(dockerfile).to.include(
      'COPY --from=build --chown=65532:65532 /build/website/client/dist /srv',
    );
    expect(dockerfile).to.include('USER 65532:65532');
    expect(dockerfile).not.to.include('--chown=caddy:caddy');
    expect(dockerfile).not.to.include('USER caddy');
  });

  it('removes Caddy file capabilities before dropping all runtime capabilities', () => {
    const stripCapabilities = dockerfile.indexOf('RUN setcap -r /usr/bin/caddy');
    const dropPrivileges = dockerfile.indexOf('USER 65532:65532');

    expect(stripCapabilities).to.be.greaterThan(-1);
    expect(dropPrivileges).to.be.greaterThan(stripCapabilities);
  });
});
