import test from 'node:test';
import assert from 'node:assert/strict';
import { cardTone, categoryHue, itemInitials } from '../src/utils/itemsureItemLook.js';

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
