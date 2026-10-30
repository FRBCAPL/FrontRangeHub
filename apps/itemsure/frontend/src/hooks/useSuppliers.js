import { useCallback, useEffect, useState } from 'react';
import { listItemSuppliers, listSuppliers } from '../services/itemsureSupplierService.js';

/**
 * Suppliers plus each item's main supplier.
 * { ready, available, suppliers, supplierIdFor(itemId), supplierFor(itemId), reload }.
 * available is false until both supplier database updates are applied; then
 * nothing supplier-related is shown or saved.
 */
export default function useSuppliers(organizationId) {
  const [state, setState] = useState({ ready: false, available: false, suppliers: [], links: new Map() });

  const reload = useCallback(async () => {
    try {
      const [list, links] = await Promise.all([listSuppliers(organizationId), listItemSuppliers(organizationId)]);
      setState({ ready: true, available: !list.missing && links !== null, suppliers: list.suppliers, links: links || new Map() });
    } catch {
      setState({ ready: true, available: false, suppliers: [], links: new Map() });
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const supplierIdFor = (itemId) => state.links.get(itemId) || null;
  const supplierFor = (itemId) => state.suppliers.find((s) => s.id === supplierIdFor(itemId)) || null;
  return { ...state, supplierIdFor, supplierFor, reload };
}
