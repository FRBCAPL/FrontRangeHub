import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPayments, isMakeup, isPrepaidMakeup, makeupWeeks } from './duezyMath.js';
import { asPrepaid, entryOf, keepPrepaid, markPlayedEntry, markToPlayEntry } from './duezyMakeup.js';
import { teamBucket } from './duezyTeamGroups.js';

const prepaid = { team_id: 'a', week: 1, status: 'paid', amount: 20, method: 'Cash', makeup_pending: true };

test('prepaid make-up is a make-up to play; a normally paid make-up is not', () => {
  assert.equal(isPrepaidMakeup(prepaid), true);
  assert.equal(isMakeup(prepaid), true);
  assert.equal(isMakeup({ status: 'paid', amount: 20 }), false);
  assert.equal(isMakeup({ status: 'makeup', amount: 0 }), true);
  assert.equal(isPrepaidMakeup({ status: 'bye', makeup_pending: true }), false);
});

test('makeupWeeks: all to play, only owing, only prepaid', () => {
  const idx = indexPayments([prepaid, { team_id: 'a', week: 2, status: 'makeup', amount: 0 }, { team_id: 'a', week: 3, status: 'paid', amount: 20 }]);
  assert.deepEqual(makeupWeeks('a', 3, idx), [1, 2]);
  assert.deepEqual(makeupWeeks('a', 3, idx, { dues: 20 }), [2]);
  assert.deepEqual(makeupWeeks('a', 3, idx, { dues: 20, prepaid: true }), [1]);
});

test('prepaid make-ups show under the make-up filter', () => {
  assert.equal(teamBucket({ id: 'a' }, 1, indexPayments([prepaid])), 'makeup');
  assert.equal(teamBucket({ id: 'a' }, 1, indexPayments([{ ...prepaid, makeup_pending: false }])), 'paid');
});

test('asPrepaid only flags money entries', () => {
  assert.equal(asPrepaid({ status: 'paid', amount: 20 }).makeup_pending, true);
  assert.equal(asPrepaid({ status: 'bye', amount: 0 }).makeup_pending, undefined);
});

test('mark played keeps the money and clears the flag', () => {
  assert.deepEqual(markPlayedEntry(prepaid), {
    status: 'paid', amount: 20, method: 'Cash', note: null, paid_by: null, splits: null, makeup_pending: false,
  });
  assert.equal(entryOf(prepaid).makeup_pending, true);
});

test('an already-paid week turned into a make-up to play keeps its money and payer', () => {
  const paid = { status: 'paid', amount: 20, method: 'Venmo', paid_by: 'Ana', makeup_pending: false };
  assert.deepEqual(markToPlayEntry(paid), {
    status: 'paid', amount: 20, method: 'Venmo', note: null, paid_by: 'Ana', splits: null, makeup_pending: true,
  });
});

test('corrections keep a prepaid make-up; corrected to nothing it is an unpaid make-up again', () => {
  assert.equal(keepPrepaid(prepaid, { status: 'partial', amount: 10, method: 'Cash' }).makeup_pending, true);
  assert.deepEqual(keepPrepaid(prepaid, { status: 'unpaid', amount: 0, method: null }), { status: 'makeup', amount: 0, method: null });
  assert.deepEqual(keepPrepaid({ status: 'paid', amount: 20 }, { status: 'unpaid', amount: 0 }), { status: 'unpaid', amount: 0 });
});
