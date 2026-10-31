import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveBlockers, categoryTree, moveInList, nextSortOrder, orderChanges } from '../src/utils/itemsureCategories.js';

test('orderChanges numbers siblings in steps of 10 and keeps only the ones that change', () => {
  const list = [{ id: 'b', sort_order: 0 }, { id: 'a', sort_order: 20 }, { id: 'c', sort_order: 30 }];
  assert.deepEqual(orderChanges(list), [{ id: 'b', sort_order: 10 }]);
  assert.deepEqual(orderChanges([{ id: 'x' }]), [{ id: 'x', sort_order: 10 }]);
});

test('nextSortOrder puts a new category last only once an order is set', () => {
  assert.equal(nextSortOrder([{ sort_order: 0 }, { sort_order: 0 }]), 0);
  assert.equal(nextSortOrder([{ sort_order: 10 }, { sort_order: 30 }]), 40);
  assert.equal(nextSortOrder([]), 0);
});

test('moveInList swaps with a neighbour and ignores moves past either end', () => {
  assert.deepEqual(moveInList(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(moveInList(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c']);
});

test('archiveBlockers lists active subcategories and active items in it', () => {
  const tree = categoryTree([
    { id: 'liq', name: 'Liquor' },
    { id: 'rum', name: 'Rum', parent_category_id: 'liq' },
    { id: 'gin', name: 'Gin', parent_category_id: 'liq', is_active: false },
  ]);
  const items = [
    { id: '1', category_id: 'liq', is_active: true },
    { id: '2', category_id: 'liq', is_active: false },
    { id: '3', category_id: 'rum', is_active: true },
  ];
  const liquor = archiveBlockers(tree, items, 'liq');
  assert.deepEqual(liquor.subs.map((c) => c.id), ['rum']);
  assert.deepEqual(liquor.items.map((i) => i.id), ['1']);
  const rum = archiveBlockers(tree, items, 'rum');
  assert.equal(rum.subs.length, 0);
  assert.deepEqual(rum.items.map((i) => i.id), ['3']);
});
