import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amountText, checkRecipe, linesToForm, pickableButtons, recipeFromButton, recipeText, recipeUseCounts,
} from '../src/utils/itemsureRecipes.js';

test('recipeFromButton starts from the button name and its links, keeping amounts set on it', () => {
  const pours = new Map([['b1|teq', { amount: 1.5, unit: 'fl_oz' }]]);
  assert.deepEqual(recipeFromButton({ external_id: 'b1', name: ' Margarita ' }, ['teq', 'mix'], pours), {
    name: 'Margarita',
    lines: [{ itemId: 'teq', amount: 1.5, unit: 'fl_oz' }, { itemId: 'mix', amount: null, unit: null }],
  });
  assert.deepEqual(recipeFromButton({ external_id: 'b2', name: 'Wings' }, undefined, null), { name: 'Wings', lines: [] });
});

const items = new Map([
  ['teq', { id: 'teq', name: 'Tequila', unitName: 'Bottles' }],
  ['mix', { id: 'mix', name: 'Margarita Mix', unitName: 'Bottles' }],
  ['wings', { id: 'wings', name: 'Wings', unitName: 'Cases' }],
]);
const known = new Set(items.keys());

test('amounts read in plain words, empty means the usual pour', () => {
  assert.equal(amountText({ amount: 1.5, unit: 'fl_oz' }, items.get('teq')), '1.5 oz');
  assert.equal(amountText({ amount: 1, unit: 'base' }, items.get('teq')), '1 bottle');
  assert.equal(amountText({ amount: 2, unit: 'base' }, items.get('teq')), '2 bottles');
  assert.equal(amountText({ amount: 10, unit: 'piece' }, items.get('wings')), '10 singles');
  assert.equal(amountText({ amount: null, unit: null }, items.get('teq')), 'usual pour');
});

test('recipe text lists ingredients in order and skips deleted items', () => {
  const recipe = { lines: [{ itemId: 'teq', amount: null, unit: null }, { itemId: 'mix', amount: 3, unit: 'fl_oz' }, { itemId: 'gone', amount: 1, unit: 'base' }] };
  assert.equal(recipeText(recipe, items), 'Tequila (usual pour) + 3 oz Margarita Mix');
  assert.equal(recipeText({ lines: [] }, items), 'No ingredients');
});

test('checking the form', () => {
  const rows = [{ itemId: 'teq', amount: '', unit: 'fl_oz' }, { itemId: 'mix', amount: ' 3 ', unit: 'fl_oz' }];
  assert.deepEqual(checkRecipe('  House Margarita ', rows, known), {
    name: 'House Margarita',
    lines: [{ itemId: 'teq', amount: null, unit: null }, { itemId: 'mix', amount: 3, unit: 'fl_oz' }],
  });
  assert.match(checkRecipe(' ', rows, known).error, /name/);
  assert.match(checkRecipe('X', [], known).error, /at least one/);
  assert.match(checkRecipe('X', [{ itemId: 'teq', amount: '0', unit: 'fl_oz' }], known).error, /more than 0/);
  assert.match(checkRecipe('X', [{ itemId: 'teq', amount: 'abc', unit: 'fl_oz' }], known).error, /more than 0/);
  assert.match(checkRecipe('X', [{ itemId: 'nope', amount: '', unit: 'fl_oz' }], known).error, /no longer/);
  assert.match(checkRecipe('X', [rows[0], rows[0]], known).error, /only once/);
  assert.match(checkRecipe('X', Array.from({ length: 21 }, (_, i) => ({ itemId: `i${i}`, amount: '', unit: 'fl_oz' })), known).error, /up to 20/);
});

test('saved lines become form rows and back unchanged', () => {
  const lines = [{ itemId: 'teq', amount: null, unit: null }, { itemId: 'mix', amount: 3, unit: 'ml' }];
  const rows = linesToForm(lines);
  assert.deepEqual(rows, [{ itemId: 'teq', amount: '', unit: 'fl_oz' }, { itemId: 'mix', amount: '3', unit: 'ml' }]);
  assert.deepEqual(checkRecipe('M', rows, known).lines, lines);
});

test('how many buttons use each recipe', () => {
  const counts = recipeUseCounts(new Map([['A', 'r1'], ['B', 'r1'], ['C', 'r2']]));
  assert.equal(counts.get('r1'), 2);
  assert.equal(counts.get('r2'), 1);
  assert.equal(recipeUseCounts(null).size, 0);
});

test('picking buttons: search by name or category, skip removed ones, this recipe first', () => {
  const pos = [
    { external_id: '1', name: 'Margarita', category_name: 'Cocktails' },
    { external_id: '2', name: 'HH Margarita', category_name: 'Happy Hour' },
    { external_id: '3', name: 'Old Margarita', category_name: 'Cocktails', is_deleted: true },
    { external_id: '4', name: 'Mojito', category_name: 'Cocktails' },
  ];
  const uses = new Map([['2', 'r1']]);
  assert.deepEqual(pickableButtons(pos, 'marg', uses, 'r1').map((p) => p.external_id), ['2', '1']);
  assert.deepEqual(pickableButtons(pos, 'cocktails', uses, 'r1').map((p) => p.external_id), ['1', '4']);
  assert.deepEqual(pickableButtons(pos, '', null, 'r1').map((p) => p.external_id), ['2', '1', '4']);
});
