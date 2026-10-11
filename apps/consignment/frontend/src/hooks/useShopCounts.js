import { useEffect, useState } from 'react';
import { loadCatalog } from '../services/consignmentService.js';

/** { case, auctions } for sale right now, counted like the shop badges. null until loaded. */
export default function useShopCounts() {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    let alive = true;
    loadCatalog({ status: 'available' })
      .then((rows) => {
        if (!alive) return;
        const real = rows.filter((r) => !r.is_example);
        setCounts({
          case: real.filter((r) => r.sale_method !== 'auction').length,
          auctions: real.filter((r) => r.sale_method === 'auction').length,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return counts;
}
