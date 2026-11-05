import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryDoubles, doublesByCategory } from '../src/utils/itemsureCategoryDefaults.js';
import { modifierUse } from '../src/utils/itemsurePosModifiers.js';

const categories = [
  { id: 'liquor', name: 'Liquor', parent_category_id: null },
  { id: 'well', name: 'Well', parent_category_id: 'liquor' },
  { id: 'liqueur', name: 'Liqueurs', parent_category_id: 'liquor' },
  { id: 'mixers', name: 'Mixers', parent_category_id: null },
];
const items = [
  { id: 'vodka', category_id: 'well' },
  { id: 'gin', category_id: 'liquor' },
  { id: 'sec', category_id: 'liqueur' },
  { id: 'coke', category_id: 'mixers' },
  { id: 'lime', category_id: null },
];
const byId = new Map(categories.map((c) => [c.id, c]));
const defaults = new Map([
  ['liquor', { doubles: true }],
  ['liqueur', { doubles: false }],
  ['mixers', { doubles: null, amount: 4, unit: 'fl_oz' }],
]);

test('a category answer comes from the nearest category that has one', () => {
  assert.equal(categoryDoubles(items[0], byId, defaults), true); // Well follows Liquor
  assert.equal(categoryDoubles(items[1], byId, defaults), true);
  assert.equal(categoryDoubles(items[2], byId, defaults), false); // Liqueurs opts out
  assert.equal(categoryDoubles(items[3], byId, defaults), null); // Mixers has amounts only
  assert.equal(categoryDoubles(items[4], byId, defaults), null);
});

test('each Clover item gets the matched items its categories double', () => {
  const links = new Map([
    ['LIT', ['coke', 'vodka', 'gin', 'sec']],
    ['RUMCOKE', ['coke', 'lime']],
    ['NONE', []],
  ]);
  const map = doublesByCategory({ links, items, categories, defaults });
  assert.deepEqual([...map.get('LIT')], ['vodka', 'gin']);
  assert.equal(map.has('RUMCOKE'), false); // falls back to the first matched item
  assert.equal(map.has('NONE'), false);
  assert.equal(doublesByCategory({ links, items, categories, defaults: new Map() }).size, 0);
  assert.equal(doublesByCategory({ links, items, categories, defaults: null }).size, 0);
});

test('a Double follows the categories, even when the mixer is matched first', () => {
  const links = new Map([['VSODA', ['coke', 'vodka']]]);
  const use = modifierUse({
    keys: ['VSODA|DBL'],
    qtyFor: () => 2,
    rules: new Map([['DBL', { action: 'extra', extraPours: 1 }]]),
    names: new Map([['DBL', 'Double']]),
    links,
    pours: new Map([['VSODA|vodka', { amount: 1.5, unit: 'fl_oz' }], ['VSODA|coke', { amount: 4, unit: 'fl_oz' }]]),
    unitCodes: new Map([['vodka', 'milliliter'], ['coke', 'milliliter']]),
    contents: new Map(),
    pieces: new Map(),
    doubles: doublesByCategory({ links, items, categories, defaults }),
  });
  assert.ok(Math.abs(use.get('vodka').extra - 2 * 1.5 * 29.5735) < 1e-9);
  assert.equal(use.has('coke'), false);
});
