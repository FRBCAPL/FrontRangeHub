import test from 'node:test';
import assert from 'node:assert/strict';
import { historyReport, ledgerReport, methodReport, reportFileName } from './duezyReports.js';

const unit = { id: 'd1', name: 'Tue', dues_amount: 20, dues_basis: 'team', players_per_match: 1, total_weeks: 4, start_date: '2026-09-15', skip_dates: [] };
const teams = [{ id: 'a', name: 'Sharks', division_id: 'd1' }, { id: 'b', name: 'Jets', division_id: 'd1' }];
const payments = [
  { team_id: 'a', week: 1, status: 'paid', amount: 20, method: 'Cash' },
  { team_id: 'a', week: 4, status: 'paid', amount: 20, method: 'Venmo' },
  { team_id: 'b', week: 1, status: 'partial', amount: 5, method: 'Cash' },
];
const today = '2026-09-23';

test('ledgerReport hides upcoming unpaid weeks but keeps paid-ahead ones', () => {
  const r = ledgerReport({ units: [unit], teams, payments, today });
  assert.deepEqual(r.columns.map((c) => c.label), ['Team', 'Week', 'Night', 'Status', 'Paid', 'Balance', 'Due now', 'Method']);
  assert.equal(r.rows.length, 5);
  assert.ok(r.rows.some((row) => row[0] === 'Sharks' && row[1] === '4'));
  assert.equal(r.summary.find((s) => s.label === 'Collected').value, '$45');
  assert.equal(ledgerReport({ units: [unit], teams, payments, today, includeUpcoming: true }).rows.length, 8);
});

test('ledgerReport adds a Division column for several divisions', () => {
  const other = { ...unit, id: 'd2', name: 'Thu' };
  const r = ledgerReport({ units: [unit, other], teams, payments, today });
  assert.equal(r.columns[0].label, 'Division');
});

test('historyReport counts corrections and net change', () => {
  const rows = [
    { changed_at: '2026-09-16T01:00:00Z', team_id: 'a', team: { name: 'Sharks', division_id: 'd1' }, week: 1, action: 'created', new_status: 'paid', new_amount: 80, method: 'Venmo', changed_by_email: 'o@x.com' },
    { changed_at: '2026-09-17T01:00:00Z', team_id: 'a', team: { name: 'Sharks', division_id: 'd1' }, week: 1, action: 'changed', old_status: 'paid', old_amount: 80, new_status: 'partial', new_amount: 70, method: 'Venmo', note: 'Miscount', changed_by_email: 'o@x.com' },
  ];
  const r = historyReport({ rows, units: [unit] });
  assert.equal(r.rows.length, 2);
  assert.equal(r.summary.find((s) => s.label === 'Corrections').value, '1');
  assert.equal(r.summary.find((s) => s.label === 'Net change').value, '$70');
  assert.equal(r.rows[1][6], '−$10');
});

test('methodReport shares add up', () => {
  const r = methodReport({ units: [unit], teams, payments });
  assert.deepEqual(r.rows.map((row) => row[0]), ['Cash', 'Venmo']);
  assert.equal(r.summary[0].value, '$45');
});

test('reportFileName is a tidy slug', () => {
  assert.equal(reportFileName('Front Range League', 'Season ledger', 'Tuesday 8-Ball', '2026-10-12', 'pdf'), 'front-range-league-tuesday-8-ball-season-ledger-2026-10-12.pdf');
});
