import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryOptions, categoryPath, categoryTree, extraCategoryNames, foundIn, inCategory, NO_CATEGORY, rootOf, searchCategories } from '../src/utils/itemsureCategories.js';

const categories = [
  { id: 'liq', name: 'Liquor', is_active: true, parent_category_id: null },
  { id: 'rum', name: 'Rum', is_active: true, parent_category_id: 'liq' },
  { id: 'vod', name: 'Vodka', is_active: true, parent_category_id: 'liq' },
  { id: 'beer', name: 'Beer', is_active: true, parent_category_id: null },
  { id: 'old', name: 'Old', is_active: false, parent_category_id: null },
  { id: 'orphan', name: 'Cider', is_active: true, parent_category_id: 'old' },
];
const tree = categoryTree(categories);

test('main categories and subcategories; a sub of an archived main becomes a main', () => {
  assert.deepEqual(tree.roots.map((c) => c.id), ['liq', 'beer', 'orphan']);
  assert.deepEqual(tree.childrenOf('liq').map((c) => c.id), ['rum', 'vod']);
  assert.equal(tree.parentOf('rum'), 'liq');
  assert.equal(tree.parentOf('orphan'), null);
});

test('paths and picker options read "Liquor › Rum"', () => {
  assert.equal(categoryPath(tree, 'rum'), 'Liquor \u203a Rum');
  assert.equal(categoryPath(tree, 'beer'), 'Beer');
  assert.equal(categoryPath(tree, 'old'), '');
  assert.deepEqual(categoryOptions(tree).map((o) => o.label), ['Liquor', 'Liquor \u203a Rum', 'Liquor \u203a Vodka', 'Beer', 'Cider']);
});

test('a main category includes its subcategories; a subcategory is just itself', () => {
  const wellRum = { category_id: 'rum' };
  const ale = { category_id: 'beer' };
  const loose = { category_id: null };
  const archived = { category_id: 'old' };
  assert.equal(inCategory(tree, wellRum, 'liq'), true);
  assert.equal(inCategory(tree, wellRum, 'rum'), true);
  assert.equal(inCategory(tree, wellRum, 'vod'), false);
  assert.equal(inCategory(tree, ale, 'liq'), false);
  assert.equal(inCategory(tree, wellRum, ''), true);
  assert.equal(inCategory(tree, loose, NO_CATEGORY), true);
  assert.equal(inCategory(tree, archived, NO_CATEGORY), true);
  assert.equal(inCategory(tree, wellRum, NO_CATEGORY), false);
});

test('category search keeps a matching main whole and narrows the rest', () => {
  const ids = (groups) => groups.map((g) => [g.root.id, g.children.map((c) => c.id)]);
  assert.deepEqual(ids(searchCategories(tree, '')), [['liq', ['rum', 'vod']], ['beer', []], ['orphan', []]]);
  assert.deepEqual(ids(searchCategories(tree, 'rum')), [['liq', ['rum']]]);
  assert.deepEqual(ids(searchCategories(tree, 'LIQ')), [['liq', ['rum', 'vod']]]);
  assert.deepEqual(ids(searchCategories(tree, 'zzz')), []);
});

test('extra categories help find an item; the main category alone decides "No category"', () => {
  const lime = { category_id: 'beer', extraCategoryIds: ['rum', 'old'] };
  assert.equal(foundIn(tree, lime, 'beer'), true);
  assert.equal(foundIn(tree, lime, 'rum'), true);
  assert.equal(foundIn(tree, lime, 'liq'), true);
  assert.equal(foundIn(tree, lime, 'vod'), false);
  assert.equal(foundIn(tree, lime, 'old'), false);
  assert.equal(foundIn(tree, lime, 'all'), true);
  assert.equal(foundIn(tree, { category_id: null, extraCategoryIds: ['rum'] }, NO_CATEGORY), true);
  assert.equal(foundIn(tree, { category_id: 'beer' }, 'rum'), false);
  assert.equal(inCategory(tree, lime, 'rum'), false);
  assert.deepEqual(extraCategoryNames(tree, lime), ['Liquor \u203a Rum']);
  assert.deepEqual(extraCategoryNames(tree, { category_id: 'rum', extraCategoryIds: ['rum'] }), []);
});

test('the open main category for a chosen chip', () => {
  assert.equal(rootOf(tree, 'rum'), 'liq');
  assert.equal(rootOf(tree, 'liq'), 'liq');
  assert.equal(rootOf(tree, 'all'), null);
  assert.equal(rootOf(tree, ''), null);
});
