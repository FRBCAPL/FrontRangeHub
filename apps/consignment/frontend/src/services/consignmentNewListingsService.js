import { supabase } from '@shared/config/supabase.js';
import { countNewListings, NEW_LISTING_DAYS } from '../utils/consignmentNewListings.js';

/** { shelf, auction } listed in the last NEW_LISTING_DAYS. Kept light: the homepage imports it. */
export async function loadNewListingCounts() {
  const cutoff = new Date(Date.now() - NEW_LISTING_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [items, auctions] = await Promise.all([
    supabase.from('consignment_catalog').select('*').eq('status', 'available'),
    supabase.from('consignment_auction_board').select('status, starts_at').eq('status', 'live').gte('starts_at', cutoff),
  ]);
  return countNewListings({ items: items.data || [], auctions: auctions.data || [] });
}
