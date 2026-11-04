import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryAmountRows, categoryPour, categorySize, withCategoryDefaults } from '../src/utils/itemsureCategoryDefaults.js';

const categories = [
  { id: 'liq', name: 'Liquor', parent_category_id: null },
  { id: 'well', name: 'Well', parent_category_id: 'liq' },
  { id: 'draft', name: 'Draft Beer', parent_category_id: 'liq' },
  { id: 'beer', name: 'Beer', parent_category_id: null },
  { id: 'btl', name: 'Bottled', parent_category_id: 'beer' },
  { id: 'old', name: 'Old', parent_category_id: null, is_active: false },
];
const byId = new Map(categories.map((c) => [c.id, c]));
const defaults = new Map([
  ['liq', { contentMl: 750, amount: 1.5, unit: 'fl_oz' }],
  ['well', { contentMl: 1750, amount: null, unit: null }],
  ['beer', { contentMl: null, amount: 16, unit: 'fl_oz' }],
  ['btl', { contentMl: null, amount: 1, unit: 'base' }],
]);
const keg = { code: 'keg', name: 'Keg' };
const items = [
  { id: 'rum', name: 'Well Rum', category_id: 'well', base_unit_id: 'bottle' },
  { id: 'gin', name: 'Well Gin', category_id: 'liq', base_unit_id: 'bottle' },
  { id: 'bud', name: 'Bud Light', category_id: 'btl', base_unit_id: 'each' },
  { id: 'nap', name: 'Napkins', category_id: null, base_unit_id: 'each' },
  { id: 'coors', name: 'Coors Light', category_id: 'draft', base_unit_id: 'keg', unitName: 'Keg', unitCode: 'keg' },
];

test('nearest category wins: subcategory, then main category', () => {
  assert.deepEqual(categoryPour(items[0], byId, defaults), { amount: 1.5, unit: 'fl_oz', fromCategory: 'Liquor' });
  assert.deepEqual(categorySize(items[0], byId, defaults), { ml: 1750, fromCategory: 'Well' });
  assert.deepEqual(categorySize(items[1], byId, defaults), { ml: 750, fromCategory: 'Liquor' });
  assert.deepEqual(categoryPour(items[2], byId, defaults), { amount: 1, unit: 'base', fromCategory: 'Bottled' });
  assert.equal(categoryPour(items[3], byId, defaults), null);
  assert.equal(categorySize(items[2], byId, defaults), null);
});

test('draft beer does not use liquor amounts, even under Liquor', () => {
  assert.equal(categoryPour(items[4], byId, defaults, keg), null);
  assert.equal(categorySize(items[4], byId, defaults, keg), null);
  const filled = withCategoryDefaults({
    links: new Map([['D', ['coors']]]), pours: new Map(), contents: new Map(), items, categories, defaults,
    units: [{ id: 'keg', code: 'keg', name: 'Keg' }],
  });
  assert.equal(filled.pours.has('D|coors'), false);
  assert.equal(filled.contents.has('coors'), false);
});

test('own values win; category values fill the gaps', () => {
  const links = new Map([['R', ['rum']], ['G', ['gin']], ['N', ['nap']]]);
  const pours = new Map([['G|gin', { amount: 2, unit: 'fl_oz' }]]);
  const contents = new Map([['gin', 1000]]);
  const out = withCategoryDefaults({ links, pours, contents, items, categories, defaults });
  assert.deepEqual(out.pours.get('G|gin'), { amount: 2, unit: 'fl_oz' });
  assert.equal(out.pours.get('R|rum').fromCategory, 'Liquor');
  assert.equal(out.pours.has('N|nap'), false);
  assert.equal(out.contents.get('gin'), 1000);
  assert.equal(out.contents.get('rum'), 1750);
  assert.equal(out.contentFrom.get('rum'), 'Well');
  assert.equal(out.contentFrom.has('gin'), false);
  assert.equal(pours.has('R|rum'), false, 'the own list is not changed');
});

test('without category values or the database update, nothing changes', () => {
  const pours = new Map();
  assert.equal(withCategoryDefaults({ links: new Map(), pours, contents: null, items, categories, defaults: null }).pours, pours);
  assert.equal(withCategoryDefaults({ links: new Map([['R', ['rum']]]), pours: null, contents: null, items, categories, defaults }).pours, null);
});

test('category rows: main then subcategories, matched counts roll up, inactive left out', () => {
  const rows = categoryAmountRows({
    categories, items, matchedItemIds: new Set(['rum', 'gin']), defaults,
    units: [{ id: 'bottle', code: 'bottle', name: 'Bottle' }, { id: 'each', code: 'each', name: 'Each' }],
  });
  assert.deepEqual(rows.map((r) => [r.category.id, r.depth, r.matched]), [
    ['beer', 0, 0], ['btl', 1, 0], ['liq', 0, 2], ['draft', 1, 0], ['well', 1, 1],
  ]);
  assert.equal(rows.find((r) => r.category.id === 'liq').unit.name, 'Bottle');
  assert.equal(rows.find((r) => r.category.id === 'btl').value.amount, 1);
});
