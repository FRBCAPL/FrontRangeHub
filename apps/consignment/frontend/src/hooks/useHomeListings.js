import { useEffect, useState } from 'react';
import { loadCatalog, loadExamples } from '../services/consignmentService.js';
import { loadAuctionsForItems } from '../services/consignmentAuctionService.js';
import { forSaleListings, shopCounts } from '../utils/consignmentHomeListings.js';

/**
 * Home page data: { counts: { case, auctions, total }, listings, auctions (by item id), examples }.
 * null until loaded.
 */
export default function useHomeListings() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadCatalog({ status: 'available' }), loadExamples().catch(() => [])])
      .then(async ([rows, examples]) => {
        const auctionIds = rows.filter((r) => !r.is_example && r.sale_method === 'auction').map((r) => r.id);
        const byItem = await loadAuctionsForItems(auctionIds);
        if (!alive) return;
        const listings = forSaleListings(rows, byItem);
        setData({
          counts: shopCounts(listings),
          listings,
          auctions: byItem,
          examples: examples.filter((r) => r.sale_method !== 'auction' || !listings.some((l) => l.sale_method === 'auction')),
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return data;
}
