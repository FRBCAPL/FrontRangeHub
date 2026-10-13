/**
 * CSV of every payment change in a league (oldest first): what it was, what it became, who and when.
 * Pairs with the ledger CSV — the ledger is where things stand, this is how they got there.
 */
import { round2 } from './duezyMath.js';
import { fileSlug, toCsv } from './duezyExport.js';
import { weekDates } from './duezySchedule.js';
import { changeKind, statusText } from './duezyHistory.js';

export const HISTORY_HEADER = [
  'Changed at', 'Division', 'Team', 'Week', 'Night', 'Change', 'Was', 'Now', 'Amount change', 'Method', 'Paid by', 'Note', 'By',
];

const stamp = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ') : '');

/** rows = duezy_payment_history records, each optionally with `team: { name, division_id }`. */
export function historyRows({ rows, units = [], teamsById = {} }) {
  const unitById = new Map(units.map((u) => [u.id || null, u]));
  const datesById = new Map(units.map((u) => [u.id || null, weekDates(u) || []]));
  return [...rows]
    .sort((a, b) => String(a.changed_at).localeCompare(String(b.changed_at)))
    .map((r) => {
      const team = r.team || teamsById[r.team_id] || {};
      const divisionId = team.division_id || null;
      const unit = unitById.get(divisionId) || (units.length === 1 ? units[0] : null);
      const delta = round2(Number(r.new_amount || 0) - (r.action === 'created' ? 0 : Number(r.old_amount || 0)));
      return [
        stamp(r.changed_at),
        unit?.id ? unit.name : '',
        team.name || '(removed team)',
        r.week,
        (datesById.get(unit?.id || null) || [])[r.week - 1] || '',
        changeKind(r),
        r.action === 'created' ? '' : statusText(r.old_status, r.old_amount),
        statusText(r.new_status, r.new_amount),
        delta.toFixed(2),
        r.method || '',
        r.paid_by || '',
        r.note || '',
        r.changed_by_email || '',
      ];
    });
}

export function historyCsv(args) {
  return toCsv([HISTORY_HEADER, ...historyRows(args)]);
}

export function historyFileName(leagueName, today) {
  return `${fileSlug(leagueName)}-payment-history-${today}.csv`;
}
