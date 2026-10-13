import test from 'node:test';
import assert from 'node:assert/strict';
import { groupByLeague, leagueSnapshot } from './duezyDashboard.js';

const league = { id: 'L', multi_division: true, grace_days: 0 };
const divisions = [
  { id: 'd1', league_id: 'L', name: 'Tue', dues_amount: 20, dues_basis: 'team', total_weeks: 10, current_week: 3 },
  { id: 'd2', league_id: 'L', name: 'Thu', dues_amount: 10, dues_basis: 'team', total_weeks: 10, start_date: '2026-12-01' },
];
const teams = [
  { id: 'a', league_id: 'L', name: 'A', division_id: 'd1' },
  { id: 'b', league_id: 'L', name: 'B', division_id: 'd2' },
];

test('collected (incl. paid ahead), late and season value across divisions', () => {
  const payments = [
    { league_id: 'L', team_id: 'a', week: 1, status: 'paid', amount: 20 },
    { league_id: 'L', team_id: 'b', week: 1, status: 'paid', amount: 10 },
  ];
  const s = leagueSnapshot(league, divisions, teams, payments, '2026-10-12');
  assert.equal(s.collected, 30);
  assert.equal(s.late, 20);
  assert.equal(s.lateTeams, 1);
  assert.equal(s.due, 20);
  assert.equal(s.seasonValue, 300);
});

test('groupByLeague', () => {
  assert.deepEqual(groupByLeague([{ league_id: 'x', n: 1 }, { league_id: 'x', n: 2 }, { league_id: 'y', n: 3 }]), {
    x: [{ league_id: 'x', n: 1 }, { league_id: 'x', n: 2 }],
    y: [{ league_id: 'y', n: 3 }],
  });
});
