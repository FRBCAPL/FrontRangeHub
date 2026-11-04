import { useCallback, useEffect, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import { listItemContents, listPosItems, listPosLinks, listPosPours } from '../services/itemsurePosService.js';
import { listItemPieces } from '../services/itemsureItemContentService.js';
import { withCategoryDefaults } from '../utils/itemsureCategoryDefaults.js';

/**
 * Clover items, matches, and amounts per sale (with category amounts filling gaps), loaded the
 * same way as the Match list. { data: null while loading, error, reload }.
 */
export default function useItemCloverUses(organizationId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [posItems, links, catalog, ownPours, ownContents, ownPieces] = await Promise.all([
        listPosItems(organizationId), listPosLinks(organizationId), listCatalog(organizationId),
        listPosPours(organizationId), listItemContents(organizationId), listItemPieces(organizationId),
      ]);
      const filled = withCategoryDefaults({
        links, pours: ownPours, contents: ownContents, pieces: ownPieces, items: catalog.items, categories: catalog.categories, defaults: catalog.categoryDefaults, units: catalog.units,
      });
      setData({ posItems, links, items: catalog.items, units: catalog.units, ...filled, piecesReady: ownPieces !== null });
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      setData(null);
      setError('');
      return;
    }
    load();
  }, [load, organizationId]);

  return { data, error, reload: load };
}
