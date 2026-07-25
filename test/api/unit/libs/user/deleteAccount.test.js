import {
  model as Group,
} from '../../../../../website/server/models/group';
import * as Tasks from '../../../../../website/server/models/task';
import {
  chatModel as Chat,
  inboxModel as Inbox,
} from '../../../../../website/server/models/message';
import { model as UserHistory } from '../../../../../website/server/models/userHistory';
import { model as IapPurchaseReceipt } from '../../../../../website/server/models/iapPurchaseReceipt';
import { TransactionModel as Transaction } from '../../../../../website/server/models/transaction';
import { model as EmailUnsubscription } from '../../../../../website/server/models/emailUnsubscription';
import deleteAccount from '../../../../../website/server/libs/user/deleteAccount';

describe('deleteAccount', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('awaits group departure, task deletion, and user deletion', async () => {
    const user = {
      _id: 'user-id',
      auth: {
        google: {
          emails: [{ value: 'Social@Example.Test' }],
        },
        local: {
          email: 'Local@Example.Test',
        },
      },
      deleteOne: sandbox.stub().resolves(),
    };
    const groups = [
      { leave: sandbox.stub().resolves() },
      { leave: sandbox.stub().resolves() },
    ];
    sandbox.stub(Group, 'getGroups').resolves(groups);
    const deletionModels = [
      Tasks.Task,
      Chat,
      Inbox,
      UserHistory,
      IapPurchaseReceipt,
      Transaction,
      EmailUnsubscription,
    ];
    deletionModels.forEach(model => {
      sandbox.stub(model, 'deleteMany').returns({
        exec: sandbox.stub().resolves(),
      });
    });

    await deleteAccount(user);

    expect(Group.getGroups).to.be.calledOnce;
    expect(groups[0].leave).to.be.calledOnceWithExactly(user, 'remove-all');
    expect(groups[1].leave).to.be.calledOnceWithExactly(user, 'remove-all');
    expect(Tasks.Task.deleteMany).to.be.calledOnceWithExactly({ userId: 'user-id' });
    expect(Chat.deleteMany).to.be.calledOnceWithExactly({ uuid: 'user-id' });
    expect(Inbox.deleteMany).to.be.calledOnceWithExactly({
      $or: [
        { ownerId: 'user-id' },
        { uuid: 'user-id' },
      ],
    });
    expect(UserHistory.deleteMany).to.be.calledOnceWithExactly({ userId: 'user-id' });
    expect(IapPurchaseReceipt.deleteMany).to.be.calledOnceWithExactly({ userId: 'user-id' });
    expect(Transaction.deleteMany).to.be.calledOnceWithExactly({ userId: 'user-id' });
    expect(EmailUnsubscription.deleteMany).to.be.calledOnceWithExactly({
      email: {
        $in: [
          'local@example.test',
          'social@example.test',
        ],
      },
    });
    expect(user.deleteOne).to.be.calledOnce;
  });
});
