import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKED_MESSAGE, TRIAL_LIMIT_MESSAGE, billingBanner, canAddDivisions, friendlyError } from './duezyBillingText.js';

test('billing errors become plain English; others pass through', () => {
  assert.equal(friendlyError('duezy_trial_division_limit: the free trial covers up to 2 divisions'), TRIAL_LIMIT_MESSAGE);
  assert.equal(friendlyError('new row violates row-level security policy for table "duezy_payments"'), LOCKED_MESSAGE);
  assert.equal(friendlyError('network down'), 'network down');
});

test('trial allows 2 divisions in total; paid has no cap; locked allows none', () => {
  assert.equal(canAddDivisions(null, 5), true);
  assert.equal(canAddDivisions({ phase: 'trial', can_write: true, division_limit: 2, divisions_used: 1 }, 1), true);
  assert.equal(canAddDivisions({ phase: 'trial', can_write: true, division_limit: 2, divisions_used: 1 }, 2), false);
  assert.equal(canAddDivisions({ phase: 'active', can_write: true, division_limit: null, divisions_used: 9 }, 3), true);
  assert.equal(canAddDivisions({ phase: 'locked', can_write: false, division_limit: null, divisions_used: 0 }, 1), false);
});

test('banner copy by phase', () => {
  assert.equal(
    billingBanner({ phase: 'trial', days_remaining: 18, divisions_used: 1, division_limit: 2 }).text,
    'Free trial · 18 days left · 1 of 2 divisions used'
  );
  assert.equal(billingBanner({ phase: 'trial', days_remaining: 3 }).tone, 'warn');
  assert.equal(billingBanner({ phase: 'locked', status: 'trialing' }).tone, 'bad');
  assert.equal(billingBanner({ phase: 'active' }), null);
  assert.equal(billingBanner(null), null);
});
