import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blankRow, fromEditorRows, gearFormError, pretaxGearPrices, toEditorRows, toTaxIncludedEditor,
} from './consignmentGearForm.js';

test('tax-included products show totals and save before-tax prices', () => {
  const shown = toTaxIncludedEditor({ name: 'X', price: '277.14' }, [row([], { price: '' }), row([], { price: '92.38' })], 0.0825);
  assert.equal(shown.form.price, '300');
  assert.equal(shown.rows[0].price, '');
  assert.equal(shown.rows[1].price, '100');
  const saved = pretaxGearPrices(300, [{ price: null }, { price: 100 }], 0.0825);
  assert.equal(saved.price, 277.14);
  assert.deepEqual(saved.variants, [{ price: null }, { price: 92.38 }]);
});

const form = { name: 'Sneaky Pete', price: '199' };
const row = (values, extra = {}) => ({ ...blankRow(values.length), values, ...extra });

test('round trip keeps option values and overrides', () => {
  const product = {
    option_names: ['Weight'],
    variants: [{ id: 'v1', options: { Weight: '19 oz' }, sku: 'SP19', price: 210, stock: 2, active: true }],
  };
  const rows = toEditorRows(product);
  assert.deepEqual(rows[0].values, ['19 oz']);
  assert.deepEqual(fromEditorRows(['Weight'], rows), [
    { id: 'v1', options: { Weight: '19 oz' }, sku: 'SP19', price: 210, stock: 2, active: true },
  ]);
});

test('new product starts with one blank row', () => {
  assert.equal(toEditorRows({ option_names: [], variants: [] }).length, 1);
});

test('valid forms pass', () => {
  assert.equal(gearFormError(form, [], [row([])]), null);
  assert.equal(gearFormError(form, ['Weight'], [row(['19 oz']), row(['20 oz'], { price: '205', stock: '3' })]), null);
});

test('catches the common mistakes', () => {
  assert.match(gearFormError({ ...form, name: '' }, [], [row([])]), /name/);
  assert.match(gearFormError({ ...form, price: '0' }, [], [row([])]), /price/);
  assert.match(gearFormError(form, [''], [row([''])]), /Name every option/);
  assert.match(gearFormError(form, ['Tip', 'tip'], [row(['a', 'b'])]), /different name/);
  assert.match(gearFormError(form, [], [row([]), row([])]), /one row/);
  assert.match(gearFormError(form, ['Weight'], [row([''])]), /fill in every option/);
  assert.match(gearFormError(form, ['Weight'], [row(['19 oz']), row(['19 OZ'])]), /repeats/);
  assert.match(gearFormError(form, ['Weight'], [row(['19 oz'], { stock: '1.5' })]), /whole number/);
});
