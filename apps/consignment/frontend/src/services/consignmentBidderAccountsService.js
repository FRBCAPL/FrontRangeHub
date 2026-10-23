import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/consignment-bidder-accounts-2026-10.sql in the Supabase SQL editor, then refresh.';

/** No search: everyone who has bid. With a search: matching accounts (name or email). Admin only. */
export async function loadBidderAccounts(search = '') {
  const { data, error } = await supabase.rpc('admin_consignment_bidder_accounts', { p_search: search || null });
  if (error) {
    if (/could not find the function|schema cache|does not exist/i.test(error.message || '')) throw new Error(MISSING);
    throw new Error(error.message || 'Could not load bidders.');
  }
  return data || [];
}

/**
 * Auctions one bidder has bid on, newest first:
 * [{ auction, item, topBid, bidCount, lastBidAt, boughtNow }]. Admin only (bids/auctions admin policies).
 */
export async function loadBidderAuctions(userId) {
  const { data: bids, error } = await supabase
    .from('consignment_bids')
    .select('auction_id, amount, is_buy_now, created_at')
    .eq('bidder_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Could not load bids.');
  const byAuction = new Map();
  for (const b of bids || []) {
    const row = byAuction.get(b.auction_id)
      || { topBid: 0, bidCount: 0, lastBidAt: b.created_at, boughtNow: false };
    row.topBid = Math.max(row.topBid, Number(b.amount) || 0);
    row.bidCount += 1;
    row.boughtNow = row.boughtNow || b.is_buy_now;
    byAuction.set(b.auction_id, row);
  }
  const auctionIds = [...byAuction.keys()];
  if (!auctionIds.length) return [];
  const { data: auctions, error: auctionError } = await supabase
    .from('consignment_auctions')
    .select('id, item_id, status, current_bid, current_bidder, winner_id, winning_bid, ends_at, paid_at')
    .in('id', auctionIds);
  if (auctionError) throw new Error(auctionError.message || 'Could not load auctions.');
  const itemIds = [...new Set((auctions || []).map((a) => a.item_id))];
  const { data: items, error: itemError } = itemIds.length
    ? await supabase.from('consignment_items').select('id, item_number, name, category').in('id', itemIds)
    : { data: [], error: null };
  if (itemError) throw new Error(itemError.message || 'Could not load items.');
  const itemById = Object.fromEntries((items || []).map((i) => [i.id, i]));
  const auctionById = Object.fromEntries((auctions || []).map((a) => [a.id, a]));
  return auctionIds
    .filter((id) => auctionById[id])
    .map((id) => ({ ...byAuction.get(id), auction: auctionById[id], item: itemById[auctionById[id].item_id] || null }));
}
