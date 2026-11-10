import { supabase } from '@shared/config/supabase.js';
import { DEFAULT_COMPLAINT_DAYS } from '../utils/consignmentShipping.js';

export const SHIPPING_MISSING = 'Run supabase-migrations/consignment-shipping-2026-11.sql in the Supabase SQL editor, then refresh.';

export const SHIPPING_OFF = Object.freeze({ enabled: false, complaintDays: DEFAULT_COMPLAINT_DAYS });

export function shippingError(error, fallback) {
  if (/could not find|schema cache|does not exist/i.test(error?.message || '')) return new Error(SHIPPING_MISSING);
  return new Error(error?.message || fallback);
}

async function call(fn, args, fallback) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw shippingError(error, fallback);
  return data;
}

let infoPromise = null;

/** { enabled, complaintDays }. Off before the migration runs. Cached; pass fresh after the admin changes it. */
export function loadShippingInfo({ fresh = false } = {}) {
  if (!infoPromise || fresh) {
    infoPromise = supabase.rpc('consignment_shipping_public')
      .then(({ data, error }) => (error || !data ? SHIPPING_OFF : {
        enabled: Boolean(data.enabled),
        complaintDays: Number(data.complaint_days) || DEFAULT_COMPLAINT_DAYS,
      }))
      .catch(() => SHIPPING_OFF);
  }
  return infoPromise;
}

/** { [item_id]: shipping price }. Shoppers only get rows while shipping is on; empty before the migration runs. */
export async function loadShipPrices(itemIds = null) {
  if (Array.isArray(itemIds) && !itemIds.length) return {};
  let query = supabase.from('consignment_item_shipping').select('item_id, shipping_price');
  if (Array.isArray(itemIds)) query = query.in('item_id', itemIds);
  const { data, error } = await query;
  if (error) return {};
  return Object.fromEntries((data || []).map((r) => [r.item_id, Number(r.shipping_price)]));
}

export async function loadShipPrice(itemId) {
  const prices = await loadShipPrices([itemId]);
  return prices[itemId] ?? null;
}

/** Case items someone is buying for shipping (shop "On hold" ribbon). Empty before the migration runs. */
export async function loadShippingHeldIds() {
  const { data, error } = await supabase.rpc('consignment_items_shipping_hold');
  if (error) return new Set();
  return new Set((data || []).map((row) => (typeof row === 'string' ? row : row.consignment_items_shipping_hold)));
}

/** address: { name, line1, line2, city, state, zip, phone }. Returns { id, total }. */
export const requestShipping = (itemId, address, note) => call(
  'request_consignment_shipping',
  { p_item_id: itemId, p_address: address, p_note: note || null },
  'Could not send the shipping request.',
);

export const cancelShipping = (shipmentId) => call(
  'cancel_consignment_shipping',
  { p_shipment_id: shipmentId },
  'Could not cancel the shipping request.',
);

/** Empty before the migration runs. */
export async function loadMyShipments() {
  const { data, error } = await supabase.rpc('my_consignment_shipments');
  if (error) return [];
  return data || [];
}

/** The signed-in buyer's open (not cancelled) shipment for one item, or null. */
export async function loadMyShipmentForItem(itemId, userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('consignment_shipments')
    .select('*')
    .eq('item_id', itemId)
    .eq('buyer_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return null;
  return data?.[0] || null;
}
