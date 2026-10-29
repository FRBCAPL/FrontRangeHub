import { useEffect, useState } from 'react';
import { listOpenPlans, loadRecommendations } from '../services/itemsureRestockService.js';
import { listSessions } from '../services/itemsureCountService.js';
import { listReviews } from '../services/itemsureCountReviewService.js';
import { onInventoryChanged } from '../utils/itemsureChanges.js';

const quietly = (promise) => promise.catch((e) => {
  console.warn('[itemsure] today list part unavailable', e?.message || e);
  return null;
});

/**
 * Everything the Today list needs. Parts the person can't see (or that fail) are
 * null and simply left out. `loaded` turns true after the first load.
 */
export default function useTodayData(organizationId, { stock, counts }) {
  const [data, setData] = useState({ loaded: false });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [recs, plans, sessions, reviews] = await Promise.all([
        stock ? quietly(loadRecommendations(organizationId)) : null,
        stock ? quietly(listOpenPlans(organizationId)) : null,
        counts ? quietly(listSessions(organizationId)) : null,
        counts ? quietly(listReviews(organizationId)) : null,
      ]);
      if (alive) setData({ loaded: true, recs, plans, sessions, reviews: reviews || {} });
    };
    load();
    const off = onInventoryChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [organizationId, stock, counts]);

  return data;
}
