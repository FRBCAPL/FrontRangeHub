import test from 'node:test';
import assert from 'node:assert/strict';
import { asksContent, checkContent, contentForm, contentLabel } from '../src/utils/itemsureItemContent.js';
import { pluralUnit, singularUnit } from '../src/utils/itemsureItemLook.js';

test('checkContent turns a typed size into ml', () => {
  assert.deepEqual(checkContent('750', 'ml'), { ml: 750 });
  assert.deepEqual(checkContent('1.75', 'l'), { ml: 1750 });
  assert.deepEqual(checkContent('25.4', 'fl_oz'), { ml: 751.167 });
  assert.deepEqual(checkContent('  ', 'ml'), { ml: null });
  assert.ok(checkContent('0', 'ml').error);
  assert.ok(checkContent('abc', 'ml').error);
  assert.ok(checkContent('2000', 'l').error);
});

test('contentForm and contentLabel show sizes the way people say them', () => {
  assert.deepEqual(contentForm(750), { content_size: '750', content_unit: 'ml' });
  assert.deepEqual(contentForm(1000), { content_size: '1', content_unit: 'l' });
  assert.deepEqual(contentForm(null), { content_size: '', content_unit: 'ml' });
  assert.equal(contentLabel(1000), '1 liter');
  assert.equal(contentLabel(1750), '1.75 liters');
  assert.equal(contentLabel(58673.855), 'Half barrel (15.5 gal)');
  assert.deepEqual(contentForm(58673.855), { content_size: '15.5', content_unit: 'gal' });
  assert.equal(contentLabel(800), '800 ml');
  assert.equal(contentLabel(null), '');
});

test('a saved size comes back in the unit it was typed in', () => {
  const back = (text, unit) => contentForm(checkContent(text, unit).ml);
  assert.deepEqual(back('24', 'fl_oz'), { content_size: '24', content_unit: 'fl_oz' });
  assert.deepEqual(back('19.5', 'fl_oz'), { content_size: '19.5', content_unit: 'fl_oz' });
  assert.deepEqual(back('5', 'gal'), { content_size: '5', content_unit: 'gal' });
  assert.deepEqual(back('500', 'ml'), { content_size: '500', content_unit: 'ml' });
  assert.deepEqual(back('2', 'l'), { content_size: '2', content_unit: 'l' });
  assert.equal(contentLabel(checkContent('24', 'fl_oz').ml), '24 oz');
  assert.equal(contentLabel(checkContent('5', 'gal').ml), '5 gal');
});

test('unit names read right in "one keg holds"', () => {
  assert.equal(singularUnit('Kegs'), 'Keg');
  assert.equal(singularUnit('Boxes'), 'Box');
  assert.equal(singularUnit('Bottles'), 'Bottle');
  assert.equal(singularUnit('Batteries'), 'Battery');
  assert.equal(singularUnit('Each'), 'Each');
  assert.equal(singularUnit('Glass'), 'Glass');
  assert.equal(pluralUnit(singularUnit('Kegs')), 'Kegs');
});

test('asksContent skips items already counted in a volume', () => {
  assert.equal(asksContent('bottle'), true);
  assert.equal(asksContent('keg'), true);
  assert.equal(asksContent('liter'), false);
});
