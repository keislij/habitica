import { model as User } from '../../../../website/server/models/user';
import { model as Group } from '../../../../website/server/models/group';

// The unlock flag is read at call time from process.env, so these tests can
// flip it per-case. Default-off is what keeps the upstream suite green.
function unlock (on) {
  if (on) {
    process.env.SELF_HOST_UNLOCK_ALL = 'true';
  } else {
    delete process.env.SELF_HOST_UNLOCK_ALL;
  }
}

describe('self-host group/subscription unlock', () => {
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

  describe('user subscriber perks', () => {
    it('is not subscribed without a plan when locked', () => {
      unlock(false);
      expect(new User().isSubscribed()).to.not.be.ok;
    });

    it('is subscribed without a plan when unlocked', () => {
      unlock(true);
      expect(new User().isSubscribed()).to.eql(true);
    });

    it('never fabricates a plan.customerId (nothing may treat it as a paying customer)', () => {
      unlock(true);
      const user = new User();
      expect(user.isSubscribed()).to.eql(true);
      expect(user.purchased.plan.customerId).to.be.undefined;
    });

    it('still allows gem drops (canGetGems is not short-circuited by the unlock)', async () => {
      unlock(true);
      const user = new User();
      await expect(user.canGetGems()).to.eventually.eql(true);
    });
  });

  describe('group serialization', () => {
    it('reports purchased.active false for a plan-less group when locked', () => {
      unlock(false);
      const group = new Group({ name: 'Family', type: 'party' });
      // hasActiveGroupPlan() is falsy-undefined for a plan-less group
      expect(group.toJSON().purchased.active).to.not.be.ok;
    });

    it('reports purchased.active true for a plan-less group when unlocked', () => {
      unlock(true);
      const group = new Group({ name: 'Family', type: 'party' });
      expect(group.toJSON().purchased.active).to.eql(true);
    });

    it('does not expose purchased.plan either way (stays private)', () => {
      unlock(true);
      const group = new Group({ name: 'Family', type: 'party' });
      expect(group.toJSON().purchased.plan).to.be.undefined;
    });

    it('leaves the destructive group-plan predicates alone', () => {
      // hasActiveGroupPlan/hasNotCancelled drive group deletion, leader
      // changes, and payment calls on join/leave. The unlock must NOT flip
      // them, or joining a group would invoke payment code paths.
      unlock(true);
      const group = new Group({ name: 'Family', type: 'party' });
      expect(group.hasActiveGroupPlan()).to.not.be.ok;
      expect(group.hasNotCancelled()).to.not.be.ok;
    });
  });
});
