import {
  basicFields as basicGroupFields,
  model as Group,
} from '../../models/group';
import * as Tasks from '../../models/task';
import {
  chatModel as Chat,
  inboxModel as Inbox,
} from '../../models/message';
import { model as UserHistory } from '../../models/userHistory';
import { model as IapPurchaseReceipt } from '../../models/iapPurchaseReceipt';
import { TransactionModel as Transaction } from '../../models/transaction';
import { model as EmailUnsubscription } from '../../models/emailUnsubscription';

function getEmailAddresses (user) {
  const addresses = [];
  const { auth = {} } = user;

  if (auth.local && auth.local.email) addresses.push(auth.local.email);
  ['apple', 'facebook', 'google'].forEach(network => {
    const emails = auth[network] && auth[network].emails;
    if (!Array.isArray(emails)) return;
    emails.forEach(email => {
      if (email && email.value) addresses.push(email.value);
    });
  });

  return [...new Set(addresses.map(email => email.toLowerCase()))];
}

export default async function deleteAccount (user) {
  const userId = user._id;
  const emailAddresses = getEmailAddresses(user);
  const types = ['party', 'guilds'];
  const groupFields = basicGroupFields.concat(' leader memberCount purchased');
  const groupsUserIsMemberOf = await Group.getGroups({ user, types, groupFields });

  await Promise.all(groupsUserIsMemberOf.map(group => group.leave(user, 'remove-all')));
  const purgeOperations = [
    Tasks.Task.deleteMany({ userId }).exec(),
    Chat.deleteMany({ uuid: userId }).exec(),
    Inbox.deleteMany({
      $or: [
        { ownerId: userId },
        { uuid: userId },
      ],
    }).exec(),
    UserHistory.deleteMany({ userId }).exec(),
    IapPurchaseReceipt.deleteMany({ userId }).exec(),
    Transaction.deleteMany({ userId }).exec(),
  ];
  if (emailAddresses.length > 0) {
    purgeOperations.push(EmailUnsubscription.deleteMany({
      email: { $in: emailAddresses },
    }).exec());
  }
  await Promise.all(purgeOperations);
  await user.deleteOne();
}

export {
  getEmailAddresses,
};
