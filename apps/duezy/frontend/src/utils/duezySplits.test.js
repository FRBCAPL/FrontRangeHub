import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPartEntry, canAddPart, methodCells, methodText, paymentParts } from './duezySplits.js';

const cash78 = { status: 'partial', amount: 78, method: 'Cash', paid_by: null, note: 'short tonight' };

test('adding Venmo to a partial cash week makes a paid split', () => {
  const entry = addPartEntry(cash78, 100, { amount: 22, method: 'Venmo', paid_by: 'Ana' });
  assert.deepEqual(entry, {
    status: 'paid', amount: 100, method: null, paid_by: null, note: 'short tonight',
    splits: [{ amount: 78, method: 'Cash', paid_by: null }, { amount: 22, method: 'Venmo', paid_by: 'Ana' }],
  });
});

test('still short after adding stays partial', () => {
  const entry = addPartEntry(cash78, 100, { amount: 10, method: 'Zelle' });
  assert.equal(entry.status, 'partial');
  assert.equal(entry.amount, 88);
  assert.equal(entry.splits.length, 2);
});

test('same method and payer adds to that part instead of splitting', () => {
  const entry = addPartEntry(cash78, 100, { amount: 22, method: 'Cash' });
  assert.deepEqual(entry, { status: 'paid', amount: 100, method: 'Cash', paid_by: null, note: 'short tonight', splits: null });
});

test('a third part adds onto an existing split', () => {
  const split = addPartEntry(cash78, 120, { amount: 22, method: 'Venmo', paid_by: 'Ana' });
  const entry = addPartEntry(split, 120, { amount: 20, method: 'Zelle', paid_by: 'Bo' });
  assert.equal(entry.status, 'paid');
  assert.equal(entry.amount, 120);
  assert.deepEqual(entry.splits.map((p) => p.method), ['Cash', 'Venmo', 'Zelle']);
});

test('parts, text and spreadsheet cells', () => {
  const split = addPartEntry(cash78, 100, { amount: 22, method: 'Venmo', paid_by: 'Ana' });
  assert.equal(paymentParts(split, 100).length, 2);
  assert.equal(methodText(split), 'Cash $78 + Venmo from Ana $22');
  assert.deepEqual(methodCells(split), ['Cash 78.00 + Venmo 22.00', 'Ana']);
  assert.equal(methodText(cash78), 'Cash');
  assert.deepEqual(methodCells({ method: 'Venmo', paid_by: 'Ana' }), ['Venmo', 'Ana']);
  assert.deepEqual(paymentParts({ status: 'paid', amount: 0, method: 'Cash' }, 20), [{ amount: 20, method: 'Cash', paid_by: null }]);
  assert.deepEqual(paymentParts({ status: 'unpaid', amount: 0 }, 20), []);
  assert.equal(canAddPart(cash78, 100), true);
});
