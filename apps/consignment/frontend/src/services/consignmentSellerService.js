import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/consignment-seller-portal-2026-10.sql in the Supabase SQL editor, then refresh.';

/** Items the signed-in user consigned (matched by account or seller email). */
export async function loadMyItems() {
  const { data, error } = await supabase.rpc('my_consignment_items');
  if (error) {
    const msg = error.message || '';
    if (/my_consignment_items|schema cache|does not exist/i.test(msg)) throw new Error(MISSING);
    throw new Error(msg || 'Could not load your items.');
  }
  return Array.isArray(data) ? data : [];
}

export async function currentUserEmail() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.email || '';
}
