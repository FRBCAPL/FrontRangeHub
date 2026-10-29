import test from 'node:test';
import assert from 'node:assert/strict';
import { stepQuantity } from '../src/utils/itemsureQuantity.js';

test('plus and minus move one whole unit', () => {
  assert.equal(stepQuantity('3', 1), '4');
  assert.equal(stepQuantity('3', -1), '2');
  assert.equal(stepQuantity('0', 1), '1');
});

test('blank: plus starts at 1, minus stays blank (not counted)', () => {
  assert.equal(stepQuantity('', 1), '1');
  assert.equal(stepQuantity('', -1), '');
  assert.equal(stepQuantity('  ', 1), '1');
});

test('never goes below zero', () => {
  assert.equal(stepQuantity('0', -1), '0');
  assert.equal(stepQuantity('0.5', -1), '0');
});

test('decimals are kept exactly, never rounded through floats', () => {
  assert.equal(stepQuantity('2.5', 1), '3.5');
  assert.equal(stepQuantity('1.25', -1), '0.25');
  assert.equal(stepQuantity('0.1', 1), '1.1');
  assert.equal(stepQuantity('2.50', 1), '3.5');
  assert.equal(stepQuantity('2,5', 1), '3.5');
  assert.equal(stepQuantity('999999999998', 1), '999999999999');
});

test('text that is not a quantity is left for the person to fix', () => {
  assert.equal(stepQuantity('abc', 1), 'abc');
  assert.equal(stepQuantity('-2', 1), '-2');
});
