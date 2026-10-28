import { useCallback, useEffect, useState } from 'react';
import { listBalances, listStockItems } from '../services/itemsureInventoryService.js';
import { listLocations } from '../services/itemsureLocationService.js';

/** Locations, items, and established balances for the Stock page. */
export default function useStockData(organizationId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [locations, items, balances] = await Promise.all([
        listLocations(organizationId),
        listStockItems(organizationId),
        listBalances(organizationId),
      ]);
      setData({ locations, items, balances });
      setError('');
    } catch (e) {
      setError(e.message);
      setData((current) => current || { locations: [], items: [], balances: [] });
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
