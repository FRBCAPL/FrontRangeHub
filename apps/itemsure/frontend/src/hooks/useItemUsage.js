import { useEffect, useState } from 'react';
import { listUsageMovements } from '../services/itemsureInventoryService.js';
import { onInventoryChanged } from '../utils/itemsureChanges.js';
import { USAGE_WINDOW_DAYS, usageRates } from '../utils/itemsureUsage.js';

/** How fast one item is used (see usageRates), or null while loading or when history can't be read. */
export default function useItemUsage(organizationId, itemId, enabled) {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 86400000).toISOString();
        const { movements, historyStart } = await listUsageMovements(organizationId, itemId, since);
        if (alive) setUsage(usageRates(movements, { historyStart }));
      } catch (e) {
        console.warn('[itemsure] usage unavailable', e);
        if (alive) setUsage(null);
      }
    };
    load();
    const off = onInventoryChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [organizationId, itemId, enabled]);

  return usage;
}
