import test from 'node:test';
import assert from 'node:assert/strict';
import { groupByMainMatch, posPrice, posRows, suggestMatch } from '../src/utils/itemsurePosMatch.js';

const items = [
  { id: 'rum', name: 'Superior', brand: 'Bacardi' },
  { id: 'lime', name: 'Lime', brand: '' },
  { id: 'coke', name: 'Coke', brand: '' },
  { id: 'diet', name: 'Diet Coke', brand: '' },
];

test('suggestMatch needs every word of the ItemSure name and picks the closest fit', () => {
  assert.equal(suggestMatch('Bacardi Superior Rum Shot', items)?.id, 'rum');
  assert.equal(suggestMatch('Diet Coke 12oz', items)?.id, 'diet');
  assert.equal(suggestMatch('Coke', items)?.id, 'coke');
  assert.equal(suggestMatch('Pool table time', items), null);
  assert.equal(suggestMatch('', items), null);
});

test('suggestMatch leaves ties for a person', () => {
  assert.equal(suggestMatch('Lime Coke', items), null);
});

test('posRows filters by matched state and search, hiding removed items unless matched', () => {
  const pos = [
    { external_id: 'a', name: 'Mojito', category_name: 'Cocktails', sku: '' },
    { external_id: 'b', name: 'Rum shot', category_name: 'Shots', sku: '' },
    { external_id: 'c', name: 'Old special', category_name: '', sku: '', is_deleted: true },
    { external_id: 'd', name: 'Gone but matched', category_name: '', sku: '', is_deleted: true },
  ];
  const links = new Map([['b', ['rum']], ['d', ['lime']]]);
  const ids = (rows) => rows.map((r) => r.external_id);
  assert.deepEqual(ids(posRows(pos, links)), ['a']);
  assert.deepEqual(ids(posRows(pos, links, { filter: 'done' })), ['b', 'd']);
  assert.deepEqual(ids(posRows(pos, links, { filter: 'all', search: 'shot' })), ['b']);
  assert.deepEqual(ids(posRows(pos, links, { filter: 'all', search: 'cocktail' })), ['a']);
  assert.deepEqual(ids(posRows(pos, links, { keep: new Set(['b']) })), ['a', 'b']);
});

test('groupByMainMatch groups by the first matched item, A to Z, unknown last', () => {
  const pos = [{ external_id: 'shot' }, { external_id: 'mojito' }, { external_id: 'coke' }, { external_id: 'odd' }];
  const links = new Map([['shot', ['rum']], ['mojito', ['rum', 'lime']], ['coke', ['coke']], ['odd', ['gone']]]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const groups = groupByMainMatch(pos, links, byId);
  assert.deepEqual(groups.map((g) => [g.label, g.rows.map((r) => r.external_id)]), [
    ['Coke', ['coke']],
    ['Superior', ['shot', 'mojito']],
    ['Other items', ['odd']],
  ]);
});

test('posPrice shows Clover prices plainly', () => {
  assert.equal(posPrice({ price_cents: 900, price_type: 'FIXED' }), '$9.00');
  assert.equal(posPrice({ price_cents: 250, price_type: 'PER_UNIT' }), '$2.50 / unit');
  assert.equal(posPrice({ price_cents: 0, price_type: 'VARIABLE' }), 'Price varies');
  assert.equal(posPrice({ price_cents: null, price_type: '' }), '');
});
