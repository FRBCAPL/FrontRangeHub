import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPrice, nextDivisionCost, priceFor, yearlyPrice } from './duezyPricing.js';

test('monthly tiers: $9 for one, $19 up to three, +$4 after', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 10].map(monthlyPrice), [9, 9, 19, 19, 23, 27, 47]);
});

test('yearly is ten months', () => {
  assert.equal(yearlyPrice(1), 90);
  assert.equal(yearlyPrice(4), 230);
  assert.equal(priceFor(3, 'year'), 190);
});

test('cost of adding the next division', () => {
  assert.equal(nextDivisionCost(1), 10);
  assert.equal(nextDivisionCost(2), 0);
  assert.equal(nextDivisionCost(3), 4);
  assert.equal(nextDivisionCost(3, 'year'), 40);
});
