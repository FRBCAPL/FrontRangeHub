import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPayments } from './duezyMath.js';
import { quickPayAmount, usualPay } from './duezyUsualMethod.js';

const league = { default_method: 'Cash' };
const pay = (week, method, paid_by = null, status = 'paid') => ({ team_id: 't', week, status, amount: 20, method, paid_by });

test('no history uses the league default', () => {
  assert.deepEqual(usualPay(league, 't', 5, indexPayments([])), { method: 'Cash', paid_by: null, learned: false });
});

test('most used method in recent weeks wins', () => {
  const idx = indexPayments([pay(1, 'Venmo', 'Ana'), pay(2, 'Venmo', 'Ana'), pay(3, 'Venmo', 'Ana'), pay(4, 'Cash')]);
  assert.deepEqual(usualPay(league, 't', 5, idx), { method: 'Venmo', paid_by: 'Ana', learned: true });
});

test('a tie goes to the most recent method', () => {
  const idx = indexPayments([pay(1, 'Venmo', 'Ana'), pay(2, 'Cash')]);
  assert.equal(usualPay(league, 't', 3, idx).method, 'Cash');
});

test('only looks back 6 weeks and ignores this week and later', () => {
  const idx = indexPayments([
    pay(1, 'Zelle', 'Bo'), pay(2, 'Zelle', 'Bo'), pay(3, 'Zelle', 'Bo'),
    pay(4, 'Cash'), pay(5, 'Cash'), pay(6, 'Venmo'), pay(7, 'Venmo'), pay(8, 'Card'), pay(9, 'Card'),
    pay(10, 'Check'),
  ]);
  assert.equal(usualPay(league, 't', 10, idx).method, 'Card');
});

test('payer only filled in when one person sends most of them', () => {
  const mixed = indexPayments([pay(1, 'Venmo', 'Ana'), pay(2, 'Venmo', 'Bo')]);
  assert.deepEqual(usualPay(league, 't', 3, mixed), { method: 'Venmo', paid_by: null, learned: true });
  const usual = indexPayments([pay(1, 'Venmo', 'Bo'), pay(2, 'Venmo', 'Ana'), pay(3, 'Venmo', 'Ana')]);
  assert.equal(usualPay(league, 't', 4, usual).paid_by, 'Ana');
});

test('splits count their biggest part; unrecorded methods and dropped methods are skipped', () => {
  const idx = indexPayments([
    { team_id: 't', week: 1, status: 'paid', amount: 100, method: null, splits: [{ amount: 22, method: 'Venmo' }, { amount: 78, method: 'Cash' }] },
    pay(2, null),
    pay(3, 'Bitcoin'),
  ]);
  assert.equal(usualPay(league, 't', 4, idx).method, 'Cash');
  assert.deepEqual(usualPay({ payment_methods: ['Venmo', 'Zelle'] }, 't', 4, indexPayments([pay(1, 'Cash')])).method, 'Venmo');
});

test('quick pay amount: full dues, the rest of a partial, nothing when settled', () => {
  assert.equal(quickPayAmount(null, 100), 100);
  assert.equal(quickPayAmount({ status: 'makeup' }, 100), 100);
  assert.equal(quickPayAmount({ status: 'partial', amount: 78 }, 100), 22);
  assert.equal(quickPayAmount({ status: 'paid', amount: 100 }, 100), 0);
  assert.equal(quickPayAmount({ status: 'bye' }, 100), 0);
});
