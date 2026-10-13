import test from 'node:test';
import assert from 'node:assert/strict';
import { byWhom, historyChange } from './duezyHistory.js';

test('history lines read old → new with method and note', () => {
  assert.equal(
    historyChange({ action: 'changed', week: 3, old_status: 'partial', old_amount: 5, new_status: 'paid', new_amount: 20, method: 'Cash', note: 'rest at table' }),
    'Week 3: Partial $5 → Paid $20 · Cash · rest at table'
  );
  assert.equal(historyChange({ action: 'created', week: 1, new_status: 'bye', new_amount: 0 }, (w) => `Sep ${w}`), 'Sep 1: Bye');
});

test('who changed it', () => {
  assert.equal(byWhom('Sam@x.com', 'sam@x.com'), 'by you');
  assert.equal(byWhom('amy@x.com', 'sam@x.com'), 'by amy@x.com');
  assert.equal(byWhom(null, 'sam@x.com'), '');
});
