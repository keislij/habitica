import EventEmitter from 'events';
import mongoose from 'mongoose';
import { model as Blocker } from '../../../../website/server/models/blocker';

function waitForWatcherSetup () {
  return new Promise(resolve => {
    process.nextTick(resolve);
  });
}

describe('Blocker Model', () => {
  let changeStream;
  let originalReadyStateDescriptor;

  beforeEach(() => {
    changeStream = new EventEmitter();
    originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    sandbox.stub(Blocker, 'watch').returns(changeStream);
  });

  afterEach(() => {
    sandbox.restore();
    delete mongoose.connection.readyState;
    if (originalReadyStateDescriptor) {
      Object.defineProperty(mongoose.connection, 'readyState', originalReadyStateDescriptor);
    }
  });

  [mongoose.STATES.disconnecting, mongoose.STATES.disconnected].forEach(connectionState => {
    it(`suppresses MongoClientClosedError while MongoDB is ${mongoose.STATES[connectionState]}`, async () => {
      const errorListener = sandbox.spy();
      const watcher = Blocker.watchBlockers(undefined, {});
      watcher.on('error', errorListener);
      await waitForWatcherSetup();
      Object.defineProperty(mongoose.connection, 'readyState', {
        configurable: true,
        value: connectionState,
      });

      changeStream.emit('error', new mongoose.mongo.MongoClientClosedError());

      expect(errorListener).not.to.have.been.called;
    });
  });

  it('propagates MongoClientClosedError while MongoDB is connected', async () => {
    const watcherError = new mongoose.mongo.MongoClientClosedError();
    const errorListener = sandbox.spy();
    const watcher = Blocker.watchBlockers(undefined, {});
    watcher.on('error', errorListener);
    await waitForWatcherSetup();
    Object.defineProperty(mongoose.connection, 'readyState', {
      configurable: true,
      value: mongoose.STATES.connected,
    });

    changeStream.emit('error', watcherError);

    expect(errorListener).to.have.been.calledOnce;
    expect(errorListener).to.have.been.calledWithExactly(watcherError);
  });

  it('propagates real change stream errors while MongoDB is disconnecting', async () => {
    const watcherError = new Error('change stream failed');
    const errorListener = sandbox.spy();
    const watcher = Blocker.watchBlockers(undefined, {});
    watcher.on('error', errorListener);
    await waitForWatcherSetup();
    Object.defineProperty(mongoose.connection, 'readyState', {
      configurable: true,
      value: mongoose.STATES.disconnecting,
    });

    changeStream.emit('error', watcherError);

    expect(errorListener).to.have.been.calledOnce;
    expect(errorListener).to.have.been.calledWithExactly(watcherError);
  });
});
