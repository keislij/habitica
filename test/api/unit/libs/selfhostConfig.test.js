import nconf from 'nconf';
import validateSelfhostConfig from '../../../../website/server/libs/selfhostConfig';

const VALID_CONFIG = {
  BASE_URL: 'https://chores.example.test',
  EMAIL_DELIVERY: 'disabled',
  NODE_DB_URI: 'mongodb://mongo/habitica?replicaSet=rs0',
  SELF_HOST_REGISTRATION_ENABLED: 'false',
  SESSION_SECRET: 'a'.repeat(32),
  SESSION_SECRET_KEY: 'a'.repeat(64),
};

describe('self-host production configuration', () => {
  afterEach(() => {
    sandbox.restore();
  });

  function stubConfig (overrides = {}) {
    const config = {
      IS_PROD: true,
      ...VALID_CONFIG,
      ...overrides,
    };
    sandbox.stub(nconf, 'get').callsFake(key => config[key]);
  }

  it('accepts a valid fail-closed production configuration', () => {
    stubConfig();

    expect(() => validateSelfhostConfig()).not.to.throw();
  });

  it('requires runtime secrets instead of accepting image placeholders', () => {
    stubConfig({
      SESSION_SECRET: '',
      SESSION_SECRET_KEY: '',
    });

    expect(() => validateSelfhostConfig()).to.throw(
      'SESSION_SECRET is required; SESSION_SECRET_KEY is required',
    );
  });

  it('requires an explicit registration policy', () => {
    stubConfig({ SELF_HOST_REGISTRATION_ENABLED: undefined });

    expect(() => validateSelfhostConfig()).to.throw(
      'SELF_HOST_REGISTRATION_ENABLED must be explicitly true or false',
    );
  });

  it('requires SMTP connection settings when SMTP is selected', () => {
    stubConfig({
      ADMIN_EMAIL: '',
      EMAIL_DELIVERY: 'smtp',
      EMAIL_SERVER_FROM: '',
      EMAIL_SERVER_HOST: '',
    });

    expect(() => validateSelfhostConfig()).to.throw(
      'EMAIL_SERVER_HOST is required for SMTP',
    );
  });
});
