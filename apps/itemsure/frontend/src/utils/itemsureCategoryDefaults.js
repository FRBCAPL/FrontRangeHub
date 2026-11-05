// Category sizes and amounts per sale: an item's own value wins, then its subcategory's, then
// its main category's — only when that category is the same kind of thing (draft, wine, liquor,
// bottled). Liquor amounts do not fill in draft beer. Matches itemsure.pos_sale_uses.

import { kindForNames, kindOf } from './itemsureCategoryKind.js';

/** The item's category, then the ones above it (nearest first). Stops on a loop. */
export function categoryChain(categoryId, categoriesById) {
  const chain = [];
  const seen = new Set();
  for (let c = categoriesById.get(categoryId); c && !seen.has(c.id); c = categoriesById.get(c.parent_category_id)) {
    seen.add(c.id);
    chain.push(c);
  }
  return chain;
}

/** Counted unit from the catalog item, used so kegs stay draft. */
const unitOf = (item, unitsById) => {
  if (item?.base_unit_id && unitsById?.get(item.base_unit_id)) return unitsById.get(item.base_unit_id);
  if (item?.unitName || item?.unitCode) return { code: item.unitCode || '', name: item.unitName || '' };
  return null;
};

/** Nearest category of the same kind that has a value, else null. `pick(default)` returns the field. */
function sameKindValue(item, categoriesById, defaults, pick, unit) {
  const chain = categoryChain(item?.category_id, categoriesById);
  const names = chain.map((c) => c.name);
  const itemKind = kindForNames(item?.name, names, unit || unitOf(item));
  for (let i = 0; i < chain.length; i += 1) {
    const c = chain[i];
    const value = pick(defaults?.get(c.id));
    if (value == null) continue;
    // Include parents so "Bottled" under Beer is packaged, not leftover "other".
    if (kindOf(names.slice(i).join(' ')) !== itemKind) continue;
    return { value, name: c.name };
  }
  return null;
}

/** { amount, unit, fromCategory } from the nearest same-kind category with an amount, else null. */
export function categoryPour(item, categoriesById, defaults, unit) {
  const hit = sameKindValue(item, categoriesById, defaults, (d) => (d?.amount != null ? d : null), unit);
  return hit ? { amount: hit.value.amount, unit: hit.value.unit, fromCategory: hit.name } : null;
}

/** { ml, fromCategory } from the nearest same-kind category with a size, else null. */
export function categorySize(item, categoriesById, defaults, unit) {
  const hit = sameKindValue(item, categoriesById, defaults, (d) => (d?.contentMl != null ? d.contentMl : null), unit);
  return hit ? { ml: hit.value, fromCategory: hit.name } : null;
}

/** { pieces, fromCategory } from the nearest same-kind category with "how many in one", else null. */
export function categoryPieces(item, categoriesById, defaults, unit) {
  const hit = sameKindValue(item, categoriesById, defaults, (d) => (d?.pieces != null ? d.pieces : null), unit);
  return hit ? { pieces: hit.value, fromCategory: hit.name } : null;
}

/** Whether a Double pours more of this item: its nearest category with a yes/no answer, else null. */
export function categoryDoubles(item, categoriesById, defaults) {
  for (const c of categoryChain(item?.category_id, categoriesById)) {
    const value = defaults?.get(c.id)?.doubles;
    if (value != null) return value;
  }
  return null;
}

/**
 * Map Clover item id -> Set of its matched items whose category says a Double pours more of
 * them. Clover items with none are left out, so a Double there pours its first matched item.
 */
export function doublesByCategory({ links, items, categories, defaults }) {
  const out = new Map();
  if (!defaults?.size || !links) return out;
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  for (const [externalId, itemIds] of links) {
    const yes = itemIds.filter((id) => categoryDoubles(itemsById.get(id), categoriesById, defaults) === true);
    if (yes.length) out.set(externalId, new Set(yes));
  }
  return out;
}

/**
 * Rows for the "Category amounts" list: each main category, then its subcategories.
 * matched: Clover-matched items in it (a main category counts its subcategories' too).
 * unit: the unit most of its items are counted in (for size choices), or null.
 * value: its saved { contentMl, amount, unit } or null. Only active categories.
 */
export function categoryAmountRows({ categories, items, matchedItemIds, defaults, units }) {
  const active = categories.filter((c) => c.is_active !== false);
  const byId = new Map(active.map((c) => [c.id, c]));
  const unitsById = new Map((units || []).map((u) => [u.id, u]));
  const mainOf = (id) => {
    const p = byId.get(id)?.parent_category_id;
    return p && byId.has(p) ? p : null;
  };
  const stats = new Map();
  const add = (categoryId, item, isMatched) => {
    const s = stats.get(categoryId) || { matched: 0, units: new Map() };
    if (isMatched) s.matched += 1;
    s.units.set(item.base_unit_id, (s.units.get(item.base_unit_id) || 0) + 1);
    stats.set(categoryId, s);
  };
  for (const item of items) {
    if (!byId.has(item.category_id)) continue;
    const isMatched = matchedItemIds.has(item.id);
    add(item.category_id, item, isMatched);
    const main = mainOf(item.category_id);
    if (main) add(main, item, isMatched);
  }
  const row = (c, depth) => {
    const s = stats.get(c.id);
    const top = s ? [...s.units].sort((a, b) => b[1] - a[1])[0] : null;
    return { category: c, depth, matched: s?.matched || 0, unit: top ? unitsById.get(top[0]) || null : null, value: defaults?.get(c.id) || null };
  };
  const byName = (a, b) => a.name.localeCompare(b.name);
  const roots = active.filter((c) => !mainOf(c.id)).sort(byName);
  return roots.flatMap((root) => [
    row(root, 0),
    ...active.filter((c) => mainOf(c.id) === root.id).sort(byName).map((c) => row(c, 1)),
  ]);
}

/**
 * Amounts and sizes as used for sales: own values, with category values filling the gaps.
 * pours: Map "cloverId|itemId" -> { amount, unit, fromCategory? }; contents: Map itemId -> ml;
 * contentFrom: Map itemId -> category name, for sizes that come from a category.
 * pieces / piecesFrom: the same for "how many singles in one" (a case of 24).
 * pours, contents or pieces stay null when their own list is null (database update not applied).
 */
export function withCategoryDefaults({ links, pours, contents, pieces = null, items, categories, defaults, units }) {
  if (!defaults?.size) return { pours, contents, contentFrom: new Map(), pieces, piecesFrom: new Map() };
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const unitsById = new Map((units || []).map((u) => [u.id, u]));
  const outPours = pours ? new Map(pours) : null;
  const outContents = contents ? new Map(contents) : null;
  const contentFrom = new Map();
  if (outPours) {
    for (const [externalId, itemIds] of links) {
      for (const itemId of itemIds) {
        const key = `${externalId}|${itemId}`;
        if (outPours.has(key)) continue;
        const item = itemsById.get(itemId);
        const pour = categoryPour(item, categoriesById, defaults, unitOf(item, unitsById));
        if (pour) outPours.set(key, pour);
      }
    }
  }
  if (outContents) {
    for (const item of items) {
      if (outContents.has(item.id)) continue;
      const size = categorySize(item, categoriesById, defaults, unitOf(item, unitsById));
      if (size) {
        outContents.set(item.id, size.ml);
        contentFrom.set(item.id, size.fromCategory);
      }
    }
  }
  const outPieces = pieces ? new Map(pieces) : null;
  const piecesFrom = new Map();
  if (outPieces) {
    for (const item of items) {
      if (outPieces.has(item.id)) continue;
      const count = categoryPieces(item, categoriesById, defaults, unitOf(item, unitsById));
      if (count) {
        outPieces.set(item.id, count.pieces);
        piecesFrom.set(item.id, count.fromCategory);
      }
    }
  }
  return { pours: outPours, contents: outContents, contentFrom, pieces: outPieces, piecesFrom };
}
