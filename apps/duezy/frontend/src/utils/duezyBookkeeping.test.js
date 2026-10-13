import test from 'node:test';
import assert from 'node:assert/strict';
import { methodTotals, methodTotalsCsvRows, NO_METHOD, seasonRange } from './duezyBookkeeping.js';

const unit = { id: 'd1', name: 'Tue', dues_amount: 20, dues_basis: 'team', players_per_match: 1, total_weeks: 3, start_date: '2026-09-15', skip_dates: [] };
const teams = [{ id: 'a', division_id: 'd1' }, { id: 'b', division_id: 'd1' }];

test('methodTotals groups recorded money by method', () => {
  const payments = [
    { team_id: 'a', week: 1, status: 'paid', amount: 20, method: 'Cash' },
    { team_id: 'a', week: 2, status: 'partial', amount: 5, method: 'Cash' },
    { team_id: 'b', week: 1, status: 'paid', amount: 20, method: 'Venmo' },
    { team_id: 'b', week: 2, status: 'paid', amount: 20, method: null },
    { team_id: 'b', week: 3, status: 'bye', amount: 0, method: null },
    { team_id: 'gone', week: 1, status: 'paid', amount: 20, method: 'Cash' },
  ];
  assert.deepEqual(methodTotals({ units: [unit], teams, payments }), [
    { method: 'Cash', total: 25, count: 2 },
    { method: NO_METHOD, total: 20, count: 1 },
    { method: 'Venmo', total: 20, count: 1 },
  ]);
});

test('methodTotalsCsvRows adds an all-methods line', () => {
  const rows = methodTotalsCsvRows([{ method: 'Cash', total: 25, count: 2 }, { method: 'Venmo', total: 20, count: 1 }]);
  assert.deepEqual(rows.at(-1), ['All methods', 3, '45.00']);
});

test('seasonRange uses dates or weeks', () => {
  assert.equal(seasonRange([unit]), 'Sep 15 – Sep 29');
  assert.equal(seasonRange([{ total_weeks: 12 }]), 'Weeks 1–12');
});
