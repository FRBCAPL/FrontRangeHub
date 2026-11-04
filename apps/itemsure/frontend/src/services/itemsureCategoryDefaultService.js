import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Sizes and amounts per sale set by category ("Liquor: 750 ml bottles, 1.5 oz a sale").
// Items and Clover matches without their own value use these (see itemsureCategoryDefaults.js).

const num = (v) => (v == null ? null : Number(v));

/**
 * Map of category id -> { contentMl, amount, unit, pieces } (each may be null). pieces is
 * "how many singles in one" (a case of 24). null until the database update is applied.
 */
export async function listCategoryDefaults(organizationId) {
  const base = 'category_id, content_ml, uses_amount, uses_unit';
  const query = (columns) => itemsure.from('category_defaults').select(columns).eq('organization_id', organizationId);
  let { data, error } = await query(`${base}, pieces`);
  if (error) ({ data, error } = await query(base));
  if (error) return null;
  return new Map((data || []).map((r) => [r.category_id, {
    contentMl: num(r.content_ml), amount: num(r.uses_amount), unit: r.uses_unit || null, pieces: num(r.pieces),
  }]));
}

/** Saves a category's size, amount and count; all empty removes its row. Updates, else inserts (retrying the update on a race). */
export async function saveCategoryDefault(organizationId, categoryId, value) {
  const { contentMl = null, amount = null, unit = null, pieces = null } = value;
  const scope = 'save the category amounts';
  if (contentMl == null && amount == null && pieces == null) {
    assertOk(await itemsure.from('category_defaults').delete().eq('organization_id', organizationId).eq('category_id', categoryId), scope);
    return;
  }
  // pieces is only sent when the form knows about it, so this still works before that database update.
  const values = { content_ml: contentMl, uses_amount: amount, uses_unit: amount == null ? null : unit, ...('pieces' in value ? { pieces } : {}) };
  const update = async () => assertOk(
    await itemsure.from('category_defaults').update({ ...values, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId).eq('category_id', categoryId).select('category_id'),
    scope,
  ) || [];
  if ((await update()).length) return;
  const { error } = await itemsure.from('category_defaults').insert({ category_id: categoryId, organization_id: organizationId, ...values });
  if (!error) return;
  if (error.code !== '23505') assertOk({ error }, scope);
  await update();
}
