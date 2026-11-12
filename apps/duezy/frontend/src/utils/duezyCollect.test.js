import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPayments } from './duezyMath.js';
import { collectDelta, collectList, weekTotals } from './duezyCollect.js';

const teams = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
const idx = indexPayments([
  { team_id: 'a', week: 3, status: 'paid', amount: 20 },
  { team_id: 'b', week: 3, status: 'partial', amount: 5 },
  { team_id: 'c', week: 3, status: 'bye', amount: 0 },
  { team_id: 'd', week: 3, status: 'makeup', amount: 0 },
]);

test('collect list: unpaid and partial teams only', () => {
  assert.deepEqual(collectList(teams, 3, idx).map((t) => t.id), ['b', 'e']);
});

test('week totals skip byes and count partial money', () => {
  assert.deepEqual(weekTotals(teams, 3, 20, idx), { collected: 25, due: 80, left: 2 });
});

test('collect delta: what one save added', () => {
  assert.equal(collectDelta(null, { status: 'paid', amount: 20 }, 20), 20);
  assert.equal(collectDelta({ status: 'partial', amount: 5 }, { status: 'paid', amount: 20 }, 20), 15);
  assert.equal(collectDelta(null, { status: 'bye', amount: 0 }, 20), 0);
});
