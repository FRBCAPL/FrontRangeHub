import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTakeResults, moveSpot, orderedSpots, shortByItem, takeWindows } from '../src/utils/itemsurePosStock.js';

const HOUR = 3600 * 1000;
const at = (iso) => Date.parse(iso);

test('takeWindows covers finished hours only', () => {
  const now = at('2026-11-03T15:40:00Z');
  assert.deepEqual(takeWindows('2026-11-03T12:00:00Z', now), [['2026-11-03T12:00:00.000Z', '2026-11-03T15:00:00.000Z']]);
  assert.deepEqual(takeWindows('2026-11-03T15:00:00Z', now), []);
  assert.deepEqual(takeWindows('2026-11-03T16:00:00Z', now), []);
  assert.deepEqual(takeWindows(null, now), []);
});

test('takeWindows splits long gaps into 44-day pieces', () => {
  const from = '2026-08-01T00:00:00Z';
  const now = at(from) + 100 * 24 * HOUR + 30 * 60 * 1000;
  const windows = takeWindows(from, now);
  assert.equal(windows.length, 3);
  assert.equal(windows[0][0], '2026-08-01T00:00:00.000Z');
  assert.equal(windows[1][0], windows[0][1]);
  assert.equal(windows[2][1], new Date(at(from) + 100 * 24 * HOUR).toISOString());
});

test('mergeTakeResults adds up and lists missing setups once', () => {
  const miss = { external_id: 'c1', item_id: 'i1', pos_name: 'Beer', item_name: 'Beer keg' };
  const merged = mergeTakeResults([
    { taken: 2, counted: 1, not_set_up: 1, short: [{ item_id: 'a', short: 1 }], missing: [miss], to: 't1' },
    { nothing: true },
    { taken: 3, counted: 0, not_set_up: 2, short: [], missing: [miss], to: 't2' },
  ]);
  assert.deepEqual({ ...merged, short: merged.short.length }, { taken: 5, counted: 1, notSetUp: 3, short: 1, missing: [miss], to: 't2', addOns: false });
});

test('mergeTakeResults says add-ons were included when any window counted them', () => {
  assert.equal(mergeTakeResults([{ taken: 1, add_ons: false }, { taken: 1, add_ons: true }]).addOns, true);
  assert.equal(mergeTakeResults([{ taken: 1 }, { nothing: true, add_ons: true }]).addOns, false);
});

test('shortByItem totals per item, biggest first', () => {
  const rows = shortByItem([
    { item_id: 'a', item_name: 'Limes', unit: 'ea', short: 2 },
    { item_id: 'b', item_name: 'Rum', unit: 'btl', short: 5 },
    { item_id: 'a', item_name: 'Limes', unit: 'ea', short: 4 },
  ]);
  assert.deepEqual(rows.map((r) => [r.name, r.short]), [['Limes', 6], ['Rum', 5]]);
});

test('orderedSpots puts the saved order first, then the rest by name', () => {
  const areas = [
    { id: 'c', name: 'Cooler' },
    { id: 'z', name: 'Zbar' },
    { id: 'b', name: 'Back room' },
    { id: 'x', name: 'Old shelf', is_active: false },
  ];
  assert.deepEqual(orderedSpots(areas, ['z']).map((a) => a.id), ['z', 'b', 'c']);
  assert.deepEqual(orderedSpots(areas, ['x', 'gone']).map((a) => a.id), ['x', 'b', 'c', 'z']);
});

test('moveSpot swaps neighbours and ignores moves off the ends', () => {
  assert.deepEqual(moveSpot(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(moveSpot(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
  const list = ['a', 'b'];
  assert.equal(moveSpot(list, 0, -1), list);
});
