import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catchUpWeeks, nextCatchUpWeek, settlesCatchUp } from './duezyCatchUp.js';

test('catchUpWeeks merges late and make-up, unique, sorted', () => {
  assert.deepEqual(
    catchUpWeeks({ lateWeeks: [8, 3], makeupWeeks: [3, 10] }),
    [3, 8, 10]
  );
  assert.deepEqual(catchUpWeeks({}), []);
});

test('settlesCatchUp only paid and bye', () => {
  assert.equal(settlesCatchUp({ status: 'paid' }), true);
  assert.equal(settlesCatchUp({ status: 'bye' }), true);
  assert.equal(settlesCatchUp({ status: 'partial' }), false);
  assert.equal(settlesCatchUp({ status: 'makeup' }), false);
});

test('nextCatchUpWeek picks the next later night', () => {
  assert.equal(nextCatchUpWeek([3, 8, 10], 3), 8);
  assert.equal(nextCatchUpWeek([3, 8, 10], 8), 10);
  assert.equal(nextCatchUpWeek([3, 8, 10], 10), null);
  assert.equal(nextCatchUpWeek([3, 8], 5), 8);
});
