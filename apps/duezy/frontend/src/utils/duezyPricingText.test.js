import test from 'node:test';
import assert from 'node:assert/strict';
import { divisionCostNote, trialUsage } from './duezyPricingText.js';

test('trial: says which trial division this uses, nothing when over the limit', () => {
  const trial = { phase: 'trial', divisions_used: 1, division_limit: 2, has_subscription: false };
  assert.equal(divisionCostNote(trial), 'This uses 2 of your 2 free-trial divisions.');
  assert.equal(divisionCostNote({ ...trial, divisions_used: 2 }), null);
  assert.equal(trialUsage(trial), '1 of 2 divisions used');
});

test('paid: shows the price change or that it is included', () => {
  const paid = { phase: 'active', has_subscription: true, plan_interval: 'month', divisions_used: 1 };
  assert.equal(divisionCostNote(paid), 'This adds 1 division — your plan goes from $9 to $19/mo.');
  assert.equal(divisionCostNote({ ...paid, divisions_used: 2 }), 'This adds 1 division — included in your current plan, no price change.');
  assert.equal(divisionCostNote({ ...paid, divisions_used: 3, plan_interval: 'year' }), 'This adds 1 division — your plan goes from $190 to $230/yr.');
});

test('comp and no access: nothing to say', () => {
  assert.equal(divisionCostNote({ phase: 'comp', has_subscription: false, divisions_used: 4 }), null);
  assert.equal(divisionCostNote(null), null);
});
