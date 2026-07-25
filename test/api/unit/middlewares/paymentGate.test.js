import nconf from 'nconf';
import paymentGate, {
  isPaymentPath,
} from '../../../../website/server/middlewares/paymentGate';

describe('paymentGate', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('recognizes external payment and IAP endpoints', () => {
    expect(isPaymentPath('/stripe/checkout-session')).to.eql(true);
    expect(isPaymentPath('/paypal/ipn')).to.eql(true);
    expect(isPaymentPath('/api/v4/iap/android/verify')).to.eql(true);
    expect(isPaymentPath('/api/v3/groups/create-plan')).to.eql(true);
    expect(isPaymentPath('/api/v4/groups/create-plan')).to.eql(true);
    expect(isPaymentPath('/api/v3/groups')).to.eql(false);
    expect(isPaymentPath('/api/v4/user/purchase/gear/sword')).to.eql(false);
  });

  it('returns 404 when payments are disabled', () => {
    sandbox.stub(nconf, 'get').withArgs('PAYMENTS_ENABLED').returns('false');
    const req = { path: '/stripe/checkout-session' };
    const res = {
      send: sandbox.stub(),
      status: sandbox.stub(),
    };
    res.status.returns(res);
    const next = sandbox.stub();

    paymentGate(req, res, next);

    expect(res.status).to.be.calledOnceWithExactly(404);
    expect(res.send).to.be.calledOnce;
    expect(next).not.to.be.called;
  });

  it('blocks group-plan payment initiation when payments are disabled', () => {
    sandbox.stub(nconf, 'get').withArgs('PAYMENTS_ENABLED').returns('false');
    const req = { path: '/api/v3/groups/create-plan' };
    const res = {
      send: sandbox.stub(),
      status: sandbox.stub(),
    };
    res.status.returns(res);
    const next = sandbox.stub();

    paymentGate(req, res, next);

    expect(res.status).to.be.calledOnceWithExactly(404);
    expect(next).not.to.be.called;
  });

  it('allows non-payment endpoints through', () => {
    sandbox.stub(nconf, 'get').withArgs('PAYMENTS_ENABLED').returns('false');
    const next = sandbox.stub();

    paymentGate({ path: '/api/v4/tasks/user' }, {}, next);

    expect(next).to.be.calledOnce;
  });
});
