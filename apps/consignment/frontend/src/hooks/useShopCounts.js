import { useEffect, useState } from 'react';
import { loadCatalog } from '../services/consignmentService.js';
import { loadAuctionsForItems } from '../services/consignmentAuctionService.js';

/** { case, auctions } for sale right now, counted like the shop badges. null until loaded. */
export default function useShopCounts() {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    let alive = true;
    loadCatalog({ status: 'available' })
      .then(async (rows) => {
        const real = rows.filter((r) => !r.is_example);
        const auctionItems = real.filter((r) => r.sale_method === 'auction');
        const byItem = await loadAuctionsForItems(auctionItems.map((r) => r.id));
        if (!alive) return;
        setCounts({
          case: real.length - auctionItems.length,
          auctions: auctionItems.filter((r) => !byItem[r.id] || byItem[r.id].status === 'live').length,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return counts;
}
