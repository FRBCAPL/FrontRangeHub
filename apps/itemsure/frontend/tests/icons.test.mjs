import test from 'node:test';
import assert from 'node:assert/strict';
import { isLetterIcon, searchIcons, typedIcon } from '../src/utils/itemsureIcons.js';

const icons = (query, first) => searchIcons(query, first).map((r) => r.icon);

test('searchIcons finds icons by name and other words', () => {
  assert.deepEqual(icons(''), []);
  assert.equal(icons('pizza')[0], '🍕');
  assert.equal(icons('truck')[0], '🚚');
  assert.ok(icons('lemon').includes('🍋'));
  assert.ok(icons('citrus').includes('🍋'));
  assert.ok(icons('whiskey').includes('🥃'));
  assert.ok(icons('cleaning').includes('🧽'));
});

test('searchIcons handles plurals, partial words, and several words', () => {
  assert.ok(icons('boxes').includes('📦'));
  assert.ok(icons('lemons').includes('🍋'));
  assert.ok(icons('piz').includes('🍕'));
  assert.deepEqual(icons('red circle'), ['🔴']);
  assert.deepEqual(icons('zzzz'), []);
});

test('searchIcons puts starting choices first and has no duplicates', () => {
  const found = icons('beer', [{ icon: '🍺', name: 'Beer' }]);
  assert.equal(found[0], '🍺');
  assert.equal(new Set(found).size, found.length);
});

test('typedIcon keeps up to two letters', () => {
  assert.equal(typedIcon(''), '');
  assert.equal(typedIcon(' sysco'), 'SY');
  assert.equal(typedIcon('s c'), 'SC');
  assert.equal(typedIcon('7-Eleven'), '7');
  assert.equal(typedIcon('🛒'), '');
});

test('isLetterIcon tells letters from emoji', () => {
  assert.equal(isLetterIcon('SC'), true);
  assert.equal(isLetterIcon('🛒'), false);
  assert.equal(isLetterIcon(''), false);
});
