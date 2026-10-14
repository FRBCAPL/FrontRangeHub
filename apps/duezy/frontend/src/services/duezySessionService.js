import duezy from './duezyClient.js';
import { check } from './duezyService.js';
import { syncQuantity } from './duezyBillingService.js';
import { updateDivision } from './duezyDivisionService.js';
import { friendlyError } from '../utils/duezyBillingText.js';

export const SESSIONS_SQL_NEEDED = 'Starting a new session needs the sessions database update (duezy-division-sessions-2026-10.sql).';

const ERRORS = [
  [/duezy_start_sessions|schema cache/i, SESSIONS_SQL_NEEDED],
  [/duezy_session_division/, 'One of those divisions already ended or was removed. Reload and try again.'],
  [/duezy_session_name/, 'Every division needs a name.'],
  [/duezy_session_empty/, 'Pick at least one division.'],
];

/**
 * Archive each picked division and add its next session (new division row + returning teams), all or nothing.
 * items: [{ from_division_id, division: {...}, teams: [...] }]. Returns [{ from, id }].
 */
export async function startSessions(leagueId, items) {
  const { data, error } = await duezy.rpc('duezy_start_sessions', { p_league_id: leagueId, p_items: items });
  if (error) {
    const msg = error.message || '';
    const hit = ERRORS.find(([re]) => re.test(msg));
    throw new Error(hit ? hit[1] : friendlyError(msg));
  }
  syncQuantity();
  return data || [];
}

/** A league's past sessions (archived divisions), newest first; [] before the divisions SQL. */
export async function listPastDivisions(leagueId) {
  const result = await duezy.from('duezy_divisions').select('*').eq('league_id', leagueId).eq('archived', true)
    .order('created_at', { ascending: false });
  if (result.error && /duezy_divisions/.test(result.error.message || '')) return [];
  return check(result) || [];
}

export const restoreDivision = (id) => updateDivision(id, { archived: false });
