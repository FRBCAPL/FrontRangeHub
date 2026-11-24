import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPORT_REMINDER,
  LOCKED_MESSAGE,
  TRIAL_LIMIT_MESSAGE,
  billingBanner,
  canAddDivisions,
  deletionNote,
  friendlyError,
  shouldRemindExport,
} from './duezyBillingText.js';

test('billing errors become plain English; others pass through', () => {
  assert.equal(friendlyError('duezy_trial_division_limit: the free trial covers up to 2 divisions'), TRIAL_LIMIT_MESSAGE);
  assert.equal(friendlyError('new row violates row-level security policy for table "duezy_payments"'), LOCKED_MESSAGE);
  assert.equal(friendlyError('network down'), 'network down');
  assert.equal(friendlyError('duezy_not_owner: only the league owner can add people'), 'Only the league owner can add people');
});

test('only a truly missing column asks for the schedule SQL', () => {
  const sqlNeeded = /duezy-schedule SQL/;
  assert.match(friendlyError("Could not find the 'skip_dates' column of 'duezy_divisions' in the schema cache"), sqlNeeded);
  assert.match(friendlyError('column "start_date" of relation "duezy_leagues" does not exist'), sqlNeeded);
  const notNull = 'null value in column "skip_dates" of relation "duezy_divisions" violates not-null constraint';
  assert.equal(friendlyError(notNull), notNull);
});

test('trial allows 2 divisions in total; paid has no cap; locked allows none', () => {
  assert.equal(canAddDivisions(null, 5), true);
  assert.equal(canAddDivisions({ phase: 'trial', can_write: true, division_limit: 2, divisions_used: 1 }, 1), true);
  assert.equal(canAddDivisions({ phase: 'trial', can_write: true, division_limit: 2, divisions_used: 1 }, 2), false);
  assert.equal(canAddDivisions({ phase: 'active', can_write: true, division_limit: null, divisions_used: 9 }, 3), true);
  assert.equal(canAddDivisions({ phase: 'locked', can_write: false, division_limit: null, divisions_used: 0 }, 1), false);
});

test('banner copy by phase', () => {
  const early = billingBanner({ phase: 'trial', days_remaining: 18, divisions_used: 1, division_limit: 2 });
  assert.equal(early.text, 'Free trial · 18 days left · 1 of 2 divisions used');
  assert.equal(early.showExport, false);
  const late = billingBanner({ phase: 'trial', days_remaining: 3, divisions_used: 1, division_limit: 2 });
  assert.equal(late.tone, 'warn');
  assert.equal(late.showExport, true);
  assert.match(late.text, new RegExp(EXPORT_REMINDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(billingBanner({ phase: 'locked', status: 'trialing' }).tone, 'bad');
  assert.equal(billingBanner({ phase: 'locked', status: 'trialing' }).showExport, true);
  assert.equal(billingBanner({ phase: 'active' }), null);
  assert.equal(billingBanner(null), null);
});

test('export reminder when trial ends soon or leagues are locked', () => {
  assert.equal(shouldRemindExport({ phase: 'trial', days_remaining: 8 }), false);
  assert.equal(shouldRemindExport({ phase: 'trial', days_remaining: 7 }), true);
  assert.equal(shouldRemindExport({ phase: 'locked' }), true);
  assert.equal(shouldRemindExport({ phase: 'active' }), false);
  assert.equal(shouldRemindExport(null), false);
});

test('read-only banner counts down to deletion, red in the last week', () => {
  const far = { phase: 'locked', status: 'trialing', delete_on: '2026-11-20T15:00:00Z', days_until_delete: 25 };
  assert.equal(billingBanner(far).tone, 'warn');
  assert.match(billingBanner(far).text, /^Your free trial has ended and your leagues are read-only\. Your leagues will be deleted on Nov 20/);
  assert.match(billingBanner(far).text, new RegExp(EXPORT_REMINDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const near = { ...far, status: 'canceled', days_until_delete: 1 };
  assert.equal(billingBanner(near).tone, 'bad');
  assert.match(billingBanner(near).text, /^Your plan has ended.*deleted in 1 day \(Nov 20\)/);
  assert.match(deletionNote({ ...far, days_until_delete: 0 }), /scheduled for deletion/);
  assert.equal(deletionNote({ phase: 'locked' }), null);
  assert.equal(deletionNote(null), null);
});
