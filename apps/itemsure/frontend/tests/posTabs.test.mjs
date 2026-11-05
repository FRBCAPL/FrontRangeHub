import test from 'node:test';
import assert from 'node:assert/strict';
import { pickPosTab, posTabPath, POS_TABS } from '../src/utils/itemsurePosTabs.js';
import { doublesRows, doublesSummary, doublesValue } from '../src/utils/itemsurePosDoubles.js';

test('Point of sale tabs: links and picking a tab', () => {
  assert.deepEqual(POS_TABS.map((t) => t.key), ['left', 'buttons', 'pours', 'addons', 'stock', 'connection']);
  assert.equal(posTabPath('/itemsure', 'pours'), '/itemsure/settings/pos?tab=pours');
  assert.equal(posTabPath('/itemsure'), '/itemsure/settings/pos');
  assert.equal(pickPosTab('addons', ['left', 'addons']), 'addons');
  assert.equal(pickPosTab('stock', ['left', 'buttons']), 'left'); // not offered
  assert.equal(pickPosTab(null, ['left', 'buttons']), 'left');
});

const categories = [
  { id: 'liquor', name: 'Liquor', parent_category_id: null },
  { id: 'well', name: 'Well', parent_category_id: 'liquor' },
  { id: 'liqueur', name: 'Liqueurs', parent_category_id: 'liquor' },
  { id: 'mixers', name: 'Mixers', parent_category_id: null },
  { id: 'kitchen', name: 'Kitchen', parent_category_id: null },
];
const items = [
  { id: 'vodka', category_id: 'well', base_unit_id: 'u' },
  { id: 'sec', category_id: 'liqueur', base_unit_id: 'u' },
  { id: 'coke', category_id: 'mixers', base_unit_id: 'u' },
  { id: 'fryer', category_id: 'kitchen', base_unit_id: 'u' },
];
const matchedItemIds = new Set(['vodka', 'sec', 'coke']);
const rowsFor = (defaults) => doublesRows({ categories, items, matchedItemIds, defaults, units: [] });

test('Double checklist: categories with linked items, subcategories follow their main one', () => {
  const rows = rowsFor(new Map([['liquor', { doubles: true }], ['liqueur', { doubles: false }]]));
  const by = Object.fromEntries(rows.map((r) => [r.category.name, r]));
  assert.deepEqual(rows.map((r) => r.category.name), ['Liquor', 'Liqueurs', 'Well', 'Mixers']); // no Kitchen
  assert.equal(by.Liquor.on, true);
  assert.equal(by.Well.on, true); // follows Liquor
  assert.equal(by.Liqueurs.on, false); // opted out
  assert.equal(by.Mixers.on, false);
  assert.equal(doublesSummary(rows), 'Liquor');
  assert.equal(doublesSummary(rowsFor(new Map())), '');
  assert.equal(doublesSummary(rowsFor(new Map([['liqueur', { doubles: true }]]))), 'Liqueurs');
});

test('Double checklist saves only differences from the main category', () => {
  assert.equal(doublesValue(true, false), true);
  assert.equal(doublesValue(true, true), null);
  assert.equal(doublesValue(false, true), false);
  assert.equal(doublesValue(false, false), null);
});
