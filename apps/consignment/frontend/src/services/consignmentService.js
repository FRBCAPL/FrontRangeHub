import { supabase } from '@shared/config/supabase.js';
import { shelfSaleSplit } from '../utils/consignmentFeePolicy.js';
import { deleteConsignmentPhotos } from './consignmentPhotos.js';
import { loadFeesForItems } from './consignmentFeesService.js';
import { loadLatestAuctionsForItems } from './consignmentAuctionAdminService.js';
import { EXPIRING_SOON_DAYS } from '../data/consignmentConstants.js';

export const SOLD_PHOTO_DAYS = 30;

const MISSING = 'Run the consignment SQL files in supabase-migrations/ (consignment-2026-10.sql, consignment-model-2026-10.sql, then consignment-seller-payout-2026-10.sql, consignment-photos-2026-10.sql, consignment-fees-2026-10.sql, consignment-payouts-2026-10.sql, consignment-auctions-2026-10.sql, consignment-auction-payments-2026-10.sql, consignment-auction-reserve-2026-10.sql, consignment-auction-terms-2026-10.sql) in the Supabase SQL editor, then refresh.';

function missingSchema(error) {
  return /does not exist|schema cache|consignment_/i.test(error?.message || '');
}

function throwNice(error, fallback) {
  if (missingSchema(error)) throw new Error(MISSING);
  throw new Error(error?.message || fallback);
}

export async function loadSettings() {
  const { data, error } = await supabase
    .from('consignment_settings')
    .select('*')
    .eq('id', 'frpl')
    .maybeSingle();
  if (error) throwNice(error, 'Could not load consignment settings.');
  return data;
}

export async function saveAgreementText(agreement_text) {
  const { error } = await supabase
    .from('consignment_settings')
    .update({ agreement_text, updated_at: new Date().toISOString() })
    .eq('id', 'frpl');
  if (error) throwNice(error, 'Could not save the agreement.');
}

export async function saveAuctionAgreementText(auction_agreement_text) {
  const { error } = await supabase
    .from('consignment_settings')
    .update({ auction_agreement_text, updated_at: new Date().toISOString() })
    .eq('id', 'frpl');
  if (error) throwNice(error, 'Could not save the auction agreement.');
}

export async function loadCatalog({ category = 'all', status = 'available' } = {}) {
  let query = supabase
    .from('consignment_catalog')
    .select('*')
    .order('created_at', { ascending: false });
  if (category && category !== 'all') query = query.eq('category', category);
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throwNice(error, 'Could not load the shop.');
  return data || [];
}

export async function loadPublicItem(itemNumber) {
  const { data, error } = await supabase
    .from('consignment_catalog')
    .select('*')
    .eq('item_number', itemNumber)
    .maybeSingle();
  if (error) throwNice(error, 'Could not load this item.');
  return data;
}

export async function submitItem(payload) {
  const { data, error } = await supabase.rpc('submit_consignment_item', { payload });
  if (error) throwNice(error, 'Could not submit this item.');
  return data;
}

export async function loadAdminItemByNumber(itemNumber) {
  const { data, error } = await supabase
    .from('consignment_items')
    .select('*')
    .eq('item_number', itemNumber)
    .maybeSingle();
  if (error) throwNice(error, 'Could not load this item.');
  return data;
}

/** status: a status id, 'all', or 'expiring' (listed and ending within EXPIRING_SOON_DAYS). */
export async function loadAdminItems(status = 'all') {
  let query = supabase.from('consignment_items').select('*');
  if (status === 'expiring') {
    const soon = new Date(Date.now() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000).toISOString();
    query = query.eq('status', 'available').lte('expires_at', soon).order('expires_at', { ascending: true });
  } else if (status === 'seller_unpaid') {
    query = query.eq('status', 'sold').is('seller_paid_at', null).order('sold_at', { ascending: true });
  } else {
    if (status && status !== 'all') query = query.eq('status', status);
    query = query.order('created_at', { ascending: false });
  }
  const { data, error } = await query;
  if (error) throwNice(error, 'Could not load submissions.');
  const items = data || [];
  const ids = items.map((row) => row.id);
  if (!ids.length) return items;
  const [{ data: sellers, error: sellerError }, feesByItem, auctionByItem] = await Promise.all([
    supabase.from('consignment_sellers').select('item_id, full_name, phone, email').in('item_id', ids),
    loadFeesForItems(ids),
    loadLatestAuctionsForItems(ids),
  ]);
  if (sellerError) throwNice(sellerError, 'Could not load sellers.');
  const byItem = Object.fromEntries((sellers || []).map((row) => [row.item_id, row]));
  return items.map((row) => ({
    ...row,
    seller: byItem[row.id] || null,
    fees: feesByItem[row.id] || [],
    auction: auctionByItem[row.id] || null,
  }));
}

export async function updateItem(id, patch) {
  const { error } = await supabase
    .from('consignment_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throwNice(error, 'Could not save this item.');
}

export async function clearItemPhotos(item) {
  await deleteConsignmentPhotos(item.photo_urls);
  await updateItem(item.id, { photo_urls: [] });
}

/** Deletes photos for items sold more than SOLD_PHOTO_DAYS ago. Returns how many items were cleaned. */
export async function purgeExpiredSoldPhotos() {
  const cutoff = new Date(Date.now() - SOLD_PHOTO_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('consignment_items')
    .select('id, photo_urls')
    .eq('status', 'sold')
    .lt('sold_at', cutoff)
    .neq('photo_urls', '{}');
  if (error) throwNice(error, 'Could not check old sold photos.');
  const rows = (data || []).filter((row) => row.photo_urls?.length);
  for (const row of rows) {
    await clearItemPhotos(row);
  }
  return rows.length;
}

export async function markSold(item, { actualSellingPrice, paymentMethod, transactionFee = null }) {
  const actual = Number(actualSellingPrice);
  const split = shelfSaleSplit(item, actual);
  const patch = {
    status: 'sold',
    actual_selling_price: actual,
    seller_payout_paid: split.sellerFromSale,
    frpl_revenue: split.frplFromSale,
    sold_at: new Date().toISOString(),
    payment_method: paymentMethod,
  };
  if (transactionFee != null) patch.transaction_fee = Number(transactionFee);
  return updateItem(item.id, patch);
}
