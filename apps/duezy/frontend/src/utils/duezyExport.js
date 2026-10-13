/**
 * CSV ledger for treasurers: one line per team for every week of the season (unpaid and upcoming
 * weeks included), so the columns reconcile with the screens:
 *   sum(Paid) = collected · sum(Paid + Balance) = full-season value (byes excluded) · sum(Due now) = owed today.
 */
import { indexPayments, paidFor, round2, weeklyDues } from './duezyMath.js';
import { teamsInUnit, unitSchedule } from './duezyDivisions.js';

export const LEDGER_HEADER = [
  'Division', 'Team', 'Captain', 'Week', 'Night', 'When', 'Dues', 'Status', 'Paid', 'Balance', 'Due now',
  'Method', 'Note', 'Recorded by', 'Last updated',
];

function whenLabel(week, schedule) {
  if (!schedule.started || week > schedule.currentWeek) return 'Upcoming';
  return week === schedule.currentWeek ? 'This week' : 'Past';
}

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
    const totalWeeks = Math.max(1, Number(unit.total_weeks) || 1);
    teamsInUnit(teams, unit, i === 0).forEach((team) => {
      const last = Math.max(totalWeeks, lastPaidWeek[team.id] || 0);
      for (let w = 1; w <= last; w += 1) {
        const p = index.get(`${team.id}:${w}`);
        const status = p?.status || 'unpaid';
        const paid = paidFor(p, dues);
        const balance = status === 'bye' ? 0 : Math.max(0, round2(dues - paid));
        rows.push([
          unit.name,
          team.name,
          team.captain || '',
          w,
          schedule.dates?.[w - 1] || '',
          whenLabel(w, schedule),
          dues.toFixed(2),
          STATUS[status] || status,
          round2(paid).toFixed(2),
          balance.toFixed(2),
          (w <= through ? balance : 0).toFixed(2),
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

export const fileSlug = (name) =>
  String(name || 'league').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'league';

export function ledgerFileName(leagueName, today) {
  return `${fileSlug(leagueName)}-dues-${today}.csv`;
}

/** Download text as a UTF-8 CSV (with BOM so Excel reads accents). Browser only. */
export function downloadCsv(csv, fileName) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
