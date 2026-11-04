import test from 'node:test';
import assert from 'node:assert/strict';
import { countRounds, expectedUse, needsContent, salesIndex, pourInBase, salesCovered, salesHourRange, shortQty, usageRows } from '../src/utils/itemsurePosUsage.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);

test('pourInBase converts oz and ml into the counted unit', () => {
  close(pourInBase({ amount: 1.5, unit: 'fl_oz' }, 'bottle', 750), (1.5 * 29.5735) / 750);
  close(pourInBase({ amount: 50, unit: 'ml' }, 'liter'), 0.05);
  close(pourInBase({ amount: 25, unit: 'ml' }, 'milliliter'), 25);
  close(pourInBase({ amount: 0.5, unit: 'base' }, 'each'), 0.5);
  assert.equal(pourInBase({ amount: 1.5, unit: 'fl_oz' }, 'bottle', undefined), null);
  assert.equal(pourInBase(null, 'bottle', 750), null);
});

test('needsContent only when an oz/ml pour comes from a non-volume unit', () => {
  assert.equal(needsContent({ amount: 1, unit: 'fl_oz' }, 'bottle'), true);
  assert.equal(needsContent({ amount: 1, unit: 'fl_oz' }, 'liter'), false);
  assert.equal(needsContent({ amount: 1, unit: 'base' }, 'bottle'), false);
});

test('expectedUse adds up every Clover item that uses an item and flags gaps', () => {
  const links = new Map([['mojito', ['rum', 'lime']], ['shot', ['rum']], ['quiet', ['rum']]]);
  const sold = new Map([['mojito', 10], ['shot', 4]]);
  const pours = new Map([['mojito|rum', { amount: 2, unit: 'fl_oz' }], ['shot|rum', { amount: 1, unit: 'fl_oz' }]]);
  const out = expectedUse({ links, sold, pours, unitCodes: new Map([['rum', 'bottle'], ['lime', 'each']]), contents: new Map([['rum', 750]]) });
  close(out.get('rum').expected, (24 * 29.5735) / 750);
  assert.equal(out.get('rum').sold, 14);
  assert.deepEqual(out.get('lime').missingPour, ['mojito']);

  const noSize = expectedUse({ links, sold, pours, unitCodes: new Map([['rum', 'bottle']]), contents: new Map() });
  assert.equal(noSize.get('rum').missingContent, true);
});

test('usageRows gap is Between counts minus Clover used (take-off must not shrink counted)', () => {
  const expected = new Map([['rum', { expected: 3, sold: 3, missingPour: [], missingContent: false }]]);
  const rows = usageRows([{ item_id: 'rum', item_name: 'Rum', unit_symbol: 'btl', used: '4' }], expected, new Map());
  assert.equal(rows[0].counted, 4);
  assert.equal(rows[0].expected, 3);
  assert.equal(rows[0].difference, 1);
});

test('usageRows lists counted items first, then sold-but-not-counted ones', () => {
  const expected = new Map([['rum', { expected: 1, sold: 14, missingPour: [], missingContent: false }], ['gin', { expected: 0.5, sold: 3, missingPour: [], missingContent: false }]]);
  const rows = usageRows([{ item_id: 'rum', item_name: 'Rum', unit_symbol: 'btl', used: '1.25' }], expected, new Map([['gin', { name: 'Gin', unitName: 'Bottle' }]]));
  assert.equal(rows[0].name, 'Rum');
  close(rows[0].difference, 0.25);
  assert.equal(rows[1].notCounted, true);
  assert.equal(rows[1].difference, null);
});

test('salesHourRange and salesCovered work to the nearest hour', () => {
  const r = salesHourRange('2026-11-01T02:20:00.000Z', '2026-11-02T02:40:00.000Z');
  assert.equal(r.after, '2026-11-01T01:50:00.000Z');
  assert.equal(r.upTo, '2026-11-02T02:10:00.000Z');
  const sync = { from_at: '2026-11-01T02:00:00.000Z', to_at: '2026-11-02T03:00:00.000Z' };
  assert.equal(salesCovered([sync], '2026-11-01T02:20:00.000Z', '2026-11-02T02:40:00.000Z'), true);
  assert.equal(salesCovered([{ ...sync, to_at: '2026-11-02T02:30:00.000Z' }], '2026-11-01T02:20:00.000Z', '2026-11-02T02:40:00.000Z'), false);
  assert.equal(salesCovered([], '2026-11-01T02:20:00.000Z', '2026-11-02T02:40:00.000Z'), false);
});

test('countRounds groups spot counts by day, newest first, ending at the last approval', () => {
  const rounds = countRounds([
    { name: 'Bar', at: '2026-11-02T18:00:00', decidedAt: '2026-11-02T18:05:00' },
    { name: 'Back Room', at: '2026-11-02T19:00:00', decidedAt: '2026-11-02T19:30:00' },
    { name: 'Walk-In', at: '2026-10-31T09:00:00', decidedAt: '2026-10-31T09:10:00' },
  ]);
  assert.equal(rounds.length, 2);
  assert.deepEqual(rounds[0].names, ['Bar', 'Back Room']);
  assert.equal(rounds[0].endAt, '2026-11-02T19:30:00');
  assert.deepEqual(rounds[1].names, ['Walk-In']);
});

test('salesIndex sums each Clover item over its own window, to the nearest hour', () => {
  const soldIn = salesIndex([
    { external_id: 'shot', hour_start: '2026-11-01T20:00:00.000Z', quantity: 3 },
    { external_id: 'shot', hour_start: '2026-11-02T20:00:00.000Z', quantity: 5 },
    { external_id: 'beer', hour_start: '2026-11-01T20:00:00.000Z', quantity: 9 },
  ]);
  assert.equal(soldIn('shot', '2026-11-01T12:00:00.000Z', '2026-11-03T00:00:00.000Z'), 8);
  assert.equal(soldIn('shot', '2026-11-02T00:00:00.000Z', '2026-11-03T00:00:00.000Z'), 5);
  assert.equal(soldIn('shot', '2026-11-01T20:40:00.000Z', '2026-11-03T00:00:00.000Z'), 5);
  assert.equal(soldIn('none', '2026-11-01T00:00:00.000Z', '2026-11-03T00:00:00.000Z'), 0);
});

test('expectedUse accepts sales per Clover item and ItemSure item', () => {
  const out = expectedUse({
    links: new Map([['shot', ['rum']]]),
    sold: (cloverId, itemId) => (cloverId === 'shot' && itemId === 'rum' ? 2 : 0),
    pours: new Map([['shot|rum', { amount: 1, unit: 'base' }]]),
    unitCodes: new Map([['rum', 'bottle']]),
    contents: new Map(),
  });
  assert.equal(out.get('rum').expected, 2);
});

test('shortQty rounds to two places', () => {
  assert.equal(shortQty(1.23456), '1.23');
  assert.equal(shortQty(null), '—');
});
