export const MIN_REDEEM_POINTS = 50;

const QR_TYPE = 'loc-redeem';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function defaultRedeemAmount(points) {
  const balance = wholePoints(points);
  if (balance < MIN_REDEEM_POINTS) return 0;
  return Math.floor(balance / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS;
}

export function parseRedeemAmount(text) {
  if (typeof text !== 'string' || text.trim() === '') return null;
  if (!/^\d+$/.test(text.trim())) return Number.NaN;
  return Number(text.trim());
}

export function redeemAmountError(amount, points) {
  const balance = wholePoints(points);
  if (balance < MIN_REDEEM_POINTS) return `They need at least ${MIN_REDEEM_POINTS} points to redeem.`;
  if (amount == null) return 'Enter how many points to redeem.';
  if (!Number.isInteger(amount)) return 'Enter a whole number of points.';
  if (amount < MIN_REDEEM_POINTS || amount % MIN_REDEEM_POINTS !== 0) {
    return `Redeem in steps of ${MIN_REDEEM_POINTS}.`;
  }
  const max = defaultRedeemAmount(balance);
  if (amount > max) return `They can redeem up to ${max} points.`;
  return '';
}

export function redeemQrPayload({ guestId, email }) {
  return JSON.stringify({
    t: QR_TYPE,
    id: guestId,
    email: email || '',
  });
}

export function parseRedeemQr(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.t !== QR_TYPE || typeof data.id !== 'string' || !UUID.test(data.id)) return null;
  return { guestId: data.id, email: typeof data.email === 'string' ? data.email : '' };
}

function wholePoints(points) {
  const n = Number(points);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}
