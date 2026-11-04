import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestAmount } from '../src/utils/itemsurePourSuggest.js';
import { presetForMl, presetsFor } from '../src/utils/itemsureSizePresets.js';

const keg = { code: 'keg', name: 'Keg' };
const bottle = { code: 'bottle', name: 'Bottle' };
const each = { code: 'each', name: 'Each' };

test('a size in the name wins', () => {
  assert.deepEqual(suggestAmount({ name: '1554 16oz', category_name: 'Draft Beer' }, keg), { amount: 16, unit: 'fl_oz', reason: 'From the name' });
  assert.equal(suggestAmount({ name: '1554 26 oz Draft' }, keg).amount, 26);
  assert.deepEqual(suggestAmount({ name: 'House Red 150ml' }, bottle).unit, 'ml');
});

test('house words come next, longest first', () => {
  assert.equal(suggestAmount({ name: '1554 Pitcher', category_name: 'Draft Beer' }, keg).amount, 60);
  assert.equal(suggestAmount({ name: 'Jameson Double Shot' }, bottle).amount, 3);
  assert.equal(suggestAmount({ name: '$4 Any Pint Special' }, keg).amount, 16);
  assert.equal(suggestAmount({ name: '1554 Pitcher' }, keg, [{ keyword: 'pitcher', amount: 48, unit: 'fl_oz' }]).amount, 48);
});

test('bottles, cans, food and retail sell whole, but never from a keg', () => {
  assert.deepEqual(suggestAmount({ name: 'Angry Orchard Bottle', category_name: 'Bottle Beer' }, bottle), { amount: 1, unit: 'base', reason: 'Sold whole' });
  assert.equal(suggestAmount({ name: '1/2 Wings', category_name: 'Food' }, each).unit, 'base');
  assert.equal(suggestAmount({ name: 'Big Legends Stickers' }, each).amount, 1);
  assert.equal(suggestAmount({ name: 'Bud Light', category_name: 'Bottle Beer' }, keg), null);
});

test('liquor categories mean a shot; draft uses a pint; anything else is left for people', () => {
  assert.deepEqual(suggestAmount({ name: 'Bacardi', category_name: 'Rum' }, bottle), { amount: 1.5, unit: 'fl_oz', reason: 'Liquor: a shot' });
  assert.deepEqual(suggestAmount({ name: '1554', category_name: 'Draft Beer' }, keg), { amount: 16, unit: 'fl_oz', reason: 'Draft: a pint' });
  assert.equal(suggestAmount({ name: 'Whiskey Barrel Stout', category_name: 'Draft Beer' }, keg).amount, 16);
  assert.equal(suggestAmount({ name: 'Alabama Slammer', category_name: 'Cocktails' }, bottle), null);
  assert.equal(suggestAmount({ name: 'House Merlot', category_name: 'Wine' }, bottle).amount, 6);
});

test('no guess when one sale is a small part of a bulk unit', () => {
  const caseUnit = { code: 'case', name: 'Case' };
  const bags = { code: 'bag', name: 'Bags' };
  assert.equal(suggestAmount({ name: 'Corona Bottle', category_name: 'Bottle Beer' }, caseUnit), null);
  assert.equal(suggestAmount({ name: 'Coors Banquet 16oz Alum Can' }, caseUnit), null);
  assert.equal(suggestAmount({ name: 'Boneless Wings', category_name: 'Food' }, bags), null);
  assert.equal(suggestAmount({ name: 'Coors Banquet 16oz Alum Can' }, { code: 'can', name: 'Can' }).unit, 'base');
});

test('a drink that uses several items only guesses the liquor', () => {
  const pos = { name: '$4 Mimosa', category_name: 'Cocktails' };
  assert.equal(suggestAmount(pos, bottle, undefined, { shared: true, itemName: 'Well Rum' }).amount, 1.5);
  assert.equal(suggestAmount(pos, each, undefined, { shared: true, itemName: 'Limes' }), null);
});

test('size presets fit the unit and are recognised from ml', () => {
  assert.equal(presetsFor(keg)[0].key, 'half-barrel');
  assert.equal(presetsFor(bottle)[0].key, '750ml');
  assert.equal(presetForMl(58673.855).key, 'half-barrel');
  assert.equal(presetForMl(750).label, '750 ml');
  assert.equal(presetForMl(800), null);
});
