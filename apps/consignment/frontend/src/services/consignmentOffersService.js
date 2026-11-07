import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/consignment-offers-2026-11.sql in the Supabase SQL editor, then refresh.';

function fail(error, fallback) {
  if (/could not find the function|schema cache|does not exist/i.test(error?.message || '')) throw new Error(MISSING);
  throw new Error(error?.message || fallback);
}

async function call(fn, args, fallback) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) fail(error, fallback);
  return data;
}

/**
 * Item page: { reason, asking, minimum, sale_method, hold_until, signed_in, is_seller, offer_days, hold_days, my_offer }.
 * reason is null when the item takes offers. Null (no button) if the migration hasn't run.
 */
export async function loadOfferTerms(itemId) {
  const { data, error } = await supabase.rpc('consignment_offer_terms', { p_item_id: itemId });
  if (error) return null;
  return data;
}

export const makeOffer = (itemId, amount, message) => call(
  'make_consignment_offer',
  { p_item_id: itemId, p_amount: Number(amount), p_message: message || null },
  'Could not send the offer.',
);

/** action: accept | decline | counter */
export const respondToOffer = (offerId, action, amount = null, note = '') => call(
  'respond_consignment_offer',
  { p_offer_id: offerId, p_action: action, p_amount: amount == null ? null : Number(amount), p_note: note || null },
  'Could not update the offer.',
);

export const withdrawOffer = (offerId) => call('withdraw_consignment_offer', { p_offer_id: offerId }, 'Could not withdraw the offer.');

export const releaseOfferHold = (offerId, note = '') => call(
  'admin_release_consignment_offer',
  { p_offer_id: offerId, p_note: note || null },
  'Could not end the hold.',
);

export async function loadMyOffers() {
  return (await call('my_consignment_offers', {}, 'Could not load your offers.')) || [];
}

/** Offers on items the signed-in user consigned. Empty before the migration runs. */
export async function loadSellerOffers() {
  const { data, error } = await supabase.rpc('seller_consignment_offers');
  if (error) return [];
  return data || [];
}

/** scope: active (open + accepted) | all (last 90 days). Admin only. */
export async function loadAdminOffers(scope = 'active') {
  return (await call('admin_consignment_offers', { p_scope: scope }, 'Could not load offers.')) || [];
}

/** The accepted (held) offer on an item, for the admin Sold screen. Null if none or before the migration runs. */
export async function loadAcceptedOffer(itemId) {
  const { data, error } = await supabase
    .from('consignment_offers')
    .select('id, amount, hold_until, buyer_id')
    .eq('item_id', itemId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (error) return null;
  return data;
}

/** Ids of fixed-price items held for a buyer (shop "On hold" ribbon). Empty before the migration runs. */
export async function loadHeldItemIds() {
  const { data, error } = await supabase.rpc('consignment_items_on_hold');
  if (error) return new Set();
  return new Set((data || []).map((row) => (typeof row === 'string' ? row : row.consignment_items_on_hold)));
}
