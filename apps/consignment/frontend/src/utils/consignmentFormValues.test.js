import test from 'node:test';
import assert from 'node:assert/strict';
import { fromDateInput, numOrNull, toDateInput } from './consignmentFormValues.js';

test('numOrNull treats blanks and junk as null', () => {
  assert.equal(numOrNull(''), null);
  assert.equal(numOrNull(null), null);
  assert.equal(numOrNull('abc'), null);
  assert.equal(numOrNull('0'), 0);
  assert.equal(numOrNull('12.5'), 12.5);
});

test('date input round-trips to the end of the same local day', () => {
  assert.equal(toDateInput(''), '');
  assert.equal(fromDateInput(''), null);
  const iso = fromDateInput('2026-10-30');
  const d = new Date(iso);
  assert.equal(toDateInput(iso), '2026-10-30');
  assert.equal(d.getHours(), 23);
  assert.equal(d.getMinutes(), 59);
});
