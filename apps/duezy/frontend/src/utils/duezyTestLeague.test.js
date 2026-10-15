import test from 'node:test';
import assert from 'node:assert/strict';
import { isTestLeague, testDaysLeft, testResetText, testResetWhat, testSetupProblem } from './duezyTestLeague.js';

const NOW = Date.parse('2026-10-15T12:00:00Z');
const inDays = (d) => ({ is_test: true, test_reset_at: new Date(NOW + d * 86400000).toISOString() });

test('countdown to the next refresh', () => {
  assert.equal(testDaysLeft(inDays(12), NOW), 12);
  assert.equal(testDaysLeft(inDays(0.2), NOW), 1);
  assert.equal(testDaysLeft(inDays(-3), NOW), 0);
  assert.equal(testDaysLeft({ is_test: true }, NOW), null);
  assert.equal(testResetText(inDays(12), NOW), 'Refreshes in 12 days');
  assert.equal(testResetText(inDays(1), NOW), 'Refreshes tomorrow');
  assert.equal(testResetText(inDays(-1), NOW), 'Refreshes today');
  assert.equal(testResetText({ is_test: true }, NOW), 'Refreshes every 30 days');
});

test('what a refresh does depends on how it started', () => {
  assert.match(testResetWhat({ test_seed: 'sample' }), /sample teams/);
  assert.match(testResetWhat({ test_seed: 'blank' }), /divisions and teams stay/);
});

test('setup limits: 2 divisions, 10 teams each', () => {
  assert.equal(testSetupProblem([8, 10]), null);
  assert.match(testSetupProblem([3, 3, 3]), /up to 2 divisions/);
  assert.match(testSetupProblem([11]), /up to 10 teams/);
});

test('isTestLeague', () => {
  assert.equal(isTestLeague({ is_test: true }), true);
  assert.equal(isTestLeague({}), false);
  assert.equal(isTestLeague(null), false);
});
