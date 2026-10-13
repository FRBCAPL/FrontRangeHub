import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerRows } from './duezyExport.js';
import { ledgerReport } from './duezyReports.js';

// Tuesdays Sep 15, 22, 29, Oct 6. Sharks paid week 1; Jets paid nothing.
const unit = { id: 'd1', name: 'Tue', dues_amount: 20, dues_basis: 'team', players_per_match: 1, total_weeks: 4, start_date: '2026-09-15', skip_dates: [] };
const teams = [{ id: 'a', name: 'Sharks', division_id: 'd1' }, { id: 'b', name: 'Jets', division_id: 'd1' }];
const payments = [{ team_id: 'a', week: 1, status: 'paid', amount: 20, method: 'Cash' }];

const WHEN = 5;
const DUE_NOW = 10;
const rowsOn = (today) => ledgerRows({ units: [unit], teams, payments, today });
const whenFor = (rows, team) => rows.filter((r) => r[1] === team).map((r) => r[WHEN]);
const dueNow = (rows) => rows.reduce((s, r) => s + Number(r[DUE_NOW]), 0);

test('before the season every week is upcoming and nothing is due yet', () => {
  const rows = rowsOn('2026-09-01');
  assert.deepEqual(whenFor(rows, 'Jets'), ['Upcoming', 'Upcoming', 'Upcoming', 'Upcoming']);
  assert.equal(dueNow(rows), 0);
  assert.equal(ledgerReport({ units: [unit], teams, payments, today: '2026-09-01' }).rows.length, 1);
});

test('mid-season, played weeks move from upcoming to due', () => {
  const rows = rowsOn('2026-09-23');
  assert.deepEqual(whenFor(rows, 'Jets'), ['Past', 'This week', 'Upcoming', 'Upcoming']);
  assert.equal(dueNow(rows), 60);
  const report = ledgerReport({ units: [unit], teams, payments, today: '2026-09-23' });
  assert.equal(report.rows.length, 4);
  assert.equal(report.summary.find((s) => s.label === 'Due now').value, '$60');
  assert.equal(report.summary.find((s) => s.label === 'Rest of season').value, '$80');
});

test('after the season nothing is upcoming and every unpaid week is due', () => {
  const rows = rowsOn('2026-11-01');
  assert.ok(!rows.some((r) => r[WHEN] === 'Upcoming'));
  assert.equal(dueNow(rows), 140);
  const report = ledgerReport({ units: [unit], teams, payments, today: '2026-11-01' });
  assert.equal(report.rows.length, 8);
  assert.equal(report.summary.find((s) => s.label === 'Rest of season').value, '$0');
});
