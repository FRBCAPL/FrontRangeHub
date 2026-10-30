import { useCallback, useEffect, useState } from 'react';
import { listBalances, listStockItems } from '../services/itemsureInventoryService.js';
import { listLocations } from '../services/itemsureLocationService.js';
import { listCategoryRows, listTargets } from '../services/itemsureTargetService.js';
import { listPlaces } from '../services/itemsurePlaceService.js';
import { targetKey } from '../utils/itemsureTargets.js';

/** Locations, items (with category), balances, saved levels keyed by slot, and "kept at" places. */
export default function useTargetsData(organizationId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [locations, items, balances, targets, cats, places] = await Promise.all([
        listLocations(organizationId),
        listStockItems(organizationId),
        listBalances(organizationId),
        listTargets(organizationId),
        listCategoryRows(organizationId),
        // Null when places can't load, so the page falls back to showing every spot.
        listPlaces(organizationId).catch(() => null),
      ]);
      const categoryOf = new Map(cats.itemCategories.map((r) => [r.id, r.category_id]));
      const targetsByKey = {};
      targets.forEach((t) => {
        targetsByKey[targetKey(t.item_id, t.location_id, t.storage_area_id)] = t;
      });
      setData({
        locations,
        items: items.map((i) => ({ ...i, categoryId: categoryOf.get(i.id) || null })),
        balances,
        targets,
        targetsByKey,
        places,
        categories: cats.categories,
      });
      setError('');
    } catch (e) {
      // Keep data null on a failed first load so pages never show a load error as "nothing here".
      setError(e.message);
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
