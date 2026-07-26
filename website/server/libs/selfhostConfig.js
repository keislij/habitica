import nconf from 'nconf';

function hasValue (key) {
  const value = nconf.get(key);
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function validateSelfhostConfig () {
  if (!nconf.get('IS_PROD')) return;

  const errors = [];
  [
    'BASE_URL',
    'NODE_DB_URI',
    'SESSION_SECRET',
    'SESSION_SECRET_KEY',
  ].forEach(key => {
    if (!hasValue(key)) errors.push(`${key} is required`);
  });

  const baseUrl = nconf.get('BASE_URL');
  if (baseUrl && !String(baseUrl).startsWith('https://')) {
    errors.push('BASE_URL must use https');
  }

  const sessionSecret = nconf.get('SESSION_SECRET');
  if (sessionSecret && String(sessionSecret).length < 32) {
    errors.push('SESSION_SECRET must contain at least 32 characters');
  }

  const sessionSecretKey = nconf.get('SESSION_SECRET_KEY');
  if (sessionSecretKey && !/^[a-fA-F0-9]{64}$/.test(String(sessionSecretKey))) {
    errors.push('SESSION_SECRET_KEY must be exactly 64 hexadecimal characters');
  }

  const registrationEnabled = nconf.get('SELF_HOST_REGISTRATION_ENABLED');
  if (registrationEnabled !== true
    && registrationEnabled !== false
    && registrationEnabled !== 'true'
    && registrationEnabled !== 'false') {
    errors.push('SELF_HOST_REGISTRATION_ENABLED must be explicitly true or false');
  }

  const oidcEnabled = nconf.get('OIDC_ENABLED');
  if (oidcEnabled !== undefined && oidcEnabled !== null && oidcEnabled !== ''
    && !['true', 'false', true, false].includes(oidcEnabled)) {
    errors.push('OIDC_ENABLED must be true or false when set');
  }
  if (oidcEnabled === true || oidcEnabled === 'true') {
    const issuer = nconf.get('OIDC_ISSUER');
    if (!issuer || !String(issuer).startsWith('https://')) {
      errors.push('OIDC_ISSUER must be an https URL when OIDC is enabled');
    }
    if (!hasValue('OIDC_CLIENT_ID')) errors.push('OIDC_CLIENT_ID is required when OIDC is enabled');
    if (!hasValue('OIDC_CLIENT_SECRET')) errors.push('OIDC_CLIENT_SECRET is required when OIDC is enabled');
  }

  const emailDelivery = nconf.get('EMAIL_DELIVERY');
  if (!['disabled', 'smtp', 'worker'].includes(emailDelivery)) {
    errors.push('EMAIL_DELIVERY must be disabled, smtp, or worker');
  } else if (emailDelivery === 'smtp') {
    if (!hasValue('EMAIL_SERVER_HOST')) errors.push('EMAIL_SERVER_HOST is required for SMTP');
    if (!hasValue('EMAIL_SERVER_FROM') && !hasValue('ADMIN_EMAIL')) {
      errors.push('EMAIL_SERVER_FROM or ADMIN_EMAIL is required for SMTP');
    }
  } else if (emailDelivery === 'worker' && !hasValue('WORKER_REDIS_URL')) {
    errors.push('WORKER_REDIS_URL is required for worker email delivery');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid self-host production configuration: ${errors.join('; ')}`);
  }
}

export default validateSelfhostConfig;
