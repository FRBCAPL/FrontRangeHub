import test from 'node:test';
import assert from 'node:assert/strict';
import {
  draftToSave, leagueCopyRow, nextSeasonLabel, nextSeasonName, seasonDrafts, seasonIsOver, seasonProblems, suggestedStart,
} from './duezyNextSeason.js';

test('next season names', () => {
  assert.equal(nextSeasonName('Front Range Fall 2026'), 'Front Range Winter 2027');
  assert.equal(nextSeasonName('Spring 2026 8-Ball'), 'Summer 2026 8-Ball');
  assert.equal(nextSeasonName('Darts League autumn 2025'), 'Darts League Winter 2026');
  assert.equal(nextSeasonName('Tuesday Session 3'), 'Tuesday Session 4');
  assert.equal(nextSeasonName('Cornhole 2026'), 'Cornhole 2027');
  assert.equal(nextSeasonName('Thursday Darts'), 'Thursday Darts · next season');
  assert.equal(nextSeasonLabel('Fall 2026'), 'Winter 2027');
  assert.equal(nextSeasonLabel('Session 7'), 'Session 8');
  assert.equal(nextSeasonLabel('Summer league'), '');
  assert.equal(nextSeasonLabel(''), '');
});

test('league settings carry over; history fields do not', () => {
  const league = {
    id: 'x', name: 'Old', sport: 'darts', dues_amount: 20, current_week: 9, start_date: '2026-01-06',
    skip_dates: ['2026-02-03'], archived: false, multi_division: true, pay_handles: { venmo: '@fr' }, owner_id: 'u',
  };
  assert.deepEqual(leagueCopyRow(league, '  New  '), { name: 'New', sport: 'darts', dues_amount: 20, pay_handles: { venmo: '@fr' } });
});

test('suggested start is a week after the last night, never in the past', () => {
  const unit = { start_date: '2026-09-01', total_weeks: 4, skip_dates: [] };
  assert.equal(suggestedStart(unit, '2026-09-10'), '2026-09-29');
  assert.equal(suggestedStart(unit, '2026-12-01'), '2026-12-01');
  assert.equal(suggestedStart(unit, '2026-12-02'), '2026-12-08');
  assert.equal(suggestedStart({ total_weeks: 4 }, '2026-09-10'), '');
});

test('drafts per division with their teams; old single-division leagues become one draft', () => {
  const league = { name: 'L', multi_division: true, dues_amount: 10 };
  const divisions = [
    { id: 'a', name: 'Tue', play_day: 'Tuesday', dues_amount: 20, total_weeks: 10, grace_days: 2 },
    { id: 'b', name: 'Thu', play_day: 'Thursday', dues_amount: 15, total_weeks: 8, grace_days: null },
  ];
  const teams = [
    { id: 't1', division_id: 'a', name: 'Sharks', captain: 'Bo', players: ['Ana'] },
    { id: 't2', division_id: 'b', name: 'Rails' },
    { id: 't3', division_id: null, name: 'Orphan' },
  ];
  const drafts = seasonDrafts(league, divisions, teams, '2026-10-13');
  assert.deepEqual(drafts.map((d) => [d.key, d.teams.map((t) => t.name), d.grace_days]), [
    ['a', ['Sharks', 'Orphan'], 2],
    ['b', ['Rails'], undefined],
  ]);
  const single = seasonDrafts({ name: 'Solo', play_day: 'Monday', dues_amount: 5, total_weeks: 6 }, [], [{ id: 'x', name: 'Jets' }]);
  assert.equal(single.length, 1);
  assert.equal(single[0].name, 'Solo');
  assert.equal(single[0].teams[0].name, 'Jets');
});

test('saving a draft keeps ticked teams, adds new ones and follows the new start date', () => {
  const draft = {
    name: 'Tue', play_day: 'Tuesday', dues_amount: '20', dues_basis: 'team', players_per_match: 4, total_weeks: '10',
    start_date: '2027-01-07', teams: [{ name: 'Sharks', include: true, players: ['Ana'] }, { name: 'Gone', include: false }],
  };
  const saved = draftToSave(draft, [{ name: 'New Kids', captain: 'Lee', players: [] }]);
  assert.equal(saved.play_day, 'Thursday');
  assert.equal(saved.start_date, '2027-01-07');
  assert.deepEqual(saved.skip_dates, []);
  assert.deepEqual(saved.teams.map((t) => t.name), ['Sharks', 'New Kids']);
  assert.equal(saved.dues_amount, 20);
});

test('problems block create; a finished season is spotted', () => {
  assert.deepEqual(seasonProblems('', [{ include: false }]), ['Give the new season a name.', 'Keep at least one division.']);
  assert.deepEqual(seasonProblems('N', [{ include: true, name: 'Tue', dues_amount: 0, total_weeks: 8 }]), ['Tue: set the dues.']);
  assert.deepEqual(seasonProblems('N', [{ include: true, name: 'Tue', dues_amount: 5, total_weeks: 8 }]), []);
  assert.equal(seasonIsOver([{ start_date: '2026-09-01', total_weeks: 2 }], '2026-09-09'), true);
  assert.equal(seasonIsOver([{ start_date: '2026-09-01', total_weeks: 2 }], '2026-09-08'), false);
  assert.equal(seasonIsOver([{ current_week: 12, total_weeks: 12 }]), true);
  assert.equal(seasonIsOver([]), false);
});
