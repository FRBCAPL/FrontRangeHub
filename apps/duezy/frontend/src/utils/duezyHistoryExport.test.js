import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_HEADER, historyCsv, historyFileName, historyRows } from './duezyHistoryExport.js';
import { changeKind, isCorrection } from './duezyHistory.js';

const units = [{ id: 'd1', name: 'Tuesday', start_date: '2026-10-20', total_weeks: 12 }];
const team = { name: 'Sharks', division_id: 'd1' };

test('created, changed and corrected rows read oldest first with the money moved', () => {
  const rows = historyRows({
    units,
    rows: [
      { action: 'changed', week: 1, old_status: 'paid', old_amount: 40, new_status: 'unpaid', new_amount: 0, changed_at: '2026-10-21T02:00:00Z', changed_by_email: 'amy@x.com', team },
      { action: 'created', week: 1, new_status: 'paid', new_amount: 40, method: 'Venmo', paid_by: 'Ana', changed_at: '2026-10-21T01:00:00Z', changed_by_email: 'sam@x.com', team },
    ],
  });
  assert.deepEqual(rows[0], ['2026-10-21 01:00', 'Tuesday', 'Sharks', 1, '2026-10-20', 'Recorded', '', 'Paid $40', '40.00', 'Venmo', 'Ana', '', 'sam@x.com']);
  assert.deepEqual(rows[1].slice(5, 9), ['Correction', 'Paid $40', 'Not paid', '-40.00']);
  assert.equal(rows[1][12], 'amy@x.com');
});

test('teams that were removed still show up', () => {
  const [row] = historyRows({ units, rows: [{ action: 'created', week: 2, new_status: 'bye', new_amount: 0, changed_at: '2026-10-28T01:00:00Z' }] });
  assert.equal(row[2], '(removed team)');
});

test('correction = money taken back; method edits and top-ups are just changes', () => {
  assert.equal(isCorrection({ action: 'changed', old_amount: 20, new_amount: 5 }), true);
  assert.equal(isCorrection({ action: 'changed', old_amount: 5, new_amount: 20 }), false);
  assert.equal(changeKind({ action: 'changed', old_amount: 20, new_amount: 20 }), 'Changed');
  assert.equal(changeKind({ action: 'created', new_amount: 20 }), 'Recorded');
});

test('CSV header and file name', () => {
  assert.match(historyCsv({ units, rows: [] }), new RegExp(`^${HISTORY_HEADER.slice(0, 3).join(',')}`));
  assert.equal(historyFileName('Front Range!', '2026-10-12'), 'front-range-payment-history-2026-10-12.csv');
});
