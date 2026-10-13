/** Wording for the payment audit trail. A history row is a duezy_payment_history record. */
import { money } from './duezyMath.js';

export function statusText(status, amount) {
  if (status === 'paid') return `Paid ${money(amount)}`;
  if (status === 'partial') return `Partial ${money(amount)}`;
  if (status === 'bye') return 'Bye';
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
  return [`${weekLabel(row.week)}: ${change}`, row.method, row.note].filter(Boolean).join(' · ');
}

/** "by sam@x.com" / "by you" */
export function byWhom(email, myEmail) {
  if (!email) return '';
  return myEmail && email.toLowerCase() === myEmail.toLowerCase() ? 'by you' : `by ${email}`;
}
