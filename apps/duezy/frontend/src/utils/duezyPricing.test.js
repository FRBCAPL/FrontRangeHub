import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atCap, CAP_DIVISIONS, capFor, monthlyPrice, nextDivisionCost, priceFor, yearlyPrice } from './duezyPricing.js';

test('monthly tiers: $9 for one, $19 up to three, +$4 through 10', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 10].map(monthlyPrice), [9, 9, 19, 19, 23, 27, 47]);
});

test('extra divisions get cheaper: +$3 for 11–20, +$2 after', () => {
  assert.deepEqual([11, 15, 20, 21, 25, 30].map(monthlyPrice), [50, 62, 77, 79, 87, 97]);
});

test('never more than $99/mo', () => {
  assert.equal(CAP_DIVISIONS, 31);
  assert.deepEqual([31, 32, 50, 100, 500].map(monthlyPrice), [99, 99, 99, 99, 99]);
  assert.equal(atCap(30), false);
  assert.equal(atCap(31), true);
  assert.equal(capFor('year'), 990);
});

test('yearly is ten months', () => {
  assert.equal(yearlyPrice(1), 90);
  assert.equal(yearlyPrice(4), 230);
  assert.equal(priceFor(3, 'year'), 190);
  assert.equal(yearlyPrice(60), 990);
});

test('cost of adding the next division', () => {
  assert.equal(nextDivisionCost(1), 10);
  assert.equal(nextDivisionCost(2), 0);
  assert.equal(nextDivisionCost(3), 4);
  assert.equal(nextDivisionCost(3, 'year'), 40);
  assert.equal(nextDivisionCost(10), 3);
  assert.equal(nextDivisionCost(20), 2);
  assert.equal(nextDivisionCost(30), 2);
  assert.equal(nextDivisionCost(31), 0);
});
