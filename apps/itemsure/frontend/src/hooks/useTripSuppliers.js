import { useCallback, useEffect, useRef, useState } from 'react';
import { clearTripSuppliers, listTripSuppliers, setTripSupplier } from '../services/itemsureOtherSupplierService.js';
import { tripSupplierId } from '../utils/itemsureTripSupplier.js';

const REFRESH_MS = 30000;

/**
 * "Buying from X this trip" on the shopping list, shared by everyone in the business.
 * `suppliers` is useSuppliers. { available, supplierIdFor(itemId), changed(itemId),
 * optionsFor(itemId), choose(itemId, supplierId), clear(itemIds), error }.
 * available is false until the other-suppliers database update is applied; then every
 * item is simply listed under its main supplier.
 */
export default function useTripSuppliers(organizationId, suppliers) {
  const [choices, setChoices] = useState(null);
  const [error, setError] = useState('');
  const availableRef = useRef(false);

  const reload = useCallback(async () => {
    const next = await listTripSuppliers(organizationId).catch(() => null);
    availableRef.current = next !== null;
    setChoices(next);
  }, [organizationId]);

  useEffect(() => {
    reload();
    const onShow = () => {
      if (document.visibilityState === 'visible') reload();
    };
    const timer = setInterval(() => {
      if (availableRef.current && document.visibilityState === 'visible') reload();
    }, REFRESH_MS);
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, [reload]);

  const { links, others } = suppliers;
  const available = choices !== null && suppliers.othersAvailable;
  const supplierIdFor = useCallback(
    (itemId) => {
      const main = links.get(itemId) || null;
      return tripSupplierId(available ? choices.get(itemId) : null, main, [main, ...(others.get(itemId) || [])].filter(Boolean));
    },
    [available, choices, links, others],
  );
  const changed = (itemId) => {
    const main = suppliers.supplierIdFor(itemId);
    return Boolean(main) && supplierIdFor(itemId) !== main;
  };
  const optionsFor = (itemId) => {
    if (!available || !suppliers.supplierIdFor(itemId)) return [];
    const ids = suppliers.supplierIdsFor(itemId);
    return ids.length > 1 ? ids.map((id) => suppliers.suppliers.find((s) => s.id === id)).filter(Boolean) : [];
  };

  const choose = async (itemId, supplierId) => {
    setError('');
    setChoices((m) => {
      const next = new Map(m || []);
      if (supplierId === suppliers.supplierIdFor(itemId)) next.delete(itemId);
      else next.set(itemId, supplierId);
      return next;
    });
    try {
      if (supplierId === suppliers.supplierIdFor(itemId)) await clearTripSuppliers(organizationId, [itemId]);
      else await setTripSupplier(organizationId, itemId, supplierId);
    } catch (e) {
      setError(e.message);
    }
    await reload();
  };

  /** Best effort: a choice left behind only lists the item under that supplier next time. */
  const clear = async (itemIds) => {
    if (!available || !itemIds.some((id) => choices.has(id))) return;
    await clearTripSuppliers(organizationId, itemIds.filter((id) => choices.has(id))).catch(() => {});
    await reload();
  };

  return { available, supplierIdFor, changed, optionsFor, choose, clear, error, reload };
}
