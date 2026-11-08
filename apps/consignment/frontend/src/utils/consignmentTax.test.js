import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TAX_RATE, normalizeTaxRate, pretaxFromTotal, salesTax, taxPercent, withTax } from './consignmentTax.js';
import { itemPriceLabel, priceWithTaxLabel } from './consignmentMoney.js';

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

test('tax-included totals turn back into a before-tax price that hits the total', () => {
  assert.equal(pretaxFromTotal(300, 0.0825), 277.14);
  assert.equal(withTax(277.14, 0.0825), 300);
  for (const total of [1, 5, 19.99, 50, 99.99, 100, 125, 250, 300, 450, 999.99, 1500]) {
    const p = pretaxFromTotal(total, 0.0825);
    assert.ok(Math.abs(withTax(p, 0.0825) - total) <= 0.01, `${total} → ${p} → ${withTax(p, 0.0825)}`);
  }
  assert.equal(pretaxFromTotal(100, 0), 100);
  assert.equal(pretaxFromTotal(0, 0.0825), 0);
  assert.equal(pretaxFromTotal('', 0.0825), 0);
});

test('labels', () => {
  assert.equal(taxPercent(0.0825), '8.25%');
  assert.equal(taxPercent(0.029), '2.9%');
  assert.equal(priceWithTaxLabel(300, 0.0825), '$324.75 with tax');
  assert.equal(itemPriceLabel({ selling_price: 300 }, 0.0825), '$324.75 with tax');
  assert.equal(itemPriceLabel({ selling_price: 277.14, price_tax_included: true }, 0.0825), '$300 tax included');
  assert.equal(itemPriceLabel({ sale_method: 'auction', price_tax_included: true }, 0.0825), 'Online auction');
});
