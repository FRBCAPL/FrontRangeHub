import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { listRecipes } from './itemsureRecipeService.js';

// Clover modifiers ("Double", "Add Red Bull") and what each does for stock. Reports only:
// nothing here changes stock, and nothing is ever sent to Clover.

const PROVIDER = 'clover';
const PAGE = 1000;
const RULE = 'id, modifier_id, name, seen_at, action, extra_pours, item_id, uses_amount, uses_unit';

const missingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205'
  || /could not find the table|does not exist/i.test(error.message || ''));

/** Map modifier_id -> [{ item_id, uses_amount, uses_unit }], or null until the multi-item update is applied. */
async function listModifierLines(organizationId) {
  const { data, error } = await itemsure.from('pos_modifier_items').select('modifier_id, item_id, uses_amount, uses_unit')
    .eq('organization_id', organizationId).eq('provider', PROVIDER).order('created_at');
  if (missingTable(error)) return null;
  const byModifier = new Map();
  for (const r of assertOk({ data, error }, 'Clover modifier items') || []) {
    byModifier.set(r.modifier_id, [...(byModifier.get(r.modifier_id) || []), r]);
  }
  return byModifier;
}

const missingColumn = (error) => error && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''));

/** Modifier rows, with recipe_id when the add-on recipes update is applied. */
async function listRules(organizationId) {
  const query = (cols) => itemsure.from('pos_modifiers').select(cols).eq('organization_id', organizationId).eq('provider', PROVIDER).order('name');
  const withRecipe = await query(`${RULE}, recipe_id`);
  if (!missingColumn(withRecipe.error)) return { ...withRecipe, recipeReady: !withRecipe.error };
  return { ...(await query(RULE)), recipeReady: false };
}

/**
 * { missing } until the database update is applied, else { rows, multiReady, recipeReady, recipes }:
 * every modifier seen in sales, each with its `lines` when it uses several items and its `recipe`
 * ({ id, name, lines }) when it uses one. recipes: every recipe, for choosing one.
 */
export async function listModifiers(organizationId) {
  const [{ data, error, recipeReady }, lines, recipeList] = await Promise.all([
    listRules(organizationId),
    listModifierLines(organizationId),
    listRecipes(organizationId).catch(() => ({ missing: true, recipes: [] })),
  ]);
  if (missingTable(error)) return { missing: true, rows: [], multiReady: false, recipeReady: false, recipes: [] };
  const recipes = recipeList.missing ? [] : recipeList.recipes;
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const rows = (assertOk({ data, error }, 'Clover modifiers') || []).map((r) => ({
    ...r, lines: lines?.get(r.modifier_id) || [], recipe: r.recipe_id ? byId.get(r.recipe_id) || null : null,
  }));
  return { missing: false, rows, multiReady: lines !== null, recipeReady: recipeReady && !recipeList.missing, recipes };
}

/**
 * Saves what a modifier does: { action: 'none' } | { action: 'extra', extraPours }
 * | { action: 'item', itemId, amount, unit } | { action: 'items', lines: [{ itemId, amount, unit }] }
 * | { action: 'recipe', recipeId }. With `recipeReady`, any saved recipe is cleared first.
 * Several items are saved in one step (all or nothing).
 */
export async function saveModifier(id, rule) {
  if (rule.action === 'items') {
    const lines = rule.lines.map((l) => ({ item_id: l.itemId, amount: l.amount, unit: l.unit }));
    assertOk(await itemsure.rpc('set_pos_modifier_items', { p_modifier: id, p_lines: lines }), 'save the modifier');
    const row = assertOk(await itemsure.from('pos_modifiers').select(RULE).eq('id', id).single(), 'save the modifier');
    const saved = assertOk(await itemsure.from('pos_modifier_items').select('modifier_id, item_id, uses_amount, uses_unit')
      .eq('organization_id', rule.organizationId).eq('provider', PROVIDER).eq('modifier_id', row.modifier_id).order('created_at'), 'save the modifier');
    return { ...row, lines: saved || [] };
  }
  const row = { action: rule.action, extra_pours: null, item_id: null, uses_amount: null, uses_unit: null, updated_at: new Date().toISOString() };
  if (rule.recipeReady) row.recipe_id = null;
  if (rule.action === 'extra') row.extra_pours = rule.extraPours;
  if (rule.action === 'item') Object.assign(row, { item_id: rule.itemId, uses_amount: rule.amount, uses_unit: rule.unit });
  if (rule.action === 'recipe') row.recipe_id = rule.recipeId;
  const cols = rule.recipeReady ? `${RULE}, recipe_id` : RULE;
  return { ...assertOk(await itemsure.from('pos_modifiers').update(row).eq('id', id).select(cols).single(), 'save the modifier'), lines: [] };
}

/** Hourly modifier use [{ external_id, modifier_id, hour_start, quantity }], or null until the update is applied. */
export async function modifierHours(organizationId, after, upTo) {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await itemsure.from('pos_modifier_hourly')
      .select('external_id, modifier_id, hour_start, quantity')
      .eq('organization_id', organizationId).eq('provider', PROVIDER)
      .gt('hour_start', after).lte('hour_start', upTo)
      .order('hour_start').order('external_id').order('modifier_id').range(from, from + PAGE - 1);
    if (missingTable(error)) return null;
    const rows = assertOk({ data, error }, 'Clover modifiers') || [];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}