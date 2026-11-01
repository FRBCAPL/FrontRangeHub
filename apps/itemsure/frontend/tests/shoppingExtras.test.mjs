import test from 'node:test';
import assert from 'node:assert/strict';
import { EXTRA_GROUP, extraTick, mergeExtras, pickableItems } from '../src/utils/itemsureShoppingExtras.js';
import { shoppingText, tickOf } from '../src/utils/itemsureShoppingList.js';

const workedRow = (itemId, name) => ({ key: `g|${itemId}`, itemId, name, unit: 'btl', status: 'low', total: '2', upTo: false, spots: [] });
const extra = (over) => ({ id: 'e1', item_id: null, supplier_id: null, name: 'Candles', amount: '', ...over });

test('mergeExtras puts hand-added lines in their group, in A to Z order with the worked-out rows', () => {
  const groups = [{ label: 'Sysco', rows: [workedRow('i1', 'Limes')] }];
  const merged = mergeExtras(groups, [extra({ supplier_id: 's1', amount: '2 bags' }), extra({ id: 'e2', supplier_id: 's1', name: 'Napkins' })], {
    groupOf: (e) => (e.supplier_id === 's1' ? 'Sysco' : 'No supplier'),
    lastGroup: 'No supplier',
  });
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].rows.map((r) => r.name), ['Candles', 'Limes', 'Napkins']);
  const added = merged[0].rows[0];
  assert.equal(added.extra, true);
  assert.equal(added.tick, extraTick('e1'));
  assert.equal(added.amount, '2 bags');
  assert.equal(groups[0].rows.length, 1, 'the original groups are not changed');
});

test('mergeExtras makes new groups, keeps the last group last, and skips items already listed', () => {
  const groups = [{ label: 'Sysco', rows: [workedRow('i1', 'Limes')] }];
  const merged = mergeExtras(groups, [extra({ id: 'e1' }), extra({ id: 'e2', item_id: 'i1', name: 'Limes' }), extra({ id: 'e3', name: 'Ice' })], {
    groupOf: (e) => (e.id === 'e3' ? 'Alpha' : EXTRA_GROUP),
    lastGroup: EXTRA_GROUP,
  });
  assert.deepEqual(merged.map((g) => g.label), ['Alpha', 'Sysco', EXTRA_GROUP]);
  assert.equal(merged[1].rows.length, 1, 'Limes is not shown twice');
});

test('mergeExtras shows the current item name for item lines', () => {
  const merged = mergeExtras([], [extra({ item_id: 'i9', name: 'Old name' })], {
    groupOf: () => EXTRA_GROUP,
    lastGroup: EXTRA_GROUP,
    itemsById: new Map([['i9', { id: 'i9', name: 'New name' }]]),
  });
  assert.equal(merged[0].rows[0].name, 'New name');
  assert.equal(merged[0].rows[0].itemId, 'i9');
});

test('pickableItems filters by supplier, listed, archived, and every typed word', () => {
  const items = [
    { id: 'a', name: 'Lime Juice', is_active: true },
    { id: 'b', name: 'Lemon Juice', is_active: true },
    { id: 'c', name: 'Old Lime', is_active: false },
    { id: 'd', name: 'Limes', is_active: true },
  ];
  const supplierOf = (id) => ({ a: 's1', b: 's1', d: 's2' })[id] || null;
  assert.deepEqual(pickableItems(items).map((i) => i.id), ['b', 'a', 'd']);
  assert.deepEqual(pickableItems(items, { supplierId: 's1', supplierOf }).map((i) => i.id), ['b', 'a']);
  assert.deepEqual(pickableItems(items, { listed: new Set(['a']) }).map((i) => i.id), ['b', 'd']);
  assert.deepEqual(pickableItems(items, { query: 'juice lim' }).map((i) => i.id), ['a']);
});

test('shoppingText includes hand-added lines and leaves ticked ones out', () => {
  const groups = mergeExtras([{ label: 'Sysco', rows: [workedRow('i1', 'Limes')] }], [extra({ amount: '1 box' }), extra({ id: 'e2', name: 'Ice' })], {
    groupOf: () => 'Sysco',
    lastGroup: 'No supplier',
  });
  assert.deepEqual(groups[0].rows.map((r) => r.name), ['Candles', 'Ice', 'Limes']);
  assert.equal(tickOf(groups[0].rows[2]), 'i1');
  assert.equal(shoppingText(groups, new Set([extraTick('e2')])), 'Sysco\n- Candles: 1 box\n- Limes: 2 btl');
});
