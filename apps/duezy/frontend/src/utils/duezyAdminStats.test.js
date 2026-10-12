import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountPhase, filterAccounts, planMonthly, summarizeAccounts } from './duezyAdminStats.js';

const paying = {
  email: 'ann@pool.com',
  access: { phase: 'active', divisions_used: 4 },
  subscription: { status: 'active', stripe_subscription_id: 'sub_1', plan_interval: 'month', division_quantity: 4 },
};
const yearly = {
  email: 'bo@darts.com',
  name: 'Bo Smith',
  access: { phase: 'active', divisions_used: 1 },
  subscription: { status: 'active', stripe_subscription_id: 'sub_2', plan_interval: 'year', division_quantity: 1 },
};
const trialPlan = {
  email: 'cy@x.com',
  access: { phase: 'active', divisions_used: 2 },
  subscription: { status: 'trialing', stripe_subscription_id: 'sub_3', plan_interval: 'month', division_quantity: 2 },
};
const trial = { email: 'di@x.com', access: { phase: 'trial', days_remaining: 3 }, subscription: { status: 'trialing' } };
const comp = { email: 'me@frpl.com', access: { phase: 'comp' }, subscription: { status: 'comp' } };

test('phase splits out trials that already picked a plan', () => {
  assert.equal(accountPhase(paying), 'active');
  assert.equal(accountPhase(trialPlan), 'trial_plan');
  assert.equal(accountPhase(trial), 'trial');
  assert.equal(accountPhase({}), 'trial');
});

test('plan value per month at list price', () => {
  assert.equal(planMonthly(paying), 23);
  assert.equal(planMonthly(yearly), 7.5);
  assert.equal(planMonthly(trial), 0);
});

test('summary counts and revenue', () => {
  const s = summarizeAccounts([paying, yearly, trialPlan, trial, comp]);
  assert.equal(s.total, 5);
  assert.equal(s.counts.active, 2);
  assert.equal(s.counts.comp, 1);
  assert.equal(s.mrr, 30.5);
  assert.equal(s.arr, 366);
  assert.equal(s.upcomingMrr, 19);
  assert.equal(s.trialsEndingSoon, 1);
});

test('filter by phase and search', () => {
  const all = [paying, yearly, trial];
  assert.deepEqual(filterAccounts(all, { phase: 'trial' }), [trial]);
  assert.deepEqual(filterAccounts(all, { query: 'smith' }), [yearly]);
  assert.equal(filterAccounts(all, {}).length, 3);
});
