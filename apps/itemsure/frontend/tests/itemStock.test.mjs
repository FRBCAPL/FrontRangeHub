import test from 'node:test';
import assert from 'node:assert/strict';
import { addQuantity, isEmptySlot, itemSlots, itemSummary, visibleSlots, whereLabels, worstStatus } from '../src/utils/itemsureItemStock.js';

const locations = [
  { id: 'n', name: 'North', storageAreas: [{ id: 'bar', name: 'Bar' }, { id: 'cellar', name: 'Cellar' }] },
  { id: 's', name: 'South', storageAreas: [] },
];

test('adds decimal text exactly', () => {
  assert.equal(addQuantity('0.1', '0.2'), '0.3');
  assert.equal(addQuantity(null, '12'), '12');
  assert.equal(addQuantity('2.50', '7.5'), '10');
  assert.equal(addQuantity('999999999999.999999', '0.000001'), '1000000000000');
});

test('worst status puts low first, then below par', () => {
  assert.equal(worstStatus(['at_target', 'below_par', null]), 'below_par');
  assert.equal(worstStatus(['above_target', 'low', 'below_par']), 'low');
  assert.equal(worstStatus([null]), null);
});

test('slots combine kept-at places, stock, and levels, in location order', () => {
  const groups = itemSlots('rice', {
    locations,
    places: [{ item_id: 'rice', location_id: 's', storage_area_id: null }, { item_id: 'other', location_id: 'n', storage_area_id: null }],
    balances: [{ item_id: 'rice', location_id: 'n', storage_area_id: 'cellar', quantity_text: '4.50' }],
    targets: [{ item_id: 'rice', location_id: 'n', storage_area_id: 'cellar', minimum_text: '5', par_text: '10' }],
  });
  assert.deepEqual(groups.map((g) => g.location.id), ['n', 's']);
  const cellar = groups[0].slots[0];
  assert.equal(cellar.areaName, 'Cellar');
  assert.equal(cellar.quantity, '4.5');
  assert.equal(cellar.status, 'low');
  assert.deepEqual(groups[1].slots.map((s) => [s.storageAreaId, s.quantity, s.status]), [[null, null, null]]);
  assert.equal(cellar.kept, false, 'stock and levels alone do not make it a kept-at place');
  assert.equal(groups[1].slots[0].kept, true);
});

test('empty places with nothing set disappear; stock, levels, or an old choice keep them', () => {
  const groups = visibleSlots('rice', {
    locations,
    places: [{ item_id: 'rice', location_id: 's', storage_area_id: null }],
    balances: [
      { item_id: 'rice', location_id: 'n', storage_area_id: null, quantity_text: '0.00' },
      { item_id: 'rice', location_id: 'n', storage_area_id: 'bar', quantity_text: '2' },
      { item_id: 'rice', location_id: 'n', storage_area_id: 'cellar', quantity_text: '0' },
    ],
    targets: [{ item_id: 'rice', location_id: 'n', storage_area_id: 'cellar', minimum_text: '1', par_text: null }],
  });
  assert.deepEqual(groups.map((g) => [g.location.id, g.slots.map((s) => s.storageAreaId)]), [['n', ['bar', 'cellar']], ['s', [null]]]);
  assert.equal(isEmptySlot(groups[0].slots[1]), true);
  assert.equal(isEmptySlot(groups[0].slots[0]), false);
  assert.deepEqual(whereLabels(groups), ['North (Bar, Cellar)', 'South']);
});

test('where labels call the no-spot place "Loose" next to spots', () => {
  const groups = visibleSlots('rice', {
    locations,
    balances: [
      { item_id: 'rice', location_id: 'n', storage_area_id: null, quantity_text: '5' },
      { item_id: 'rice', location_id: 'n', storage_area_id: 'bar', quantity_text: '2' },
    ],
  });
  assert.deepEqual(whereLabels(groups), ['North (Bar, Loose)']);
});

test('places at locations the person cannot see are left out', () => {
  const groups = itemSlots('rice', { locations, places: [{ item_id: 'rice', location_id: 'hidden', storage_area_id: null }] });
  assert.deepEqual(groups, []);
});

test('summary totals every visible slot and reports the worst status', () => {
  const summary = itemSummary('rice', {
    locations,
    balances: [
      { item_id: 'rice', location_id: 'n', storage_area_id: 'bar', quantity_text: '3' },
      { item_id: 'rice', location_id: 's', storage_area_id: null, quantity_text: '0.5' },
    ],
    targets: [{ item_id: 'rice', location_id: 's', storage_area_id: null, minimum_text: null, par_text: '2' }],
  });
  assert.deepEqual(summary, { total: '3.5', status: 'below_par' });
  assert.deepEqual(itemSummary('rice', { locations }), { total: null, status: null });
});
