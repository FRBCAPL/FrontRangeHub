import { useCallback, useEffect, useMemo, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import { getPosConnection, listItemContents, listPosItems, listPosLinks, listPosPours } from '../services/itemsurePosService.js';
import { listItemPieces } from '../services/itemsureItemContentService.js';
import { listStandardAmounts } from '../services/itemsureStandardAmountService.js';
import { DEFAULT_STANDARDS, suggestAmount } from '../utils/itemsurePourSuggest.js';
import { asksContent } from '../utils/itemsureItemContent.js';
import { withCategoryDefaults } from '../utils/itemsureCategoryDefaults.js';

/**
 * Sales tracking setup: what's left to do, with suggestions.
 * amounts: matched pairs with no amount yet, each { key, pos, item, unit, suggestion|null }.
 * sizes: items with an oz/ml amount, counted in something without a size yet.
 * Category amounts and sizes count as set; byCategory says how many come from them.
 * enabled: false loads nothing. needsConnection: check Clover first; summary is { off: true } without it.
 */
export default function usePosSetup(organizationId, reloadKey, { enabled = true, needsConnection = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      if (needsConnection) {
        const { connection, salesReady } = await getPosConnection(organizationId);
        if (!connection || !salesReady) {
          setData({ off: true });
          return;
        }
      }
      const [posItems, links, ownPours, ownContents, catalog, saved, ownPieces] = await Promise.all([
        listPosItems(organizationId), listPosLinks(organizationId), listPosPours(organizationId),
        listItemContents(organizationId), listCatalog(organizationId), listStandardAmounts(organizationId),
        listItemPieces(organizationId),
      ]);
      const defaults = catalog.categoryDefaults;
      const { pours, contents, pieces } = withCategoryDefaults({
        links, pours: ownPours, contents: ownContents, pieces: ownPieces, items: catalog.items, categories: catalog.categories, defaults,
      });
      setData({
        posItems, links, pours, contents, pieces, ownPours, ownContents, ownPieces, defaults, saved,
        items: catalog.items, units: catalog.units, categories: catalog.categories,
      });
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [organizationId, enabled, needsConnection]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const summary = useMemo(() => {
    if (!data) return null;
    if (data.off) return { off: true };
    const standards = data.saved?.length ? data.saved : DEFAULT_STANDARDS;
    const posById = new Map(data.posItems.map((p) => [p.external_id, p]));
    const itemsById = new Map(data.items.map((i) => [i.id, i]));
    const unitsById = new Map(data.units.map((u) => [u.id, u]));
    const unitOf = (item) => unitsById.get(item?.base_unit_id) || null;
    const amounts = [];
    const sizeIds = new Set();
    const countIds = new Set();
    const byCategory = { amounts: 0, sizes: new Set() };
    for (const [externalId, itemIds] of data.links) {
      const pos = posById.get(externalId);
      if (!pos) continue;
      for (const itemId of itemIds) {
        const item = itemsById.get(itemId);
        if (!item) continue;
        const unit = unitOf(item);
        const key = `${externalId}|${itemId}`;
        const pour = data.pours?.get(key);
        const options = { shared: itemIds.length > 1, itemName: item.name };
        if (!pour) amounts.push({ key, pos, item, unit, suggestion: suggestAmount(pos, unit, standards, options) });
        else if (pour.unit === 'piece') {
          if (!data.pieces?.get(itemId)) countIds.add(itemId);
          else if (!data.ownPieces?.get(itemId)) byCategory.sizes.add(itemId);
        } else if (pour.unit !== 'base' && asksContent(unit?.code)) {
          if (!data.contents?.get(itemId)) sizeIds.add(itemId);
          else if (!data.ownContents?.get(itemId)) byCategory.sizes.add(itemId);
        }
        if (pour?.fromCategory) byCategory.amounts += 1;
      }
    }
    amounts.sort((a, b) => Number(!a.suggestion) - Number(!b.suggestion) || a.pos.name.localeCompare(b.pos.name));
    const matched = [...data.links.values()].filter((ids) => ids.length).length;
    return {
      ready: data.pours !== null && data.contents !== null,
      standardsSaved: data.saved,
      standards,
      matched,
      unmatched: data.posItems.filter((p) => !p.is_deleted && !(data.links.get(p.external_id) || []).length).length,
      amounts,
      byCategory: { amounts: byCategory.amounts, sizes: byCategory.sizes.size },
      categoryReady: data.defaults !== null,
      piecesReady: data.ownPieces !== null,
      defaults: data.defaults,
      categories: data.categories,
      items: data.items,
      units: data.units,
      matchedItemIds: new Set([...data.links.values()].flat()),
      sizes: [
        ...[...sizeIds].map((id) => ({ item: itemsById.get(id), unit: unitOf(itemsById.get(id)), need: 'size' })),
        ...[...countIds].map((id) => ({ item: itemsById.get(id), unit: unitOf(itemsById.get(id)), need: 'pieces' })),
      ].sort((a, b) => a.item.name.localeCompare(b.item.name)),
    };
  }, [data]);

  return { summary, error, reload: load };
}
