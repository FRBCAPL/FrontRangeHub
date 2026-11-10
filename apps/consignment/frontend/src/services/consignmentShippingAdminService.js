import { BACKEND_URL } from '@shared/config/config.js';
import { supabase } from '@shared/config/supabase.js';
import { loadFeesForItems } from './consignmentFeesService.js';
import { loadShippingInfo, shippingError } from './consignmentShippingService.js';

async function call(fn, args, fallback) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw shippingError(error, fallback);
  return data;
}

/** scope: open (needs a step, or delivered and the seller not paid yet) | all (last 90 days). */
export async function loadShipmentsAdmin(scope = 'open') {
  return (await call('admin_consignment_shipments', { p_scope: scope }, 'Could not load shipping requests.')) || [];
}

/** action: invoiced | paid | shipped | arrived | cancel | note */
export const updateShipment = (id, action, { note = '', link = '', carrier = '', tracking = '' } = {}) => call(
  'admin_update_consignment_shipment',
  {
    p_shipment_id: id,
    p_action: action,
    p_note: note || null,
    p_link: link || null,
    p_carrier: carrier || null,
    p_tracking: tracking || null,
  },
  'Could not update the shipping request.',
);

/** resolution: pay_seller (the seller can be paid) | refunded (the seller isn't paid). The buyer gets an email. */
export const resolveShipmentProblem = (id, resolution, note = '') => call(
  'admin_resolve_consignment_shipment',
  { p_shipment_id: id, p_resolution: resolution, p_note: note || null },
  'Could not resolve the problem.',
);

async function backend(path, body = {}, fallback = 'Could not reach the server.') {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please log in again.');
  let res;
  try {
    res = await fetch(`${BACKEND_URL}/api/consignment-shipping/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`${fallback} The server may be waking up; try again in a minute.`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || fallback);
  return json;
}

/** Creates (or replaces) the Square payment link and emails it to the buyer. */
export const sendSquareLink = (id, note = '') => backend(`${id}/payment-link`, { note }, 'Could not create the Square link.');

/** Turns the Square link off so it can't be paid (before cancelling). Fails if the buyer already paid. */
export const voidSquareLink = (id) => backend(`${id}/void-link`, {}, 'Could not turn off the Square link.');

/** Asks Square whether the buyer paid. result: paid | already | fee_updated | unpaid | short | cancelled | no_link */
export const checkSquarePayment = (id) => backend(`${id}/check-payment`, {}, 'Could not check with Square.');

/** ships false turns shipping off for the item. fixed null = automatic price; a number = this item's own price. */
export async function saveItemShipping(itemId, { ships, fixed = null }) {
  if (!ships) {
    const { error } = await supabase.from('consignment_item_shipping').delete().eq('item_id', itemId);
    if (error) throw shippingError(error, 'Could not turn off shipping for this item.');
    return;
  }
  const { error } = await supabase
    .from('consignment_item_shipping')
    .upsert({ item_id: itemId, shipping_price: fixed == null ? null : Number(fixed), updated_at: new Date().toISOString() });
  if (error) throw shippingError(error, 'Could not save the shipping price.');
}

/** rules (optional): { baseRates, insurancePer100, includedCoverage } for automatic prices. */
export async function saveShippingSettings({ enabled, complaintDays, rules = null }) {
  const row = {
    shipping_enabled: Boolean(enabled),
    shipping_complaint_days: Number(complaintDays),
    updated_at: new Date().toISOString(),
  };
  if (rules) {
    row.shipping_base_rates = rules.baseRates;
    row.shipping_insurance_per_100 = Number(rules.insurancePer100);
    row.shipping_included_coverage = Number(rules.includedCoverage);
  }
  const { error } = await supabase
    .from('consignment_settings')
    .update(row)
    .eq('id', 'frpl');
  if (error) throw shippingError(error, 'Could not save the shipping settings.');
  await loadShippingInfo({ fresh: true });
}

/** A case item with its fees, for the Sold screen. */
export async function loadItemForSale(itemId) {
  const { data, error } = await supabase.from('consignment_items').select('*').eq('id', itemId).maybeSingle();
  if (error) throw new Error(error.message || 'Could not load the item.');
  if (!data) throw new Error('Item not found.');
  const fees = await loadFeesForItems([itemId]);
  return { ...data, fees: fees[itemId] || [] };
}

/** An auction with its item and winner, for the Auction paid screen. */
export async function loadAuctionForPayment(auctionId) {
  const { data, error } = await supabase
    .from('consignment_auctions')
    .select('*, item:consignment_items(id, item_number, category, name, status, sale_method)')
    .eq('id', auctionId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not load the auction.');
  if (!data) throw new Error('Auction not found.');
  const { data: winner } = data.winner_id
    ? await supabase.from('users').select('*').eq('id', data.winner_id).maybeSingle()
    : { data: null };
  return { ...data, winner: winner || null };
}
