import nconf from 'nconf';
import { Forbidden } from '../../../../../website/server/libs/errors';
import {
  assertRegistrationEnabled,
  isRegistrationEnabled,
  REGISTRATION_DISABLED_MESSAGE,
} from '../../../../../website/server/libs/auth/registration';

describe('self-host registration gate', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('fails closed in production when not explicitly configured', () => {
    sandbox.stub(nconf, 'get')
      .withArgs('SELF_HOST_REGISTRATION_ENABLED')
      .returns(undefined)
      .withArgs('IS_PROD')
      .returns(true);

    expect(isRegistrationEnabled()).to.eql(false);
  });

  it('keeps development and test registration enabled by default', () => {
    sandbox.stub(nconf, 'get')
      .withArgs('SELF_HOST_REGISTRATION_ENABLED')
      .returns(undefined)
      .withArgs('IS_PROD')
      .returns(false);

    expect(isRegistrationEnabled()).to.eql(true);
  });

  it('requires the explicit true value when configured', () => {
    sandbox.stub(nconf, 'get')
      .withArgs('SELF_HOST_REGISTRATION_ENABLED').returns('false');

    expect(isRegistrationEnabled()).to.eql(false);
  });

  it('rejects anonymous registration with a clear forbidden error', () => {
    sandbox.stub(nconf, 'get')
      .withArgs('SELF_HOST_REGISTRATION_ENABLED').returns('false');

    expect(() => assertRegistrationEnabled()).to.throw(Forbidden, REGISTRATION_DISABLED_MESSAGE);
  });

  it('allows an authenticated user to add local credentials', () => {
    sandbox.stub(nconf, 'get')
      .withArgs('SELF_HOST_REGISTRATION_ENABLED').returns('false');

    expect(() => assertRegistrationEnabled({ _id: 'existing-user' })).not.to.throw();
  });
});
