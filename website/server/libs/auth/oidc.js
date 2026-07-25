import crypto from 'crypto';
import nconf from 'nconf';
import { model as User } from '../../models/user';
import {
  BadRequest,
  NotAuthorized,
} from '../errors';
import logger from '../logger';

// Native OpenID Connect login for the private self-host (authentik).
// Authorization-code + PKCE, confidential client.
//
// SECURITY MODEL (deliberate, and narrower than it first looks):
//   * The ONLY accepted login key is the immutable subject (auth.oidc.id).
//     Email and username claims are never used to find an account: authentik
//     cannot assert email_verified (it ships `email_verified: false` on
//     purpose) and usernames/emails are user-editable, so matching on them
//     would let any authentik principal sign in as any local account.
//   * A subject is bound to an account only by an AUTHENTICATED link action
//     (the account owner proves control with local credentials first), so
//     login itself can never create or re-bind an identity.
//   * SSO never creates accounts; registration stays fail-closed.
// Mobile apps, API tokens, and the Home Assistant integration are untouched.

const DISCOVERY_TTL_MS = 10 * 60 * 1000;
let discoveryCache = null;
let discoveryFetchedAt = 0;

export function oidcEnabled () {
  return String(nconf.get('OIDC_ENABLED')) === 'true'
    && Boolean(nconf.get('OIDC_ISSUER'))
    && Boolean(nconf.get('OIDC_CLIENT_ID'))
    && Boolean(nconf.get('OIDC_CLIENT_SECRET'));
}

function assertEnabled () {
  if (!oidcEnabled()) throw new NotAuthorized('OIDC login is not enabled on this server.');
}

function issuerBase () {
  return String(nconf.get('OIDC_ISSUER')).replace(/\/+$/, '');
}

function redirectUri () {
  return `${String(nconf.get('BASE_URL')).replace(/\/+$/, '')}/api/v4/user/auth/oidc/callback`;
}

export async function getDiscovery (fetcher = fetch) {
  const now = Date.now();
  if (discoveryCache && now - discoveryFetchedAt < DISCOVERY_TTL_MS) {
    return discoveryCache;
  }
  const issuer = issuerBase();
  const response = await fetcher(`${issuer}/.well-known/openid-configuration`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new BadRequest(`OIDC discovery failed with HTTP ${response.status}`);
  }
  const doc = await response.json();

  // The document is only trusted if it self-identifies as our configured
  // issuer and keeps every endpoint on that exact origin — otherwise a
  // compromised/misconfigured issuer could redirect the client secret.
  if (String(doc.issuer || '').replace(/\/+$/, '') !== issuer) {
    throw new BadRequest('OIDC discovery issuer does not match OIDC_ISSUER');
  }
  const expectedOrigin = new URL(issuer).origin;
  for (const field of ['authorization_endpoint', 'token_endpoint', 'userinfo_endpoint']) {
    const value = doc[field];
    if (typeof value !== 'string' || !value.startsWith('https://')) {
      throw new BadRequest(`OIDC discovery document lacks a valid ${field}`);
    }
    if (new URL(value).origin !== expectedOrigin) {
      throw new BadRequest(`OIDC discovery ${field} is not on the issuer origin`);
    }
  }
  discoveryCache = doc;
  discoveryFetchedAt = now;
  return doc;
}

export function resetDiscoveryCache () {
  discoveryCache = null;
  discoveryFetchedAt = 0;
}

function base64url (buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Constant-time compare that tolerates differing lengths (timingSafeEqual
// throws RangeError on a length mismatch, which would surface as a 500).
export function safeEqual (a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

// mode 'login' signs in an already-linked subject; mode 'link' binds the
// subject to the authenticated user recorded in the session.
async function startFlow (req, res, mode, linkUserId) {
  assertEnabled();
  const discovery = await getDiscovery();

  const state = base64url(crypto.randomBytes(24));
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  req.session.oidcState = state;
  req.session.oidcVerifier = verifier;
  req.session.oidcMode = mode;
  req.session.oidcLinkUserId = mode === 'link' ? String(linkUserId) : undefined;

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', nconf.get('OIDC_CLIENT_ID'));
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return res.redirect(303, url.toString());
}

export async function beginLogin (req, res) {
  return startFlow(req, res, 'login');
}

export async function beginLink (req, res, user) {
  return startFlow(req, res, 'link', user._id);
}

async function exchangeCode (code, verifier, fetcher = fetch) {
  const discovery = await getDiscovery(fetcher);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: nconf.get('OIDC_CLIENT_ID'),
    client_secret: nconf.get('OIDC_CLIENT_SECRET'),
    code_verifier: verifier,
  });
  const response = await fetcher(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });
  if (!response.ok) {
    logger.error(new Error(`OIDC token exchange failed with HTTP ${response.status}`));
    throw new NotAuthorized('OIDC sign-in could not be completed.');
  }
  return response.json();
}

async function fetchClaims (accessToken, fetcher = fetch) {
  const discovery = await getDiscovery(fetcher);
  const response = await fetcher(discovery.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new NotAuthorized('OIDC sign-in could not be completed.');
  }
  return response.json();
}

// Login lookup is subject-only, by design. See the security model above.
export async function findLinkedUser (claims) {
  if (!claims.sub) return null;
  return User.findOne({ 'auth.oidc.id': String(claims.sub) }).exec();
}

function consumeFlowState (req) {
  const flow = {
    state: req.session.oidcState,
    verifier: req.session.oidcVerifier,
    mode: req.session.oidcMode,
    linkUserId: req.session.oidcLinkUserId,
  };
  delete req.session.oidcState;
  delete req.session.oidcVerifier;
  delete req.session.oidcMode;
  delete req.session.oidcLinkUserId;
  return flow;
}

export async function completeLogin (req, res, fetcher = fetch) {
  assertEnabled();
  const { code, state } = req.query;
  const flow = consumeFlowState(req);

  if (!code || !state || !flow.state || !flow.verifier) {
    throw new BadRequest('This SSO sign-in has expired; start again from the login page.');
  }
  if (!safeEqual(state, flow.state)) {
    throw new NotAuthorized('SSO sign-in could not be verified; start again from the login page.');
  }

  const tokens = await exchangeCode(String(code), String(flow.verifier), fetcher);
  if (!tokens.access_token) throw new NotAuthorized('OIDC sign-in could not be completed.');
  const claims = await fetchClaims(tokens.access_token, fetcher);
  if (!claims.sub) throw new NotAuthorized('OIDC sign-in could not be completed.');
  const subject = String(claims.sub);

  if (flow.mode === 'link') {
    const owner = await User.findOne({ _id: String(flow.linkUserId) }).exec();
    if (!owner) throw new NotAuthorized('The account being linked no longer exists.');
    const claimedBy = await User.findOne({ 'auth.oidc.id': subject }).exec();
    if (claimedBy && String(claimedBy._id) !== String(owner._id)) {
      throw new NotAuthorized('That SSO identity is already linked to another account.');
    }
    owner.auth.oidc = {
      id: subject,
      email: claims.email ? String(claims.email).toLowerCase() : undefined,
      linkedAt: new Date(),
    };
    owner.markModified('auth.oidc');
    await owner.save();
    logger.info(`OIDC identity linked to user ${owner._id}`);
    req.session.oidcHandoffUserId = String(owner._id);
    return res.redirect(303, '/user/settings/site?sso=linked');
  }

  const user = await findLinkedUser(claims);
  // Uniform outcome for "no linked account" and "blocked": the callback must
  // not become an oracle for which identities map to local accounts.
  if (!user || user.auth.blocked) {
    logger.info('OIDC sign-in refused for an unlinked or blocked identity');
    return res.redirect(303, '/login?sso=denied');
  }

  req.session.oidcHandoffUserId = String(user._id);
  return res.redirect(303, '/login?sso=1');
}

// Wraps the callback so no failure renders a raw JSON API envelope in the
// browser; everything lands back on the login page with a friendly flag.
export async function handleCallback (req, res, fetcher = fetch) {
  try {
    return await completeLogin(req, res, fetcher);
  } catch (err) {
    logger.error(err);
    return res.redirect(303, '/login?sso=error');
  }
}

// One-shot session -> API credentials hand-off for the SPA. It reads a
// DEDICATED key written only by a successful callback: session.userId cannot be
// used here because authWithHeaders re-sets it on every authenticated API call,
// which would turn this route into a permanent cookie -> apiToken converter.
// The key is consumed on read and the response is explicitly uncacheable.
export async function sessionCredentials (req, res) {
  assertEnabled();
  const userId = req.session && req.session.oidcHandoffUserId;
  delete req.session.oidcHandoffUserId;
  if (res && typeof res.set === 'function') {
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Pragma', 'no-cache');
  }
  if (!userId) throw new NotAuthorized('No SSO sign-in to complete; start again from the login page.');
  const user = await User.findOne({ _id: String(userId) }).exec();
  if (!user || user.auth.blocked) throw new NotAuthorized('This SSO sign-in is no longer valid.');
  return { id: user._id, apiToken: user.apiToken };
}

export async function unlink (user) {
  await User.updateOne({ _id: user._id }, { $unset: { 'auth.oidc': 1 } }).exec();
  logger.info(`OIDC identity unlinked from user ${user._id}`);
}
