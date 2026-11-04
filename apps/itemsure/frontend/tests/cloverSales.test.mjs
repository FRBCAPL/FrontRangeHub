import test from 'node:test';
import assert from 'node:assert/strict';
import { itemSalesRows, periodRange, salesTotals, unmatchedRows } from '../src/utils/itemsureCloverSales.js';

const now = new Date(2026, 10, 4, 1, 30);

test('periods are whole local days, the end not included', () => {
  assert.deepEqual(periodRange('today', now), { from: new Date(2026, 10, 4), to: new Date(2026, 10, 5) });
  assert.deepEqual(periodRange('yesterday', now), { from: new Date(2026, 10, 3), to: new Date(2026, 10, 4) });
  assert.deepEqual(periodRange('week', now), { from: new Date(2026, 9, 29), to: new Date(2026, 10, 5) });
  assert.deepEqual(periodRange('month', now).from, new Date(2026, 9, 6));
  assert.deepEqual(periodRange('custom', now, { from: '2026-11-01', to: '2026-11-02' }), { from: new Date(2026, 10, 1), to: new Date(2026, 10, 3) });
  assert.equal(periodRange('custom', now, { from: '2026-11-02', to: '2026-11-01' }), null);
  assert.equal(periodRange('custom', now, { from: '', to: '2026-11-01' }), null);
});

test('adds up hourly sales per Clover item', () => {
  const totals = salesTotals([{ external_id: 'a', quantity: '2' }, { external_id: 'a', quantity: 3 }, { external_id: 'b', quantity: 1 }]);
  assert.equal(totals.get('a'), 5);
  assert.equal(totals.get('b'), 1);
});

test('rows per item: how many sold, how much stock that is, and which Clover buttons', () => {
  const links = new Map([['shot', ['rum']], ['mojito', ['rum', 'mint']], ['fries', ['potato']], ['quiet', ['rum']]]);
  const totals = new Map([['shot', 20], ['mojito', 6], ['fries', 4], ['beer', 9]]);
  const pours = new Map([['shot|rum', { amount: 1.5, unit: 'fl_oz' }], ['mojito|rum', { amount: 1.5, unit: 'fl_oz' }], ['mojito|mint', { amount: 1, unit: 'base' }]]);
  const rows = itemSalesRows({
    totals, links, pours,
    unitCodes: new Map([['rum', 'bottle'], ['mint', 'bunch'], ['potato', 'bag']]),
    contents: new Map([['rum', 750]]),
    pieces: new Map(),
    itemsById: new Map([['rum', { name: 'Bacardi', unitName: 'Bottle' }], ['mint', { name: 'Mint', unitName: 'Bunch' }], ['potato', { name: 'Fries', unitName: 'Bag' }]]),
    posNames: new Map([['shot', 'Bacardi'], ['mojito', 'Mojito'], ['fries', 'Battered Fries'], ['beer', 'Bud Light']]),
  });
  assert.deepEqual(rows.map((r) => [r.name, r.sold]), [['Bacardi', 26], ['Mint', 6], ['Fries', 4]]);
  const rum = rows[0];
  assert.equal(rum.complete, true);
  assert.ok(Math.abs(rum.used - (26 * 1.5 * 29.5735) / 750) < 1e-9);
  assert.deepEqual(rum.buttons.map((b) => [b.name, b.sold]), [['Bacardi', 20], ['Mojito', 6]]);
  const fries = rows[2];
  assert.equal(fries.complete, false);
  assert.equal(fries.used, 0);
  assert.deepEqual(fries.missingPour, ['fries']);
});

test('lists Clover items that sold but are not matched', () => {
  const links = new Map([['shot', ['rum']]]);
  const totals = new Map([['shot', 3], ['beer', 9], ['wings', 2], ['zero', 0]]);
  const names = new Map([['beer', 'Bud Light'], ['wings', 'Wings']]);
  assert.deepEqual(unmatchedRows(totals, links, names), [
    { externalId: 'beer', name: 'Bud Light', sold: 9 },
    { externalId: 'wings', name: 'Wings', sold: 2 },
  ]);
});
