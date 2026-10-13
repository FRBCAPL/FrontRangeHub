/**
 * CSV ledger for treasurers: one line per team per week through each division's current week
 * (plus any later week that already has a payment), with dues, what was paid, and what's still owed.
 */
import { indexPayments, paidFor, round2, weeklyDues } from './duezyMath.js';
import { teamsInUnit, unitSchedule } from './duezyDivisions.js';

export const LEDGER_HEADER = [
  'Division', 'Team', 'Captain', 'Week', 'Night', 'Dues', 'Status', 'Paid', 'Owed', 'Method', 'Note', 'Recorded by', 'Last updated',
];

const STATUS = { paid: 'Paid', partial: 'Partial', bye: 'Bye', unpaid: 'Not paid' };

/** Text starting with = + - @ gets a leading ' so spreadsheets don't run it as a formula. */
function cell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (rows) => rows.map((r) => r.map(cell).join(',')).join('\r\n');

export function ledgerRows({ units, teams, payments, today, defaultGrace = 0 }) {
  const index = indexPayments(payments);
  const lastPaidWeek = {};
  payments.forEach((p) => { lastPaidWeek[p.team_id] = Math.max(lastPaidWeek[p.team_id] || 0, p.week); });

  const rows = [];
  units.forEach((unit, i) => {
    const dues = weeklyDues(unit);
    const schedule = unitSchedule(unit, { today, defaultGrace });
    const through = schedule.started ? schedule.currentWeek : 0;
    teamsInUnit(teams, unit, i === 0).forEach((team) => {
      const last = Math.max(through, lastPaidWeek[team.id] || 0);
      for (let w = 1; w <= last; w += 1) {
        const p = index.get(`${team.id}:${w}`);
        if (!p && w > through) continue;
        const status = p?.status || 'unpaid';
        const paid = paidFor(p, dues);
        rows.push([
          unit.name,
          team.name,
          team.captain || '',
          w,
          schedule.dates?.[w - 1] || '',
          dues.toFixed(2),
          STATUS[status] || status,
          round2(paid).toFixed(2),
          (status === 'bye' ? 0 : Math.max(0, round2(dues - paid))).toFixed(2),
          p?.method || '',
          p?.note || '',
          p?.recorded_by_email || '',
          p?.updated_at ? p.updated_at.slice(0, 16).replace('T', ' ') : '',
        ]);
      }
    });
  });
  return rows;
}

export function ledgerCsv(args) {
  return toCsv([LEDGER_HEADER, ...ledgerRows(args)]);
}

export function ledgerFileName(leagueName, today) {
  const slug = String(leagueName || 'league').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'league';
  return `${slug}-dues-${today}.csv`;
}
