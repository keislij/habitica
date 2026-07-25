import nconf from 'nconf';
import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import logger from './logger';

const SUBJECTS = {
  'admin-feedback': 'Habitica account feedback',
  'invite-boss-quest': 'You were invited to a boss quest',
  'invite-collection-quest': 'You were invited to a collection quest',
  'invite-friend': 'You were invited to Habitica',
  'invite-friend-guild': 'You were invited to a Habitica guild',
  'invited-guild': 'You were invited to a Habitica guild',
  'invited-party': 'You were invited to a Habitica party',
  'kicked-from-guild': 'You were removed from a guild',
  'kicked-from-party': 'You were removed from a party',
  'new-pm': 'You received a private message',
  'quest-started': 'Your Habitica quest started',
  'reset-password': 'Reset your Habitica password',
  welcome: 'Welcome to Habitica',
  'welcome-v2b': 'Welcome to Habitica',
};

function configIsTrue (key, fallback = false) {
  const value = nconf.get(key);
  if (typeof value === 'undefined' || value === null || value === '') return fallback;
  return value === true || value === 'true';
}

function htmlEscape (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function variablesToObject (variables = []) {
  return variables.reduce((result, variable) => {
    result[variable.name] = variable.content; // eslint-disable-line no-param-reassign
    return result;
  }, {});
}

function renderBody (emailType, variables) {
  const baseUrl = variables.BASE_URL || nconf.get('BASE_URL');
  const resetLink = variables.PASSWORD_RESET_LINK;

  if (emailType === 'reset-password') {
    return {
      text: `A password reset was requested for your Habitica account.\n\nReset it here (valid for 24 hours): ${resetLink}`,
      html: `<p>A password reset was requested for your Habitica account.</p><p><a href="${htmlEscape(resetLink)}">Reset your password</a> (valid for 24 hours).</p>`,
    };
  }

  if (emailType === 'welcome' || emailType === 'welcome-v2b') {
    return {
      text: `Welcome to Habitica.\n\nOpen your account: ${baseUrl}`,
      html: `<p>Welcome to Habitica.</p><p><a href="${htmlEscape(baseUrl)}">Open your account</a>.</p>`,
    };
  }

  const excludedVariables = new Set([
    'BASE_URL',
    'RECIPIENT_NAME',
    'RECIPIENT_UNSUB_URL',
  ]);
  const details = Object.entries(variables)
    .filter(([name, value]) => !excludedVariables.has(name) && value !== null && typeof value !== 'undefined')
    .map(([name, value]) => `${name.replace(/_/g, ' ')}: ${value}`);
  const textDetails = details.length > 0 ? `\n\n${details.join('\n')}` : '';
  const htmlDetails = details.length > 0
    ? `<dl>${details.map(detail => {
      const separator = detail.indexOf(':');
      return `<dt>${htmlEscape(detail.slice(0, separator))}</dt><dd>${htmlEscape(detail.slice(separator + 2))}</dd>`;
    }).join('')}</dl>`
    : '';

  return {
    text: `${SUBJECTS[emailType] || 'Habitica notification'}${textDetails}\n\nOpen Habitica: ${baseUrl}`,
    html: `<p>${htmlEscape(SUBJECTS[emailType] || 'Habitica notification')}</p>${htmlDetails}<p><a href="${htmlEscape(baseUrl)}">Open Habitica</a>.</p>`,
  };
}

export function createMessages (data) {
  const sharedVariables = variablesToObject(data.variables);
  const recipients = new Map((data.to || []).map(recipient => [recipient.email, recipient]));

  return (data.personalVariables || []).map(personal => {
    const recipient = recipients.get(personal.rcpt) || {};
    const variables = {
      ...sharedVariables,
      ...variablesToObject(personal.vars),
    };
    const body = renderBody(data.emailType, variables);
    const recipientName = variables.RECIPIENT_NAME || recipient.name;

    return {
      from: nconf.get('EMAIL_SERVER_FROM') || nconf.get('ADMIN_EMAIL'),
      to: recipientName ? {
        address: personal.rcpt,
        name: String(recipientName),
      } : personal.rcpt,
      subject: SUBJECTS[data.emailType] || `Habitica: ${data.emailType}`,
      ...body,
    };
  });
}

export function createTransportOptions (readCaFile = readFileSync) {
  const host = nconf.get('EMAIL_SERVER_HOST') || nconf.get('EMAIL_SERVER_URL');
  if (!host) throw new Error('EMAIL_SERVER_HOST is required when EMAIL_DELIVERY=smtp');

  const port = Number(nconf.get('EMAIL_SERVER_PORT') || 587);
  const user = nconf.get('EMAIL_SERVER_AUTH_USER');
  const password = nconf.get('EMAIL_SERVER_AUTH_PASSWORD');
  const caFile = nconf.get('EMAIL_SERVER_CA_FILE');
  const servername = nconf.get('EMAIL_SERVER_TLS_SERVERNAME');

  return {
    host,
    port,
    secure: configIsTrue('EMAIL_SERVER_SECURE', port === 465),
    requireTLS: configIsTrue('EMAIL_SERVER_REQUIRE_TLS', port !== 465),
    auth: user ? {
      user,
      pass: password,
    } : undefined,
    tls: {
      rejectUnauthorized: configIsTrue('EMAIL_SERVER_REJECT_UNAUTHORIZED', true),
      ...(caFile ? { ca: readCaFile(caFile) } : {}),
      ...(servername ? { servername } : {}),
    },
  };
}

function createTransport () {
  return nodemailer.createTransport(createTransportOptions());
}

export async function sendEmail (data) {
  const messages = createMessages(data);
  if (messages.length === 0) return [];

  const transporter = createTransport();
  try {
    return await Promise.all(messages.map(message => transporter.sendMail(message)));
  } catch (err) {
    logger.error(err);
    throw err;
  } finally {
    transporter.close();
  }
}

export default {
  createMessages,
  sendEmail,
};
