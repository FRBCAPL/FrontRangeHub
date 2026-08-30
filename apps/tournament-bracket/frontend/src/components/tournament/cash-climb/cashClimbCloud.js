import { supabase } from '@shared/config/supabase.js';

export const CASH_CLIMB_EVENTS_TABLE = 'cash_climb_events';
export const CASH_CLIMB_PENDING_TABLE = 'cash_climb_pending_results';

function isMissingTable(error) {
  const msg = String(error?.message || error?.code || '');
  return error?.code === 'PGRST205' || error?.code === '42P01' || /cash_climb_/i.test(msg) && /does not exist|schema cache/i.test(msg);
}

async function swallow(work) {
  try {
    const result = await work();
    if (result?.error) {
      if (!isMissingTable(result.error)) {
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
  const result = await swallow(() => supabase
    .from(CASH_CLIMB_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle());
  const row = result.data;
  if (!row?.payload || typeof row.payload !== 'object') return { tournament: null, error: result.error };
  return { tournament: { ...row.payload, id: row.id || row.payload.id }, error: null };
}

export async function loadCashClimbPending(eventId) {
  if (!eventId) return [];
  const result = await swallow(() => supabase
    .from(CASH_CLIMB_PENDING_TABLE)
    .select('id, event_id, match_id, winner_id, score, submitted_by, submitted_at')
    .eq('event_id', String(eventId))
    .order('submitted_at', { ascending: false }));
  return Array.isArray(result.data) ? result.data : [];
}

export async function submitCashClimbPending({ eventId, matchId, winnerId, score = null, submittedBy = '' }) {
  if (!eventId || !matchId || !winnerId) return { error: new Error('Missing match details.') };
  return swallow(() => supabase.from(CASH_CLIMB_PENDING_TABLE).upsert({
    event_id: String(eventId),
    match_id: String(matchId),
    winner_id: String(winnerId),
    score: score ? String(score) : null,
    submitted_by: submittedBy ? String(submittedBy).trim() : null,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'event_id,match_id' }));
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
