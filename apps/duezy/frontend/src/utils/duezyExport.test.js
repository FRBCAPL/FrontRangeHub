import test from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_HEADER, ledgerCsv, ledgerFileName, ledgerRows, toCsv } from './duezyExport.js';
import { indexPayments, seasonSummary } from './duezyMath.js';
import { teamBalance, unitSchedule } from './duezyDivisions.js';

const unit = { id: 'd1', name: 'Tuesday', dues_amount: 20, dues_basis: 'team', total_weeks: 10, current_week: 3 };
const teams = [{ id: 't1', name: 'Sharks', captain: 'Bob', division_id: 'd1' }];
const col = (name) => LEDGER_HEADER.indexOf(name);
const sum = (rows, name) => Math.round(rows.reduce((s, r) => s + Number(r[col(name)]), 0) * 100) / 100;

test('every week of the season is exported, with When / Balance / Due now', () => {
  const payments = [
    { team_id: 't1', week: 1, status: 'paid', amount: 20, method: 'Cash', updated_at: '2026-10-01T19:00:00Z' },
    { team_id: 't1', week: 2, status: 'partial', amount: 5 },
  ];
  const rows = ledgerRows({ units: [unit], teams, payments, today: '2026-10-12' });
  assert.equal(rows.length, 10);
  assert.deepEqual(rows[0].slice(3, 12), [1, '', 'Past', '20.00', 'Paid', '20.00', '0.00', '0.00', 'Cash']);
  assert.deepEqual(rows[1].slice(5, 11), ['Past', '20.00', 'Partial', '5.00', '15.00', '15.00']);
  assert.deepEqual(rows[2].slice(5, 11), ['This week', '20.00', 'Not paid', '0.00', '20.00', '20.00']);
  assert.deepEqual(rows[3].slice(5, 11), ['Upcoming', '20.00', 'Not paid', '0.00', '20.00', '0.00']);
});

test('prepaid future weeks and byes', () => {
  const payments = [{ team_id: 't1', week: 5, status: 'paid', amount: 20 }, { team_id: 't1', week: 2, status: 'bye', amount: 0 }];
  const rows = ledgerRows({ units: [unit], teams, payments, today: '2026-10-12' });
  assert.equal(rows.length, 10);
  assert.deepEqual(rows[1].slice(7, 11), ['Bye', '0.00', '0.00', '0.00']);
  assert.deepEqual(rows[4].slice(5, 11), ['Upcoming', '20.00', 'Paid', '20.00', '0.00', '0.00']);
});

test('a division that has not started still exports the whole season, nothing due yet', () => {
  const later = { ...unit, start_date: '2026-11-03', total_weeks: 12 };
  const eight = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, division_id: 'd1' }));
  const rows = ledgerRows({ units: [later], teams: eight, payments: [{ team_id: 't0', week: 1, status: 'paid', amount: 20 }], today: '2026-10-12' });
  assert.equal(rows.length, 96);
  assert.ok(rows.every((r) => r[col('When')] === 'Upcoming'));
  assert.equal(sum(rows, 'Due now'), 0);
  assert.equal(sum(rows, 'Paid'), 20);
  assert.equal(rows[0][col('Night')], '2026-11-03');
});

test('column totals match the on-screen totals', () => {
  const dated = { ...unit, start_date: '2026-09-15', total_weeks: 12, grace_days: 2 };
  const two = [...teams, { id: 't2', name: 'Jets', division_id: 'd1' }];
  const payments = [
    { team_id: 't1', week: 1, status: 'paid', amount: 20 },
    { team_id: 't1', week: 2, status: 'partial', amount: 8 },
    { team_id: 't2', week: 1, status: 'bye', amount: 0 },
    { team_id: 't2', week: 3, status: 'paid', amount: 20 },
    { team_id: 't2', week: 11, status: 'paid', amount: 20 },
  ];
  const today = '2026-10-12';
  const rows = ledgerRows({ units: [dated], teams: two, payments, today });
  const index = indexPayments(payments);
  const schedule = unitSchedule(dated, { today });
  const season = seasonSummary(two, schedule.currentWeek, 20, 12, index);
  const owedNow = two.reduce((s, t) => {
    const b = teamBalance(t.id, schedule, 20, index);
    return s + b.late + b.due;
  }, 0);
  const byes = payments.filter((p) => p.status === 'bye').length;
  assert.equal(rows.length, 24);
  assert.equal(sum(rows, 'Paid'), season.collectedAll);
  assert.equal(sum(rows, 'Paid') + sum(rows, 'Balance'), season.seasonValue - byes * 20);
  assert.equal(sum(rows, 'Due now'), Math.round(owedNow * 100) / 100);
});

test('CSV quoting and spreadsheet-formula safety', () => {
  assert.equal(toCsv([['a,b', 'say "hi"', '=SUM(A1)', 'plain']]), '"a,b","say ""hi""",\'=SUM(A1),plain');
  assert.match(ledgerCsv({ units: [unit], teams, payments: [], today: '2026-10-12' }), /^Division,Team,Captain,Week,Night,When/);
  assert.equal(ledgerFileName('Front Range Tuesday!', '2026-10-12'), 'front-range-tuesday-dues-2026-10-12.csv');
});
