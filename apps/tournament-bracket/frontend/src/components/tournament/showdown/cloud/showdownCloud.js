/**
 * The app's Showdown cloud: the signed-in operator session plus a session-less public client, behind the
 * development guard (showdownCloudGuard.js) that keeps V3 test events out of the live database.
 */
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@shared/config/supabase.js';
import { createShowdownCloud } from './showdownCloudApi.js';
import { createGuardedCloud } from './showdownCloudGuard.js';
import { createIsolatedCloud } from './showdownIsolatedCloud.js';
import { savedToIsolatedCloud } from './showdownSyncStore.js';
import { v3PreviewAvailable, v3PreviewOn } from '../operator/v3/showdownV3Preview.js';

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

export const showdownCloud = createGuardedCloud({
  live: createShowdownCloud({ operator: supabase, publicClient: publicClient() }),
  isolated: () => createIsolatedCloud(),
  isolationOn: () => v3PreviewOn(),
  devBuild: () => v3PreviewAvailable(),
  isolatedOrigin: savedToIsolatedCloud,
});
