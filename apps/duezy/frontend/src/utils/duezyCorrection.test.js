import test from 'node:test';
import assert from 'node:assert/strict';
import { correctionEntry, correctionSummary, hasRecordedEntry, isSameEntry } from './duezyCorrection.js';

const paid80 = { status: 'paid', amount: 80, method: 'Venmo' };

test('hasRecordedEntry only for paid or partial weeks', () => {
  assert.equal(hasRecordedEntry(paid80), true);
  assert.equal(hasRecordedEntry({ status: 'partial', amount: 20 }), true);
  assert.equal(hasRecordedEntry({ status: 'bye' }), false);
  assert.equal(hasRecordedEntry({ status: 'unpaid' }), false);
  assert.equal(hasRecordedEntry(undefined), false);
});

test('correctionEntry picks paid, partial or unpaid', () => {
  assert.deepEqual(correctionEntry('70', 80, 'Cash', ' typo '), { status: 'partial', amount: 70, method: 'Cash', note: 'typo' });
  assert.deepEqual(correctionEntry(80, 80, 'Cash', ''), { status: 'paid', amount: 80, method: 'Cash', note: null });
  assert.deepEqual(correctionEntry(0, 80, 'Cash', 'bounced'), { status: 'unpaid', amount: 0, method: null, note: 'bounced' });
});

test('correctionSummary shows before and after', () => {
  assert.equal(correctionSummary(paid80, 80, 70, 'Venmo'), '$80 recorded → $70 corrected');
  assert.equal(correctionSummary(paid80, 80, 80, 'Cash'), '$80 recorded → $80 corrected (Venmo → Cash)');
  assert.equal(correctionSummary(paid80, 80, 0, 'Venmo'), '$80 recorded → not paid');
});

test('isSameEntry detects no-op saves', () => {
  assert.equal(isSameEntry(paid80, 80, 80, 'Venmo'), true);
  assert.equal(isSameEntry(paid80, 80, 80, 'Cash'), false);
  assert.equal(isSameEntry(paid80, 80, 70, 'Venmo'), false);
});
