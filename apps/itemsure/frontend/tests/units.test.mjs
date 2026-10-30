import test from 'node:test';
import assert from 'node:assert/strict';
import { findUnit, mergeUnits, unitCode } from '../src/utils/itemsureUnits.js';

const units = [
  { id: '1', code: 'each', name: 'Each', symbol: 'ea' },
  { id: '2', code: 'kilogram', name: 'Kilogram', symbol: 'kg' },
  { id: '3', code: 'half_keg', name: 'Half Keg', symbol: null, organization_id: 'org' },
];

test('unitCode makes a database-safe code', () => {
  assert.equal(unitCode('Half Keg (1/2)'), 'half_keg_1_2');
  assert.equal(unitCode('  Café tray '), 'cafe_tray');
  assert.equal(unitCode('!!!'), '');
  assert.match(unitCode('x'.repeat(100)), /^[a-z0-9_]{1,60}$/);
});

test('findUnit matches name, short name, or code, ignoring case', () => {
  assert.equal(findUnit(units, 'each')?.id, '1');
  assert.equal(findUnit(units, 'KG')?.id, '2');
  assert.equal(findUnit(units, 'half-keg')?.id, '3');
  assert.equal(findUnit(units, 'Tray'), null);
  assert.equal(findUnit(units, '  '), null);
});

test('mergeUnits adds new units once', () => {
  const added = [{ id: '3' }, { id: '4', name: 'Tray' }];
  assert.deepEqual(mergeUnits(units, added).map((u) => u.id), ['1', '2', '3', '4']);
});
