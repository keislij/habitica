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
});
