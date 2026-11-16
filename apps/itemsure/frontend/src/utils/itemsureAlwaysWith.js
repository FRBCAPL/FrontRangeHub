import { singularUnit } from './itemsureItemLook.js';
import { categoryPath, categoryTree } from './itemsureCategories.js';

/** Form rows for Goes with sales: [{ categoryId, amount: text, unit }]. */
export function alwaysWithToForm(rows) {
  return (rows || []).map((r) => ({
    categoryId: r.categoryId,
    amount: r.amount == null ? '1' : String(r.amount),
    unit: r.unit || 'base',
  }));
}

/**
 * Validates form rows. Returns { error } or { rows: [{ categoryId, amount, unit }] }.
 */
export function checkAlwaysWith(formRows, knownCategoryIds) {
  const known = knownCategoryIds instanceof Set ? knownCategoryIds : new Set(knownCategoryIds || []);
  const seen = new Set();
  const rows = [];
  for (const r of formRows || []) {
    if (!r.categoryId || !known.has(r.categoryId)) {
      return { error: 'Pick a category that is still in your list.' };
    }
    if (seen.has(r.categoryId)) return { error: 'Each category can be listed only once.' };
    seen.add(r.categoryId);
    const n = Number(String(r.amount ?? '').trim());
    if (!(n > 0) || n > 100000) return { error: 'Amount must be more than 0.' };
    const unit = r.unit || 'base';
    if (!['fl_oz', 'ml', 'base', 'piece'].includes(unit)) return { error: 'Pick a valid unit.' };
    rows.push({ categoryId: r.categoryId, amount: n, unit });
  }
  if (rows.length > 20) return { error: 'Keep Goes with sales to at most 20 categories.' };
  return { rows };
}

/** Short door hint: "Food · Wings" or a fallback. */
export function alwaysWithHint(rows, categories) {
  if (!rows?.length) return 'Taken off once with sales in chosen categories';
  const tree = categoryTree(categories || []);
  const names = rows.map((r) => categoryPath(tree, r.categoryId) || 'Category').filter(Boolean);
  return names.slice(0, 3).join(' · ') + (names.length > 3 ? ` · +${names.length - 3}` : '');
}

/** "1 sheet" style for a rule line. */
export function alwaysWithAmountText(row, unitName) {
  const n = Number(row.amount);
  const base = singularUnit(unitName || 'unit').toLowerCase();
  const unit = { fl_oz: 'oz', ml: 'ml', base: n === 1 ? base : `${base}s`, piece: n === 1 ? 'single' : 'singles' }[row.unit] || '';
  return `${n} ${unit}`.trim();
}

/**
 * True when a sale of an item in `itemCategoryId` triggers an always-with rule for `ruleCategoryId`
 * (exact category or the item's parent is the rule category — same as take-off SQL).
 */
export function categoryTriggersAlwaysWith(itemCategoryId, ruleCategoryId, categories) {
  if (!itemCategoryId || !ruleCategoryId) return false;
  if (itemCategoryId === ruleCategoryId) return true;
  const tree = categoryTree(categories || []);
  return tree.parentOf(itemCategoryId) === ruleCategoryId;
}

/**
 * Packaging items that ride along when this catalog item is sold in Clover.
 * `alwaysByItem`: Map packagingItemId -> [{ categoryId, amount, unit }].
 * Returns [{ itemId, name, amount, unit, unitName, categoryId }] (skips the item itself).
 */
export function packagingForCatalogItem(alwaysByItem, item, categories, itemsById) {
  if (!alwaysByItem?.size || !item?.category_id) return [];
  const out = [];
  for (const [packId, rules] of alwaysByItem) {
    if (packId === item.id) continue;
    const hit = (rules || []).find((r) => categoryTriggersAlwaysWith(item.category_id, r.categoryId, categories));
    if (!hit) continue;
    const pack = itemsById?.get?.(packId) || null;
    out.push({
      itemId: packId,
      name: pack?.name || 'Item',
      amount: hit.amount,
      unit: hit.unit,
      unitName: pack?.unitName || 'unit',
      categoryId: hit.categoryId,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** "1 Checkered Sheets" list for a food item note. */
export function packagingAttachedLabel(rows) {
  return (rows || []).map((r) => `${alwaysWithAmountText(r, r.unitName)} ${r.name}`).join(', ');
}
