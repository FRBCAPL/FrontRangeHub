import { useCallback, useEffect, useRef, useState } from 'react';
import { clearTripSuppliers, listTripSuppliers, setTripSupplier } from '../services/itemsureOtherSupplierService.js';
import { cheapestSupplierId } from '../utils/itemsureSupplierPrices.js';
import { tripSupplierId } from '../utils/itemsureTripSupplier.js';

const REFRESH_MS = 30000;

/**
 * "Buying from X this trip" on the shopping list, shared by everyone in the business.
 * `suppliers` is useSuppliers; `prices` is useSupplierPrices (optional — without it, defaults
 * stay on the main supplier). { available, supplierIdFor(itemId), defaultIdFor(itemId),
 * changed(itemId), optionsFor(itemId), choose(itemId, supplierId), clear(itemIds), error }.
 * available is false until the other-suppliers database update is applied; then every
 * item is simply listed under its default supplier.
 */
export default function useTripSuppliers(organizationId, suppliers, prices = null) {
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
  const priceMap = (itemId) => (prices?.available ? prices.priceMapFor(itemId) : null);
  const idsFor = (itemId) => {
    const main = links.get(itemId) || null;
    return [main, ...(others.get(itemId) || [])].filter(Boolean);
  };
  const defaultIdFor = useCallback(
    (itemId) => {
      const main = links.get(itemId) || null;
      return cheapestSupplierId(main, idsFor(itemId), priceMap(itemId));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- others/links/prices read fresh each render
    [links, others, prices],
  );
  const supplierIdFor = useCallback(
    (itemId) => {
      const main = links.get(itemId) || null;
      return tripSupplierId(available ? choices.get(itemId) : null, main, idsFor(itemId), priceMap(itemId));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, choices, links, others, prices],
  );
  const changed = (itemId) => {
    const choice = available ? choices?.get(itemId) : null;
    if (!choice || !idsFor(itemId).includes(choice)) return false;
    return choice !== defaultIdFor(itemId);
  };
  const optionsFor = (itemId) => {
    if (!available || !suppliers.supplierIdFor(itemId)) return [];
    const ids = suppliers.supplierIdsFor(itemId);
    return ids.length > 1 ? ids.map((id) => suppliers.suppliers.find((s) => s.id === id)).filter(Boolean) : [];
  };

  const choose = async (itemId, supplierId) => {
    setError('');
    const def = defaultIdFor(itemId);
    setChoices((m) => {
      const next = new Map(m || []);
      if (supplierId === def) next.delete(itemId);
      else next.set(itemId, supplierId);
      return next;
    });
    try {
      if (supplierId === def) await clearTripSuppliers(organizationId, [itemId]);
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

  return {
    available,
    supplierIdFor,
    defaultIdFor,
    priceMapFor: (itemId) => priceMap(itemId),
    changed,
    optionsFor,
    choose,
    clear,
    error,
    reload,
  };
}
