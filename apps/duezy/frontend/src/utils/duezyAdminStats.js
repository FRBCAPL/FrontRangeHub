/** Owner-admin numbers built from /api/duezy-admin/accounts rows. Revenue is at list price (before promo codes). */
import { monthlyPrice, yearlyPrice } from './duezyPricing.js';
import { round2 } from './duezyMath.js';

export const PHASES = [
  { id: 'active', label: 'Paying' },
  { id: 'trial_plan', label: 'Trial · plan chosen' },
  { id: 'trial', label: 'Trial' },
  { id: 'grace', label: 'Payment failed' },
  { id: 'comp', label: 'Free (comp)' },
  { id: 'locked', label: 'Locked' },
];

export const phaseLabel = (id) => PHASES.find((p) => p.id === id)?.label || id;

/** Billing phase, splitting out people who picked a plan but are still inside their free trial. */
export function accountPhase(account) {
  const phase = account?.access?.phase || 'trial';
  if (phase === 'active' && account?.subscription?.status === 'trialing') return 'trial_plan';
  return phase;
}

/** What the account's plan is worth per month at list price. */
export function planMonthly(account) {
  const sub = account?.subscription;
  if (!sub?.stripe_subscription_id) return 0;
  const qty = Math.max(1, Number(sub.division_quantity) || Number(account?.access?.divisions_used) || 1);
  return round2(sub.plan_interval === 'year' ? yearlyPrice(qty) / 12 : monthlyPrice(qty));
}

export function summarizeAccounts(accounts = []) {
  const counts = Object.fromEntries(PHASES.map((p) => [p.id, 0]));
  let mrr = 0;
  let upcomingMrr = 0;
  let trialsEndingSoon = 0;
  accounts.forEach((a) => {
    const phase = accountPhase(a);
    counts[phase] = (counts[phase] || 0) + 1;
    if (phase === 'active') mrr += planMonthly(a);
    if (phase === 'trial_plan') upcomingMrr += planMonthly(a);
    if (phase === 'trial' && Number(a.access?.days_remaining) <= 7) trialsEndingSoon += 1;
  });
  return { total: accounts.length, counts, mrr: round2(mrr), arr: round2(mrr * 12), upcomingMrr: round2(upcomingMrr), trialsEndingSoon };
}

export function filterAccounts(accounts = [], { query = '', phase = '' } = {}) {
  const q = query.trim().toLowerCase();
  return accounts.filter((a) => {
    if (phase && accountPhase(a) !== phase) return false;
    if (!q) return true;
    return [a.email, a.name].some((v) => String(v || '').toLowerCase().includes(q));
  });
}

export function shortDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
