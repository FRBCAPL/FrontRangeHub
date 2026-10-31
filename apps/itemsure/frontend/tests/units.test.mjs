import test from 'node:test';
import assert from 'node:assert/strict';
import { findUnit, mergeUnits, unitCode, unitSections } from '../src/utils/itemsureUnits.js';

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

test('unitSections shows own and in-use units, hiding the rest', () => {
  const ids = (s) => ({ own: s.own.map((u) => u.id), inUse: s.inUse.map((u) => u.id), more: s.more.map((u) => u.id) });
  assert.deepEqual(ids(unitSections(units, [{ base_unit_id: '1' }], '')), { own: ['3'], inUse: ['1'], more: ['2'] });
  // The chosen unit always shows, even if no item uses it yet.
  assert.deepEqual(ids(unitSections(units, [], '2')), { own: ['3'], inUse: ['2'], more: ['1'] });
  // Own units alone are enough to hide the standard ones.
  assert.deepEqual(ids(unitSections(units, [], '')), { own: ['3'], inUse: [], more: ['1', '2'] });
  // Nothing in use and no own units: show every standard unit.
  assert.deepEqual(ids(unitSections(units.slice(0, 2), [], '')), { own: [], inUse: ['1', '2'], more: [] });
});

test('mergeUnits adds new units once', () => {
  const added = [{ id: '3' }, { id: '4', name: 'Tray' }];
  assert.deepEqual(mergeUnits(units, added).map((u) => u.id), ['1', '2', '3', '4']);
});
