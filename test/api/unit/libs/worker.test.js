import nconf from 'nconf';
import * as smtp from '../../../../website/server/libs/emailSmtp';
import worker from '../../../../website/server/libs/worker';

describe('worker', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('routes email jobs to SMTP when configured', async () => {
    sandbox.stub(nconf, 'get').withArgs('EMAIL_DELIVERY').returns('smtp');
    const sendEmail = sandbox.stub(smtp, 'sendEmail').resolves([]);
    const data = {
      emailType: 'welcome',
      to: [],
      variables: [],
      personalVariables: [],
    };

    await worker.sendJob('email', {
      identifier: 'welcome',
      data,
    });

    expect(sendEmail).to.be.calledOnceWithExactly(data);
  });

  it('explicitly disables email without touching SMTP', async () => {
    sandbox.stub(nconf, 'get').withArgs('EMAIL_DELIVERY').returns('disabled');
    const sendEmail = sandbox.stub(smtp, 'sendEmail');

    const result = await worker.sendJob('email', {
      identifier: 'welcome',
      data: {},
    });

    expect(result).to.eql({ disabled: true });
    expect(sendEmail).not.to.be.called;
  });

  it('does not misroute delete jobs to SMTP', async () => {
    sandbox.stub(nconf, 'get').withArgs('EMAIL_DELIVERY').returns('smtp');
    const sendEmail = sandbox.stub(smtp, 'sendEmail');

    await expect(worker.sendJob('deleteUser', {
      identifier: 'user-id',
      data: { userId: 'user-id' },
    })).to.be.rejectedWith('Queue deleteUser does not exist');
    expect(sendEmail).not.to.be.called;
  });
});
