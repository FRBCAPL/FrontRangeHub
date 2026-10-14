import { supabase } from '@shared/config/supabase.js';

const DELIVERY_MISSING = 'Run supabase-migrations/consignment-auction-delivery-2026-10.sql in the Supabase SQL editor, then refresh.';

async function deliveryRpc(name, args, fallback) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (/could not find the function|schema cache/i.test(error.message || '')) throw new Error(DELIVERY_MISSING);
    throw new Error(error.message || fallback);
  }
  return data;
}

/** The seller brought the item to Legends; the winner's pay window starts now. */
export function markAuctionDelivered(auction) {
  return deliveryRpc('mark_consignment_auction_delivered', { p_auction_id: auction.id }, 'Could not mark it delivered.');
}

/** Statuses where the "Item is at Legends" checkbox applies (before a win; wins use Delivered). */
export const AT_LEGENDS_STATUSES = ['live', 'ended_no_bids', 'defaulted'];

/**
 * The seller dropped the item at Legends during the auction (or took it back). If it then sells,
 * the winner's pay window starts right away instead of waiting on delivery.
 */
export async function setAuctionAtLegends(auction, atLegends) {
  const { data, error } = await supabase
    .from('consignment_auctions')
    .update({ delivered_at: atLegends ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', auction.id)
    .in('status', AT_LEGENDS_STATUSES)
    .select('id');
  if (error) {
    if (/delivered_at|does not exist|schema cache/i.test(error.message || '')) throw new Error(DELIVERY_MISSING);
    throw new Error(error.message || 'Could not update where the item is.');
  }
  if (!data?.length) throw new Error('This auction has moved on; refresh and use Delivered instead.');
}

/** The seller didn't deliver: cancel the sale, withdraw the item and (by default) remove seller access. */
export function auctionNotDelivered(auction, { removeSeller = true } = {}) {
  return deliveryRpc('consignment_auction_not_delivered', {
    p_auction_id: auction.id,
    p_remove_seller: Boolean(removeSeller),
  }, 'Could not cancel the sale.');
}

/** Won, but the item hasn't reached Legends yet (no pay window until it does). */
export function awaitingDelivery(auction) {
  return auction?.status === 'awaiting_payment' && 'delivered_at' in auction && !auction.delivered_at;
}
