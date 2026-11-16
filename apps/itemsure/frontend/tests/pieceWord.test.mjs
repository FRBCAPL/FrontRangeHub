import test from 'node:test';
import assert from 'node:assert/strict';
import { pieceWord, pieceWordChoices, pieceWordFromLabel } from '../src/utils/itemsurePieceWord.js';

test('guesses what is inside a case from the name and category', () => {
  assert.equal(pieceWord('Budweiser Bottle Beer Bottles - Domestic').many, 'bottles');
  assert.equal(pieceWord('Coors Light Beer Cans').many, 'cans');
  assert.equal(pieceWord('Dinner Napkins Paper Goods').many, 'napkins');
  assert.equal(pieceWord('Corona Beer').many, 'bottles or cans');
  assert.deepEqual(pieceWord('Lime wedges'), { one: 'item', many: 'items' });
  assert.equal(pieceWord('Wings - Bone In Food').many, 'wings');
  assert.equal(pieceWord('Kitchen Food Prep').many, 'portions');
  assert.equal(pieceWord('').many, 'items');
});

test('pieceWordChoices offers portions alongside the guess', () => {
  const choices = pieceWordChoices('Wings - Bone In Food');
  assert.deepEqual(choices.map((c) => c.many), ['wings', 'portions', 'items']);
  assert.equal(pieceWordFromLabel('portions', 'Wings').many, 'portions');
  assert.equal(pieceWordFromLabel('', 'Wings Food').many, 'wings');
});

test('does not match words inside other words', () => {
  assert.equal(pieceWord('Mexican Lager').many, 'items');
  assert.equal(pieceWord('Scandal Cider').many, 'bottles or cans');
});
