import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/consignment-bidder-accounts-2026-10.sql in the Supabase SQL editor, then refresh.';

/** No search: everyone who has bid. With a search: matching accounts (name or email). Admin only. */
export async function loadBidderAccounts(search = '') {
  const { data, error } = await supabase.rpc('admin_consignment_bidder_accounts', { p_search: search || null });
  if (error) {
    if (/could not find the function|schema cache|does not exist/i.test(error.message || '')) throw new Error(MISSING);
    throw new Error(error.message || 'Could not load bidders.');
  }
  return data || [];
}
