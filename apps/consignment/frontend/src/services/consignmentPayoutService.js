import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/consignment-payouts-2026-10.sql in the Supabase SQL editor, then refresh.';

function fail(error, fallback) {
  const msg = error?.message || '';
  if (/consignment_item_events|change_consignment_payout|seller_paid|schema cache|does not exist/i.test(msg)) {
    throw new Error(MISSING);
  }
  throw new Error(msg || fallback);
}

export async function changePayout(itemId, { newPayout, consent, note }) {
  const { error } = await supabase.rpc('change_consignment_payout', {
    p_item_id: itemId,
    p_new_payout: Number(newPayout),
    p_consent: consent || null,
    p_note: note || null,
  });
  if (error) fail(error, 'Could not change the payout.');
}

export async function markSellerPaid(itemId, { method, paidAt }) {
  const { error } = await supabase
    .from('consignment_items')
    .update({
      seller_paid_at: paidAt || new Date().toISOString(),
      seller_paid_method: method || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);
  if (error) fail(error, 'Could not mark the seller paid.');
}

export async function clearSellerPaid(itemId) {
  const { error } = await supabase
    .from('consignment_items')
    .update({ seller_paid_at: null, seller_paid_method: null, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) fail(error, 'Could not undo the seller payment.');
}

export async function loadItemEvents(itemId) {
  const { data, error } = await supabase
    .from('consignment_item_events')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });
  if (error) fail(error, 'Could not load history.');
  return data || [];
}

export async function addItemNote(itemId, note) {
  const { data, error } = await supabase
    .from('consignment_item_events')
    .insert({ item_id: itemId, kind: 'note', note })
    .select()
    .single();
  if (error) fail(error, 'Could not save the note.');
  return data;
}
