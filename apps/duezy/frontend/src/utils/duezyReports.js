/**
 * Bookkeeping reports as one shape the preview, the PDF and the CSV all use:
 *   { title, columns: [{ label, align }], rows: [[...text]], summary: [{ label, value }], empty }
 * Built from the same rows as the CSV exports so the numbers always match.
 */
import { money, round2 } from './duezyMath.js';
import { ledgerRows } from './duezyExport.js';
import { historyRows } from './duezyHistoryExport.js';
import { methodTotals, seasonRange } from './duezyBookkeeping.js';
import { shortDate } from './duezySchedule.js';

const R = 'right';
const night = (iso) => (iso ? shortDate(iso) : '');
const num = (s) => Number(s) || 0;

/** Ledger rows are LEDGER_HEADER order: 0 Division … 5 When, 7 Status, 8 Paid, 9 Balance, 10 Due now, 11 Method. */
export function ledgerReport({ units, teams, payments, today, defaultGrace = 0, includeUpcoming = false }) {
  const all = ledgerRows({ units, teams, payments, today, defaultGrace });
  const shown = includeUpcoming ? all : all.filter((r) => r[5] !== 'Upcoming' || num(r[8]) > 0);
  const several = units.length > 1;
  const columns = [
    several && { label: 'Division' },
    { label: 'Team' },
    { label: 'Week', align: R },
    { label: 'Night' },
    { label: 'Status' },
    { label: 'Paid', align: R },
    { label: 'Balance', align: R },
    { label: 'Due now', align: R },
    { label: 'Method' },
  ].filter(Boolean);
  const rows = shown.map((r) => [
    ...(several ? [r[0]] : []),
    r[1], String(r[3]), night(r[4]), r[7], money(num(r[8])), money(num(r[9])), money(num(r[10])), r[11],
  ]);
  const sum = (i) => round2(all.reduce((s, r) => s + num(r[i]), 0));
  return {
    title: 'Season ledger',
    range: seasonRange(units),
    columns,
    rows,
    summary: [
      { label: 'Collected', value: money(sum(8)) },
      { label: 'Due now', value: money(sum(10)) },
      { label: 'Rest of season', value: money(round2(sum(9) - sum(10))) },
      { label: 'Teams', value: String(new Set(all.map((r) => `${r[0]}|${r[1]}`)).size) },
    ],
    note: includeUpcoming ? 'Every week of the season, including weeks that haven’t been played yet.' : 'Weeks played so far, plus any paid ahead. Upcoming weeks are left out.',
    empty: 'No teams yet.',
  };
}

/** History rows are HISTORY_HEADER order: 0 Changed at, 2 Team, 3 Week, 5 Change, 6 Was, 7 Now, 8 Amount change, 9 Method, 10 Note, 11 By. */
export function historyReport({ rows, units }) {
  const all = historyRows({ rows, units });
  const several = units.length > 1;
  const columns = [
    { label: 'When' },
    several && { label: 'Division' },
    { label: 'Team' },
    { label: 'Week', align: R },
    { label: 'Change' },
    { label: 'Was' },
    { label: 'Now' },
    { label: '+/−', align: R },
    { label: 'Method' },
    { label: 'Note' },
    { label: 'By' },
  ].filter(Boolean);
  const signed = (s) => { const n = num(s); return n === 0 ? '—' : `${n > 0 ? '+' : '−'}${money(Math.abs(n))}`; };
  return {
    title: 'Change history',
    range: all.length ? `${all[0][0].slice(0, 10)} – ${all[all.length - 1][0].slice(0, 10)}` : '',
    columns,
    rows: all.map((r) => [r[0], ...(several ? [r[1]] : []), r[2], String(r[3]), r[5], r[6], r[7], signed(r[8]), r[9], r[10], r[11]]),
    summary: [
      { label: 'Entries', value: String(all.length) },
      { label: 'Corrections', value: String(all.filter((r) => r[5] === 'Correction').length) },
      { label: 'Net change', value: money(round2(all.reduce((s, r) => s + num(r[8]), 0))) },
    ],
    note: 'Every payment recorded or changed, oldest first, with who made it. Entries are never erased.',
    empty: 'Nothing recorded yet.',
  };
}

export function methodReport({ units, teams, payments }) {
  const totals = methodTotals({ units, teams, payments });
  const total = round2(totals.reduce((s, t) => s + t.total, 0));
  return {
    title: 'Totals by payment method',
    range: seasonRange(units),
    columns: [{ label: 'Payment method' }, { label: 'Entries', align: R }, { label: 'Total collected', align: R }, { label: 'Share', align: R }],
    rows: totals.map((t) => [t.method, String(t.count), money(t.total), total ? `${Math.round((t.total / total) * 100)}%` : '']),
    summary: [
      { label: 'Total collected', value: money(total) },
      { label: 'Methods', value: String(totals.length) },
    ],
    note: 'Match these against your bank, Venmo or cash records. Duezy records what you collected — it doesn’t move money.',
    empty: 'Nothing collected yet.',
  };
}

export const reportFileName = (leagueName, reportTitle, scope, today, ext) =>
  [leagueName, scope, reportTitle, today].filter(Boolean).join(' ')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + `.${ext}`;
