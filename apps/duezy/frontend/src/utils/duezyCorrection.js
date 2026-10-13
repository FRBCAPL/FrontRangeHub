/**
 * Correcting a week that already has a payment. The new entry replaces the week's status;
 * the payment history keeps the original and the correction side by side.
 */
import { money, paidFor } from './duezyMath.js';

/** A week with money (or a bye) recorded is corrected rather than recorded again. */
export const hasRecordedEntry = (payment) => payment?.status === 'paid' || payment?.status === 'partial';

/** Entry to save for a corrected amount. 0 means the team hasn't actually paid this week. */
export function correctionEntry(amount, dues, method, reason) {
  const n = Math.max(0, Number(amount) || 0);
  const note = reason?.trim() || null;
  if (n === 0) return { status: 'unpaid', amount: 0, method: null, note };
  return { status: n >= dues ? 'paid' : 'partial', amount: n, method: method || null, note };
}

/** "$80 recorded → $70 corrected" plus the method change when there is one. */
export function correctionSummary(payment, dues, amount, method) {
  const before = paidFor(payment, dues);
  const n = Math.max(0, Number(amount) || 0);
  const after = n === 0 ? 'not paid' : `${money(n)} corrected`;
  const methodChange = n > 0 && method && payment?.method && method !== payment.method ? ` (${payment.method} → ${method})` : '';
  return `${money(before)} recorded → ${after}${methodChange}`;
}

/** True when saving would change nothing. */
export function isSameEntry(payment, dues, amount, method) {
  const n = Math.max(0, Number(amount) || 0);
  return n === paidFor(payment, dues) && (n === 0 || (method || null) === (payment?.method || null));
}
