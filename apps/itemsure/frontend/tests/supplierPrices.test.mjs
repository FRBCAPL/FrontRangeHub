import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cheapestSupplierId,
  formatPrice,
  parsePrice,
  supplierPriceRows,
} from '../src/utils/itemsureSupplierPrices.js';
import { tripSupplierId } from '../src/utils/itemsureTripSupplier.js';

test('parsePrice accepts dollars and blanks', () => {
  assert.deepEqual(parsePrice(''), { price: null });
  assert.deepEqual(parsePrice('  $12.50 '), { price: 12.5 });
  assert.equal(parsePrice('0').error, 'Price must be more than 0, or left empty.');
  assert.ok(parsePrice('12.12345').error);
});

test('formatPrice shows money or blank', () => {
  assert.equal(formatPrice(null), '');
  assert.equal(formatPrice(12), '$12.00');
  assert.equal(formatPrice(9.25), '$9.25');
});

test('cheapestSupplierId prefers the lowest price, then main on a tie', () => {
  assert.equal(cheapestSupplierId('main', ['main', 'corner'], new Map([['main', 10], ['corner', 8]])), 'corner');
  const tied = new Map([['main', 10], ['corner', 8], ['bulk', 8]]);
  assert.equal(cheapestSupplierId('bulk', ['main', 'corner', 'bulk'], tied), 'bulk');
  assert.equal(cheapestSupplierId('main', ['main', 'corner'], new Map()), 'main');
  assert.equal(cheapestSupplierId('main', ['main'], null), 'main');
});

test('tripSupplierId uses trip choice, else cheapest, else main', () => {
  const prices = new Map([['main', 12], ['corner', 9]]);
  assert.equal(tripSupplierId('corner', 'main', ['main', 'corner'], prices), 'corner');
  assert.equal(tripSupplierId(null, 'main', ['main', 'corner'], prices), 'corner');
  assert.equal(tripSupplierId(null, 'main', ['main', 'corner'], null), 'main');
  assert.equal(tripSupplierId('gone', 'main', ['main'], prices), 'main');
});

test('supplierPriceRows sorts cheapest first', () => {
  const rows = supplierPriceRows(
    [{ id: 'main', name: 'Main' }, { id: 'corner', name: 'Corner' }],
    'main',
    new Map([['main', { price: 12, code: 'A' }], ['corner', { price: 9, code: '' }]]),
  );
  assert.equal(rows[0].id, 'corner');
  assert.equal(rows[0].isMain, false);
  assert.equal(rows[1].isMain, true);
});
