import test from 'node:test';
import assert from 'node:assert/strict';
import { locationCounts, locationRows, matchesFilter, otherItemCount, spotSections } from '../src/utils/itemsureLocationStock.js';

const location = { id: 'L', name: 'Legends', storageAreas: [{ id: 'bar', name: 'Bar' }, { id: 'walk', name: 'Walk-in' }] };
const items = [
  { id: 'rum', name: 'Rum', isActive: true },
  { id: 'gin', name: 'Gin', isActive: true },
  { id: 'lime', name: 'Lime', isActive: true },
  { id: 'salt', name: 'Salt', isActive: true },
];
const sources = {
  places: [
    { item_id: 'rum', location_id: 'L', storage_area_id: 'bar' },
    { item_id: 'lime', location_id: 'L', storage_area_id: null },
  ],
  balances: [
    { item_id: 'rum', location_id: 'L', storage_area_id: 'bar', quantity_text: '1' },
    { item_id: 'gin', location_id: 'L', storage_area_id: 'walk', quantity_text: '8' },
    { item_id: 'gin', location_id: 'OTHER', storage_area_id: null, quantity_text: '5' },
  ],
  targets: [
    { item_id: 'rum', location_id: 'L', storage_area_id: 'bar', minimum_text: '2', par_text: '6' },
    { item_id: 'gin', location_id: 'L', storage_area_id: 'walk', minimum_text: '2', par_text: '10' },
  ],
};

test('locationRows lists items used here, most urgent first, and leaves the rest out', () => {
  const rows = locationRows(items, sources, location);
  assert.deepEqual(rows.map((r) => r.item.id), ['rum', 'gin', 'lime']);
  assert.equal(rows[1].summary.total, '8');
  assert.equal(otherItemCount(items, rows), 1);
});

test('locationRows leaves out a spot that was emptied and has nothing set', () => {
  const moved = {
    places: [{ item_id: 'salt', location_id: 'L', storage_area_id: 'walk' }],
    balances: [
      { item_id: 'salt', location_id: 'L', storage_area_id: 'bar', quantity_text: '0' },
      { item_id: 'salt', location_id: 'L', storage_area_id: 'walk', quantity_text: '4' },
    ],
    targets: [],
  };
  const [row] = locationRows([items[3]], moved, location);
  assert.deepEqual(row.slots.map((s) => s.areaName), ['Walk-in']);
  assert.equal(row.summary.total, '4');
});

test('locationRows shows every active item when asked or when places could not load', () => {
  assert.equal(locationRows(items, sources, location, { showAll: true }).length, 4);
  assert.equal(locationRows(items, { ...sources, places: null }, location).length, 4);
});

test('locationCounts and matchesFilter agree', () => {
  const rows = locationRows(items, sources, location);
  assert.deepEqual(locationCounts(rows), { all: 3, low: 1, below_par: 1, unset: 1 });
  assert.deepEqual(rows.filter((r) => matchesFilter(r, 'unset')).map((r) => r.item.id), ['lime']);
  assert.deepEqual(rows.filter((r) => matchesFilter(r, 'low')).map((r) => r.item.id), ['rum']);
});

test('spotSections groups by spot in location order with Loose last', () => {
  const sections = spotSections(locationRows(items, sources, location), location);
  assert.deepEqual(sections.map((s) => [s.name, s.entries.map((e) => e.item.id)]), [
    ['Bar', ['rum']],
    ['Walk-in', ['gin']],
    ['Loose (no specific spot)', ['lime']],
  ]);
});
