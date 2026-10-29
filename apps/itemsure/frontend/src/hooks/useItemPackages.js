import { useCallback, useEffect, useMemo, useState } from 'react';
import { listPackages } from '../services/itemsurePackageService.js';

/**
 * Packaging sizes for an organization. `packages` stays null when they cannot
 * load (for example before the packaging migration is applied), so pages hide
 * packaging instead of breaking.
 */
export default function useItemPackages(organizationId) {
  const [packages, setPackages] = useState(null);

  const reload = useCallback(async () => {
    try {
      setPackages(await listPackages(organizationId));
    } catch (e) {
      console.warn('[itemsure] packaging unavailable', e);
      setPackages(null);
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const byItem = useMemo(() => {
    const map = new Map();
    for (const p of packages || []) map.set(p.item_id, [...(map.get(p.item_id) || []), p]);
    return map;
  }, [packages]);

  return {
    ready: packages !== null,
    packagesFor: (itemId) => (packages === null ? null : byItem.get(itemId) || []),
    reload,
  };
}
