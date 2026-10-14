import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/consignment-watch-list-2026-10.sql in the Supabase SQL editor, then refresh.';

const MISSING_CODES = ['42P01', '42883', 'PGRST202', 'PGRST205'];

function fail(error, fallback) {
  if (MISSING_CODES.includes(error?.code)) throw new Error(MISSING);
  throw new Error(error?.message || fallback);
}

/** Item ids the user watches. Empty when signed out or the watch-list SQL hasn't run. */
export async function loadWatchedIds(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabase.from('consignment_watches').select('item_id').eq('user_id', userId);
  if (error) return new Set();
  return new Set((data || []).map((r) => r.item_id));
}

export async function watchItem(userId, itemId) {
  const { error } = await supabase.from('consignment_watches').insert({ user_id: userId, item_id: itemId });
  if (error && !/duplicate key/i.test(error.message || '')) fail(error, 'Could not add it to your watch list.');
}

export async function unwatchItem(userId, itemId) {
  const { error } = await supabase.from('consignment_watches').delete().eq('user_id', userId).eq('item_id', itemId);
  if (error) fail(error, 'Could not remove it from your watch list.');
}

/** How many people watch an item; null if unavailable. */
export async function loadWatchCount(itemId) {
  const { data, error } = await supabase.rpc('consignment_watch_count', { p_item_id: itemId });
  return error ? null : Number(data) || 0;
}
