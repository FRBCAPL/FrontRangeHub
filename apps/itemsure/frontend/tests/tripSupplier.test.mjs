import test from 'node:test';
import assert from 'node:assert/strict';
import { itemIdsOfTicks, tripSupplierId } from '../src/utils/itemsureTripSupplier.js';

test('tripSupplierId lists an item under this trip\'s choice only while it is one of its suppliers', () => {
  assert.equal(tripSupplierId('corner', 'main', ['main', 'corner']), 'corner');
  assert.equal(tripSupplierId(null, 'main', ['main', 'corner']), 'main');
  assert.equal(tripSupplierId('gone', 'main', ['main']), 'main');
  assert.equal(tripSupplierId(undefined, null, []), null);
});

test('itemIdsOfTicks skips hand-added lines', () => {
  assert.deepEqual(itemIdsOfTicks(['item-1', 'extra:9', 'item-2']), ['item-1', 'item-2']);
});
