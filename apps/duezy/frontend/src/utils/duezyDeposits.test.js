import test from 'node:test';
import assert from 'node:assert/strict';
import { depositBalances, depositTotals, parseDepositAmount } from './duezyDeposits.js';

test('depositBalances: collected minus deposited per method, accepted methods first', () => {
  const totals = [
    { method: 'Venmo', total: 120, count: 6 },
    { method: 'Cash', total: 200, count: 10 },
    { method: 'Method not recorded', total: 20, count: 1 },
  ];
  const deposits = [
    { method: 'Cash', amount: '150.00' },
    { method: 'Cash', amount: 25.5 },
    { method: 'Old Zelle', amount: 40 },
  ];
  const rows = depositBalances(['Cash', 'Venmo', 'PayPal'], totals, deposits);
  assert.deepEqual(rows.map((r) => r.method), ['Cash', 'Venmo', 'PayPal', 'Method not recorded', 'Old Zelle']);
  assert.deepEqual(rows[0], { method: 'Cash', collected: 200, count: 10, deposited: 175.5, deposits: 2, onHand: 24.5 });
  assert.equal(rows[1].onHand, 120);
  assert.deepEqual(rows[2], { method: 'PayPal', collected: 0, count: 0, deposited: 0, deposits: 0, onHand: 0 });
  assert.equal(rows[4].onHand, -40);
  assert.deepEqual(depositTotals(rows), { collected: 340, deposited: 215.5, onHand: 124.5 });
});

test('parseDepositAmount accepts money-ish input, rejects zero / junk', () => {
  assert.equal(parseDepositAmount('$1,250.456'), 1250.46);
  assert.equal(parseDepositAmount(' 40 '), 40);
  assert.equal(parseDepositAmount('0'), null);
  assert.equal(parseDepositAmount('-5'), null);
  assert.equal(parseDepositAmount('abc'), null);
  assert.equal(parseDepositAmount(''), null);
});
