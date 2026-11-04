import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PIECES, isGroupUnit, kindOf, starterFor } from '../src/utils/itemsureCategoryKind.js';
import { presetForMl, presetsFor } from '../src/utils/itemsureSizePresets.js';
import { expectedUse, needsContent, needsPieces, pourInBase } from '../src/utils/itemsurePosUsage.js';
import { categoryPieces, withCategoryDefaults } from '../src/utils/itemsureCategoryDefaults.js';
import { checkPieces, unitAsks } from '../src/utils/itemsureItemContent.js';

const caseUnit = { code: 'case', name: 'Case' };
const bottle = { code: 'bottle', name: 'Bottle' };
const keg = { code: 'keg', name: 'Keg' };

test('kindOf reads names', () => {
  assert.equal(kindOf('Beer Bottled', caseUnit), 'packaged');
  assert.equal(kindOf('Well Liquor', bottle), 'liquor');
  assert.equal(kindOf('House Wine', bottle), 'wine');
  assert.equal(kindOf('Draft Beer', keg), 'draft');
  assert.equal(kindOf('Anything', keg), 'draft');
  assert.equal(kindOf('Napkins', null), 'other');
});

test('isGroupUnit spots cases and packs', () => {
  assert.equal(isGroupUnit(caseUnit), true);
  assert.equal(isGroupUnit({ code: 'pk', name: '6 Pack' }), true);
  assert.equal(isGroupUnit(bottle), false);
  assert.equal(isGroupUnit(null), false);
});

test('the item form asks what fits "Counted as"', () => {
  assert.equal(unitAsks(bottle), 'size');
  assert.equal(unitAsks(keg), 'size');
  assert.equal(unitAsks({ code: 'can', name: 'Can' }), 'size');
  assert.equal(unitAsks({ code: 'liter_bottle', name: 'Liter bottle' }), 'size');
  assert.equal(unitAsks(caseUnit), 'pieces');
  assert.equal(unitAsks({ code: 'case_24', name: 'Case (24 cans)' }), 'pieces');
  assert.equal(unitAsks({ code: 'box', name: 'Box' }), 'pieces');
  assert.equal(unitAsks({ code: 'each', name: 'Each' }), null);
  assert.equal(unitAsks({ code: 'pound', name: 'Pound' }), null);
  assert.equal(unitAsks({ code: 'liter', name: 'Liter' }), null);
  assert.equal(unitAsks({ code: 'package', name: 'Package' }), null);
  assert.equal(unitAsks(null), null);
});

test('checkPieces: blank is fine, otherwise a number above 0', () => {
  assert.deepEqual(checkPieces(''), { pieces: null });
  assert.deepEqual(checkPieces(' 500 '), { pieces: 500 });
  assert.ok(checkPieces('0').error);
  assert.ok(checkPieces('abc').error);
});

test('starterFor guesses by kind', () => {
  assert.deepEqual(
    { ...starterFor('Bottled Beer', caseUnit), reason: undefined },
    { amount: 1, unit: 'piece', contentMl: null, pieces: DEFAULT_PIECES, reason: undefined },
  );
  assert.equal(starterFor('Well Liquor', bottle).amount, 1.5);
  assert.equal(starterFor('Well Liquor', bottle).contentMl, 750);
  assert.equal(starterFor('House Wine', bottle).amount, 6);
  assert.equal(starterFor('Draft', keg).amount, 16);
  assert.equal(starterFor('Bottled Beer', bottle).unit, 'base');
  assert.equal(starterFor('Paper', caseUnit), null);
});

test('size buttons fit the kind; old saved sizes still match', () => {
  assert.equal(presetsFor(bottle, 'Bottled Beer')[0].label, '12 oz');
  assert.equal(presetsFor(bottle, 'Vodka')[0].label, '750 ml');
  assert.ok(presetsFor(bottle, 'Wine').some((p) => p.label === '3 liters'));
  assert.equal(presetsFor(keg, '')[0].key, 'half-barrel');
  assert.equal(presetsFor(bottle, '').length, 6);
  assert.equal(presetForMl(750).key, '750ml');
  assert.equal(presetForMl(12 * 29.5735).key, '12oz');
});

test('singles from a case: 1 of 24 is 1/24 of a case', () => {
  const single = { amount: 1, unit: 'piece' };
  assert.equal(needsPieces(single), true);
  assert.equal(needsContent(single, 'case'), false);
  assert.equal(pourInBase(single, 'case', null, 24), 1 / 24);
  assert.equal(pourInBase(single, 'case', null, null), null);
  const use = expectedUse({
    links: new Map([['c1', ['bud']]]),
    sold: new Map([['c1', 48]]),
    pours: new Map([['c1|bud', single]]),
    unitCodes: new Map([['bud', 'case']]),
    contents: new Map(),
    pieces: new Map([['bud', 24]]),
  });
  assert.equal(use.get('bud').expected, 2);
  const missing = expectedUse({
    links: new Map([['c1', ['bud']]]), sold: new Map([['c1', 3]]), pours: new Map([['c1|bud', single]]),
    unitCodes: new Map([['bud', 'case']]), contents: new Map(), pieces: new Map(),
  });
  assert.equal(missing.get('bud').missingContent, true);
});

test('case counts follow the category unless the item has its own', () => {
  const categories = [
    { id: 'beer', name: 'Beer', parent_category_id: null },
    { id: 'btl', name: 'Bottled', parent_category_id: 'beer' },
  ];
  const defaults = new Map([['beer', { contentMl: null, amount: null, unit: null, pieces: 30 }], ['btl', { contentMl: null, amount: 1, unit: 'piece', pieces: 24 }]]);
  const items = [{ id: 'bud', category_id: 'btl' }, { id: 'cor', category_id: 'btl' }, { id: 'pbr', category_id: 'beer' }];
  assert.deepEqual(categoryPieces(items[0], new Map(categories.map((c) => [c.id, c])), defaults), { pieces: 24, fromCategory: 'Bottled' });
  const out = withCategoryDefaults({
    links: new Map([['c1', ['bud', 'cor']]]), pours: new Map(), contents: new Map(), pieces: new Map([['cor', 12]]), items, categories, defaults,
  });
  assert.equal(out.pieces.get('bud'), 24);
  assert.equal(out.piecesFrom.get('bud'), 'Bottled');
  assert.equal(out.pieces.get('cor'), 12);
  assert.equal(out.piecesFrom.has('cor'), false);
  assert.equal(out.pieces.get('pbr'), 30);
  assert.equal(out.pours.get('c1|bud').unit, 'piece');
  const notReady = withCategoryDefaults({ links: new Map(), pours: new Map(), contents: new Map(), pieces: null, items, categories, defaults });
  assert.equal(notReady.pieces, null);
});
