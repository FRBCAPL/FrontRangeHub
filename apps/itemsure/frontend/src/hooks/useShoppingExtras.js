import { useCallback, useEffect, useState } from 'react';
import { addShoppingExtra, listShoppingExtras, removeShoppingExtras } from '../services/itemsureShoppingExtrasService.js';

/**
 * Hand-added shopping list lines, shared by the business.
 * { ready, available, extras, add(line), remove(ids), reload }.
 * available is false until the database update is applied; then nothing is shown.
 */
export default function useShoppingExtras(organizationId) {
  const [state, setState] = useState({ ready: false, available: false, extras: [] });

  const reload = useCallback(async () => {
    const extras = await listShoppingExtras(organizationId).catch(() => null);
    setState({ ready: true, available: extras !== null, extras: extras || [] });
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (line) => {
      await addShoppingExtra(organizationId, line);
      await reload();
    },
    [organizationId, reload],
  );
  const remove = useCallback(
    async (ids) => {
      await removeShoppingExtras(organizationId, ids);
      await reload();
    },
    [organizationId, reload],
  );
  return { ...state, add, remove, reload };
}
