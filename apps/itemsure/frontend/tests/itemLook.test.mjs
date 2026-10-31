import test from 'node:test';
import assert from 'node:assert/strict';
import { cardTone, categoryHue, groupByStatus, itemInitials, listTone, topUpCanWait } from '../src/utils/itemsureItemLook.js';
import { categoryIcon, categoryTree, labelWithIcon } from '../src/utils/itemsureCategories.js';

test('topping up can wait while more than halfway from warn-at to par', () => {
  const lemons = (total, minimum = '10') => ({ total, par: '40', minimum, status: 'below_par' });
  assert.equal(topUpCanWait(lemons('39')), true);
  assert.equal(topUpCanWait(lemons('26')), true);
  assert.equal(topUpCanWait(lemons('25')), false);
  assert.equal(topUpCanWait(lemons('11')), false);
  assert.equal(topUpCanWait(lemons('21', null)), true);
  assert.equal(topUpCanWait(lemons('20', null)), false);
  assert.equal(topUpCanWait({ total: '5', par: '40', minimum: '10', status: 'low' }), false);
  assert.equal(topUpCanWait(null), false);
  assert.equal(listTone(lemons('30')), 'ok');
  assert.equal(listTone(lemons('20')), 'warn');
  assert.equal(listTone({ total: '5', par: '40', minimum: '10', status: 'low' }), 'danger');
});

test('items split into needs attention, all good, others, and archived, in order', () => {
  const tones = { a: 'danger', b: 'ok', c: 'warn', d: 'none', e: 'muted', f: 'ok' };
  const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, is_active: id !== 'f' }));
  const groups = groupByStatus(items, (item) => tones[item.id]);
  assert.deepEqual(groups.map((g) => [g.key, g.items.map((i) => i.id)]), [
    ['attention', ['a', 'c']],
    ['good', ['b']],
    ['other', ['d', 'e']],
    ['archived', ['f']],
  ]);
  assert.deepEqual(groupByStatus([{ id: 'x', is_active: true }], () => 'ok').map((g) => g.key), ['good']);
  assert.deepEqual(groupByStatus([], () => 'ok'), []);
});

test('a subcategory without an icon uses its main category icon', () => {
  const tree = categoryTree([
    { id: 'liq', name: 'Liquor', icon: '\u{1F943}', parent_category_id: null },
    { id: 'rum', name: 'Rum', icon: '', parent_category_id: 'liq' },
    { id: 'gin', name: 'Gin', icon: '\u{1F378}', parent_category_id: 'liq' },
    { id: 'soda', name: 'Soda', icon: '', parent_category_id: null },
  ]);
  assert.equal(categoryIcon(tree, 'rum'), '\u{1F943}');
  assert.equal(categoryIcon(tree, 'gin'), '\u{1F378}');
  assert.equal(categoryIcon(tree, 'soda'), '');
  assert.equal(categoryIcon(tree, null), '');
  assert.equal(labelWithIcon(tree.byId.get('liq')), '\u{1F943} Liquor');
  assert.equal(labelWithIcon(tree.byId.get('soda')), 'Soda');
});

test('initials use the first and last word, or two letters of one word', () => {
  assert.equal(itemInitials('Well Rum'), 'WR');
  assert.equal(itemInitials('Captain Morgan Spiced Rum'), 'CR');
  assert.equal(itemInitials('vodka'), 'VO');
  assert.equal(itemInitials('  '), '?');
});

test('each category keeps the same hue; no category has none', () => {
  const a = categoryHue('5d1c-rum');
  assert.equal(categoryHue('5d1c-rum'), a);
  assert.ok(a >= 0 && a < 360);
  assert.equal(categoryHue(null), null);
});

test('card tone follows the stock status', () => {
  assert.equal(cardTone({ status: 'low' }), 'danger');
  assert.equal(cardTone({ status: 'below_par' }), 'warn');
  assert.equal(cardTone({ status: 'at_target' }), 'ok');
  assert.equal(cardTone({ status: null }), 'none');
  assert.equal(cardTone(null), 'none');
});
