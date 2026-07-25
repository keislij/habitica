import selfhostUnlockAll from '../../../../website/common/script/libs/selfhostUnlock';

describe('self-host unlock flag', () => {
  let original;

  beforeEach(() => {
    original = process.env.SELF_HOST_UNLOCK_ALL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SELF_HOST_UNLOCK_ALL;
    } else {
      process.env.SELF_HOST_UNLOCK_ALL = original;
    }
  });

  it('is off when unset', () => {
    delete process.env.SELF_HOST_UNLOCK_ALL;
    expect(selfhostUnlockAll()).to.eql(false);
  });

  it('is off for anything other than the exact string true', () => {
    for (const value of ['false', 'TRUE', '1', 'yes', '']) {
      process.env.SELF_HOST_UNLOCK_ALL = value;
      expect(selfhostUnlockAll(), `value: ${value}`).to.eql(false);
    }
  });

  it('is on only for the exact string true', () => {
    process.env.SELF_HOST_UNLOCK_ALL = 'true';
    expect(selfhostUnlockAll()).to.eql(true);
  });
});
