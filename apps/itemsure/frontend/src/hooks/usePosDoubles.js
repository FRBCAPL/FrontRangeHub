import { useCallback, useEffect, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import { listPosLinks } from '../services/itemsurePosService.js';
import { saveCategoryDoubles } from '../services/itemsureCategoryDefaultService.js';
import { doublesRows, doublesValue } from '../utils/itemsurePosDoubles.js';

/**
 * Add-ons tab: which categories a Double pours more of. { rows, ready, error, busy, toggle }.
 * ready is false until the database update that stores the answer is applied.
 */
export default function usePosDoubles(organizationId) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [catalog, links] = await Promise.all([listCatalog(organizationId), listPosLinks(organizationId)]);
      const defaults = catalog.categoryDefaults;
      setState({
        ready: defaults?.doublesReady === true,
        rows: doublesRows({
          categories: catalog.categories, items: catalog.items, units: catalog.units,
          matchedItemIds: new Set([...links.values()].flat()), defaults,
        }),
      });
    } catch (e) {
      setError(e.message);
      setState((s) => s || { ready: false, rows: [] });
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async (row, checked) => {
    setBusy(true);
    setError('');
    try {
      await saveCategoryDoubles(organizationId, row.category.id, doublesValue(checked, row.parentOn));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [organizationId, load]);

  return { ...(state || { ready: false, rows: [] }), loaded: Boolean(state), error, busy, toggle };
}
