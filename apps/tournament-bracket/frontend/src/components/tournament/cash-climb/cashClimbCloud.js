import { supabase } from '@shared/config/supabase.js';
import { savedEventSummary, tournamentFromEventRow } from './cashClimbSaved.js';
import { tagSubmittedBy } from './cashClimbPlayedGame.js';

export const CASH_CLIMB_EVENTS_TABLE = 'cash_climb_events';
export const CASH_CLIMB_PENDING_TABLE = 'cash_climb_pending_results';

function isMissingTable(error) {
  const msg = String(error?.message || error?.code || '');
  if (/column/i.test(msg) || error?.code === 'PGRST204' || error?.code === '42703') return false;
  return error?.code === 'PGRST205' || error?.code === '42P01' || /cash_climb_/i.test(msg) && /does not exist|schema cache/i.test(msg);
}

function isUnknownColumn(error, column) {
  if (!error) return false;
  const col = String(column || '');
  if (error.code === 'PGRST204' || error.code === '42703') return true;
  let blob = String(error.message || error.details || error.hint || error.code || '');
  try { blob = `${blob} ${JSON.stringify(error)}`; } catch { /* ignore */ }
  return Boolean(col) && new RegExp(col, 'i').test(blob) && /column|schema cache|does not exist|Could not find/i.test(blob);
}

let pendingHasGameType = true;

function pendingSelect() {
  return pendingHasGameType
    ? 'id, event_id, match_id, winner_id, score, game_type, submitted_by, submitted_at'
    : 'id, event_id, match_id, winner_id, score, submitted_by, submitted_at';
}

function rememberMissingGameType(error) {
  if (!pendingHasGameType) return false;
  if (!isUnknownColumn(error, 'game_type')) return false;
  pendingHasGameType = false;
  return true;
}

async function swallow(work) {
  try {
    const result = await work();
    if (result?.error) {
      if (!isMissingTable(result.error) && !isUnknownColumn(result.error, 'game_type')) {
        console.warn('Cash Climb cloud:', result.error.message || result.error);
      }
      return { data: null, error: result.error };
    }
    return { data: result?.data ?? null, error: null };
  } catch (error) {
    console.warn('Cash Climb cloud:', error?.message || error);
    return { data: null, error };
  }
}

export async function publishCashClimbEvent(tournament) {
  if (!tournament?.id) return { error: null };
  return swallow(() => supabase.from(CASH_CLIMB_EVENTS_TABLE).upsert({
    id: String(tournament.id),
    payload: tournament,
    status: tournament.status === 'completed' ? 'completed' : 'in-progress',
    updated_at: new Date().toISOString(),
  }));
}

export async function retireCashClimbEvent(tournament) {
  if (!tournament?.id) return { error: null };
  return swallow(() => supabase.from(CASH_CLIMB_EVENTS_TABLE).upsert({
    id: String(tournament.id),
    payload: tournament,
    status: 'ended',
    updated_at: new Date().toISOString(),
  }));
}

export async function loadLiveCashClimbEvent() {
  const live = await listLiveCashClimbEvents();
  return { tournament: live[0]?.tournament || null, error: null };
}

export async function loadCashClimbEventById(eventId) {
  if (!eventId) return { tournament: null, error: null };
  const result = await swallow(() => supabase
    .from(CASH_CLIMB_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('id', String(eventId))
    .maybeSingle());
  return { tournament: tournamentFromEventRow(result.data), error: result.error };
}

export async function listLiveCashClimbEvents() {
  const result = await swallow(() => supabase
    .from(CASH_CLIMB_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false })
    .limit(12));
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(savedEventSummary).filter((item) => item && item.status === 'in-progress');
}

export async function listSavedCashClimbEvents() {
  const result = await swallow(() => supabase
    .from(CASH_CLIMB_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(24));
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(savedEventSummary).filter(Boolean);
}

export async function deleteCashClimbEvent(eventId) {
  if (!eventId) return { error: null };
  return swallow(() => supabase.from(CASH_CLIMB_EVENTS_TABLE).delete().eq('id', String(eventId)));
}

export async function loadCashClimbPending(eventId) {
  if (!eventId) return [];
  const result = await swallow(() => supabase
    .from(CASH_CLIMB_PENDING_TABLE)
    .select(pendingSelect())
    .eq('event_id', String(eventId))
    .order('submitted_at', { ascending: false }));
  if (result.error && rememberMissingGameType(result.error)) {
    return loadCashClimbPending(eventId);
  }
  return Array.isArray(result.data) ? result.data : [];
}

export async function submitCashClimbPending({ eventId, matchId, winnerId, score = null, submittedBy = '', playedGame = '' }) {
  if (!eventId || !matchId || !winnerId) return { error: new Error('Missing match details.') };
  const row = {
    event_id: String(eventId),
    match_id: String(matchId),
    winner_id: String(winnerId),
    score: score ? String(score) : null,
    submitted_by: tagSubmittedBy(submittedBy, playedGame),
    submitted_at: new Date().toISOString(),
  };
  const payload = pendingHasGameType
    ? { ...row, game_type: playedGame ? String(playedGame).trim() : null }
    : row;
  const first = await swallow(() => supabase.from(CASH_CLIMB_PENDING_TABLE).upsert(payload, { onConflict: 'event_id,match_id' }));
  if (first.error && rememberMissingGameType(first.error)) {
    return swallow(() => supabase.from(CASH_CLIMB_PENDING_TABLE).upsert(row, { onConflict: 'event_id,match_id' }));
  }
  return first;
}

export async function deleteCashClimbPending(eventId, matchId) {
  if (!eventId || !matchId) return { error: null };
  return swallow(() => supabase
    .from(CASH_CLIMB_PENDING_TABLE)
    .delete()
    .eq('event_id', String(eventId))
    .eq('match_id', String(matchId)));
}

export async function clearPostedCashClimbPending(tournament) {
  if (!tournament?.id) return;
  const posted = (tournament.matches || [])
    .filter((m) => m.status === 'completed' || m.status === 'cancelled')
    .map((m) => m.id);
  if (!posted.length) return;
  await swallow(() => supabase
    .from(CASH_CLIMB_PENDING_TABLE)
    .delete()
    .eq('event_id', String(tournament.id))
    .in('match_id', posted));
}

export function syncCashClimbCloud(tournament) {
  if (!tournament?.id) return;
  Promise.resolve().then(async () => {
    await publishCashClimbEvent(tournament);
    await clearPostedCashClimbPending(tournament);
  });
}
