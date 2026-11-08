import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TAX_RATE, normalizeTaxRate, salesTax, taxPercent, withTax } from './consignmentTax.js';
import { priceWithTaxLabel } from './consignmentMoney.js';

test('8.25% on common prices, rounded to the cent', () => {
  assert.equal(salesTax(300, 0.0825), 24.75);
  assert.equal(withTax(300, 0.0825), 324.75);
  assert.equal(salesTax(19.99, 0.0825), 1.65);
  assert.equal(withTax(19.99, 0.0825), 21.64);
  assert.equal(withTax(0.1, 0.0825), 0.11);
});

test('missing or silly rates fall back to the default', () => {
  assert.equal(normalizeTaxRate(undefined), DEFAULT_TAX_RATE);
  assert.equal(normalizeTaxRate('abc'), DEFAULT_TAX_RATE);
  assert.equal(normalizeTaxRate(8.25), DEFAULT_TAX_RATE);
  assert.equal(normalizeTaxRate(0), 0);
  assert.equal(withTax(100, 0), 100);
});

test('labels', () => {
  assert.equal(taxPercent(0.0825), '8.25%');
  assert.equal(taxPercent(0.029), '2.9%');
  assert.equal(priceWithTaxLabel(300, 0.0825), '$324.75 with tax');
});
