import { useCallback, useEffect, useMemo, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import { getPosConnection, listItemContents, listPosItems, listPosLinks, listPosPours } from '../services/itemsurePosService.js';
import { listStandardAmounts } from '../services/itemsureStandardAmountService.js';
import { DEFAULT_STANDARDS, suggestAmount } from '../utils/itemsurePourSuggest.js';
import { asksContent } from '../utils/itemsureItemContent.js';

/**
 * Sales tracking setup: what's left to do, with suggestions.
 * amounts: matched pairs with no amount yet, each { key, pos, item, unit, suggestion|null }.
 * sizes: items with an oz/ml amount, counted in something without a size yet.
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
      const [posItems, links, pours, contents, catalog, saved] = await Promise.all([
        listPosItems(organizationId), listPosLinks(organizationId), listPosPours(organizationId),
        listItemContents(organizationId), listCatalog(organizationId), listStandardAmounts(organizationId),
      ]);
      setData({ posItems, links, pours, contents, items: catalog.items, units: catalog.units, saved });
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
    for (const [externalId, itemIds] of data.links) {
      const pos = posById.get(externalId);
      if (!pos) continue;
      for (const itemId of itemIds) {
        const item = itemsById.get(itemId);
        if (!item) continue;
        const unit = unitOf(item);
        const pour = data.pours?.get(`${externalId}|${itemId}`);
        const options = { shared: itemIds.length > 1, itemName: item.name };
        if (!pour) amounts.push({ key: `${externalId}|${itemId}`, pos, item, unit, suggestion: suggestAmount(pos, unit, standards, options) });
        else if (pour.unit !== 'base' && asksContent(unit?.code) && !data.contents?.get(itemId)) sizeIds.add(itemId);
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
      sizes: [...sizeIds].map((id) => ({ item: itemsById.get(id), unit: unitOf(itemsById.get(id)) })).sort((a, b) => a.item.name.localeCompare(b.item.name)),
    };
  }, [data]);

  return { summary, error, reload: load };
}
