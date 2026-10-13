/** Wording for the payment audit trail. A history row is a duezy_payment_history record. */
import { money } from './duezyMath.js';
import { methodFrom } from './duezyPayers.js';

export function statusText(status, amount) {
  if (status === 'paid') return `Paid ${money(amount)}`;
  if (status === 'partial') return `Partial ${money(amount)}`;
  if (status === 'bye') return 'Bye';
  if (status === 'makeup') return 'Make up';
  return 'Not paid';
}

export function shortStamp(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "Week 3: Not paid → Paid $20 · Cash · note" */
export function historyChange(row, weekLabel = (w) => `Week ${w}`) {
  const next = statusText(row.new_status, row.new_amount);
  const change = row.action === 'created' ? next : `${statusText(row.old_status, row.old_amount)} → ${next}`;
  return [`${weekLabel(row.week)}: ${change}`, row.method && methodFrom(row.method, row.paid_by), row.note].filter(Boolean).join(' · ');
}

/** A change that took money back off the books (paid → partial / not paid / bye, or a smaller amount). */
export const isCorrection = (row) => row.action === 'changed' && Number(row.new_amount || 0) < Number(row.old_amount || 0);

export function changeKind(row) {
  if (row.action === 'created') return 'Recorded';
  return isCorrection(row) ? 'Correction' : 'Changed';
}

/** "by sam@x.com" / "by you" */
export function byWhom(email, myEmail) {
  if (!email) return '';
  return myEmail && email.toLowerCase() === myEmail.toLowerCase() ? 'by you' : `by ${email}`;
}
