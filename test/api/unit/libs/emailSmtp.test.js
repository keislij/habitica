import nconf from 'nconf';
import {
  createMessages,
  createTransportOptions,
} from '../../../../website/server/libs/emailSmtp';

describe('emailSmtp', () => {
  beforeEach(() => {
    sandbox.stub(nconf, 'get').callsFake(key => ({
      ADMIN_EMAIL: 'Habitica <habitica@example.test>',
      BASE_URL: 'https://chores.example.test',
    })[key]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('renders a separate variable map for each recipient', () => {
    const messages = createMessages({
      emailType: 'new-pm',
      to: [
        { email: 'one@example.test', name: 'One' },
        { email: 'two@example.test', name: 'Two' },
      ],
      variables: [
        { name: 'BASE_URL', content: 'https://chores.example.test' },
      ],
      personalVariables: [
        {
          rcpt: 'one@example.test',
          vars: [{ name: 'SENDER', content: 'Alice' }],
        },
        {
          rcpt: 'two@example.test',
          vars: [{ name: 'SENDER', content: 'Bob' }],
        },
      ],
    });

    expect(messages).to.have.length(2);
    expect(messages[0].text).to.include('Alice');
    expect(messages[0].text).not.to.include('Bob');
    expect(messages[1].text).to.include('Bob');
    expect(messages[1].text).not.to.include('Alice');
  });

  it('escapes user-controlled values in HTML mail', () => {
    const [message] = createMessages({
      emailType: 'new-pm',
      to: [{ email: 'one@example.test', name: 'One' }],
      variables: [],
      personalVariables: [{
        rcpt: 'one@example.test',
        vars: [{ name: 'SENDER', content: '<script>alert(1)</script>' }],
      }],
    });

    expect(message.html).to.include('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).not.to.include('<script>');
  });

  it('renders the password reset link', () => {
    const [message] = createMessages({
      emailType: 'reset-password',
      to: [{ email: 'one@example.test', name: 'One' }],
      variables: [{
        name: 'PASSWORD_RESET_LINK',
        content: 'https://chores.example.test/reset?token=secret',
      }],
      personalVariables: [{
        rcpt: 'one@example.test',
        vars: [],
      }],
    });

    expect(message.text).to.include('https://chores.example.test/reset?token=secret');
  });

  it('pins SMTP TLS to the configured CA and server name', () => {
    nconf.get.restore();
    sandbox.stub(nconf, 'get').callsFake(key => ({
      EMAIL_SERVER_CA_FILE: '/run/config/proton-bridge-ca.pem',
      EMAIL_SERVER_HOST: '10.10.3.95',
      EMAIL_SERVER_PORT: '1025',
      EMAIL_SERVER_REJECT_UNAUTHORIZED: 'true',
      EMAIL_SERVER_REQUIRE_TLS: 'true',
      EMAIL_SERVER_SECURE: 'false',
      EMAIL_SERVER_TLS_SERVERNAME: '127.0.0.1',
    })[key]);
    const readCaFile = sandbox.stub().returns(Buffer.from('test-ca'));

    const options = createTransportOptions(readCaFile);

    expect(readCaFile).to.be.calledOnceWithExactly('/run/config/proton-bridge-ca.pem');
    expect(options).to.include({
      host: '10.10.3.95',
      port: 1025,
      requireTLS: true,
      secure: false,
    });
    expect(options.tls.rejectUnauthorized).to.eql(true);
    expect(options.tls.servername).to.eql('127.0.0.1');
    expect(options.tls.ca.toString()).to.eql('test-ca');
  });
});
