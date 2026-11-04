import test from 'node:test';
import assert from 'node:assert/strict';
import { fullCases, joinLoose, loosePieces, looseText, splitLoose } from '../src/utils/itemsureLoose.js';

test('cards show only the full cases', () => {
  assert.equal(fullCases('2.291667', 24), '2');
  assert.equal(fullCases('0.291667', 24), '0');
  assert.equal(fullCases('2.999999', 24), '3');
  assert.equal(fullCases('-1.5', 24), '−1');
  assert.equal(fullCases('abc', 24), null);
});

test('2 cases + 7 loose out of 24 is stored as 2.291667 cases', () => {
  assert.deepEqual(joinLoose('2', '7', 24, 6), { value: '2.291667' });
  assert.deepEqual(joinLoose('2', '', 24, 6), { value: '2' });
  assert.deepEqual(joinLoose('', '7', 24, 6), { value: '0.291667' });
  assert.deepEqual(joinLoose('', '', 24, 6), { empty: true });
  assert.deepEqual(joinLoose('0', '12', 24, 6), { value: '0.5' });
  assert.deepEqual(joinLoose('1', '30', 24, 6), { value: '2.25' });
});

test('joining rounds to the unit decimals (before the update, cases allowed 2)', () => {
  assert.deepEqual(joinLoose('2', '7', 24, 2), { value: '2.29' });
});

test('cases and loose are whole numbers; bad text explains itself', () => {
  assert.match(joinLoose('2.5', '', 24, 6).error, /whole numbers here/);
  assert.match(joinLoose('2', '1.5', 24, 6).error, /one at a time/);
  assert.ok(joinLoose('abc', '', 24, 6).error);
  assert.ok(joinLoose('2', '-1', 24, 6).error);
});

test('splitting a stored amount gives cases and loose back', () => {
  assert.deepEqual(splitLoose('2.291667', 24), { negative: false, cases: '2', loose: '7' });
  assert.deepEqual(splitLoose('2.29', 24), { negative: false, cases: '2', loose: '7' });
  assert.deepEqual(splitLoose('3', 24), { negative: false, cases: '3', loose: '0' });
  assert.deepEqual(splitLoose('2.999999', 24), { negative: false, cases: '3', loose: '0' });
  assert.deepEqual(splitLoose('-0.041667', 24), { negative: true, cases: '0', loose: '1' });
  assert.deepEqual(splitLoose('1.014', 500), { negative: false, cases: '1', loose: '7' });
  assert.equal(splitLoose('abc', 24), null);
  assert.equal(splitLoose('2', 0), null);
});

test('every loose count out of 24 and 500 round-trips exactly at 6 decimals', () => {
  for (const pieces of [24, 500]) {
    for (let loose = 0; loose < pieces; loose += 1) {
      const { value } = joinLoose('3', String(loose), pieces, 6);
      assert.deepEqual(splitLoose(value, pieces), { negative: false, cases: '3', loose: String(loose) });
    }
  }
});

test('reads like people say it', () => {
  assert.equal(looseText('2.291667', 24, 'Cases'), '2 cases + 7 loose');
  assert.equal(looseText('1', 24, 'Case'), '1 case');
  assert.equal(looseText('0.291667', 24, 'Case'), '7 loose');
  assert.equal(looseText('0', 24, 'Case'), '0 cases');
  assert.equal(looseText('-0.041667', 24, 'Case'), '−1 loose');
  assert.equal(looseText('2', 12, 'Box'), '2 boxes');
});

test('loose counting only applies when switched on and the item has a count', () => {
  assert.equal(loosePieces(true, 24), 24);
  assert.equal(loosePieces(false, 24), 0);
  assert.equal(loosePieces(true, null), 0);
});
