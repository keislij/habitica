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
});
