// Fractional Each is supported on purpose (migration 20261030002900): Each allows 2 decimal
// places, so half a lemon or 2.5 kegs can be counted. Milliliter stays whole. These tests
// guard that from being "fixed" back to whole numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkQuantity, displayQuantity, stepQuantity, wholeToBuy } from '../src/utils/itemsureQuantity.js';
import { planSpotCounts } from '../src/utils/itemsureQuickCount.js';
import { convertPackageQuantity } from '../src/utils/itemsurePackages.js';
import { validateTargetEdit } from '../src/utils/itemsureTargets.js';
import { usageRows } from '../src/utils/itemsurePosUsage.js';

const EACH = 2;
const MILLILITER = 0;

test('Each accepts up to 2 decimal places', () => {
  assert.deepEqual(checkQuantity('0.5', EACH, 'Each'), { value: '0.5' });
  assert.deepEqual(checkQuantity('2.25', EACH, 'Each'), { value: '2.25' });
  assert.deepEqual(checkQuantity('.5', EACH, 'Each'), { value: '0.5' });
  assert.deepEqual(checkQuantity('0,5', EACH, 'Each'), { value: '0.5' });
  assert.deepEqual(checkQuantity('3.50', EACH, 'Each'), { value: '3.5' });
  assert.match(checkQuantity('0.255', EACH, 'Each').error, /Each allows up to 2 decimal places/);
});

test('Milliliter stays whole numbers', () => {
  assert.deepEqual(checkQuantity('250', MILLILITER, 'Milliliter'), { value: '250' });
  assert.match(checkQuantity('0.5', MILLILITER, 'Milliliter').error, /whole numbers/);
});

test('a quick count of 0.5 Each is saved, not flagged', () => {
  const opts = { unitId: 'each', precision: EACH, unitName: 'Each' };
  const { errors, changes } = planSpotCounts({ bar: '0.5', back: '2.25', top: '0.125' }, {}, opts);
  assert.deepEqual(Object.keys(errors), ['top']);
  assert.deepEqual(changes.map((c) => [c.areaId, c.value]), [['bar', '0.5'], ['back', '2.25']]);
});

test('warning levels can use parts of an Each', () => {
  assert.deepEqual(validateTargetEdit({ minimum: '0.5', par: '2.5' }, EACH, 'Each'), { minimum: '0.5', par: '2.5' });
  assert.match(validateTargetEdit({ minimum: '0.125', par: '' }, EACH, 'Each').error, /2 decimal places/);
});

test('half a case of 12 is 6 Each; a part that lands on 2 decimals is fine', () => {
  const caseOf12 = { id: 'c', name: 'Case', size: '12', is_active: true, is_purchase_unit: true };
  assert.deepEqual(convertPackageQuantity('0.5', caseOf12, 'Each', EACH), { packageQuantity: '0.5', base: '6' });
  const pairOfHalves = { id: 'h', name: 'Half pair', size: '0.5', is_active: true, is_purchase_unit: false };
  assert.deepEqual(convertPackageQuantity('3', pairOfHalves, 'Each', EACH), { packageQuantity: '3', base: '1.5' });
  assert.match(convertPackageQuantity('0.25', pairOfHalves, 'Each', EACH).error, /2 decimal places/);
});

test('parts display, step, and buy sensibly', () => {
  assert.equal(displayQuantity('0.50'), '0.5');
  assert.equal(stepQuantity('0.5', 1), '1.5');
  assert.equal(stepQuantity('0.5', -1), '0');
  assert.equal(wholeToBuy('2.5'), '3');
});

test('Sales vs counts with parts: start 2.5, end 0.5, Clover 1.5 → used 2, gap 0.5', () => {
  const expected = new Map([['lemons', { expected: 1.5, sold: 3, missingPour: [], missingContent: false }]]);
  const rows = usageRows([{ item_id: 'lemons', item_name: 'Lemons', unit_symbol: 'ea', used: '2' }], expected, new Map());
  assert.equal(rows[0].counted, 2);
  assert.equal(rows[0].expected, 1.5);
  assert.equal(rows[0].difference, 0.5);
});
