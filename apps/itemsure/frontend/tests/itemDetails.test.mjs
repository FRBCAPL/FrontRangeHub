import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultVariantLabel, detailsLine, knownBrands, matchBrand, variantLabelFor } from '../src/utils/itemsureItemDetails.js';

test('the second detail follows the industry until the business names it', () => {
  assert.equal(defaultVariantLabel('hospitality'), 'Style');
  assert.equal(defaultVariantLabel('warehouse'), 'Part number');
  assert.equal(defaultVariantLabel('unknown'), 'Model');
  assert.equal(variantLabelFor({ industryType: 'retail' }), 'Model');
  assert.equal(variantLabelFor({ industryType: 'retail', variantLabel: '  Color ' }), 'Color');
  assert.equal(variantLabelFor(null), 'Model');
});

test('detailsLine joins whatever is filled in', () => {
  assert.equal(detailsLine({ brand: 'Bacardi', variant: 'Spiced' }), 'Bacardi \u00b7 Spiced');
  assert.equal(detailsLine({ brand: 'Bacardi', variant: '' }), 'Bacardi');
  assert.equal(detailsLine({ brand: ' ', variant: 'Spiced' }), 'Spiced');
  assert.equal(detailsLine({}), '');
});

test('known brands keep the first spelling and sort A to Z', () => {
  const items = [{ brand: 'bacardi' }, { brand: 'Absolut' }, { brand: 'BACARDI' }, { brand: '' }, {}];
  assert.deepEqual(knownBrands(items), ['Absolut', 'bacardi']);
});

test('a typed brand snaps to the existing spelling', () => {
  const brands = ['Bacardi', 'Captain Morgan'];
  assert.equal(matchBrand(brands, 'bacardi '), 'Bacardi');
  assert.equal(matchBrand(brands, 'captain   morgan'), 'Captain Morgan');
  assert.equal(matchBrand(brands, ' New  Brand '), 'New Brand');
  assert.equal(matchBrand(brands, ''), '');
});
