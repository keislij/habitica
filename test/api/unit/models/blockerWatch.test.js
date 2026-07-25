import EventEmitter from 'events';
import nconf from 'nconf';
import { model as Blocker } from '../../../../website/server/models/blocker';

describe('Blocker.watchBlockers change-stream gate', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('returns an inert emitter without opening a change stream when disabled', done => {
    sandbox.stub(nconf, 'get').withArgs('ONE_SHOT_PROCESS').returns('true');
    const watchSpy = sandbox.spy(Blocker, 'watch');
    const findSpy = sandbox.spy(Blocker, 'find');

    const emitter = Blocker.watchBlockers({ type: 'email', area: 'full' }, { initial: true });

    expect(emitter).to.be.an.instanceOf(EventEmitter);
    // watchBlockers defers its work to process.nextTick; assert after it ran
    process.nextTick(() => {
      expect(watchSpy).not.to.be.called;
      expect(findSpy).not.to.be.called;
      done();
    });
  });

  it('honors the boolean form of the flag', done => {
    sandbox.stub(nconf, 'get').withArgs('ONE_SHOT_PROCESS').returns(true);
    const watchSpy = sandbox.spy(Blocker, 'watch');

    Blocker.watchBlockers({ type: 'email', area: 'full' }, { initial: false });

    process.nextTick(() => {
      expect(watchSpy).not.to.be.called;
      done();
    });
  });

  it('still opens the change stream when the flag is unset', done => {
    sandbox.stub(nconf, 'get').withArgs('ONE_SHOT_PROCESS').returns(undefined);
    const fakeStream = new EventEmitter();
    const watchStub = sandbox.stub(Blocker, 'watch').returns(fakeStream);

    Blocker.watchBlockers({ type: 'email', area: 'full' }, { initial: false });

    process.nextTick(() => {
      expect(watchStub).to.be.calledOnce;
      done();
    });
  });
});
