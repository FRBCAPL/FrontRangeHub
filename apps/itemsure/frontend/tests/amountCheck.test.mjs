import test from 'node:test';
import assert from 'node:assert/strict';
import { amountProblem, compareQuantities } from '../src/utils/itemsureAmountCheck.js';

const each = { unitName: 'Each', unitSymbol: 'ea', precision: 0 };
const litre = { unitName: 'Litre', unitSymbol: 'L', precision: 2 };
const typed = (text) => ({ base: text });

test('compareQuantities is exact across decimal places', () => {
  assert.equal(compareQuantities('5', '4'), 1);
  assert.equal(compareQuantities('4', '4.00'), 0);
  assert.equal(compareQuantities('0.1', '0.25'), -1);
  assert.equal(compareQuantities('10', '9.99'), 1);
});

test('blank is not ready and says nothing', () => {
  assert.deepEqual(amountProblem({ entry: typed(''), item: each }), { ready: false, message: '' });
});

test('whole-number and zero rules show while typing', () => {
  assert.equal(amountProblem({ entry: typed('0.5'), item: each }).message, 'Each must be counted in whole numbers.');
  assert.equal(amountProblem({ entry: typed('0'), item: each }).message, 'Enter an amount greater than zero.');
  assert.equal(amountProblem({ entry: typed('-2'), item: each }).message, 'Quantities cannot be negative.');
});

test('taking out more than is on hand is caught', () => {
  assert.deepEqual(amountProblem({ entry: typed('5'), item: each, onHand: '4', removing: true }), { ready: false, message: 'There are only 4 ea here.' });
  assert.equal(amountProblem({ entry: typed('2'), item: each, onHand: '1', removing: true }).message, 'There is only 1 ea here.');
  assert.equal(amountProblem({ entry: typed('4'), item: each, onHand: '4.000', removing: true }).ready, true);
  assert.equal(amountProblem({ entry: typed('1.26'), item: litre, onHand: '1.25', removing: true }).ready, false);
});

test('adding is never limited by what is on hand', () => {
  assert.equal(amountProblem({ entry: typed('500'), item: each, onHand: '4', removing: false }).ready, true);
});

test('package problems are left to the package field', () => {
  assert.deepEqual(amountProblem({ entry: { pkg: {}, error: 'bad', base: undefined }, item: each }), { ready: false, message: '' });
  assert.equal(amountProblem({ entry: { pkg: {}, base: '24' }, item: each, onHand: '12', removing: true }).message, 'There are only 12 ea here.');
});
