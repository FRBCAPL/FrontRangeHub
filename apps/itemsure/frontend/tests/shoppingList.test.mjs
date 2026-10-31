import test from 'node:test';
import assert from 'node:assert/strict';
import { buyFor, buyGroups, buyLabel, moveRows, shoppingText } from '../src/utils/itemsureShoppingList.js';

const rec = (over) => ({
  target_id: 't1', item_id: 'i1', item_name: 'Lime Juice', unit_symbol: 'btl', status: 'below_par',
  location_id: 'L1', location_name: 'Legends', storage_area_id: 'bar', area_name: 'Bar',
  need: '2', external: '2', external_at_most: null, transfers: [], ...over,
});

test('buyFor uses the outside amount, the whole need with moving off, or nothing', () => {
  assert.deepEqual(buyFor(rec({}), true), { amount: '2', upTo: false });
  assert.equal(buyFor(rec({ external: '0' }), true), null);
  assert.deepEqual(buyFor(rec({ external: '0' }), false), { amount: '2', upTo: false });
  assert.deepEqual(buyFor(rec({ external: null, external_at_most: '3' }), true), { amount: '3', upTo: true });
  assert.deepEqual(buyFor(rec({ need: null }), true), { amount: null, upTo: false });
});

test('buyGroups adds an item up across places and rounds the total up', () => {
  const recs = [
    rec({ target_id: 'a', external: '1.5' }),
    rec({ target_id: 'b', storage_area_id: 'back', area_name: 'Back', status: 'low', external: '1' }),
    rec({ target_id: 'c', item_id: 'i2', item_name: 'Cups', unit_symbol: 'box' }),
  ];
  const supplier = { i1: 'Sam', i2: null };
  const groups = buyGroups(recs, { groupOf: (r) => supplier[r.item_id] || 'No supplier' });
  assert.deepEqual(groups.map((g) => g.label), ['Sam', 'No supplier']);
  const lime = groups[0].rows[0];
  assert.equal(lime.total, '3');
  assert.equal(lime.status, 'low');
  assert.equal(lime.spots.length, 2);
  assert.equal(buyLabel(lime), '3 btl');
});

test('buyGroups puts running low first and flags a missing "Fill up to"', () => {
  const recs = [rec({ item_id: 'b', item_name: 'B' }), rec({ item_id: 'a', item_name: 'A', status: 'low', need: null })];
  const [group] = buyGroups(recs, { groupOf: () => 'Shop' });
  assert.deepEqual(group.rows.map((r) => r.name), ['A', 'B']);
  assert.equal(group.rows[0].total, null);
  assert.equal(buyLabel(group.rows[0]), 'Amount not set');
});

test('moveRows lists visible transfers, or none with moving off', () => {
  const recs = [rec({ transfers: [{ location_id: 'L1', storage_area_id: 'back', quantity: '1' }, { location_id: 'L2', hidden: true }] })];
  assert.equal(moveRows(recs).length, 1);
  assert.equal(moveRows(recs, false).length, 0);
});

test('shoppingText groups lines by supplier and skips ticked items', () => {
  const groups = buyGroups([rec({}), rec({ item_id: 'i2', item_name: 'Cups' })], { groupOf: () => 'Sam' });
  assert.equal(shoppingText(groups), 'Sam\n- Cups: 2 btl\n- Lime Juice: 2 btl');
  assert.equal(shoppingText(groups, new Set(['i2'])), 'Sam\n- Lime Juice: 2 btl');
  assert.equal(shoppingText(groups, new Set(['i1', 'i2'])), '');
});
