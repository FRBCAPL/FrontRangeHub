import { useEffect, useState } from 'react';
import { loadNewListingCounts } from '@apps/consignment/frontend/src/services/consignmentNewListingsService.js';
import { newListingsLabel } from '@apps/consignment/frontend/src/utils/consignmentNewListings.js';

/** "New auction" / "3 new items" badge for the homepage consignment tile: listings from the last 3 days. */
export default function useConsignmentNewBadge() {
  const [badge, setBadge] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadNewListingCounts()
      .then((counts) => { if (!cancelled) setBadge(newListingsLabel(counts)); })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return badge;
}
