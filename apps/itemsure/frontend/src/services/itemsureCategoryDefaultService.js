import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Sizes and amounts per sale set by category ("Liquor: 750 ml bottles, 1.5 oz a sale"), and
// whether a Double pours more of it. Items and Clover matches without their own value use
// these (see itemsureCategoryDefaults.js).

const num = (v) => (v == null ? null : Number(v));
const SCOPE = 'save the category amounts';

/**
 * Map of category id -> { contentMl, amount, unit, pieces, doubles } (each may be null). pieces
 * is "how many singles in one" (a case of 24); doubles: true / false / null (follow the main
 * category). The map's `doublesReady` is true once that database update is applied.
 * null until the first category update is applied.
 */
export async function listCategoryDefaults(organizationId) {
  const base = 'category_id, content_ml, uses_amount, uses_unit';
  const query = (columns) => itemsure.from('category_defaults').select(columns).eq('organization_id', organizationId);
  let doublesReady = true;
  let { data, error } = await query(`${base}, pieces, doubles`);
  if (error) {
    doublesReady = false;
    ({ data, error } = await query(`${base}, pieces`));
  }
  if (error) ({ data, error } = await query(base));
  if (error) return null;
  const map = new Map((data || []).map((r) => [r.category_id, {
    contentMl: num(r.content_ml), amount: num(r.uses_amount), unit: r.uses_unit || null, pieces: num(r.pieces), doubles: r.doubles ?? null,
  }]));
  return Object.defineProperty(map, 'doublesReady', { value: doublesReady });
}

const forCategory = (q, organizationId, categoryId) => q.eq('organization_id', organizationId).eq('category_id', categoryId);

/**
 * Removes a category's sizes and amounts. Without `keepDoubles` the whole row goes; with it, a
 * saved doubles setting stays (screens that only edit amounts don't know about it).
 */
async function clearCategory(organizationId, categoryId, keepDoubles) {
  if (!keepDoubles) {
    assertOk(await forCategory(itemsure.from('category_defaults').delete(), organizationId, categoryId), SCOPE);
    return;
  }
  const { error } = await forCategory(itemsure.from('category_defaults').delete(), organizationId, categoryId).is('doubles', null);
  if (error) {
    // Before the doubles update there is nothing to keep.
    assertOk(await forCategory(itemsure.from('category_defaults').delete(), organizationId, categoryId), SCOPE);
    return;
  }
  assertOk(await forCategory(itemsure.from('category_defaults')
    .update({ content_ml: null, uses_amount: null, uses_unit: null, pieces: null, updated_at: new Date().toISOString() }), organizationId, categoryId), SCOPE);
}

/**
 * Saves only whether a Double pours more of a category (true / false / null = follow the main
 * category), keeping its sizes and amounts. A row left with nothing set is removed.
 */
export async function saveCategoryDoubles(organizationId, categoryId, doubles) {
  const at = new Date().toISOString();
  if (doubles == null) {
    assertOk(await forCategory(itemsure.from('category_defaults').delete(), organizationId, categoryId)
      .is('content_ml', null).is('uses_amount', null).is('pieces', null), SCOPE);
    assertOk(await forCategory(itemsure.from('category_defaults').update({ doubles: null, updated_at: at }), organizationId, categoryId), SCOPE);
    return;
  }
  const update = async () => assertOk(
    await forCategory(itemsure.from('category_defaults').update({ doubles, updated_at: at }), organizationId, categoryId).select('category_id'),
    SCOPE,
  ) || [];
  if ((await update()).length) return;
  const { error } = await itemsure.from('category_defaults').insert({ category_id: categoryId, organization_id: organizationId, doubles });
  if (!error) return;
  if (error.code !== '23505') assertOk({ error }, SCOPE);
  await update();
}

/**
 * Saves a category's size, amount, count and doubles setting; all empty removes its row.
 * pieces and doubles are only changed when given, so this still works before those updates and
 * from screens that don't show them. Updates, else inserts (retrying the update on a race).
 */
export async function saveCategoryDefault(organizationId, categoryId, value) {
  const { contentMl = null, amount = null, unit = null, pieces = null, doubles = null } = value;
  const hasDoubles = 'doubles' in value;
  if (contentMl == null && amount == null && pieces == null && doubles == null) {
    await clearCategory(organizationId, categoryId, !hasDoubles);
    return;
  }
  const values = {
    content_ml: contentMl,
    uses_amount: amount,
    uses_unit: amount == null ? null : unit,
    ...('pieces' in value ? { pieces } : {}),
    ...(hasDoubles ? { doubles } : {}),
  };
  const update = async () => assertOk(
    await forCategory(itemsure.from('category_defaults').update({ ...values, updated_at: new Date().toISOString() }), organizationId, categoryId)
      .select('category_id'),
    SCOPE,
  ) || [];
  if ((await update()).length) return;
  const { error } = await itemsure.from('category_defaults').insert({ category_id: categoryId, organization_id: organizationId, ...values });
  if (!error) return;
  if (error.code !== '23505') assertOk({ error }, SCOPE);
  await update();
}
