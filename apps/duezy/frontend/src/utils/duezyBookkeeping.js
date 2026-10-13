/**
 * Helpers for the "Bookkeeping exports" menu: what was collected by payment method (to match against
 * bank / Venmo statements outside Duezy) and the season's date range.
 */
import { paidFor, round2, weeklyDues } from './duezyMath.js';
import { teamsInUnit } from './duezyDivisions.js';
import { shortDate, weekDates } from './duezySchedule.js';

export const NO_METHOD = 'Method not recorded';

/** [{ method, total, count }] largest first; only money actually recorded (paid / partial) on active teams. */
export function methodTotals({ units, teams, payments }) {
  const duesByTeam = new Map();
  units.forEach((unit, i) => {
    const dues = weeklyDues(unit);
    teamsInUnit(teams, unit, i === 0).forEach((t) => duesByTeam.set(t.id, dues));
  });
  const byMethod = new Map();
  payments.forEach((p) => {
    if (!duesByTeam.has(p.team_id)) return;
    const amount = paidFor(p, duesByTeam.get(p.team_id));
    if (!(amount > 0)) return;
    const key = p.method || NO_METHOD;
    const prev = byMethod.get(key) || { method: key, total: 0, count: 0 };
    byMethod.set(key, { method: key, total: round2(prev.total + amount), count: prev.count + 1 });
  });
  return [...byMethod.values()].sort((a, b) => b.total - a.total || a.method.localeCompare(b.method));
}

/** "Sep 15 – Dec 1" across every division with dates, else "Weeks 1–12". */
export function seasonRange(units) {
  const all = units.flatMap((u) => weekDates(u) || []).sort();
  if (all.length) return `${shortDate(all[0])} – ${shortDate(all[all.length - 1])}`;
  const weeks = Math.max(1, ...units.map((u) => Number(u.total_weeks) || 1));
  return `Weeks 1–${weeks}`;
}

export const methodTotalsCsvRows = (totals) => [
  ['Payment method', 'Entries', 'Total collected'],
  ...totals.map((t) => [t.method, t.count, t.total.toFixed(2)]),
  ['All methods', totals.reduce((s, t) => s + t.count, 0), round2(totals.reduce((s, t) => s + t.total, 0)).toFixed(2)],
];
