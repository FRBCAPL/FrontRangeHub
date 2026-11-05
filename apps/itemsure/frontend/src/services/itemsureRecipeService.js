import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { setPosPour } from './itemsurePosService.js';

// Recipes (a drink or dish built once from catalog items) and the Clover buttons that use them.
// Every change goes through database functions that also write the buttons' ordinary matches,
// so reports read them the same as hand-made ones. Nothing here changes stock or Clover.

const PROVIDER = 'clover';

const missingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205'
  || /could not find the table|does not exist/i.test(error.message || ''));

/**
 * { missing } until the database update is applied, else { recipes } by name, each with its
 * ingredients in order: { id, name, lines: [{ itemId, amount|null, unit|null }] }.
 */
export async function listRecipes(organizationId) {
  const [recipes, lines] = await Promise.all([
    itemsure.from('recipes').select('id, name, updated_at').eq('organization_id', organizationId).order('name'),
    itemsure.from('recipe_items').select('recipe_id, item_id, position, uses_amount, uses_unit')
      .eq('organization_id', organizationId).order('position'),
  ]);
  if (missingTable(recipes.error) || missingTable(lines.error)) return { missing: true, recipes: [] };
  const byRecipe = new Map();
  for (const r of assertOk(lines, 'recipe ingredients') || []) {
    const line = { itemId: r.item_id, amount: r.uses_amount == null ? null : Number(r.uses_amount), unit: r.uses_unit };
    byRecipe.set(r.recipe_id, [...(byRecipe.get(r.recipe_id) || []), line]);
  }
  const list = (assertOk(recipes, 'recipes') || []).map((r) => ({ id: r.id, name: r.name, lines: byRecipe.get(r.id) || [] }));
  return { missing: false, recipes: list };
}

/** Map of Clover button id -> recipe id, or null until the database update is applied. */
export async function listRecipeUses(organizationId) {
  const { data, error } = await itemsure.from('pos_recipe_uses').select('external_id, recipe_id')
    .eq('organization_id', organizationId).eq('provider', PROVIDER);
  if (missingTable(error)) return null;
  return new Map((assertOk({ data, error }, 'recipe uses') || []).map((r) => [r.external_id, r.recipe_id]));
}

/** Creates (id null) or changes a recipe; buttons using it follow. lines: [{ itemId, amount|null, unit|null }]. Returns the id. */
export async function saveRecipe(organizationId, id, name, lines) {
  const payload = lines.map((l) => ({ item_id: l.itemId, amount: l.amount ?? null, unit: l.amount == null ? null : l.unit }));
  return assertOk(
    await itemsure.rpc('save_recipe', { p_organization: organizationId, p_recipe: id || null, p_name: name, p_lines: payload }),
    'save the recipe',
  );
}

/** Buttons that used it keep their matches as ordinary ones. */
export async function deleteRecipe(organizationId, id) {
  assertOk(await itemsure.rpc('delete_recipe', { p_organization: organizationId, p_recipe: id }), 'delete the recipe');
}

/** Makes Clover buttons use a recipe (their matches are replaced). Returns how many. */
export async function applyRecipeTo(organizationId, recipeId, externalIds) {
  return assertOk(
    await itemsure.rpc('use_pos_recipe', { p_organization: organizationId, p_recipe: recipeId, p_external_ids: externalIds }),
    'use the recipe',
  );
}

/**
 * Saves how much one sale of a Clover button uses of an item (null amount clears it). When the
 * button uses a recipe, the recipe's ingredient changes instead, so every button using it follows.
 */
export async function setButtonPour(organizationId, externalId, itemId, amount, unit) {
  const { data: use, error } = await itemsure.from('pos_recipe_uses').select('recipe_id')
    .eq('organization_id', organizationId).eq('provider', PROVIDER).eq('external_id', externalId).maybeSingle();
  if (missingTable(error) || !use) {
    await setPosPour(organizationId, externalId, itemId, amount, unit);
    return;
  }
  assertOk({ error }, 'recipe uses');
  const [recipe, lines] = await Promise.all([
    itemsure.from('recipes').select('name').eq('id', use.recipe_id).single(),
    itemsure.from('recipe_items').select('item_id, uses_amount, uses_unit').eq('recipe_id', use.recipe_id).order('position'),
  ]);
  const name = assertOk(recipe, 'the recipe').name;
  const next = (assertOk(lines, 'recipe ingredients') || []).map((l) => (l.item_id === itemId
    ? { itemId, amount: amount ?? null, unit: amount == null ? null : unit }
    : { itemId: l.item_id, amount: l.uses_amount == null ? null : Number(l.uses_amount), unit: l.uses_unit }));
  await saveRecipe(organizationId, use.recipe_id, name, next);
}

/** Buttons stop using their recipe; their matches stay and can be changed one by one. */
export async function stopRecipeOn(organizationId, externalIds) {
  assertOk(await itemsure.rpc('stop_pos_recipe', { p_organization: organizationId, p_external_ids: externalIds }), 'stop using the recipe');
}
