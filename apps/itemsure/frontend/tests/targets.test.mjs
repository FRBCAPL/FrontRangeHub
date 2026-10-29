// Minimum/par validation, exact comparisons, status, and batch-save rows.
// Run: node --test apps/itemsure/frontend/tests
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildSaveRows, compareQuantity, isTargetChanged, targetKey, targetStatus, validateTargetEdit } =
  await import('../src/utils/itemsureTargets.js');

test('compares decimal text exactly', () => {
  assert.equal(compareQuantity('2.5', '2.50'), 0);
  assert.equal(compareQuantity('10', '9.999'), 1);
  assert.equal(compareQuantity('0.1', '0.10001'), -1);
  assert.equal(compareQuantity('100000000000.000001', '100000000000'), 1);
});

test('blank is unset, zero is a value', () => {
  assert.deepEqual(validateTargetEdit({ minimum: '', par: '0' }, 0, 'Each'), { minimum: null, par: '0' });
  assert.deepEqual(validateTargetEdit({ minimum: ' ', par: '' }, 0, 'Each'), { minimum: null, par: null });
});

test('minimum may equal par but not exceed it', () => {
  assert.deepEqual(validateTargetEdit({ minimum: '5', par: '5.0' }, 1, 'Liter'), { minimum: '5', par: '5' });
  assert.match(validateTargetEdit({ minimum: '5.1', par: '5' }, 1, 'Liter').error, /cannot be more than "Fill up to"/);
});

test('rejects negatives, text, and extra decimals', () => {
  assert.match(validateTargetEdit({ minimum: '-1', par: '' }, 0, 'Each').error, /negative/);
  assert.match(validateTargetEdit({ minimum: 'abc', par: '' }, 0, 'Each').error, /number/);
  assert.match(validateTargetEdit({ minimum: '', par: '2.5' }, 0, 'Each').error, /whole numbers/);
  assert.match(validateTargetEdit({ minimum: '', par: '1.555' }, 2, 'Bottle').error, /2 decimal places/);
});

test('status matches the database rules', () => {
  const both = { minimum_text: '5', par_text: '20' };
  assert.equal(targetStatus(both, null), 'not_set_up');
  assert.equal(targetStatus(both, '5'), 'low');
  assert.equal(targetStatus(both, '5.01'), 'below_par');
  assert.equal(targetStatus(both, '20'), 'at_target');
  assert.equal(targetStatus(both, '21'), 'above_target');
  assert.equal(targetStatus({ minimum_text: '0', par_text: null }, '0'), 'low');
  assert.equal(targetStatus({ minimum_text: '3', par_text: null }, '4'), 'above_minimum');
  assert.equal(targetStatus({ minimum_text: null, par_text: '4' }, '0'), 'below_par');
  assert.equal(targetStatus({ minimum_text: '4', par_text: '4' }, '4'), 'low');
  assert.equal(targetStatus(null, '4'), null);
});

test('unchanged edits are not saved; "2.50" equals saved "2.5"', () => {
  assert.equal(isTargetChanged({ minimum: '2.50', par: '' }, { minimum_text: '2.5', par_text: null }), false);
  assert.equal(isTargetChanged({ minimum: '', par: '' }, null), false);
  assert.equal(isTargetChanged({ minimum: '1', par: '' }, null), true);
});

test('batch rows keep valid edits, report invalid ones, and carry the version', () => {
  const items = { i1: { precision: 0, unitName: 'Each' }, i2: { precision: 2, unitName: 'Bottle' } };
  const k1 = targetKey('i1', 'L1', 'A1');
  const k2 = targetKey('i2', 'L1', null);
  const k3 = targetKey('i1', 'L2', null);
  const k4 = targetKey('i1', 'L1', null);
  const saved = { [k1]: { minimum_text: '1', par_text: '4', updated_at: '2026-10-28T00:00:00Z' }, [k4]: { minimum_text: '2', par_text: null, updated_at: 't4' } };
  const edits = {
    [k1]: { minimum: '2', par: '4' },
    [k2]: { minimum: '1.5', par: '3.25' },
    [k3]: { minimum: '9', par: '3' },
    [k4]: { minimum: '2', par: '' },
  };
  const { rows, keys, errors } = buildSaveRows(edits, saved, items);
  assert.deepEqual(keys, [k1, k2]);
  assert.deepEqual(rows[0], { item_id: 'i1', location_id: 'L1', storage_area_id: 'A1', minimum: '2', par: '4', expected_updated_at: '2026-10-28T00:00:00Z' });
  assert.deepEqual(rows[1], { item_id: 'i2', location_id: 'L1', storage_area_id: null, minimum: '1.5', par: '3.25', expected_updated_at: null });
  assert.match(errors[k3], /cannot be more than "Fill up to"/);
  assert.equal(errors[k4], undefined);
});
