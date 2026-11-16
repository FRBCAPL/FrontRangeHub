import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

const missingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205'
  || /could not find the table|does not exist/i.test(error.message || ''));

const missingFunction = (error) => error && (error.code === 'PGRST202' || error.code === '42883'
  || /could not find the function/i.test(error.message || ''));

/**
 * Map of item id -> [{ categoryId, amount, unit }], or null until the database update is applied.
 */
export async function listAlwaysWith(organizationId) {
  const { data, error } = await itemsure
    .from('item_always_with')
    .select('item_id, category_id, uses_amount, uses_unit')
    .eq('organization_id', organizationId);
  if (missingTable(error)) return null;
  const byItem = new Map();
  for (const row of assertOk({ data, error }, 'Goes with sales') || []) {
    const list = byItem.get(row.item_id) || [];
    list.push({
      categoryId: row.category_id,
      amount: Number(row.uses_amount),
      unit: row.uses_unit,
    });
    byItem.set(row.item_id, list);
  }
  return byItem;
}

/** Replace all Goes with sales rules for one item. rows: [{ categoryId, amount, unit }]. */
export async function saveAlwaysWith(organizationId, itemId, rows) {
  const payload = (rows || []).map((r) => ({
    category_id: r.categoryId,
    amount: r.amount,
    unit: r.unit,
  }));
  const { error } = await itemsure.rpc('set_item_always_with', {
    p_organization: organizationId,
    p_item: itemId,
    p_rows: payload,
  });
  if (missingFunction(error) || missingTable(error)) {
    throw new Error('Goes with sales needs a database update first. Nothing else is affected.');
  }
  assertOk({ data: null, error }, 'save Goes with sales');
}

/**
 * Append one ingredient to many recipes. Returns { updated, skippedHave, skippedFull }.
 * amount/unit null = usual pour.
 */
export async function addIngredientToRecipes(organizationId, itemId, amount, unit, recipeIds) {
  const { data, error } = await itemsure.rpc('add_ingredient_to_recipes', {
    p_organization: organizationId,
    p_item: itemId,
    p_amount: amount,
    p_unit: unit,
    p_recipe_ids: recipeIds,
  });
  if (missingFunction(error) || missingTable(error)) {
    throw new Error('Adding an ingredient to recipes needs a database update first. Nothing else is affected.');
  }
  const row = assertOk({ data, error }, 'add ingredient to recipes') || {};
  return {
    updated: Number(row.updated) || 0,
    skippedHave: Number(row.skipped_have) || 0,
    skippedFull: Number(row.skipped_full) || 0,
  };
}
