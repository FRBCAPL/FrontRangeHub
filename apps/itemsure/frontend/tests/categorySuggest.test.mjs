import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryTree } from '../src/utils/itemsureCategories.js';
import { applySuggestions, normalName, suggestExtras, trackExtraEdits } from '../src/utils/itemsureCategorySuggest.js';

const tree = categoryTree([
  { id: 'liq', name: 'Liquor', is_active: true, parent_category_id: null },
  { id: 'liq-rum', name: 'Rum', is_active: true, parent_category_id: 'liq' },
  { id: 'rums', name: 'Rums ', is_active: true, parent_category_id: null },
  { id: 'well', name: 'Well', is_active: true, parent_category_id: null },
  { id: 'back', name: 'Bar back', is_active: true, parent_category_id: null },
  { id: 'old-rum', name: 'Rum', is_active: false, parent_category_id: null },
  { id: 'gas', name: 'Gas', is_active: true, parent_category_id: null },
]);

const items = [
  { id: 'a', category_id: 'liq-rum', extraCategoryIds: ['well', 'back'] },
  { id: 'b', category_id: 'liq-rum', extraCategoryIds: ['well'] },
  { id: 'c', category_id: 'liq-rum', extraCategoryIds: [] },
  { id: 'd', category_id: 'liq-rum', extraCategoryIds: ['back'], is_active: false },
];

test('names match ignoring case, spaces, and a plural s', () => {
  assert.equal(normalName(' Rums '), 'rum');
  assert.equal(normalName('RUM'), 'rum');
  assert.equal(normalName('Gas'), 'gas');
});

test('suggests same-name categories, then extras most similar items share', () => {
  assert.deepEqual(suggestExtras(tree, items, 'liq-rum'), ['rums', 'well']);
});

test('never suggests the main category, its parent, archived ones, or the item itself', () => {
  const s = suggestExtras(tree, items, 'liq-rum', 'a');
  assert.ok(!s.includes('liq-rum') && !s.includes('liq') && !s.includes('old-rum'));
  assert.deepEqual(s, ['rums']);
  assert.deepEqual(suggestExtras(tree, items, ''), []);
});

test('one example is not enough to learn from', () => {
  assert.deepEqual(suggestExtras(tree, [{ id: 'x', category_id: 'gas', extraCategoryIds: ['well'] }], 'gas'), []);
});

test('changing the main category swaps suggestions but keeps hand-picked ones', () => {
  let form = { extra_category_ids: ['gas'], suggested_extra_ids: [], dismissed_extra_ids: [] };
  form = { ...form, ...applySuggestions(form, ['rums', 'well']) };
  assert.deepEqual(form.extra_category_ids, ['gas', 'rums', 'well']);
  assert.deepEqual(form.suggested_extra_ids, ['rums', 'well']);
  form = { ...form, ...applySuggestions(form, ['back']) };
  assert.deepEqual(form.extra_category_ids, ['gas', 'back']);
  assert.deepEqual(form.suggested_extra_ids, ['back']);
});

test('a removed suggestion stays removed until picked again by hand', () => {
  let form = { extra_category_ids: [], suggested_extra_ids: [], dismissed_extra_ids: [] };
  form = { ...form, ...applySuggestions(form, ['rums', 'well']) };
  form = { ...form, ...trackExtraEdits(form, ['rums']) };
  assert.deepEqual(form.dismissed_extra_ids, ['well']);
  form = { ...form, ...applySuggestions(form, ['rums', 'well']) };
  assert.deepEqual(form.extra_category_ids, ['rums']);
  form = { ...form, ...trackExtraEdits(form, ['rums', 'well']) };
  assert.deepEqual(form.dismissed_extra_ids, []);
  assert.deepEqual(form.suggested_extra_ids, ['rums']);
});
