import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/consignment-auctions-2026-10.sql in the Supabase SQL editor, then refresh.';

function fail(error, fallback) {
  const msg = error?.message || '';
  if (/consignment_auction|consignment_bid|schema cache|does not exist/i.test(msg) && !/Minimum bid|Log in|suspended/i.test(msg)) {
    throw new Error(MISSING);
  }
  throw new Error(msg || fallback);
}

/** Public auction state for one item (latest auction), or null. Closes due auctions first. */
export async function loadAuctionForItem(itemId) {
  await supabase.rpc('close_due_consignment_auctions');
  const { data, error } = await supabase
    .from('consignment_auction_board')
    .select('*')
    .eq('item_id', itemId)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error, 'Could not load the auction.');
  return data;
}

/** Latest public auction per item id, for shop cards. Empty if the auction migration hasn't run. */
export async function loadAuctionsForItems(itemIds) {
  if (!itemIds?.length) return {};
  const { data, error } = await supabase
    .from('consignment_auction_board')
    .select('*')
    .in('item_id', itemIds)
    .order('starts_at', { ascending: false });
  if (error) return {};
  const byItem = {};
  for (const row of data || []) {
    if (!byItem[row.item_id]) byItem[row.item_id] = row;
  }
  return byItem;
}

export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

/**
 * Supabase holds its auth lock while these listeners run; a Supabase call made inside one waits on that
 * lock forever and every later query hangs. setTimeout runs the callback after the lock is released.
 */
export function onAuthChange(callback) {
  let active = true;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user?.id || null;
    setTimeout(() => { if (active) callback(id); }, 0);
  });
  return () => {
    active = false;
    data?.subscription?.unsubscribe();
  };
}

/** The signed-in user's highest bid on this auction (null if none). */
export async function loadMyTopBid(auctionId, userId) {
  if (!auctionId || !userId) return null;
  const { data, error } = await supabase
    .from('consignment_bids')
    .select('amount, is_buy_now')
    .eq('auction_id', auctionId)
    .eq('bidder_id', userId)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

export function openHubLogin() {
  window.dispatchEvent(new Event('frpl:open-login'));
}

export async function loadLiveAuctions() {
  await supabase.rpc('close_due_consignment_auctions');
  const { data, error } = await supabase
    .from('consignment_auction_board')
    .select('*')
    .eq('status', 'live')
    .order('ends_at', { ascending: true });
  if (error) fail(error, 'Could not load auctions.');
  return data || [];
}

export async function loadBidHistory(auctionId) {
  const { data, error } = await supabase
    .from('consignment_auction_bid_history')
    .select('*')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false });
  if (error) fail(error, 'Could not load bid history.');
  return data || [];
}

/** Returns { ok, current_bid, ends_at, extended } or { ok: false, message } when the auction just ended. */
export async function placeBid(auctionId, amount) {
  const { data, error } = await supabase.rpc('place_consignment_bid', {
    p_auction_id: auctionId,
    p_amount: Number(amount),
  });
  if (error) fail(error, 'Could not place the bid.');
  return data;
}

export async function buyNow(auctionId) {
  const { data, error } = await supabase.rpc('buy_now_consignment_auction', { p_auction_id: auctionId });
  if (error) fail(error, 'Could not complete Buy It Now.');
  return data;
}
