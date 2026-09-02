import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@shared/config/supabase.js';
import { savedEventSummary, tournamentFromEventRow } from './cash-climb/cashClimbSaved.js';

export const ELIM_EVENTS_TABLE = 'elim_events';
export const ELIM_PENDING_TABLE = 'elim_pending_results';

const PUBLIC_KEY = '__FRPH_ELIM_PUBLIC__';

function elimPublicClient() {
  const store = typeof globalThis !== 'undefined' ? globalThis : window;
  if (!store[PUBLIC_KEY]) {
    store[PUBLIC_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'frph-elim-public',
      },
    });
  }
  return store[PUBLIC_KEY];
}

function isMissingTable(error) {
  const msg = String(error?.message || error?.code || '');
  return error?.code === 'PGRST205' || error?.code === '42P01' || /elim_(events|pending)/i.test(msg) && /does not exist|schema cache/i.test(msg);
}

async function swallow(work) {
  try {
    const result = await work();
    if (result?.error) {
      if (!isMissingTable(result.error)) {
        console.warn('Elimination cloud:', result.error.message || result.error);
      }
      return { data: null, error: result.error };
    }
    return { data: result?.data ?? null, error: null };
  } catch (error) {
    console.warn('Elimination cloud:', error?.message || error);
    return { data: null, error };
  }
}

function cloudStatus(tournament) {
  if (tournament?.status === 'completed') return 'completed';
  if (tournament?.status === 'ended') return 'ended';
  return 'in-progress';
}

export async function publishElimEvent(tournament) {
  if (!tournament?.id) return { error: null };
  return swallow(() => supabase.from(ELIM_EVENTS_TABLE).upsert({
    id: String(tournament.id),
    payload: tournament,
    status: cloudStatus(tournament),
    updated_at: new Date().toISOString(),
  }));
}

/** Save a live bracket without ending it, so another event can run on this tablet. */
export async function parkLiveElimEvent(tournament) {
  if (!tournament?.id) return { error: null };
  if (tournament.status === 'completed' || tournament.status === 'ended') return { error: null };
  return publishElimEvent({ ...tournament, status: 'in-progress' });
}

export async function retireElimEvent(tournament) {
  if (!tournament?.id) return { error: null };
  return swallow(() => supabase.from(ELIM_EVENTS_TABLE).upsert({
    id: String(tournament.id),
    payload: tournament,
    status: tournament.status === 'completed' ? 'completed' : 'ended',
    updated_at: new Date().toISOString(),
  }));
}

export async function loadLiveElimEvent() {
  const result = await swallow(() => supabase
    .from(ELIM_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle());
  const tournament = tournamentFromEventRow(result.data);
  if (!tournament) return { tournament: null, error: result.error };
  return { tournament, error: null };
}

export async function loadElimEventById(eventId) {
  if (!eventId) return { tournament: null, error: null };
  const authed = await swallow(() => supabase
    .from(ELIM_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('id', String(eventId))
    .maybeSingle());
  if (authed.data) return { tournament: tournamentFromEventRow(authed.data), error: null };
  const pub = await swallow(() => elimPublicClient()
    .from(ELIM_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('id', String(eventId))
    .maybeSingle());
  return { tournament: tournamentFromEventRow(pub.data), error: pub.error || authed.error };
}

export async function listLiveElimEvents() {
  const result = await swallow(() => elimPublicClient()
    .from(ELIM_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false })
    .limit(12));
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(savedEventSummary).filter((item) => item && item.status === 'in-progress');
}

export async function listSavedElimEvents() {
  const result = await swallow(() => supabase
    .from(ELIM_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(24));
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(savedEventSummary).filter(Boolean);
}

export async function deleteElimEvent(eventId) {
  if (!eventId) return { error: null };
  return swallow(() => supabase.from(ELIM_EVENTS_TABLE).delete().eq('id', String(eventId)));
}

export async function loadElimPending(eventId) {
  if (!eventId) return [];
  const result = await swallow(() => elimPublicClient()
    .from(ELIM_PENDING_TABLE)
    .select('id, event_id, match_id, winner_id, score, submitted_by, submitted_at')
    .eq('event_id', String(eventId))
    .order('submitted_at', { ascending: false }));
  return Array.isArray(result.data) ? result.data : [];
}

export async function submitElimPending({ eventId, matchId, winnerId, score = '', submittedBy = '' }) {
  if (!eventId || !matchId || !winnerId) return { error: new Error('Missing match details.') };
  return swallow(() => elimPublicClient().from(ELIM_PENDING_TABLE).upsert({
    event_id: String(eventId),
    match_id: String(matchId),
    winner_id: String(winnerId),
    score: score ? String(score) : null,
    submitted_by: submittedBy ? String(submittedBy) : null,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'event_id,match_id' }));
}

export async function deleteElimPending(eventId, matchId) {
  if (!eventId || !matchId) return { error: null };
  return swallow(() => supabase
    .from(ELIM_PENDING_TABLE)
    .delete()
    .eq('event_id', String(eventId))
    .eq('match_id', String(matchId)));
}

export async function clearElimPending(eventId) {
  if (!eventId) return { error: null };
  return swallow(() => supabase
    .from(ELIM_PENDING_TABLE)
    .delete()
    .eq('event_id', String(eventId)));
}

export function syncElimCloud(tournament) {
  if (!tournament?.id) return;
  Promise.resolve().then(() => publishElimEvent(tournament));
}
