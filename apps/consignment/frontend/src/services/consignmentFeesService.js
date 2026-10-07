import { supabase } from '@shared/config/supabase.js';
import { addDays, renewedExpiry } from '../utils/consignmentDates.js';

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

async function patchItem(id, patch) {
  const { error } = await supabase
    .from('consignment_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) fail(error, 'Could not update the item.');
}

/** Starts the consignment window when an item is accepted and listed. */
export function intakePatch(days) {
  const now = new Date();
  return { intake_at: now.toISOString(), expires_at: addDays(now, days).toISOString() };
}

/** Records a renewal fee, extends the window, and puts an expired item back on sale. */
/** `itemPatch` carries extra columns to update with the renewal (e.g. a lowered shop price). */
export async function renewItem(item, { amount, days, paymentMethod, note = null, itemPatch = null }) {
  await recordFee(item.id, { kind: 'renewal', amount, days, paymentMethod, note });
  await patchItem(item.id, {
    ...itemPatch,
    status: 'available',
    expires_at: renewedExpiry(item.expires_at, days).toISOString(),
  });
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
