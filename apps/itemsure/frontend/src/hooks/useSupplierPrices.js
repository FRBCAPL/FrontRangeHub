import { useCallback, useEffect, useState } from 'react';
import { listSupplierPrices, saveSupplierPrice } from '../services/itemsureSupplierPriceService.js';

/**
 * As-ordered prices per item+supplier. { ready, available, forItem(itemId), priceMapFor(itemId),
 * save(itemId, supplierId, fields), reload }.
 * available is false until the supplier-prices database update is applied.
 */
export default function useSupplierPrices(organizationId) {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState(null);

  const reload = useCallback(async () => {
    const next = await listSupplierPrices(organizationId).catch(() => null);
    setRows(next);
    setReady(true);
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const forItem = (itemId) => rows?.get(itemId) || new Map();
  const priceMapFor = (itemId) => {
    const m = new Map();
    for (const [supplierId, row] of forItem(itemId)) {
      if (row.price != null && Number(row.price) > 0) m.set(supplierId, Number(row.price));
    }
    return m;
  };

  const save = async (itemId, supplierId, fields) => {
    await saveSupplierPrice(organizationId, itemId, supplierId, fields);
    await reload();
  };

  return {
    ready,
    available: rows !== null,
    forItem,
    priceMapFor,
    save,
    reload,
  };
}
