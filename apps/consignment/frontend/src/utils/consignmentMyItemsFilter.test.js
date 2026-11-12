import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterMyItems, myItemFilterCounts, myItemMatches } from './consignmentMyItemsFilter.js';

const items = [
  { id: 1, item_number: 'FRPL-0010', category: 'cues', name: 'Joss Cue', brand: 'Joss', status: 'available', sale_method: 'auction' },
  { id: 2, item_number: 'FRPL-0004', category: 'cases', name: 'Black case', brand: 'Instroke', status: 'available', sale_method: 'consignment' },
  { id: 3, item_number: 'FRPL-0002', category: 'cues', name: 'Old cue', status: 'sold', sale_method: 'consignment' },
  { id: 4, item_number: 'FRPL-0011', category: 'shafts', name: 'Revo shaft', status: 'pending', sale_method: 'auction' },
  { id: 5, item_number: 'FRPL-0003', category: 'cues', name: 'Returned cue', status: 'returned', sale_method: 'consignment' },
];

const ids = (list) => list.map((i) => i.id);

test('filter buttons pick the right items', () => {
  assert.deepEqual(ids(filterMyItems(items, 'all', '')), [1, 2, 3, 4, 5]);
  assert.deepEqual(ids(filterMyItems(items, 'case', '')), [2]);
  assert.deepEqual(ids(filterMyItems(items, 'auction', '')), [1]);
  assert.deepEqual(ids(filterMyItems(items, 'pending', '')), [4]);
  assert.deepEqual(ids(filterMyItems(items, 'sold', '')), [3]);
  assert.deepEqual(ids(filterMyItems(items, 'ended', '')), [5]);
  assert.deepEqual(ids(filterMyItems(items, 'nonsense', '')), [1, 2, 3, 4, 5]);
});

test('search matches name, brand, item number and category', () => {
  assert.equal(myItemMatches(items[0], 'JOSS'), true);
  assert.equal(myItemMatches(items[1], 'instroke'), true);
  assert.equal(myItemMatches(items[0], 'cue #0010'), true);
  assert.equal(myItemMatches(items[0], 'frpl-0010'), true);
  assert.equal(myItemMatches(items[3], 'shafts'), true);
  assert.equal(myItemMatches(items[1], 'joss'), false);
});

test('search and filter combine, and counts follow the search', () => {
  assert.deepEqual(ids(filterMyItems(items, 'case', 'cue')), []);
  assert.deepEqual(ids(filterMyItems(items, 'all', 'cue')), [1, 3, 5]);
  assert.deepEqual(myItemFilterCounts(items, 'cue'), { all: 3, case: 0, auction: 1, pending: 0, sold: 1, ended: 1 });
});
