import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerCsv, ledgerFileName, ledgerRows, toCsv } from './duezyExport.js';

const unit = { id: 'd1', name: 'Tuesday', dues_amount: 20, dues_basis: 'team', total_weeks: 10, current_week: 3 };
const teams = [{ id: 't1', name: 'Sharks', captain: 'Bob', division_id: 'd1' }];

test('one row per week through the current week, owed and paid worked out', () => {
  const payments = [
    { team_id: 't1', week: 1, status: 'paid', amount: 20, method: 'Cash', updated_at: '2026-10-01T19:00:00Z' },
    { team_id: 't1', week: 2, status: 'partial', amount: 5 },
  ];
  const rows = ledgerRows({ units: [unit], teams, payments, today: '2026-10-12' });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0].slice(3, 10), [1, '', '20.00', 'Paid', '20.00', '0.00', 'Cash']);
  assert.deepEqual(rows[1].slice(6, 9), ['Partial', '5.00', '15.00']);
  assert.deepEqual(rows[2].slice(6, 9), ['Not paid', '0.00', '20.00']);
});

test('prepaid future weeks are included; byes owe nothing', () => {
  const payments = [{ team_id: 't1', week: 5, status: 'paid', amount: 20 }, { team_id: 't1', week: 2, status: 'bye', amount: 0 }];
  const rows = ledgerRows({ units: [unit], teams, payments, today: '2026-10-12' });
  assert.equal(rows.length, 4);
  assert.equal(rows[1][8], '0.00');
  assert.equal(rows[3][3], 5);
});

test('CSV quoting and spreadsheet-formula safety', () => {
  assert.equal(toCsv([['a,b', 'say "hi"', '=SUM(A1)', 'plain']]), '"a,b","say ""hi""",\'=SUM(A1),plain');
  assert.match(ledgerCsv({ units: [unit], teams, payments: [], today: '2026-10-12' }), /^Division,Team,Captain/);
  assert.equal(ledgerFileName('Front Range Tuesday!', '2026-10-12'), 'front-range-tuesday-dues-2026-10-12.csv');
});
