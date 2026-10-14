import { supabase } from '@shared/config/supabase.js';
import { AUCTION_DAYS } from '../utils/consignmentAuctionDates.js';
import { openingBid } from '../utils/consignmentAuctionMath.js';

export * from './consignmentAuctionDeliveryService.js';

const MISSING = 'Run supabase-migrations/consignment-auctions-2026-10.sql in the Supabase SQL editor, then refresh.';
const ACTIVE = ['draft', 'live', 'awaiting_payment'];

function fail(error, fallback) {
  if (/does not exist|schema cache|consignment_auction|sale_method|auction_/i.test(error?.message || '')) {
    throw new Error(MISSING);
  }
  throw new Error(error?.message || fallback);
}

async function patchItem(id, patch) {
  const { error } = await supabase
    .from('consignment_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) fail(error, 'Could not update the item.');
}

async function loadUsers(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.from('users').select('*').in('id', unique);
  if (error) return {};
  return Object.fromEntries((data || []).map((u) => [u.id, u]));
}

export function bidderName(user) {
  if (!user) return '';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || '';
}

/** Latest auction per item id (for the items table). Empty if the auction migration hasn't run. */
export async function loadLatestAuctionsForItems(ids) {
  if (!ids?.length) return {};
  const { data, error } = await supabase
    .from('consignment_auctions')
    .select('*')
    .in('item_id', ids)
    .order('created_at', { ascending: false });
  if (error) return {};
  const byItem = {};
  for (const row of data || []) {
    if (!byItem[row.item_id]) byItem[row.item_id] = row;
  }
  return byItem;
}

/** status: an auction status id or 'all'. Attaches item, seller, and high bidder / winner. */
export async function loadAdminAuctions(status = 'live') {
  await supabase.rpc('close_due_consignment_auctions');
  let query = supabase
    .from('consignment_auctions')
    .select('*, item:consignment_items(id, item_number, category, name, brand, model, condition, specs, description, photo_urls, seller_payout, status, sale_method, intake_at)');
  if (status && status !== 'all') query = query.eq('status', status);
  query = status === 'live'
    ? query.order('ends_at', { ascending: true })
    : query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) fail(error, 'Could not load auctions.');
  const rows = data || [];
  const itemIds = rows.map((r) => r.item_id);
  const [users, { data: sellers }, otherBidders] = await Promise.all([
    loadUsers(rows.flatMap((r) => [r.current_bidder, r.winner_id])),
    itemIds.length
      ? supabase.from('consignment_sellers').select('item_id, full_name, phone, email').in('item_id', itemIds)
      : Promise.resolve({ data: [] }),
    countOtherBidders(rows.filter((r) => r.status === 'defaulted')),
  ]);
  const sellerByItem = Object.fromEntries((sellers || []).map((s) => [s.item_id, s]));
  return rows.map((r) => ({
    ...r,
    seller: sellerByItem[r.item_id] || null,
    highBidder: users[r.current_bidder] || null,
    winner: users[r.winner_id] || null,
    otherBidderCount: otherBidders[r.id] || 0,
  }));
}

function excludedBidders(auction) {
  return new Set([...(auction.defaulted_bidders || []), auction.winner_id].filter(Boolean));
}

/** Per auction: distinct people who bid and haven't already won and failed to pay. */
async function countOtherBidders(auctions) {
  if (!auctions.length) return {};
  const { data, error } = await supabase
    .from('consignment_bids')
    .select('auction_id, bidder_id')
    .in('auction_id', auctions.map((a) => a.id));
  if (error) return {};
  const people = {};
  for (const bid of data || []) {
    if (!people[bid.auction_id]) people[bid.auction_id] = new Set();
    people[bid.auction_id].add(bid.bidder_id);
  }
  return Object.fromEntries(auctions.map((a) => {
    const skip = excludedBidders(a);
    return [a.id, [...(people[a.id] || [])].filter((id) => !skip.has(id)).length];
  }));
}

export async function loadAuctionSettings() {
  const { data, error } = await supabase
    .from('consignment_settings')
    .select('auction_commission_pct, auction_listing_fee, auction_default_days, auction_soft_close_minutes, auction_payment_days')
    .eq('id', 'frpl')
    .maybeSingle();
  if (error) fail(error, 'Could not load auction settings.');
  return data;
}

const FIXES_MISSING = 'Run supabase-migrations/consignment-auction-fixes-2026-10.sql in the Supabase SQL editor, then refresh.';

async function fixesRpc(name, args, fallback) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (/could not find the function|schema cache/i.test(error.message || '')) throw new Error(FIXES_MISSING);
    if (/consignment_auctions_one_active|duplicate key/i.test(error.message || '')) {
      throw new Error('This item already has an active auction.');
    }
    throw new Error(error.message || fallback);
  }
  return data;
}

/**
 * Puts an item up for auction in one database transaction. Works for pending (new), available fixed-price,
 * expired, and relisted items. The reserve (opening bid) is stored as the item's Seller Payout, so the
 * payout guard keeps it from selling below the reserve.
 */
export function startAuction(item, {
  reserve, commissionPct, buyNowPrice, listingFee, feeKind = 'auction_listing', feePaidNow, paymentMethod,
  consent = null, feeNote = null, atLegends = false,
}) {
  const opening = openingBid(reserve);
  if (!opening) throw new Error('Enter a valid reserve.');
  const buyNow = buyNowPrice === '' || buyNowPrice == null ? null : Number(buyNowPrice);
  if (buyNow != null && !(buyNow > opening)) throw new Error('Buy It Now must be higher than the reserve.');
  return fixesRpc('consignment_admin_start_auction', {
    p_item_id: item.id,
    p_reserve: opening,
    p_commission_pct: Number(commissionPct),
    p_buy_now: buyNow,
    p_listing_fee: listingFee === '' || listingFee == null ? null : Number(listingFee),
    p_fee_kind: feeKind,
    p_fee_paid_now: Boolean(feePaidNow),
    p_payment_method: paymentMethod || null,
    p_consent: consent || null,
    p_fee_note: feeNote || null,
    p_at_legends: Boolean(atLegends),
    p_days: AUCTION_DAYS,
  }, 'Could not start the auction.');
}

/** Only allowed before anyone bids. The item goes back to Pending (still marked auction) to restart or approve as consignment. */
export function cancelAuction(auction) {
  return fixesRpc('consignment_admin_cancel_auction', { p_auction_id: auction.id }, 'Could not cancel the auction.');
}

/** After an unsold auction: back to Pending as fixed price so admin sets a retail price via Approve. */
export async function convertToFixedPrice(auction) {
  await assertNoActiveAuction(auction.item_id);
  await patchItem(auction.item_id, { status: 'pending', sale_method: 'fixed' });
}

export async function returnToSeller(auction) {
  await assertNoActiveAuction(auction.item_id);
  await patchItem(auction.item_id, { status: 'returned' });
}

const PAYMENTS_MISSING = 'Run supabase-migrations/consignment-auction-payments-2026-10.sql in the Supabase SQL editor, then refresh.';

async function adminRpc(name, args, fallback) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (/could not find the function|schema cache|defaulted_bidders/i.test(error.message || '')) throw new Error(PAYMENTS_MISSING);
    throw new Error(error.message || fallback);
  }
  return data;
}

const TERMS_MISSING = 'Run supabase-migrations/consignment-auction-terms-2026-10.sql in the Supabase SQL editor, then refresh.';

/** Reserve + Buy It Now on the item and its live auction. The database refuses once a bid exists. */
export async function updateAuctionTerms(itemId, { reserve, buyNow }) {
  const { data, error } = await supabase.rpc('update_consignment_auction_terms', {
    p_item_id: itemId,
    p_reserve: reserve,
    p_buy_now: buyNow,
  });
  if (error) {
    if (/could not find the function|schema cache/i.test(error.message || '')) throw new Error(TERMS_MISSING);
    throw new Error(error.message || 'Could not update the reserve.');
  }
  return data;
}

export function markAuctionPaid(auction, { paymentMethod, transactionFee }) {
  return adminRpc('mark_consignment_auction_paid', {
    p_auction_id: auction.id,
    p_payment_method: paymentMethod,
    p_transaction_fee: transactionFee === '' || transactionFee == null ? null : Number(transactionFee),
  }, 'Could not record the payment.');
}

export function defaultAuction(auction, { suspend, reason }) {
  return adminRpc('default_consignment_auction', {
    p_auction_id: auction.id,
    p_suspend: Boolean(suspend),
    p_reason: reason || null,
  }, 'Could not mark the winner as unpaid.');
}

export function secondChanceAuction(auction, bidderId) {
  return adminRpc('second_chance_consignment_auction', {
    p_auction_id: auction.id,
    p_bidder_id: bidderId,
  }, 'Could not make the second-chance offer.');
}

/** Admin edits an item's listing text and photos (same fields sellers can edit). */
export async function adminUpdateListing(itemId, changes) {
  await patchItem(itemId, changes);
}

/** Other bidders on this auction, best first, each at their own highest bid. */
export async function loadSecondChanceCandidates(auction) {
  const { data, error } = await supabase
    .from('consignment_bids')
    .select('bidder_id, amount, created_at')
    .eq('auction_id', auction.id)
    .order('amount', { ascending: false });
  if (error) fail(error, 'Could not load bids.');
  const excluded = excludedBidders(auction);
  const best = new Map();
  for (const bid of data || []) {
    if (!excluded.has(bid.bidder_id) && !best.has(bid.bidder_id)) best.set(bid.bidder_id, bid);
  }
  const ids = [...best.keys()];
  const [users, { data: statuses }] = await Promise.all([
    loadUsers(ids),
    ids.length
      ? supabase.from('consignment_bidder_status').select('*').in('user_id', ids)
      : Promise.resolve({ data: [] }),
  ]);
  const statusBy = Object.fromEntries((statuses || []).map((s) => [s.user_id, s]));
  return ids.map((id) => ({
    bidderId: id,
    amount: Number(best.get(id).amount),
    user: users[id] || null,
    suspended: Boolean(statusBy[id]?.suspended),
  }));
}

/** Bidders with a default on record or a suspension. */
export async function loadBidderStatuses() {
  const { data, error } = await supabase
    .from('consignment_bidder_status')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) fail(error, 'Could not load bidder status.');
  const rows = data || [];
  const users = await loadUsers(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, user: users[r.user_id] || null }));
}

export async function setBidderSuspended(userId, suspended) {
  const { error } = await supabase
    .from('consignment_bidder_status')
    .update({ suspended, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) fail(error, 'Could not update the bidder.');
}

async function assertNoActiveAuction(itemId) {
  const { data, error } = await supabase
    .from('consignment_auctions')
    .select('id')
    .eq('item_id', itemId)
    .in('status', ACTIVE)
    .limit(1);
  if (error) fail(error, 'Could not check the auction.');
  if (data?.length) throw new Error('This item still has an active auction.');
}
