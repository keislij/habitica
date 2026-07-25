import nconf from 'nconf';
import {
  oidcEnabled,
  safeEqual,
  getDiscovery,
  resetDiscoveryCache,
} from '../../../../website/server/libs/auth/oidc';
import validateSelfhostConfig from '../../../../website/server/libs/selfhostConfig';

const VALID_CONFIG = {
  BASE_URL: 'https://chores.example.test',
  EMAIL_DELIVERY: 'disabled',
  NODE_DB_URI: 'mongodb://mongo/habitica?replicaSet=rs0',
  SELF_HOST_REGISTRATION_ENABLED: 'false',
  SESSION_SECRET: 'a'.repeat(32),
  SESSION_SECRET_KEY: 'a'.repeat(64),
  IS_PROD: true,
};

function stubConfig (overrides = {}) {
  const values = { ...VALID_CONFIG, ...overrides };
  sandbox.stub(nconf, 'get').callsFake(key => values[key]);
}

describe('self-host OIDC', () => {
  afterEach(() => {
    sandbox.restore();
    resetDiscoveryCache();
  });

  describe('oidcEnabled', () => {
    it('is false by default', () => {
      stubConfig();
      expect(oidcEnabled()).to.eql(false);
    });

    it('requires issuer, client id, and client secret', () => {
      stubConfig({ OIDC_ENABLED: 'true', OIDC_ISSUER: 'https://auth.example.test' });
      expect(oidcEnabled()).to.eql(false);
    });

    it('is true with the full configuration', () => {
      stubConfig({
        OIDC_ENABLED: 'true',
        OIDC_ISSUER: 'https://auth.example.test/application/o/habitica/',
        OIDC_CLIENT_ID: 'habitica',
        OIDC_CLIENT_SECRET: 'secret',
      });
      expect(oidcEnabled()).to.eql(true);
    });
  });

  describe('safeEqual', () => {
    it('is true for identical values', () => {
      expect(safeEqual('abc123', 'abc123')).to.eql(true);
    });

    it('is false for different values of equal length', () => {
      expect(safeEqual('abc123', 'abc124')).to.eql(false);
    });

    it('returns false instead of throwing on a length mismatch', () => {
      // crypto.timingSafeEqual throws RangeError on unequal lengths, which
      // would surface as a 500 on the callback route.
      expect(() => safeEqual('short', 'much-longer-value')).to.not.throw();
      expect(safeEqual('short', 'much-longer-value')).to.eql(false);
    });
  });

  describe('getDiscovery', () => {
    it('rejects discovery documents without https endpoints', async () => {
      stubConfig({ OIDC_ISSUER: 'https://auth.example.test/application/o/habitica/' });
      const fetcher = sandbox.stub().resolves({
        ok: true,
        json: async () => ({
          issuer: 'https://auth.example.test/application/o/habitica/',
          authorization_endpoint: 'http://insecure.example.test/authorize',
          token_endpoint: 'https://auth.example.test/token',
          userinfo_endpoint: 'https://auth.example.test/userinfo',
        }),
      });
      await expect(getDiscovery(fetcher)).to.eventually.be.rejected;
    });

    it('rejects a document whose issuer does not match OIDC_ISSUER', async () => {
      stubConfig({ OIDC_ISSUER: 'https://auth.example.test/application/o/habitica/' });
      const fetcher = sandbox.stub().resolves({
        ok: true,
        json: async () => ({
          issuer: 'https://evil.example.test/',
          authorization_endpoint: 'https://auth.example.test/authorize',
          token_endpoint: 'https://auth.example.test/token',
          userinfo_endpoint: 'https://auth.example.test/userinfo',
        }),
      });
      await expect(getDiscovery(fetcher)).to.eventually.be.rejected;
    });

    it('rejects endpoints that are not on the issuer origin', async () => {
      stubConfig({ OIDC_ISSUER: 'https://auth.example.test/application/o/habitica/' });
      const fetcher = sandbox.stub().resolves({
        ok: true,
        json: async () => ({
          issuer: 'https://auth.example.test/application/o/habitica/',
          authorization_endpoint: 'https://auth.example.test/authorize',
          token_endpoint: 'https://evil.example.test/token',
          userinfo_endpoint: 'https://auth.example.test/userinfo',
        }),
      });
      await expect(getDiscovery(fetcher)).to.eventually.be.rejected;
    });

    it('caches a valid discovery document', async () => {
      stubConfig({ OIDC_ISSUER: 'https://auth.example.test/application/o/habitica/' });
      const doc = {
        issuer: 'https://auth.example.test/application/o/habitica/',
        authorization_endpoint: 'https://auth.example.test/authorize',
        token_endpoint: 'https://auth.example.test/token',
        userinfo_endpoint: 'https://auth.example.test/userinfo',
      };
      const fetcher = sandbox.stub().resolves({ ok: true, json: async () => doc });
      const first = await getDiscovery(fetcher);
      const second = await getDiscovery(fetcher);
      expect(first).to.eql(doc);
      expect(second).to.eql(doc);
      expect(fetcher).to.be.calledOnce;
    });
  });

  describe('selfhostConfig OIDC validation', () => {
    it('accepts OIDC disabled', () => {
      stubConfig({ OIDC_ENABLED: 'false' });
      expect(() => validateSelfhostConfig()).to.not.throw();
    });

    it('rejects OIDC enabled without issuer and credentials', () => {
      stubConfig({ OIDC_ENABLED: 'true' });
      expect(() => validateSelfhostConfig()).to.throw(/OIDC_ISSUER|OIDC_CLIENT_ID|OIDC_CLIENT_SECRET/);
    });

    it('rejects a non-https issuer', () => {
      stubConfig({
        OIDC_ENABLED: 'true',
        OIDC_ISSUER: 'http://auth.example.test/',
        OIDC_CLIENT_ID: 'habitica',
        OIDC_CLIENT_SECRET: 'secret',
      });
      expect(() => validateSelfhostConfig()).to.throw(/OIDC_ISSUER must be an https URL/);
    });

    it('accepts a complete OIDC configuration', () => {
      stubConfig({
        OIDC_ENABLED: 'true',
        OIDC_ISSUER: 'https://auth.example.test/application/o/habitica/',
        OIDC_CLIENT_ID: 'habitica',
        OIDC_CLIENT_SECRET: 'secret',
      });
      expect(() => validateSelfhostConfig()).to.not.throw();
    });
  });
});
