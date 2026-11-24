import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPayments } from './duezyMath.js';
import {
  METHOD_FILTER_CASH,
  METHOD_FILTER_DIGITAL,
  METHOD_FILTER_OTHER,
  METHOD_FILTER_UNRECORDED,
  weekCollectedRows,
  weekMethodTeams,
  weekMethodTotals,
} from './duezyMethodTotals.js';

const teams = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: id }));

const week2 = indexPayments([
  { team_id: 'a', week: 2, status: 'paid', amount: 20, method: 'Cash' },
  { team_id: 'b', week: 2, status: 'paid', amount: 25, method: 'cash', paid_by: 'Bob' },
  { team_id: 'c', week: 2, status: 'paid', amount: 20, method: 'Venmo', paid_by: 'Ana' },
  { team_id: 'd', week: 2, status: 'partial', amount: 10, method: 'Zelle' },
  { team_id: 'e', week: 2, status: 'paid', amount: 20, method: null },
  { team_id: 'f', week: 2, status: 'makeup', amount: 0 },
  { team_id: 'a', week: 3, status: 'paid', amount: 20, method: 'Venmo' },
]);

test('splits a week into cash, each digital method and not recorded', () => {
  const t = weekMethodTotals(teams, 2, 20, week2);
  assert.deepEqual(t.cash, { total: 45, count: 2 });
  assert.deepEqual(t.digital, [
    { method: 'Venmo', total: 20, count: 1 },
    { method: 'Zelle', total: 10, count: 1 },
  ]);
  assert.deepEqual(t.unrecorded, { total: 20, count: 1 });
  assert.equal(t.total, 95);
});

test('empty week', () => {
  const t = weekMethodTotals(teams, 1, 20, indexPayments([]));
  assert.equal(t.total, 0);
  assert.deepEqual(t.digital, []);
});

test('lists teams for cash, a named method, other, and unrecorded', () => {
  const cash = weekMethodTeams(teams, 2, 20, week2, METHOD_FILTER_CASH);
  assert.deepEqual(cash.map((r) => [r.team.id, r.amount, r.detail]), [
    ['a', 20, ''],
    ['b', 25, 'from Bob'],
  ]);

  const venmo = weekMethodTeams(teams, 2, 20, week2, 'Venmo');
  assert.equal(venmo.length, 1);
  assert.equal(venmo[0].team.id, 'c');
  assert.equal(venmo[0].detail, 'from Ana');

  const digital = weekMethodTeams(teams, 2, 20, week2, METHOD_FILTER_DIGITAL);
  assert.deepEqual(digital.map((r) => [r.team.id, r.amount, r.method, r.detail]), [
    ['c', 20, 'Venmo', 'from Ana'],
    ['d', 10, 'Zelle', ''],
  ]);

  const other = weekMethodTeams(teams, 2, 20, week2, METHOD_FILTER_OTHER);
  assert.deepEqual(other.map((r) => [r.team.id, r.amount, r.method]), [
    ['e', 20, 'Not recorded'],
    ['c', 20, 'Venmo'],
    ['d', 10, 'Zelle'],
  ]);

  const bare = weekMethodTeams(teams, 2, 20, week2, METHOD_FILTER_UNRECORDED);
  assert.equal(bare.length, 1);
  assert.equal(bare[0].team.id, 'e');
  assert.equal(bare[0].amount, 20);
});

test('lists every team that paid this week with how', () => {
  const rows = weekCollectedRows(teams, 2, 20, week2);
  assert.deepEqual(rows.map((r) => [r.team.id, r.amount, r.how, r.status]), [
    ['a', 20, 'Cash', 'paid'],
    ['b', 25, 'cash from Bob', 'paid'],
    ['c', 20, 'Venmo from Ana', 'paid'],
    ['d', 10, 'Zelle', 'partial'],
    ['e', 20, 'Not recorded', 'paid'],
  ]);
});
