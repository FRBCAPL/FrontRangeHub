import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@shared/config/supabase.js';

/**
 * ItemSure keeps its own login session (storageKey 'itemsure-auth') so signing in
 * to ItemSure never signs anyone in to the Front Range hub, and vice versa.
 * Its tables live in the `itemsure` schema, which must be listed under
 * Supabase → API → Exposed schemas.
 */
const GLOBAL_KEY = '__ITEMSURE_SUPABASE_CLIENT__';
const store = typeof globalThis !== 'undefined' ? globalThis : window;

if (!store[GLOBAL_KEY]) {
  store[GLOBAL_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'itemsure' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'itemsure-auth',
    },
  });
}

export const itemsure = store[GLOBAL_KEY];
export default itemsure;
