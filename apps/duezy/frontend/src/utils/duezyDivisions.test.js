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
  shortNights,
  teamBalance,
  nightsWithWeeks,
  teamsInUnit,
  unitSchedule,
  unitStats,
  unitWeek,
} from './duezyDivisions.js';

test('teamBalance lists the late nights; shortNights trims long lists', () => {
  const schedule = unitSchedule({ current_week: 5, total_weeks: 12 });
  const index = indexPayments([
    { team_id: 'x', week: 1, status: 'paid', amount: 20 },
    { team_id: 'x', week: 3, status: 'bye', amount: 0 },
  ]);
  const b = teamBalance('x', schedule, 20, index);
  const dated = { dates: ['2026-08-12', '2026-08-19'], label: (w) => ['Aug 12', 'Aug 19'][w - 1] };
  assert.equal(nightsWithWeeks([1, 2], dated), 'Aug 12 (week 1), Aug 19 (week 2)');
  assert.equal(nightsWithWeeks([1, 3], { dates: null, label: (w) => `week ${w}` }), 'week 1, week 3');
  assert.deepEqual(b.lateNights, ['week 2', 'week 4']);
  assert.equal(b.lateWhen, 'week 2, week 4');
  assert.equal(teamBalance('x', schedule, 20, indexPayments([])).lateNights.length, 4);
  assert.equal(shortNights(['Oct 6', 'Oct 13']), 'Oct 6, Oct 13');
  assert.equal(shortNights(['a', 'b', 'c', 'd', 'e']), 'a, b, c +2 more');
});

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
  // Without dates, only weeks before the current one are late (week 2 is just "due").
  assert.deepEqual(behind.map((x) => [x.team.name, x.owed, x.division, x.when]), [['Hustlers', 20, 'Tue 8-Ball', 'week 1']]);
  assert.equal(per[0].dueTotal, 20);
});

test('dated division: week follows the calendar, late after the grace period', () => {
  const dated = { ...tue, start_date: '2026-09-08', skip_dates: ['2026-09-22'], current_week: 1 };
  const payments = indexPayments([{ team_id: 'a', week: 1, status: 'paid', amount: 20 }]);
  const onDay = (today, grace) => unitStats(dated, teams.slice(0, 2), payments, false, { today, defaultGrace: grace });

  const beforeSeason = onDay('2026-09-01', 0);
  assert.equal(beforeSeason.schedule.started, false);
  assert.equal(beforeSeason.dueTotal, 0);
  assert.equal(beforeSeason.behind.length, 0);

  const leagueNight = onDay('2026-09-08', 0);
  assert.equal(leagueNight.schedule.currentWeek, 1);
  assert.equal(leagueNight.behind.length, 0);
  assert.equal(leagueNight.dueTotal, 20);

  // Sep 29 = week 3 (Sep 22 skipped). Grace 3: Sep 8 and Sep 15 are late, Sep 29 is only due.
  const later = onDay('2026-09-29', 3);
  assert.equal(later.schedule.currentWeek, 3);
  assert.equal(later.schedule.lateThrough, 2);
  assert.deepEqual(later.behind.map((x) => [x.team.name, x.owed, x.when]), [
    ['Hustlers', 40, 'Sep 8, Sep 15'],
    ['Sharks', 20, 'Sep 15'],
  ]);
  assert.equal(later.dueTotal, 40);

  const ownGrace = unitStats({ ...dated, grace_days: 14 }, teams.slice(0, 2), payments, false, { today: '2026-09-29', defaultGrace: 0 });
  assert.equal(ownGrace.schedule.lateThrough, 1);
});

test('all-divisions season totals: each division through its own week, byes skipped, overpaying counts', () => {
  const payments = indexPayments([
    { team_id: 'a', week: 1, status: 'paid', amount: 30 },
    { team_id: 'a', week: 2, status: 'paid', amount: 20 },
    { team_id: 'b', week: 1, status: 'bye', amount: 0 },
    { team_id: 'c', week: 1, status: 'partial', amount: 10 },
  ]);
  const { season, per } = allDivisionsStats([tue, thu], teams.slice(0, 3), payments);
  // Tue: weeks 1-2, Sharks paid 50, Hustlers bye wk1 → expected 20+20+20 = 60
  assert.deepEqual(per[0].season, { collected: 50, expected: 60, seasonValue: 2 * 20 * 12, collectedAll: 50 });
  // Thu: week 1 only, $15/week, 10 weeks
  assert.deepEqual(per[1].season, { collected: 10, expected: 15, seasonValue: 150, collectedAll: 10 });
  assert.deepEqual(season, { collected: 60, expected: 75, seasonValue: 630, collectedAll: 60 });
});

test('league-wide "collected" always equals the sum of every division ledger (not started, paid early)', () => {
  const notStarted = { ...tue, start_date: '2026-11-03', skip_dates: [] };
  const payments = indexPayments([
    { team_id: 'a', week: 1, status: 'paid', amount: 40 },
    { team_id: 'b', week: 1, status: 'partial', amount: 20 },
    { team_id: 'c', week: 6, status: 'paid', amount: 15 },
  ]);
  const { season, per } = allDivisionsStats([notStarted, thu], teams.slice(0, 3), payments, { today: '2026-10-12' });
  assert.equal(per[0].schedule.started, false);
  assert.equal(per[0].season.collected, 0);
  assert.equal(per[0].season.collectedAll, 60);
  assert.equal(per[1].season.collectedAll, 15);
  assert.equal(season.collectedAll, per.reduce((s, x) => s + x.season.collectedAll, 0));
  assert.equal(season.collectedAll, 75);
});

test('roundup reminder names divisions and skips the week', () => {
  const text = reminderText(league, null, [{ team: { name: 'Hustlers' }, owed: 40, division: 'Tue 8-Ball' }]);
  assert.match(text, /^Mile High dues check:\n- Hustlers \(Tue 8-Ball\): \$40/);
});

test('a new division draft inherits the nights off', () => {
  const from = { skip_dates: ['2026-11-26', '2026-12-24'], start_date: '2026-10-20' };
  const d = newDivisionDraft(from);
  assert.deepEqual(d.skip_dates, ['2026-11-26', '2026-12-24']);
  d.skip_dates.push('2027-01-01');
  assert.equal(from.skip_dates.length, 2);
  assert.equal('skip_dates' in newDivisionDraft({ skip_dates: [] }), false);
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

test('teamBalance shows a make-up week as due, not late', () => {
  const schedule = { started: true, currentWeek: 3, lateThrough: 2, dates: null, label: (w) => `week ${w}` };
  const idx = indexPayments([
    { team_id: 'a', week: 1, status: 'makeup', amount: 0 },
    { team_id: 'a', week: 2, status: 'paid', amount: 20 },
    { team_id: 'a', week: 3, status: 'paid', amount: 20 },
  ]);
  const b = teamBalance('a', schedule, 20, idx);
  assert.equal(b.late, 0);
  assert.equal(b.due, 20);
  assert.equal(b.dueWhen, 'week 1');
  assert.deepEqual(b.makeupNights, ['week 1']);
});

test('owed splits into late, make-ups and this week', async () => {
  const { unitStats } = await import('./duezyDivisions.js');
  const unit = { id: null, name: 'L', dues_amount: 20, current_week: 3, total_weeks: 10 };
  const teams = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const idx = indexPayments([
    { team_id: 'a', week: 1, status: 'makeup', amount: 0 },
    { team_id: 'a', week: 2, status: 'paid', amount: 20 },
    { team_id: 'b', week: 1, status: 'paid', amount: 20 },
  ]);
  const s = unitStats(unit, teams, idx, true);
  assert.deepEqual(s.owed, { late: 20, lateTeams: 1, makeup: 20, makeupTeams: 1, current: 40 });
});
