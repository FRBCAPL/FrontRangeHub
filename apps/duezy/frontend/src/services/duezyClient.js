import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@shared/config/supabase.js';

/**
 * Duezy keeps its own login session (storageKey 'duezy-auth') so signing in to Duezy
 * never signs anyone in to the Front Range hub, and vice versa.
 */
const GLOBAL_KEY = '__DUEZY_SUPABASE_CLIENT__';
const store = typeof globalThis !== 'undefined' ? globalThis : window;

if (!store[GLOBAL_KEY]) {
  store[GLOBAL_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'duezy-auth',
    },
  });
}

export const duezy = store[GLOBAL_KEY];
export default duezy;
