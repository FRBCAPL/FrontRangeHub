// "A Double pours one more of: Liquor, Liqueurs" — the category checklist on the Add-ons tab.
// Saved as category_defaults.doubles; see doublesByCategory for how the reports use it.

import { categoryAmountRows } from './itemsureCategoryDefaults.js';

/**
 * Checklist rows: categories with Clover-matched items (or a saved answer), main categories
 * first with their subcategories under them. Each { category, depth, on, parentOn } where on is
 * the answer in effect (its own, else its main category's) and parentOn the main category's.
 */
export function doublesRows({ categories, items, matchedItemIds, defaults, units }) {
  const rows = categoryAmountRows({ categories, items, matchedItemIds, defaults, units });
  const byId = new Map(rows.map((r) => [r.category.id, r]));
  const own = (r) => r?.value?.doubles ?? null;
  return rows
    .map((r) => {
      const parent = r.depth ? byId.get(r.category.parent_category_id) : null;
      const parentOn = own(parent) === true;
      const value = own(r);
      return { category: r.category, depth: r.depth, matched: r.matched, on: value ?? parentOn, parentOn, saved: value !== null };
    })
    .filter((r) => r.matched || r.saved);
}

/** What to save when a box is ticked or cleared: only differences from the main category. */
export function doublesValue(checked, parentOn) {
  if (checked) return parentOn ? null : true;
  return parentOn ? false : null;
}

/** "Liquor, Liqueurs": ticked categories, leaving out subcategories already covered by their main one. */
export function doublesSummary(rows) {
  return rows.filter((r) => r.on && !(r.depth && r.parentOn)).map((r) => r.category.name).join(', ');
}
