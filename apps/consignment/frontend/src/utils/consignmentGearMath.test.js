import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availability, canBuyerCancel, defaultChoice, findVariant, optionLabel, optionValues, orderTotal, priceRange, productStock,
} from './consignmentGearMath.js';

const cue = {
  price: 400,
  special_order: true,
  option_names: ['Weight', 'Tip'],
  variants: [
    { id: 'a', options: { Weight: '19 oz', Tip: '12.5mm' }, stock: 0 },
    { id: 'b', options: { Weight: '19 oz', Tip: '12.75mm' }, stock: 2, price: 425 },
    { id: 'c', options: { Weight: '20 oz', Tip: '12.5mm' }, stock: 1 },
    { id: 'd', options: { Weight: '21 oz', Tip: '12.5mm' }, stock: 9, active: false },
  ],
};

test('price range and stock ignore inactive variants', () => {
  assert.deepEqual(priceRange(cue), { min: 400, max: 425 });
  assert.equal(productStock(cue), 3);
  assert.deepEqual(priceRange({ price: 50, variants: [] }), { min: 50, max: 50 });
});

test('availability: in stock, special order, sold out', () => {
  assert.equal(availability(cue), 'in_stock');
  assert.equal(availability(cue, cue.variants[0]), 'special');
  assert.equal(availability({ ...cue, special_order: false }, cue.variants[0]), 'sold_out');
});

test('option values, matching and labels', () => {
  assert.deepEqual(optionValues(cue, 'Weight'), ['19 oz', '20 oz']);
  assert.equal(findVariant(cue, { Weight: '19 oz', Tip: '12.75mm' }).id, 'b');
  assert.equal(findVariant(cue, { Weight: '20 oz', Tip: '12.75mm' }), null);
  assert.deepEqual(defaultChoice(cue), { Weight: '19 oz', Tip: '12.75mm' });
  assert.equal(optionLabel(cue, { Weight: '20 oz', Tip: '12.5mm' }), '20 oz · 12.5mm');
});

test('products without options use their single variant', () => {
  const chalk = { price: 20, option_names: [], variants: [{ id: 'x', options: {}, stock: 4 }] };
  assert.equal(findVariant(chalk, {}).id, 'x');
  assert.equal(optionLabel(chalk, {}), '');
});

test('order helpers', () => {
  assert.equal(orderTotal({ price_each: 19.99, qty: 3 }), 59.97);
  assert.equal(canBuyerCancel({ status: 'held' }), true);
  assert.equal(canBuyerCancel({ status: 'ordered' }), false);
});
