/** The app's Showdown cloud: the signed-in operator session plus a session-less public client. */
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@shared/config/supabase.js';
import { createShowdownCloud } from './showdownCloudApi.js';

const PUBLIC_KEY = '__FRPH_SHOWDOWN_PUBLIC__';

function publicClient() {
  const store = typeof globalThis !== 'undefined' ? globalThis : window;
  if (!store[PUBLIC_KEY]) {
    store[PUBLIC_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'frph-showdown-public' },
    });
  }
  return store[PUBLIC_KEY];
}

export const showdownCloud = createShowdownCloud({ operator: supabase, publicClient: publicClient() });
