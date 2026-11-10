import { supabase } from '@shared/config/supabase.js';

export const PURCHASES_MISSING = 'Run supabase-migrations/consignment-my-purchases-2026-11.sql in the Supabase SQL editor, then refresh.';

/** What the signed-in buyer won or bought for pickup (not shipped). Throws PURCHASES_MISSING before the migration runs. */
export async function loadMyPurchases() {
  const { data, error } = await supabase.rpc('my_consignment_purchases');
  if (error) {
    if (/could not find|schema cache|does not exist/i.test(error.message || '')) throw new Error(PURCHASES_MISSING);
    throw new Error(error.message || 'Could not load your purchases.');
  }
  return Array.isArray(data) ? data : [];
}
