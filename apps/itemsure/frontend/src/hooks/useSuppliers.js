import { useCallback, useEffect, useState } from 'react';
import { listItemSuppliers, listSuppliers } from '../services/itemsureSupplierService.js';
import { listOtherSuppliers } from '../services/itemsureOtherSupplierService.js';

const EMPTY = { ready: true, available: false, othersAvailable: false, suppliers: [], links: new Map(), others: new Map() };

/**
 * Suppliers plus each item's main supplier and other suppliers ("Also from").
 * { ready, available, othersAvailable, suppliers, supplierIdFor(itemId), supplierFor(itemId),
 *   otherIdsFor(itemId), supplierIdsFor(itemId) (main first), reload }.
 * available is false until both supplier database updates are applied; then
 * nothing supplier-related is shown or saved. othersAvailable needs one more update.
 */
export default function useSuppliers(organizationId) {
  const [state, setState] = useState({ ...EMPTY, ready: false });

  const reload = useCallback(async () => {
    try {
      const [list, links, others] = await Promise.all([
        listSuppliers(organizationId),
        listItemSuppliers(organizationId),
        listOtherSuppliers(organizationId),
      ]);
      const available = !list.missing && links !== null;
      setState({
        ready: true,
        available,
        othersAvailable: available && others !== null,
        suppliers: list.suppliers,
        links: links || new Map(),
        others: others || new Map(),
      });
    } catch {
      setState(EMPTY);
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const supplierIdFor = (itemId) => state.links.get(itemId) || null;
  const supplierFor = (itemId) => state.suppliers.find((s) => s.id === supplierIdFor(itemId)) || null;
  const otherIdsFor = (itemId) => (state.others.get(itemId) || []).filter((id) => id !== supplierIdFor(itemId));
  const supplierIdsFor = (itemId) => [supplierIdFor(itemId), ...otherIdsFor(itemId)].filter(Boolean);
  return { ...state, supplierIdFor, supplierFor, otherIdsFor, supplierIdsFor, reload };
}
