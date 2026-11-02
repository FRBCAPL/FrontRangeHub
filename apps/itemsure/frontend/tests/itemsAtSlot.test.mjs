import test from 'node:test';
import assert from 'node:assert/strict';
import { itemsAtSlot } from '../src/utils/itemsureStock.js';

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
const ids = ({ here, others }) => [here.map((i) => i.id), others.map((i) => i.id)];

test('itemsAtSlot lists items with a balance, "kept at", or levels in that exact slot', () => {
  const data = {
    balances: [{ item_id: 'a', location_id: 'L1', storage_area_id: 'bar', quantity_text: '0' }],
    places: [{ item_id: 'b', location_id: 'L1', storage_area_id: 'bar' }, { item_id: 'c', location_id: 'L1', storage_area_id: null }],
    targets: [{ item_id: 'd', location_id: 'L2', storage_area_id: 'bar' }],
  };
  assert.deepEqual(ids(itemsAtSlot(items, data, 'L1', 'bar')), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(ids(itemsAtSlot(items, data, 'L1', null)), [['c'], ['a', 'b', 'd']]);
  assert.deepEqual(ids(itemsAtSlot(items, data, 'L2', 'bar')), [['d'], ['a', 'b', 'c']]);
});

test('itemsAtSlot still works before "kept at" places load', () => {
  const data = { balances: [{ item_id: 'c', location_id: 'L1', storage_area_id: null }], places: null };
  assert.deepEqual(ids(itemsAtSlot(items, data, 'L1', '')), [['c'], ['a', 'b', 'd']]);
});
