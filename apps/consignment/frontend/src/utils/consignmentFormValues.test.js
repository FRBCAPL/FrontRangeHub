import test from 'node:test';
import assert from 'node:assert/strict';
import { fromDateInput, middayFromDateInput, numOrNull, toDateInput } from './consignmentFormValues.js';

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
  assert.equal(iso, '2026-10-31T05:59:59.000Z');
  assert.equal(toDateInput(iso), '2026-10-30');
  assert.equal(fromDateInput('2026-12-30'), '2026-12-31T06:59:59.000Z');
  assert.equal(middayFromDateInput('2026-10-30'), '2026-10-30T18:00:00.000Z');
});
