import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@shared/config/supabase.js';
import { savedEventSummary, tournamentFromEventRow } from '../cash-climb/cashClimbSaved.js';
import { isBreakAndRunSessionLive } from './breakAndRunSessions.js';

export const BREAK_AND_RUN_EVENTS_TABLE = 'break_and_run_events';

const PUBLIC_KEY = '__FRPH_BREAK_AND_RUN_PUBLIC__';

function publicClient() {
  const store = typeof globalThis !== 'undefined' ? globalThis : window;
  if (!store[PUBLIC_KEY]) {
    store[PUBLIC_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'frph-break-and-run-public',
      },
    });
  }
  return store[PUBLIC_KEY];
}

function isMissingTable(error) {
  const msg = String(error?.message || error?.code || '');
  return error?.code === 'PGRST205' || error?.code === '42P01' || /break_and_run_/i.test(msg) && /does not exist|schema cache/i.test(msg);
}

async function swallow(work) {
  try {
    const result = await work();
    if (result?.error) {
      if (!isMissingTable(result.error)) {
        console.warn('Break and Run cloud:', result.error.message || result.error);
      }
      return { data: null, error: result.error };
    }
    return { data: result?.data ?? null, error: null };
  } catch (error) {
    console.warn('Break and Run cloud:', error?.message || error);
    return { data: null, error };
  }
}

function cloudStatus(tournament) {
  if (tournament?.status === 'completed') return 'completed';
  if (tournament?.status === 'ended') return 'ended';
  return 'in-progress';
}

function withKind(item) {
  if (!item) return item;
  return { ...item, kind: 'break-and-run', type: item.type || 'break-and-run' };
}

export async function publishBreakAndRunEvent(tournament) {
  if (!tournament?.id) return { error: null };
  return swallow(() => supabase.from(BREAK_AND_RUN_EVENTS_TABLE).upsert({
    id: String(tournament.id),
    payload: tournament,
    status: cloudStatus(tournament),
    updated_at: new Date().toISOString(),
  }));
}

export async function parkLiveBreakAndRunEvent(tournament) {
  if (!tournament?.id) return { error: null };
  if (tournament.status === 'completed' || tournament.status === 'ended') return { error: null };
  return publishBreakAndRunEvent({ ...tournament, status: 'in-progress' });
}

export async function retireBreakAndRunEvent(tournament) {
  if (!tournament?.id) return { error: null };
  return swallow(() => supabase.from(BREAK_AND_RUN_EVENTS_TABLE).upsert({
    id: String(tournament.id),
    payload: tournament,
    status: tournament.status === 'completed' ? 'completed' : 'ended',
    updated_at: new Date().toISOString(),
  }));
}

export async function loadLiveBreakAndRunEvent() {
  const authed = await swallow(() => supabase
    .from(BREAK_AND_RUN_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle());
  if (authed.data) return { tournament: tournamentFromEventRow(authed.data), error: null };
  const pub = await swallow(() => publicClient()
    .from(BREAK_AND_RUN_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle());
  return { tournament: tournamentFromEventRow(pub.data), error: pub.error || authed.error };
}

export async function loadBreakAndRunEventById(eventId) {
  if (!eventId) return { tournament: null, error: null };
  const authed = await swallow(() => supabase
    .from(BREAK_AND_RUN_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('id', String(eventId))
    .maybeSingle());
  if (authed.data) return { tournament: tournamentFromEventRow(authed.data), error: null };
  const pub = await swallow(() => publicClient()
    .from(BREAK_AND_RUN_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('id', String(eventId))
    .maybeSingle());
  return { tournament: tournamentFromEventRow(pub.data), error: pub.error || authed.error };
}

/**
 * Push updates when the operator upserts. No polling.
 * Returns an unsubscribe function.
 */
export function subscribeBreakAndRunEvent(eventId, onRow) {
  if (!eventId || typeof onRow !== 'function') return () => {};
  const client = publicClient();
  const channel = client
    .channel(`bnr-display-${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: BREAK_AND_RUN_EVENTS_TABLE,
        filter: `id=eq.${String(eventId)}`,
      },
      (payload) => {
        const row = payload?.new;
        if (!row) return;
        onRow(row);
      }
    )
    .subscribe();
  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      /* ignore */
    }
  };
}

export async function listLiveBreakAndRunEvents() {
  const authed = await swallow(() => supabase
    .from(BREAK_AND_RUN_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false })
    .limit(12));
  let rows = Array.isArray(authed.data) ? authed.data : [];
  if (!rows.length) {
    const pub = await swallow(() => publicClient()
      .from(BREAK_AND_RUN_EVENTS_TABLE)
      .select('id, payload, status, updated_at')
      .eq('status', 'in-progress')
      .order('updated_at', { ascending: false })
      .limit(12));
    rows = Array.isArray(pub.data) ? pub.data : [];
  }
  return rows
    .map(savedEventSummary)
    .map(withKind)
    .filter((item) => (
      item
      && item.status === 'in-progress'
      && isBreakAndRunSessionLive(item.tournament)
    ));
}

export async function listSavedBreakAndRunEvents() {
  const result = await swallow(() => supabase
    .from(BREAK_AND_RUN_EVENTS_TABLE)
    .select('id, payload, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(24));
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(savedEventSummary).map(withKind).filter(Boolean);
}

export async function deleteBreakAndRunEvent(eventId) {
  if (!eventId) return { error: null };
  return swallow(() => supabase.from(BREAK_AND_RUN_EVENTS_TABLE).delete().eq('id', String(eventId)));
}

export function syncBreakAndRunCloud(tournament) {
  if (!tournament?.id) return;
  Promise.resolve().then(() => publishBreakAndRunEvent(tournament));
}
