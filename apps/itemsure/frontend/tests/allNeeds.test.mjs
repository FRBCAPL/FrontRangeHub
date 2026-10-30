import test from 'node:test';
import assert from 'node:assert/strict';
import { groupAllNeeds, needCountText } from '../src/utils/itemsureAllNeeds.js';

test('needCountText names only the kinds that are needed', () => {
  assert.equal(needCountText({ low: 2, belowPar: 0, noAmount: 1 }), '2 running low · 1 no amount yet');
  assert.equal(needCountText({ low: 0, belowPar: 0, noAmount: 0 }), '');
});

const locations = [
  { id: 'w', name: 'Warehouse', is_active: true },
  { id: 'b', name: 'Bar', is_active: true },
  { id: 'o', name: 'Old', is_active: false },
  { id: 'a', name: 'Annex', is_active: true },
];
const rows = [
  { location_id: 'b', status: 'not_set_up', item_name: 'Ice' },
  { location_id: 'b', status: 'below_par', item_name: 'Lime' },
  { location_id: 'b', status: 'low', item_name: 'Vodka' },
  { location_id: 'b', status: 'at_target', item_name: 'Gin' },
  { location_id: 'w', status: 'low', item_name: 'Lime' },
  { location_id: 'o', status: 'low', item_name: 'Rum' },
  { location_id: 'a', status: 'above_minimum', item_name: 'Rum' },
];

test('groupAllNeeds lists each active location with needs, running low first', () => {
  const { groups, clear, totals } = groupAllNeeds(locations, rows);
  assert.deepEqual(groups.map((g) => g.name), ['Bar', 'Warehouse']);
  assert.deepEqual(groups[0].rows.map((r) => r.item_name), ['Vodka', 'Lime', 'Ice']);
  assert.deepEqual([groups[0].low, groups[0].belowPar, groups[0].noAmount], [1, 1, 1]);
  assert.deepEqual(clear, ['Annex']);
  assert.deepEqual(totals, { low: 2, belowPar: 1, noAmount: 1 });
});
