/**
 * Split payments: one week's dues paid in parts, e.g. $78 cash + $22 Venmo.
 * A split row has splits = [{ amount, method, paid_by }] (2+ parts), amount = the parts added up,
 * and method / paid_by = null. Any other row is one payment with one method.
 */
import { money, paidFor, round2 } from './duezyMath.js';
import { methodFrom } from './duezyPayers.js';

export const MAX_PARTS = 6;
export const NO_METHOD_PART = 'No method';

const cleanPart = (p) => ({ amount: round2(p?.amount), method: p?.method || null, paid_by: p?.paid_by || null });

export const isSplit = (payment) => Array.isArray(payment?.splits) && payment.splits.length > 1;

/** Money recorded for a week by how it came in: [{ amount, method, paid_by }] — one part unless split. */
export function paymentParts(payment, dues) {
  const total = paidFor(payment, dues);
  if (!(total > 0)) return [];
  if (isSplit(payment)) return payment.splits.map(cleanPart).filter((p) => p.amount > 0);
  return [{ amount: total, method: payment.method || null, paid_by: payment.paid_by || null }];
}

/** "Cash $78 + Venmo from Ana $22" for a split, "Venmo from Ana" otherwise ('' when no method). Works on history rows too. */
export function methodText(payment) {
  if (isSplit(payment)) {
    return payment.splits.map((p) => `${methodFrom(p.method || NO_METHOD_PART, p.paid_by)} ${money(p.amount)}`).join(' + ');
  }
  return payment?.method ? methodFrom(payment.method, payment.paid_by) : '';
}

/** [Method, Paid by] spreadsheet cells for a payment or history row. */
export function methodCells(row) {
  if (!isSplit(row)) return [row?.method || '', row?.paid_by || ''];
  const method = row.splits.map((p) => `${p.method || NO_METHOD_PART} ${round2(p.amount).toFixed(2)}`).join(' + ');
  const payers = [...new Set(row.splits.map((p) => p.paid_by).filter(Boolean))];
  return [method, payers.join(', ')];
}

/** Parts with the same method and payer added together (two cash handfuls are one cash payment). */
function mergeParts(parts) {
  const out = [];
  parts.forEach((p) => {
    const same = out.find((o) => o.method === p.method && (o.paid_by || '').toLowerCase() === (p.paid_by || '').toLowerCase());
    if (same) same.amount = round2(same.amount + p.amount);
    else out.push({ ...p });
  });
  return out;
}

/** Room for another part on this week? */
export const canAddPart = (payment, dues) => paymentParts(payment, dues).length < MAX_PARTS;

/**
 * Entry to save when another payment comes in for a week that already has money recorded.
 * The amount adds up; each method is kept. Same method and payer just adds to that part.
 */
export function addPartEntry(payment, dues, part) {
  const parts = mergeParts([...paymentParts(payment, dues), cleanPart(part)].filter((p) => p.amount > 0));
  const amount = round2(parts.reduce((s, p) => s + p.amount, 0));
  const status = amount >= dues ? 'paid' : 'partial';
  const note = payment?.note || null;
  if (parts.length === 1) return { status, amount, method: parts[0].method, paid_by: parts[0].paid_by, note, splits: null };
  return { status, amount, method: null, paid_by: null, note, splits: parts };
}
