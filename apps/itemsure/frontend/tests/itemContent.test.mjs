import test from 'node:test';
import assert from 'node:assert/strict';
import { asksContent, checkContent, contentForm, contentLabel } from '../src/utils/itemsureItemContent.js';

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
  assert.equal(contentLabel(1750), '1750 ml');
  assert.equal(contentLabel(null), '');
});

test('asksContent skips items already counted in a volume', () => {
  assert.equal(asksContent('bottle'), true);
  assert.equal(asksContent('keg'), true);
  assert.equal(asksContent('liter'), false);
});
