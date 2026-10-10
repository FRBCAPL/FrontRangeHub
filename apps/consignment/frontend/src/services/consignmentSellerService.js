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

const NEXT_STEP_MISSING = 'Run supabase-migrations/consignment-seller-next-step-2026-10.sql in the Supabase SQL editor, then refresh.';

/**
 * Seller's pick after an unsold auction: 'relist' (with a reserve), 'fixed' or 'keep'.
 * Returns { started, fee?, drop_pct? } — started is true when a free relist went live right away.
 */
export async function chooseNextStep(itemId, choice, reserve = null) {
  const { data, error } = await supabase.rpc('consignment_seller_next_step', {
    p_item_id: itemId,
    p_choice: choice,
    p_reserve: reserve === '' || reserve == null ? null : Number(reserve),
  });
  if (error) {
    const msg = error.message || '';
    if (/consignment_seller_next_step|schema cache|does not exist/i.test(msg)) throw new Error(NEXT_STEP_MISSING);
    throw new Error(msg || 'Could not save your choice.');
  }
  return data || {};
}

export async function currentUserEmail() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.email || '';
}
