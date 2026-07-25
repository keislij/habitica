import nconf from 'nconf';

const PAYMENT_PATHS = [
  /^\/amazon(?:\/|$)/,
  /^\/iap(?:\/|$)/,
  /^\/paypal(?:\/|$)/,
  /^\/stripe(?:\/|$)/,
  /^\/api\/v[34]\/iap(?:\/|$)/,
  /^\/api\/v[34]\/groups\/create-plan(?:\/|$)/,
];

export function isPaymentPath (path) {
  return PAYMENT_PATHS.some(pattern => pattern.test(path));
}

export default function paymentGate (req, res, next) {
  if (nconf.get('PAYMENTS_ENABLED') === 'true' || !isPaymentPath(req.path)) return next();

  return res.status(404).send({
    success: false,
    error: 'NotFound',
    message: 'Payment services are not enabled on this Habitica instance.',
  });
}
