import { useCallback, useEffect, useState } from 'react';
import { listBalances } from '../services/itemsureInventoryService.js';
import { listTargets } from '../services/itemsureTargetService.js';
import { onInventoryChanged } from '../utils/itemsureChanges.js';

/**
 * Amounts and levels for every item, refreshed whenever stock or levels change.
 * Stays null for people who can't see stock (`enabled` false) or when it can't load.
 */
export default function useItemStock(organizationId, enabled) {
  const [stock, setStock] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const [balances, targets] = await Promise.all([
        listBalances(organizationId),
        listTargets(organizationId).catch(() => []),
      ]);
      setStock({ balances, targets });
    } catch (e) {
      console.warn('[itemsure] stock unavailable', e);
      setStock(null);
    }
  }, [organizationId, enabled]);

  useEffect(() => {
    reload();
    return onInventoryChanged(reload);
  }, [reload]);

  return { stock, reload };
}
