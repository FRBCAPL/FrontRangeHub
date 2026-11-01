// Hand-added shopping list lines, merged into the worked-out "To buy" groups.
import { byName } from './itemsureShoppingList.js';

/** Group for hand-added lines when the list isn't grouped by supplier. */
export const EXTRA_GROUP = 'Added by hand';

export const extraTick = (id) => `extra:${id}`;

const nameOrder = (a, b) => a.label.localeCompare(b.label);

/**
 * Adds hand-added lines to `groups` (from buyGroups). Each line becomes a row
 * { key, tick, extra: true, extraId, itemId, name, amount } in the group `groupOf(extra)`
 * names, in name order with that group's worked-out rows. An item already on the list from its
 * warning levels isn't shown twice. Groups stay in name order with `lastGroup` last.
 */
export function mergeExtras(groups, extras, { groupOf, lastGroup, itemsById = new Map() }) {
  const listed = new Set(groups.flatMap((g) => g.rows.map((r) => r.itemId)));
  const byLabel = new Map(groups.map((g) => [g.label, { ...g, rows: [...g.rows] }]));
  for (const extra of extras) {
    if (extra.item_id && listed.has(extra.item_id)) continue;
    const label = groupOf(extra);
    if (!byLabel.has(label)) byLabel.set(label, { label, rows: [] });
    byLabel.get(label).rows.push({
      key: `extra|${extra.id}`,
      tick: extraTick(extra.id),
      extra: true,
      extraId: extra.id,
      itemId: extra.item_id || null,
      name: itemsById.get(extra.item_id)?.name || extra.name,
      amount: extra.amount || '',
    });
  }
  return [...byLabel.values()]
    .map((g) => ({ ...g, rows: [...g.rows].sort(byName) }))
    .sort((a, b) => (a.label === lastGroup) - (b.label === lastGroup) || nameOrder(a, b));
}

/**
 * Active items that can still be added: not already on the list, from `supplierId`
 * when one is chosen, and matching every word of `query`. Sorted by name.
 */
export function pickableItems(items, { supplierId = '', supplierOf = () => null, listed = new Set(), query = '' } = {}) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items
    .filter((i) => i.is_active !== false && !listed.has(i.id))
    .filter((i) => !supplierId || supplierOf(i.id) === supplierId)
    .filter((i) => words.every((w) => i.name.toLowerCase().includes(w)))
    .sort((a, b) => a.name.localeCompare(b.name));
}
