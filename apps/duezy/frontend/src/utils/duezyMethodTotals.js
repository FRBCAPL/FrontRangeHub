/** One week's collected money split by how it came in: cash in hand vs each digital method. */
import { paidFor, round2 } from './duezyMath.js';
import { methodText, paymentParts } from './duezySplits.js';

export const NOT_RECORDED = 'Not recorded';

/** Filter keys for weekMethodTeams / the by-method card: cash, non-cash, digital-only, no method, or a named method. */
export const METHOD_FILTER_CASH = 'cash';
export const METHOD_FILTER_OTHER = 'other';
export const METHOD_FILTER_DIGITAL = 'digital';
export const METHOD_FILTER_UNRECORDED = 'unrecorded';

const isCash = (method) => String(method || '').trim().toLowerCase() === 'cash';

const matchesFilter = (part, filter) => {
  if (filter === METHOD_FILTER_CASH) return isCash(part.method);
  if (filter === METHOD_FILTER_OTHER) return !isCash(part.method);
  if (filter === METHOD_FILTER_DIGITAL) return Boolean(part.method) && !isCash(part.method);
  if (filter === METHOD_FILTER_UNRECORDED) return !part.method;
  return part.method === filter;
};

const showsMethodInDetail = (filter) => filter === METHOD_FILTER_OTHER || filter === METHOD_FILTER_DIGITAL;

export function methodFilterLabel(filter) {
  if (filter === METHOD_FILTER_CASH) return 'Cash';
  if (filter === METHOD_FILTER_OTHER || filter === METHOD_FILTER_DIGITAL) return 'Other methods';
  if (filter === METHOD_FILTER_UNRECORDED) return NOT_RECORDED;
  return filter;
}

/** Group label for a payment part inside the Other modal. */
export function partMethodLabel(method) {
  return method || NOT_RECORDED;
}

/**
 * { cash: { total, count }, digital: [{ method, total, count }] largest first,
 *   unrecorded: { total, count }, total } for paid / partial entries in `week`.
 */
export function weekMethodTotals(teams, week, dues, paymentIndex) {
  const cash = { total: 0, count: 0 };
  const unrecorded = { total: 0, count: 0 };
  const byMethod = new Map();
  teams.forEach((t) => {
    paymentParts(paymentIndex.get(`${t.id}:${week}`), dues).forEach((p) => {
      let bucket;
      if (isCash(p.method)) bucket = cash;
      else if (!p.method) bucket = unrecorded;
      else {
        bucket = byMethod.get(p.method) || { method: p.method, total: 0, count: 0 };
        byMethod.set(p.method, bucket);
      }
      bucket.total = round2(bucket.total + p.amount);
      bucket.count += 1;
    });
  });
  const digital = [...byMethod.values()].sort((a, b) => b.total - a.total || a.method.localeCompare(b.method));
  const total = round2(cash.total + unrecorded.total + digital.reduce((s, d) => s + d.total, 0));
  return { cash, digital, unrecorded, total };
}

/**
 * Teams that paid (or partially paid) this week via `filter`: one row per team with that method's total.
 * Rows: { team, amount, detail, method } — detail is payer notes; method is set when Other groups by type.
 */
export function weekMethodTeams(teams, week, dues, paymentIndex, filter) {
  const byKey = new Map();
  const multi = showsMethodInDetail(filter);
  teams.forEach((team) => {
    paymentParts(paymentIndex.get(`${team.id}:${week}`), dues).filter((p) => matchesFilter(p, filter)).forEach((p) => {
      const method = partMethodLabel(p.method);
      const key = multi ? `${team.id}:${method}` : team.id;
      const row = byKey.get(key) || { team, amount: 0, payers: [], method: multi ? method : null };
      row.amount = round2(row.amount + p.amount);
      if (p.paid_by) row.payers.push(p.paid_by);
      byKey.set(key, row);
    });
  });
  return [...byKey.values()]
    .map(({ team, amount, payers, method }) => ({
      team,
      amount,
      method,
      detail: [...new Set(payers)].map((name) => `from ${name}`).join(' · '),
    }))
    .sort((a, b) => {
      if (a.method && b.method && a.method !== b.method) return a.method.localeCompare(b.method);
      return a.team.name.localeCompare(b.team.name) || b.amount - a.amount;
    });
}

/**
 * Every team that paid something this week: { team, amount, how, status }.
 * `how` is the method line (Cash, Venmo from Ana, Cash $10 + Venmo $10, or Not recorded).
 */
export function weekCollectedRows(teams, week, dues, paymentIndex) {
  return teams
    .map((team) => {
      const payment = paymentIndex.get(`${team.id}:${week}`);
      const amount = paidFor(payment, dues);
      if (!(amount > 0)) return null;
      return {
        team,
        amount,
        how: methodText(payment) || NOT_RECORDED,
        status: payment?.status || 'paid',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.team.name.localeCompare(b.team.name) || b.amount - a.amount);
}
