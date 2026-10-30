import test from 'node:test';
import assert from 'node:assert/strict';
import { archivedName, findNameClash, itemNameKey } from '../src/utils/itemsureItemNames.js';

const items = [
  { id: '1', name: 'Well Rum', is_active: true },
  { id: '2', name: 'Lime', is_active: false },
  { id: '3', name: 'Lime (archived 1)', is_active: false },
];

test('names compare ignoring case and extra spaces', () => {
  assert.equal(itemNameKey('  Well   RUM '), 'well rum');
});

test('finds an active or archived item with the same name', () => {
  assert.deepEqual(findNameClash(items, 'well  rum'), { item: items[0], archived: false });
  assert.equal(findNameClash(items, 'LIME').archived, true);
  assert.equal(findNameClash(items, 'Lemon'), null);
  assert.equal(findNameClash(items, '   '), null);
});

test('an item keeping its own name is never a clash', () => {
  assert.equal(findNameClash(items, 'Well rum', { itemId: '1', originalName: 'Well Rum' }), null);
  assert.equal(findNameClash([...items, { id: '9', name: 'well rum', is_active: true }], 'Well Rum', { itemId: '9', originalName: 'well rum' }), null);
  assert.equal(findNameClash(items, 'Lime', { itemId: '1', originalName: 'Well Rum' }).item.id, '2');
});

test('the archived name uses the lowest free number', () => {
  assert.equal(archivedName(items, items[1]), 'Lime (archived 2)');
  assert.equal(archivedName(items, items[0]), 'Well Rum (archived 1)');
  assert.equal(archivedName(items, items[2]), 'Lime (archived 1)');
});
