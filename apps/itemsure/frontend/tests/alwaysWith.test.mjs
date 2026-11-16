import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alwaysWithHint,
  alwaysWithToForm,
  categoryTriggersAlwaysWith,
  checkAlwaysWith,
  packagingAttachedLabel,
  packagingForCatalogItem,
} from '../src/utils/itemsureAlwaysWith.js';

test('checkAlwaysWith accepts valid rows and rejects bad amounts', () => {
  const known = new Set(['food', 'wings']);
  assert.deepEqual(
    checkAlwaysWith([{ categoryId: 'food', amount: '1', unit: 'base' }], known),
    { rows: [{ categoryId: 'food', amount: 1, unit: 'base' }] },
  );
  assert.match(checkAlwaysWith([{ categoryId: 'food', amount: '0', unit: 'base' }], known).error, /more than 0/);
  assert.match(checkAlwaysWith([{ categoryId: 'food', amount: '1', unit: 'base' }, { categoryId: 'food', amount: '2', unit: 'base' }], known).error, /only once/);
  assert.match(checkAlwaysWith([{ categoryId: 'gone', amount: '1', unit: 'base' }], known).error, /category/);
});

test('alwaysWithToForm and hint', () => {
  const form = alwaysWithToForm([{ categoryId: 'food', amount: 2, unit: 'base' }]);
  assert.equal(form[0].amount, '2');
  assert.equal(alwaysWithHint([]), 'Taken off once with sales in chosen categories');
  const categories = [
    { id: 'food', name: 'Food', parent_category_id: null, is_active: true, sort_order: 1 },
  ];
  assert.match(alwaysWithHint([{ categoryId: 'food', amount: 1, unit: 'base' }], categories), /Food/);
});

test('packagingForCatalogItem finds sheets for Food and Wings under Food', () => {
  const categories = [
    { id: 'food', name: 'Food', parent_category_id: null, is_active: true, sort_order: 1 },
    { id: 'wings', name: 'Wings', parent_category_id: 'food', is_active: true, sort_order: 2 },
  ];
  assert.equal(categoryTriggersAlwaysWith('wings', 'food', categories), true);
  assert.equal(categoryTriggersAlwaysWith('food', 'wings', categories), false);
  const always = new Map([['sheets', [{ categoryId: 'food', amount: 1, unit: 'base' }]]]);
  const items = new Map([['sheets', { id: 'sheets', name: 'Checkered Sheets', unitName: 'each' }]]);
  const onWings = packagingForCatalogItem(always, { id: 'hot', category_id: 'wings' }, categories, items);
  assert.equal(onWings.length, 1);
  assert.equal(onWings[0].name, 'Checkered Sheets');
  assert.match(packagingAttachedLabel(onWings), /Checkered Sheets/);
  assert.equal(packagingForCatalogItem(always, { id: 'rum', category_id: 'liquor' }, categories, items).length, 0);
});
