import { supabase } from '@shared/config/supabase.js';
import { addDays } from '../utils/consignmentDates.js';

const MISSING = 'Run supabase-migrations/consignment-fees-2026-10.sql in the Supabase SQL editor, then refresh.';

function fail(error, fallback) {
  if (/does not exist|schema cache|consignment_fees|expires_at|intake_at|transaction_fee/i.test(error?.message || '')) {
    throw new Error(MISSING);
  }
  throw new Error(error?.message || fallback);
}

export async function loadFeesForItems(ids) {
  if (!ids?.length) return {};
  const { data, error } = await supabase
    .from('consignment_fees')
    .select('*')
    .in('item_id', ids)
    .order('paid_at', { ascending: true });
  if (error) fail(error, 'Could not load fees.');
  const byItem = {};
  for (const row of data || []) {
    (byItem[row.item_id] ||= []).push(row);
  }
  return byItem;
}

export async function recordFee(itemId, { kind, amount, days = null, paymentMethod = null, note = null }) {
  const { data, error } = await supabase
    .from('consignment_fees')
    .insert({
      item_id: itemId,
      kind,
      amount: Number(amount),
      days: days ? Number(days) : null,
      payment_method: paymentMethod || null,
      note: note || null,
    })
    .select()
    .single();
  if (error) fail(error, 'Could not record the fee.');
  return data;
}

export async function deleteFee(id) {
  const { error } = await supabase.from('consignment_fees').delete().eq('id', id);
  if (error) fail(error, 'Could not delete the fee.');
}

/** Starts the consignment window when an item is accepted and listed. */
export function intakePatch(days) {
  const now = new Date();
  return { intake_at: now.toISOString(), expires_at: addDays(now, days).toISOString() };
}

const ATOMIC_MISSING = 'Run supabase-migrations/consignment-admin-safety-2026-10.sql in the Supabase SQL editor, then try again.';

function failAtomic(error, fallback) {
  if (/consignment_admin_(approve|renew)|schema cache|could not find the function/i.test(error?.message || '')) {
    throw new Error(ATOMIC_MISSING);
  }
  throw new Error(error?.message || fallback);
}

/** Lists a pending shelf item and records its listing fee in one transaction. */
export async function approveItem(itemId, {
  sellerPayout, sellingPrice, fee, commissionPct, days, paymentMethod = null, allowInspection = null,
}) {
  const { error } = await supabase.rpc('consignment_admin_approve', {
    p_item_id: itemId,
    p_seller_payout: Number(sellerPayout),
    p_selling_price: Number(sellingPrice),
    p_fee: Number(fee) || 0,
    p_commission_pct: Number(commissionPct),
    p_days: Number(days),
    p_payment_method: paymentMethod,
    p_allow_inspection: allowInspection,
  });
  if (error) failAtomic(error, 'Could not approve this item.');
}

/**
 * Records a renewal fee, extends the window, and puts an expired item back on sale, in one transaction.
 * `newPayout` (with `consent` when lowering) changes the agreed price; the shop price moves by the same %.
 */
export async function renewItem(item, {
  amount, days, paymentMethod, note = null, newPayout = null, consent = null, payoutNote = null,
}) {
  const { error } = await supabase.rpc('consignment_admin_renew', {
    p_item_id: item.id,
    p_fee: Number(amount) || 0,
    p_days: Number(days),
    p_payment_method: paymentMethod || null,
    p_note: note,
    p_new_payout: newPayout == null ? null : Number(newPayout),
    p_consent: consent,
    p_payout_note: payoutNote,
  });
  if (error) failAtomic(error, 'Could not renew this item.');
}

/** Moves listings past their window to Expired – Awaiting Pickup. Returns how many changed. */
export async function expireOverdueItems() {
  const { data, error } = await supabase
    .from('consignment_items')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('status', 'available')
    .lt('expires_at', new Date().toISOString())
    .select('id');
  if (error) fail(error, 'Could not check expired listings.');
  return data?.length || 0;
}
