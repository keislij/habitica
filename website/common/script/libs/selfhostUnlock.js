// Private self-host "everything unlocked" switch.
//
// Upstream Habitica funds itself with subscriptions and group plans. On a
// private family instance there is nobody to bill and no payment provider is
// configured (PAYMENTS_ENABLED=false makes every payment route 404), so those
// gates only stand between the household and features it already owns.
//
// SELF_HOST_UNLOCK_ALL=true grants subscriber perks and group-plan features
// locally and forever. It NEVER enables a payment path and never creates a
// real subscription record: no plan.customerId is written, so nothing in the
// codebase mistakes an unlocked instance for a paying customer and tries to
// charge, cancel, or reconcile it with Stripe/Amazon/PayPal/IAP.
//
// Default false so upstream behavior (and the upstream test suite) is
// unchanged unless the flag is explicitly set.
//
// Read here from process.env because this module is shared by the server, the
// browser bundle, and the common game logic. setupNconf mirrors the nconf
// value into process.env, and the client's vite config defines it at build
// time (see website/client/vite.config.mjs envVars).
export default function selfhostUnlockAll () {
  return String(process.env.SELF_HOST_UNLOCK_ALL) === 'true';
}
