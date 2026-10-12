import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPayments, reminderText } from './duezyMath.js';
import {
  allDivisionsStats,
  divisionReady,
  divisionToSave,
  divisionUnits,
  isMultiDivision,
  newDivisionDraft,
  teamsInUnit,
  unitWeek,
} from './duezyDivisions.js';

const league = { id: 'L', name: 'Mile High', multi_division: true, play_day: 'Tuesday', dues_amount: 20, dues_basis: 'team', players_per_match: 4, total_weeks: 12, current_week: 3 };
const tue = { id: 'd1', name: 'Tue 8-Ball', dues_amount: 20, dues_basis: 'team', players_per_match: 4, total_weeks: 12, current_week: 2 };
const thu = { id: 'd2', name: 'Thu 9-Ball', dues_amount: 5, dues_basis: 'player', players_per_match: 3, total_weeks: 10, current_week: 1 };
const teams = [
  { id: 'a', name: 'Sharks', division_id: 'd1' },
  { id: 'b', name: 'Hustlers', division_id: 'd1' },
  { id: 'c', name: 'Rack Pack', division_id: 'd2' },
  { id: 'x', name: 'Orphans', division_id: null },
];

test('single-division league acts as its own unit', () => {
  const units = divisionUnits({ ...league, multi_division: false }, []);
  assert.equal(units.length, 1);
  assert.equal(units[0].id, null);
  assert.equal(units[0].current_week, 3);
  assert.equal(teamsInUnit(teams, units[0]).length, 4);
  assert.equal(isMultiDivision(league, []), false);
});

test('multi-division league uses its divisions; orphans land in the first', () => {
  const units = divisionUnits(league, [tue, thu]);
  assert.deepEqual(units.map((u) => u.id), ['d1', 'd2']);
  assert.deepEqual(teamsInUnit(teams, tue, true).map((t) => t.id), ['a', 'b', 'x']);
  assert.deepEqual(teamsInUnit(teams, thu).map((t) => t.id), ['c']);
});

test('unitWeek clamps to the season', () => {
  assert.equal(unitWeek({ current_week: 15, total_weeks: 10 }), 10);
  assert.equal(unitWeek({ current_week: 0, total_weeks: 10 }), 1);
});

test('all-divisions stats: each division at its own week and dues', () => {
  const payments = indexPayments([
    { team_id: 'a', week: 1, status: 'paid', amount: 20 },
    { team_id: 'a', week: 2, status: 'paid', amount: 20 },
    { team_id: 'c', week: 1, status: 'paid', amount: 15 },
  ]);
  const { per, summary, behind } = allDivisionsStats([tue, thu], teams.slice(0, 3), payments);
  assert.equal(per[0].week, 2);
  assert.equal(per[1].dues, 15);
  assert.equal(summary.collected, 35);
  assert.equal(summary.expected, 55);
  assert.deepEqual(behind.map((x) => [x.team.name, x.owed, x.division]), [['Hustlers', 40, 'Tue 8-Ball']]);
});

test('roundup reminder names divisions and skips the week', () => {
  const text = reminderText(league, null, [{ team: { name: 'Hustlers' }, owed: 40, division: 'Tue 8-Ball' }]);
  assert.match(text, /^Mile High dues check:\n- Hustlers \(Tue 8-Ball\): \$40/);
});

test('division drafts copy defaults and save cleanly', () => {
  const d = newDivisionDraft({ dues_amount: 25, total_weeks: 14, play_day: 'Thursday' });
  assert.equal(divisionReady(d), false);
  d.name = '  Thursday A  ';
  assert.equal(divisionReady(d), true);
  assert.deepEqual(divisionToSave(d), {
    name: 'Thursday A',
    play_day: 'Thursday',
    dues_amount: 25,
    dues_basis: 'team',
    players_per_match: 4,
    total_weeks: 14,
  });
});
