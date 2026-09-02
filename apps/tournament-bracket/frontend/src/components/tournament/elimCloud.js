import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@shared/config/supabase.js';
import { savedEventSummary, tournamentFromEventRow } from './cash-climb/cashClimbSaved.js';

export const ELIM_EVENTS_TABLE = 'elim_events';

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
  return error?.code === 'PGRST205' || error?.code === '42P01' || /elim_events/i.test(msg) && /does not exist|schema cache/i.test(msg);
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

export function syncElimCloud(tournament) {
  if (!tournament?.id) return;
  Promise.resolve().then(() => publishElimEvent(tournament));
}
