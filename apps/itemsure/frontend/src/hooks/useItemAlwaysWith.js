import { useCallback, useEffect, useState } from 'react';
import { listAlwaysWith, saveAlwaysWith } from '../services/itemsureAlwaysWithService.js';

/**
 * Goes with sales rules for the org. { ready, available, forItem(itemId), save(itemId, rows), reload }.
 * available is false until the always-with database update is applied.
 */
export default function useItemAlwaysWith(organizationId) {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState(null);

  const reload = useCallback(async () => {
    const next = await listAlwaysWith(organizationId).catch(() => null);
    setRows(next);
    setReady(true);
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const forItem = (itemId) => rows?.get(itemId) || [];

  const save = async (itemId, nextRows) => {
    await saveAlwaysWith(organizationId, itemId, nextRows);
    await reload();
  };

  return {
    ready,
    available: rows !== null,
    /** Map of packaging item id -> rules (for reverse lookup on food items). */
    byItem: rows || new Map(),
    forItem,
    save,
    reload,
  };
}
