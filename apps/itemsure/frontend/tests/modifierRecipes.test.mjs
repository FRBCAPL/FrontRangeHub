import test from 'node:test';
import assert from 'node:assert/strict';
import { modifierSetup, modifierUse, ruleLines, ruleOf, ruleText } from '../src/utils/itemsurePosModifiers.js';
import { usualPourFor } from '../src/utils/itemsureCategoryDefaults.js';

const recipe = { id: 'r1', name: 'Margarita', lines: [{ itemId: 'mix', amount: 3, unit: 'fl_oz' }, { itemId: 'sec', amount: null, unit: null }] };
const row = { modifier_id: 'M1', name: 'Make it a Margarita', action: 'recipe', recipe_id: 'r1', recipe };

test('a recipe rule reads from its recipe', () => {
  const rule = ruleOf(row);
  assert.deepEqual(rule, { action: 'recipe', recipeId: 'r1', recipeName: 'Margarita', lines: recipe.lines });
  assert.deepEqual(ruleLines(rule), recipe.lines);
  assert.equal(ruleText(rule), 'Uses the Margarita recipe');
  assert.equal(ruleText(ruleOf({ ...row, recipe: null })), 'Uses a recipe that was deleted');
  assert.deepEqual(ruleLines(ruleOf({ ...row, recipe: null })), []);
  assert.ok(modifierSetup({ rows: [row] }).rules.has('M1'));
});

test('a recipe add-on counts each ingredient; empty amounts use the usual pour', () => {
  const { rules, names } = modifierSetup({ rows: [row] });
  const mods = modifierUse({
    keys: ['RITA|M1'],
    qtyFor: () => 2,
    rules,
    names,
    links: new Map([['RITA', ['teq']]]),
    pours: new Map(),
    unitCodes: new Map([['mix', 'milliliter'], ['sec', 'milliliter']]),
    contents: new Map(),
    pieces: new Map(),
    usual: (id) => (id === 'sec' ? { amount: 0.5, unit: 'fl_oz' } : null),
  });
  assert.ok(Math.abs(mods.get('mix').extra - 2 * 3 * 29.5735) < 1e-6);
  assert.ok(Math.abs(mods.get('sec').extra - 2 * 0.5 * 29.5735) < 1e-6);
  assert.equal(mods.get('sec').incomplete, false);
  assert.equal(mods.has('teq'), false);
});

test('an empty amount with no usual pour is flagged, not guessed', () => {
  const { rules, names } = modifierSetup({ rows: [row] });
  const mods = modifierUse({
    keys: ['RITA|M1'], qtyFor: () => 1, rules, names, links: new Map(), pours: new Map(),
    unitCodes: new Map([['mix', 'milliliter'], ['sec', 'milliliter']]), contents: new Map(), pieces: new Map(),
  });
  assert.equal(mods.get('sec').incomplete, true);
  assert.equal(mods.get('sec').extra, 0);
});

test('usual pour comes from the item\'s category', () => {
  const usual = usualPourFor({
    items: [{ id: 'sec', name: 'Triple Sec', category_id: 'liq', unitName: 'Bottles' }],
    categories: [{ id: 'liq', name: 'Liquor', parent_category_id: null }],
    defaults: new Map([['liq', { amount: 1.5, unit: 'fl_oz' }]]),
    units: [],
  });
  assert.deepEqual(usual('sec'), { amount: 1.5, unit: 'fl_oz', fromCategory: 'Liquor' });
  assert.equal(usual('nope'), null);
  assert.equal(usualPourFor({ items: [], categories: [], defaults: new Map(), units: [] })('sec'), null);
});
