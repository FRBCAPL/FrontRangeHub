// Recipes: plain helpers for the form, the ingredient text, and picking Clover buttons.
import { singularUnit } from './itemsureItemLook.js';

export const MAX_INGREDIENTS = 20;
export const MAX_BUTTONS = 500;

/** "3 oz", "1 bottle", "2 singles", or "usual pour" when the amount is left empty. */
export function amountText(line, item) {
  if (line.amount == null) return 'usual pour';
  const n = Number(line.amount);
  const unitName = singularUnit(item?.unitName || 'unit').toLowerCase();
  const unit = { fl_oz: 'oz', ml: 'ml', base: n === 1 ? unitName : `${unitName}s`, piece: n === 1 ? 'single' : 'singles' }[line.unit] || '';
  return `${n} ${unit}`.trim();
}

/** "1.5 oz Tequila + 3 oz Margarita Mix"; ingredients whose item is gone are skipped. */
export function recipeText(recipe, itemsById) {
  const parts = (recipe?.lines || [])
    .filter((l) => itemsById.has(l.itemId))
    .map((l) => {
      const item = itemsById.get(l.itemId);
      return l.amount == null ? `${item.name} (usual pour)` : `${amountText(l, item)} ${item.name}`;
    });
  return parts.length ? parts.join(' + ') : 'No ingredients';
}

/**
 * A new recipe started from a Clover button: its name, and the items it's linked to now with
 * the amounts set on that button (`pours`: Map of "button|item" -> { amount, unit }; others are "usual").
 */
export function recipeFromButton(pos, matchedIds, pours) {
  return {
    name: String(pos?.name || '').trim().slice(0, 80),
    lines: (matchedIds || []).slice(0, MAX_INGREDIENTS).map((itemId) => {
      const pour = pours?.get(`${pos.external_id}|${itemId}`);
      return pour ? { itemId, amount: pour.amount, unit: pour.unit } : { itemId, amount: null, unit: null };
    }),
  };
}

/** Saved ingredients -> form rows ({ itemId, amount: text, unit }). */
export const linesToForm = (lines) => (lines || []).map((l) => ({
  itemId: l.itemId, amount: l.amount == null ? '' : String(l.amount), unit: l.unit || 'fl_oz',
}));

/**
 * Checks the form. An empty amount means "usual pour". Returns { error } or { name, lines }
 * ready for saveRecipe.
 */
export function checkRecipe(name, rows, knownIds) {
  const clean = String(name || '').trim();
  if (!clean) return { error: 'Give the recipe a name.' };
  if (clean.length > 80) return { error: 'Keep the name under 80 characters.' };
  if (!rows.length) return { error: 'Add at least one ingredient.' };
  if (rows.length > MAX_INGREDIENTS) return { error: `A recipe can have up to ${MAX_INGREDIENTS} ingredients.` };
  if (rows.some((r) => !knownIds.has(r.itemId))) return { error: 'One of the ingredients is no longer in your catalog. Remove it.' };
  if (new Set(rows.map((r) => r.itemId)).size !== rows.length) return { error: 'Each item can be in a recipe only once.' };
  const lines = [];
  for (const r of rows) {
    const text = String(r.amount ?? '').trim();
    if (!text) {
      lines.push({ itemId: r.itemId, amount: null, unit: null });
      continue;
    }
    const n = Number(text);
    if (!(n > 0) || n > 100000) return { error: 'Amounts must be more than 0, or left empty for the usual pour.' };
    lines.push({ itemId: r.itemId, amount: n, unit: r.unit || 'fl_oz' });
  }
  return { name: clean, lines };
}

/** Map of recipe id -> how many Clover buttons use it. `uses`: Map of button id -> recipe id. */
export function recipeUseCounts(uses) {
  const out = new Map();
  for (const recipeId of uses?.values() || []) out.set(recipeId, (out.get(recipeId) || 0) + 1);
  return out;
}

/**
 * Clover buttons for the picker: every word of `search` must be in the name or Clover category.
 * Removed buttons are left out. The ones already using `recipeId` come first.
 */
export function pickableButtons(posItems, search, uses, recipeId) {
  const words = String(search || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return (posItems || [])
    .filter((p) => !p.is_deleted)
    .filter((p) => {
      const text = `${p.name || ''} ${p.category_name || ''}`.toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .sort((a, b) => Number(uses?.get(b.external_id) === recipeId) - Number(uses?.get(a.external_id) === recipeId)
      || String(a.name || '').localeCompare(String(b.name || '')));
}
