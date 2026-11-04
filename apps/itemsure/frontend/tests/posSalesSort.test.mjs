import test from 'node:test';
import assert from 'node:assert/strict';
import { sortSalesRows, toggleSalesSort } from '../src/utils/itemsurePosSalesSort.js';

const rows = [
  { itemId: 'a', name: 'Vodka', sold: 2, expected: 3, counted: 4, difference: 1 },
  { itemId: 'b', name: 'Beer', sold: 10, expected: 8, counted: 8, difference: 0 },
  { itemId: 'c', name: 'Lime', sold: 1, expected: 1, counted: null, difference: null },
];

test('toggle: first tap uses the default direction, second tap flips', () => {
  const name = toggleSalesSort({ key: 'sold', dir: 'desc' }, 'name');
  assert.deepEqual(name, { key: 'name', dir: 'asc' });
  assert.deepEqual(toggleSalesSort(name, 'name'), { key: 'name', dir: 'desc' });
  assert.equal(toggleSalesSort({ key: 'difference', dir: 'desc' }, 'difference').dir, 'asc');
});

test('sorts by name, sold, and difference; blanks last', () => {
  assert.deepEqual(sortSalesRows(rows, { key: 'name', dir: 'asc' }).map((r) => r.name), ['Beer', 'Lime', 'Vodka']);
  assert.deepEqual(sortSalesRows(rows, { key: 'sold', dir: 'desc' }).map((r) => r.name), ['Beer', 'Vodka', 'Lime']);
  assert.equal(sortSalesRows(rows, { key: 'counted', dir: 'desc' }).at(-1).name, 'Lime');
  assert.deepEqual(sortSalesRows(rows, { key: 'difference', dir: 'desc' }).map((r) => r.name), ['Vodka', 'Beer', 'Lime']);
});
