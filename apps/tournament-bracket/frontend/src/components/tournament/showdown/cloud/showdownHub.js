/** Showdown entries for the Tournament hub's Current / Completed lists. */
import { SHOWDOWN_TYPE } from '../showdownRules.js';

export const SHOWDOWN_KIND = 'showdown';

const STATUS_TEXT = {
  setup: 'Setup',
  qualifying: 'Qualifying',
  shootout: 'Shootout',
  bracket: 'Bracket draw',
  playoffs: 'Playoffs',
  completed: 'Complete',
};

export function showdownStatusLabel(status) {
  return STATUS_TEXT[status] || status || '';
}

export function isShowdownHubEvent(item) {
  return item?.kind === SHOWDOWN_KIND || item?.type === SHOWDOWN_TYPE;
}

/** A row from cash_climb_showdown_list. */
export function showdownSummaryFromRow(row) {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: row.name || 'Cash Climb Showdown',
    status: row.status,
    type: SHOWDOWN_TYPE,
    kind: SHOWDOWN_KIND,
    tournamentDate: row.event_date || '',
    venue: row.venue || '',
    updatedAt: row.updated_at || '',
  };
}

/** The event open on this tablet. It wins over the cloud row with the same id. */
export function showdownSummaryFromLocal(state) {
  if (!state?.id || state.type !== SHOWDOWN_TYPE) return null;
  const last = (state.audit || [])[state.audit.length - 1];
  return {
    id: String(state.id),
    name: state.name || 'Cash Climb Showdown',
    status: state.status,
    type: SHOWDOWN_TYPE,
    kind: SHOWDOWN_KIND,
    tournamentDate: state.tournamentDate || '',
    venue: state.venue || '',
    updatedAt: last?.at || state.createdAt || '',
  };
}
