import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { loadStockAlertCounts } from '../services/itemsureTargetService.js';
import { onInventoryChanged } from '../utils/itemsureChanges.js';

/**
 * Low-stock and below-par slot counts for the caller's locations. Computed from
 * the status view on demand, so nothing is stored per alert. Refreshes on page
 * changes, stock or level changes in the app, and when the window regains focus.
 */
export default function useStockAlerts(organizationId, enabled) {
  const [counts, setCounts] = useState(null);
  const { pathname } = useLocation();

  const reload = useCallback(async () => {
    if (!organizationId || !enabled) {
      setCounts(null);
      return;
    }
    try {
      setCounts(await loadStockAlertCounts(organizationId));
    } catch {
      setCounts(null);
    }
  }, [organizationId, enabled]);

  useEffect(() => {
    reload();
  }, [reload, pathname]);

  useEffect(() => {
    const offChange = onInventoryChanged(reload);
    window.addEventListener('focus', reload);
    return () => {
      offChange();
      window.removeEventListener('focus', reload);
    };
  }, [reload]);

  return counts;
}
