import nconf from 'nconf';
import { Forbidden } from '../errors';

const REGISTRATION_DISABLED_MESSAGE = 'Registration is disabled on this server.';

function isRegistrationEnabled () {
  const configuredValue = nconf.get('SELF_HOST_REGISTRATION_ENABLED');

  if (configuredValue !== undefined && configuredValue !== null) {
    return configuredValue === true || configuredValue === 'true';
  }

  return !nconf.get('IS_PROD');
}

function assertRegistrationEnabled (existingUser) {
  if (!existingUser && !isRegistrationEnabled()) {
    throw new Forbidden(REGISTRATION_DISABLED_MESSAGE);
  }
}

export {
  assertRegistrationEnabled,
  isRegistrationEnabled,
  REGISTRATION_DISABLED_MESSAGE,
};
