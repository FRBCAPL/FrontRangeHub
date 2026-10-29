import { useCallback, useEffect, useState } from 'react';
import { listBalances, listStockItems } from '../services/itemsureInventoryService.js';
import { listLocations } from '../services/itemsureLocationService.js';
import { listPackages } from '../services/itemsurePackageService.js';

/** Locations, items, established balances, and packaging sizes for the Stock page. */
export default function useStockData(organizationId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [locations, items, balances, packages] = await Promise.all([
        listLocations(organizationId),
        listStockItems(organizationId),
        listBalances(organizationId),
        listPackages(organizationId).catch((e) => {
          console.warn('[itemsure] packaging unavailable', e);
          return [];
        }),
      ]);
      setData({ locations, items, balances, packages });
      setError('');
    } catch (e) {
      setError(e.message);
      setData((current) => current || { locations: [], items: [], balances: [], packages: [] });
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
