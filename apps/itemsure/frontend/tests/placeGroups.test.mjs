import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPlaceOptions } from '../src/utils/itemsurePlaceGroups.js';
import { slotOptions } from '../src/utils/itemsureStock.js';

const locations = [
  {
    id: 'leg',
    name: 'Legends',
    is_active: true,
    storageAreas: [
      { id: 'bar', name: 'Bar', is_active: true },
      { id: 'walk', name: 'Walk-in', is_active: true },
      { id: 'gone', name: 'Old shelf', is_active: false },
    ],
  },
  { id: 'van', name: 'Van', is_active: true, storageAreas: [] },
];

test('spots are grouped under their site, with "no specific spot" last', () => {
  const { loose, groups } = groupPlaceOptions(slotOptions(locations));
  assert.deepEqual(loose.map((o) => o.label), ['Van']);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, 'Legends');
  assert.deepEqual(groups[0].options.map((o) => o.short), ['Bar', 'Walk-in', 'Loose (no specific spot)']);
  assert.equal(groups[0].options[2].loose, true);
});

test('with spots turned off every site is a single plain option', () => {
  const { loose, groups } = groupPlaceOptions(slotOptions(locations, { spots: false }));
  assert.deepEqual(loose.map((o) => o.label), ['Legends', 'Van']);
  assert.deepEqual(groups, []);
});

test('options without a group stay plain', () => {
  const { loose, groups } = groupPlaceOptions([{ key: 'a', label: 'Bar' }]);
  assert.deepEqual(loose.map((o) => o.key), ['a']);
  assert.deepEqual(groups, []);
});
