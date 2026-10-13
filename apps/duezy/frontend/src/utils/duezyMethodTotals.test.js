import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPayments } from './duezyMath.js';
import { weekMethodTotals } from './duezyMethodTotals.js';

const teams = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: id }));

test('splits a week into cash, each digital method and not recorded', () => {
  const idx = indexPayments([
    { team_id: 'a', week: 2, status: 'paid', amount: 20, method: 'Cash' },
    { team_id: 'b', week: 2, status: 'paid', amount: 25, method: 'cash' },
    { team_id: 'c', week: 2, status: 'paid', amount: 20, method: 'Venmo' },
    { team_id: 'd', week: 2, status: 'partial', amount: 10, method: 'Zelle' },
    { team_id: 'e', week: 2, status: 'paid', amount: 20, method: null },
    { team_id: 'f', week: 2, status: 'makeup', amount: 0 },
    { team_id: 'a', week: 3, status: 'paid', amount: 20, method: 'Venmo' },
  ]);
  const t = weekMethodTotals(teams, 2, 20, idx);
  assert.deepEqual(t.cash, { total: 45, count: 2 });
  assert.deepEqual(t.digital, [
    { method: 'Venmo', total: 20, count: 1 },
    { method: 'Zelle', total: 10, count: 1 },
  ]);
  assert.deepEqual(t.unrecorded, { total: 20, count: 1 });
  assert.equal(t.total, 95);
});

test('empty week', () => {
  const t = weekMethodTotals(teams, 1, 20, indexPayments([]));
  assert.equal(t.total, 0);
  assert.deepEqual(t.digital, []);
});
