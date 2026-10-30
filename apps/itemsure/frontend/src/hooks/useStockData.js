import { useCallback, useEffect, useState } from 'react';
import { listBalances, listStockItems } from '../services/itemsureInventoryService.js';
import { listLocations } from '../services/itemsureLocationService.js';
import { listPackages } from '../services/itemsurePackageService.js';
import { listTargets } from '../services/itemsureTargetService.js';
import { listPlaces } from '../services/itemsurePlaceService.js';

/**
 * Locations, items, established balances, packaging sizes, levels, and "kept at" places
 * for the Stock page. Levels and places are extras: if they can't load, `targets` is []
 * and `places` is null, and the page still shows every balance.
 */
export default function useStockData(organizationId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [locations, items, balances, packages, targets, places] = await Promise.all([
        listLocations(organizationId),
        listStockItems(organizationId),
        listBalances(organizationId),
        listPackages(organizationId).catch((e) => {
          console.warn('[itemsure] packaging unavailable', e);
          return [];
        }),
        listTargets(organizationId).catch(() => []),
        listPlaces(organizationId).catch(() => null),
      ]);
      setData({ locations, items, balances, packages, targets, places });
      setError('');
    } catch (e) {
      setError(e.message);
      setData((current) => current || { locations: [], items: [], balances: [], packages: [], targets: [], places: null });
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
