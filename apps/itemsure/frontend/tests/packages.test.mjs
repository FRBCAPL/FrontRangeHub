import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPackageSize,
  convertPackageQuantity,
  describePackage,
  multiplyExact,
  stockEntry,
  usablePackages,
} from '../src/utils/itemsurePackages.js';

const caseOf12 = { id: 'c', name: 'Case', size: '12', is_active: true, is_purchase_unit: true };
const jug = { id: 'j', name: 'Jug', size: '3.785', is_active: true, is_purchase_unit: false };
const half = { id: 'h', name: 'Half bottle', size: '0.5', is_active: true, is_purchase_unit: false };

test('exact multiplication never goes through floats', () => {
  assert.equal(multiplyExact('2', '12'), '24');
  assert.equal(multiplyExact('0.1', '0.2'), '0.02');
  assert.equal(multiplyExact('1000', '3.785'), '3785');
  assert.equal(multiplyExact('1.5', '12.000000'), '18');
  assert.equal(multiplyExact('999999999999', '12'), '11999999999988');
});

test('single and multi-unit packages convert to the base unit', () => {
  assert.deepEqual(convertPackageQuantity('2', caseOf12, 'Each', 0), { packageQuantity: '2', base: '24' });
  assert.deepEqual(convertPackageQuantity('1', { ...caseOf12, size: '1' }, 'Each', 0), { packageQuantity: '1', base: '1' });
  assert.deepEqual(convertPackageQuantity('1.5', caseOf12, 'Each', 0), { packageQuantity: '1.5', base: '18' });
  assert.deepEqual(convertPackageQuantity('2', jug, 'Liter', 3), { packageQuantity: '2', base: '7.57' });
  assert.deepEqual(convertPackageQuantity('3', half, 'Bottle', 2), { packageQuantity: '3', base: '1.5' });
});

test('a conversion that does not fit the base unit is refused, never rounded', () => {
  assert.match(convertPackageQuantity('1.1', caseOf12, 'Each', 0).error, /13\.2 Each, but Each must be in whole numbers/);
  assert.match(convertPackageQuantity('0.5', jug, 'Liter', 3).error, /1\.8925 Liter, but Liter allows up to 3 decimal places/);
  assert.match(convertPackageQuantity('0.25', half, 'Bottle', 2).error, /allows up to 2 decimal places/);
});

test('package quantities: blank, zero, negative, text, and too many decimals', () => {
  assert.deepEqual(convertPackageQuantity('', caseOf12, 'Each', 0), { empty: true });
  assert.match(convertPackageQuantity('0', caseOf12, 'Each', 0).error, /greater than zero/);
  assert.match(convertPackageQuantity('-2', caseOf12, 'Each', 0).error, /negative/);
  assert.match(convertPackageQuantity('two', caseOf12, 'Each', 0).error, /Enter a number/);
  assert.match(convertPackageQuantity('0.0000001', caseOf12, 'Each', 0).error, /6 decimal places/);
});

test('package sizes respect the base unit precision', () => {
  assert.deepEqual(checkPackageSize('12', 'Each', 0), { value: '12' });
  assert.deepEqual(checkPackageSize('3.785', 'Liter', 3), { value: '3.785' });
  assert.match(checkPackageSize('1.5', 'Each', 0).error, /whole numbers, so a package size must too/);
  assert.match(checkPackageSize('0.125', 'Bottle', 2).error, /2 decimal places/);
  assert.match(checkPackageSize('0', 'Each', 0).error, /more than zero/);
  assert.match(checkPackageSize('', 'Each', 0).error, /how many Each/);
  assert.match(checkPackageSize('-3', 'Each', 0).error, /negative/);
});

test('stock entry: base unit passes through untouched, packages convert or explain', () => {
  const item = { unitName: 'Each', precision: 0 };
  assert.deepEqual(stockEntry('5', null, item), { base: '5' });
  assert.deepEqual(stockEntry('2', caseOf12, item), { pkg: caseOf12, packageQuantity: '2', base: '24' });
  assert.equal(stockEntry('', caseOf12, item).error, 'Enter a quantity.');
  assert.match(stockEntry('1.1', caseOf12, item).error, /whole numbers/);
});

test('descriptions and the usable list', () => {
  assert.equal(describePackage(caseOf12, 'Each'), '1 Case = 12 Each');
  assert.equal(describePackage({ name: 'Case', size: '12.000000' }, 'Bottle'), '1 Case = 12 Bottle');
  const list = usablePackages([jug, { ...half, is_active: false }, caseOf12]);
  assert.deepEqual(list.map((p) => p.id), ['c', 'j']);
});
