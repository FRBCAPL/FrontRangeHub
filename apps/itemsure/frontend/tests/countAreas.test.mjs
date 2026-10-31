import test from 'node:test';
import assert from 'node:assert/strict';
import { countingAreas, NO_AREA, splitForSpot } from '../src/utils/itemsureCountAreas.js';
import { countsCoveringSpot, entriesBySpot, planSpotCounts, savedValue, startingSpots } from '../src/utils/itemsureQuickCount.js';

test('countsCoveringSpot finds open counts for a spot and whether it is counted there', () => {
  const sessions = [
    { id: 'whole', location_id: 'L1', scope: 'location' },
    { id: 'bar', location_id: 'L1', scope: 'storage_area', storage_area_id: 'bar' },
    { id: 'other', location_id: 'L2', scope: 'location' },
  ];
  const counted = { whole: { spots: new Set(['i1:bar']) }, bar: { spots: new Set() } };
  const found = (area) => countsCoveringSpot(sessions, counted, 'i1', 'L1', area).map((c) => `${c.session.id}:${c.counted}`);
  assert.deepEqual(found('bar'), ['whole:true', 'bar:false']);
  assert.deepEqual(found(null), ['whole:false']);
  assert.deepEqual(countsCoveringSpot(sessions, counted, 'i1', 'L3', null), []);
});

const spots = [
  { id: 'bar', name: 'Bar', is_active: true },
  { id: 'old', name: 'Old shelf', is_active: false },
  { id: 'back', name: 'Back room', is_active: true },
];

test('a one-spot count offers only that spot', () => {
  const areas = countingAreas({ scope: 'storage_area', storage_area_id: 'back' }, spots, {});
  assert.deepEqual(areas, [{ id: 'back', name: 'Back room' }]);
});

test('a location count offers active spots, used archived spots, and Loose', () => {
  assert.deepEqual(countingAreas({ scope: 'location' }, spots, []).map((a) => a.id), ['bar', 'back', NO_AREA]);
  const used = [{ storage_area_id: 'old' }];
  assert.deepEqual(countingAreas({ scope: 'location' }, spots, used).map((a) => a.id), ['bar', 'old', 'back', NO_AREA]);
});

test('splitForSpot lists items that belong in the spot first and hides the rest', () => {
  const items = [{ item_id: 'a' }, { item_id: 'b' }, { item_id: 'c' }];
  const ids = (s) => [s.here.map((i) => i.item_id), s.others.map((i) => i.item_id)];
  const inUse = new Set(['a|L1|bar', 'b|L1|', 'c|L2|bar']);
  assert.deepEqual(ids(splitForSpot(items, inUse, 'L1', 'bar')), [['a'], ['b', 'c']]);
  assert.deepEqual(ids(splitForSpot(items, inUse, 'L1', NO_AREA)), [['b'], ['a', 'c']]);
  // Already counted here: stays in the list.
  assert.deepEqual(ids(splitForSpot(items, inUse, 'L1', 'bar', new Set(['c']))), [['a', 'c'], ['b']]);
  // Nothing known for the spot, or nothing loaded: show everything.
  assert.deepEqual(ids(splitForSpot(items, inUse, 'L1', 'back')), [['a', 'b', 'c'], []]);
  assert.deepEqual(ids(splitForSpot(items, null, 'L1', 'bar')), [['a', 'b', 'c'], []]);
});

test('quick count opens every spot already counted or kept, else the first spot', () => {
  const areas = [{ id: 'bar' }, { id: 'back' }, { id: NO_AREA }];
  assert.deepEqual(startingSpots(areas, ['back'], ['bar', 'back']), ['back', 'bar']);
  assert.deepEqual(startingSpots(areas, [], ['', 'bar']), ['', 'bar']);
  assert.deepEqual(startingSpots(areas, ['gone'], ['elsewhere']), ['bar']);
  assert.deepEqual(startingSpots([], [], []), []);
});

const entry = (area, qty, unit = 'btl') => ({ id: `e-${area}`, item_id: 'i1', storage_area_id: area, quantity_text: qty, unit_id: unit, revision: 1 });

test('entriesBySpot keys this item by spot, with Loose as empty', () => {
  const map = entriesBySpot([entry('bar', '2'), entry(null, '1'), { ...entry('bar', '9'), item_id: 'other' }], 'i1');
  assert.deepEqual(Object.keys(map).sort(), ['', 'bar']);
  assert.equal(map.bar.quantity_text, '2');
});

test('savedValue only fills numbers in the item unit', () => {
  assert.equal(savedValue(entry('bar', '2.50'), 'btl'), '2.5');
  assert.equal(savedValue(entry('bar', '2', 'case'), 'btl'), '');
  assert.equal(savedValue(null, 'btl'), '');
});

test('planSpotCounts skips blanks and unchanged numbers, and flags bad ones', () => {
  const saved = { bar: entry('bar', '2'), back: entry('back', '3', 'case') };
  const opts = { unitId: 'btl', precision: 0, unitName: 'Bottles' };
  const { errors, changes } = planSpotCounts({ bar: '2', back: '3', '': '4', side: '', top: '1.5' }, saved, opts);
  assert.deepEqual(Object.keys(errors), ['top']);
  assert.deepEqual(changes.map((c) => [c.areaId, c.value, c.entry?.id ?? null]), [['back', '3', 'e-back'], ['', '4', null]]);
});
