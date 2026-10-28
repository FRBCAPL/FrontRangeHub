import test from 'node:test';
import assert from 'node:assert/strict';
import { placeChanges, placeKey, placeLabels } from '../src/utils/itemsurePlaces.js';

const locations = [
  { id: 'n', name: 'North', storageAreas: [{ id: 'bar', name: 'Bar' }, { id: 'cellar', name: 'Cellar' }] },
  { id: 's', name: 'South', storageAreas: [{ id: 'store', name: 'Store' }] },
];

test('labels follow the locations list and name the area when there is one', () => {
  const places = [
    { location_id: 's', storage_area_id: 'store' },
    { location_id: 'n', storage_area_id: 'cellar' },
    { location_id: 'n', storage_area_id: null },
  ];
  assert.deepEqual(placeLabels(places, locations), ['North', 'North \u00b7 Cellar', 'South \u00b7 Store']);
});

test('places at locations the person cannot see are left out of labels', () => {
  assert.deepEqual(placeLabels([{ location_id: 'hidden', storage_area_id: null }], locations), []);
});

test('changes remove unticked places and add newly ticked ones, leaving the rest alone', () => {
  const current = [
    { id: 'p1', location_id: 'n', storage_area_id: null },
    { id: 'p2', location_id: 'n', storage_area_id: 'bar' },
  ];
  const result = placeChanges(current, [placeKey('n', 'bar'), placeKey('s', 'store'), placeKey('s', null)]);
  assert.deepEqual(result.removeIds, ['p1']);
  assert.deepEqual(result.add, [
    { location_id: 's', storage_area_id: 'store' },
    { location_id: 's', storage_area_id: null },
  ]);
});

test('no changes when the choice matches what is saved', () => {
  const current = [{ id: 'p1', location_id: 'n', storage_area_id: null }];
  assert.deepEqual(placeChanges(current, [placeKey('n', '')]), { removeIds: [], add: [] });
});
