import test from 'node:test';
import assert from 'node:assert/strict';
import { bumpSeason, draftToItem, nextSessionLabel, sessionDrafts, sessionIsOver, sessionProblems, suggestedStart } from './duezySessions.js';

test('next session labels', () => {
  assert.equal(bumpSeason('Fall 2026'), 'Winter 2027');
  assert.equal(bumpSeason('Spring 2026 8-Ball'), 'Summer 2026 8-Ball');
  assert.equal(bumpSeason('autumn 2025'), 'Winter 2026');
  assert.equal(bumpSeason('Session 3'), 'Session 4');
  assert.equal(bumpSeason('2026'), '2027');
  assert.equal(bumpSeason('Thursday Darts'), null);
  assert.equal(nextSessionLabel('Fall 2026'), 'Winter 2027');
  assert.equal(nextSessionLabel('Session 7'), 'Session 8');
  assert.equal(nextSessionLabel('Summer league'), '');
  assert.equal(nextSessionLabel(null), '');
});

test('suggested start is a week after the last night, never in the past', () => {
  const unit = { start_date: '2026-09-01', total_weeks: 4, skip_dates: [] };
  assert.equal(suggestedStart(unit, '2026-09-10'), '2026-09-29');
  assert.equal(suggestedStart(unit, '2026-12-01'), '2026-12-01');
  assert.equal(suggestedStart(unit, '2026-12-02'), '2026-12-08');
  assert.equal(suggestedStart({ total_weeks: 4 }, '2026-09-10'), '');
});

test('one draft per division, keeping its name and bumping its label; only picked ones ticked', () => {
  const divisions = [
    { id: 'a', name: 'Tue 8-Ball', session_label: 'Fall 2026', dues_amount: 20, total_weeks: 10 },
    { id: 'b', name: 'Thu 9-Ball', session_label: '', dues_amount: 15, total_weeks: 8 },
  ];
  const teams = [
    { id: 't1', division_id: 'a', name: 'Sharks', captain: 'Bo', players: ['Ana'] },
    { id: 't2', division_id: 'b', name: 'Rails' },
    { id: 't3', division_id: null, name: 'Orphan' },
  ];
  const drafts = sessionDrafts(divisions, teams, ['b'], '2026-10-13');
  assert.deepEqual(drafts.map((d) => [d.key, d.include, d.name, d.session_label, d.teams.map((t) => t.name)]), [
    ['a', false, 'Tue 8-Ball', 'Winter 2027', ['Sharks', 'Orphan']],
    ['b', true, 'Thu 9-Ball', '', ['Rails']],
  ]);
  assert.ok(sessionDrafts(divisions, teams).every((d) => d.include));
});

test('a draft becomes one start-session item', () => {
  const draft = {
    key: 'a', name: ' Tue 8-Ball ', session_label: ' Winter 2027 ', play_day: 'Tuesday', dues_amount: '20', total_weeks: '10',
    start_date: '2027-01-07', teams: [{ name: 'Sharks', include: true, players: ['Ana'] }, { name: 'Gone', include: false }],
  };
  const item = draftToItem(draft, [{ name: 'New Kids', captain: 'Lee', players: [] }, { name: ' ' }]);
  assert.equal(item.from_division_id, 'a');
  assert.deepEqual(item.division, {
    name: 'Tue 8-Ball', session_label: 'Winter 2027', play_day: 'Thursday', dues_amount: 20, total_weeks: 10,
    start_date: '2027-01-07', skip_dates: [],
  });
  assert.deepEqual(item.teams.map((t) => t.name), ['Sharks', 'New Kids']);
  const undated = draftToItem({ ...draft, start_date: '', session_label: '' });
  assert.equal(undated.division.play_day, 'Tuesday');
  assert.equal(undated.division.start_date, null);
  assert.equal(undated.division.session_label, null);
});

test('problems block start; a finished session is spotted', () => {
  assert.deepEqual(sessionProblems([{ include: false }]), ['Pick at least one division.']);
  assert.deepEqual(sessionProblems([{ include: true, name: 'Tue', dues_amount: 0, total_weeks: 8 }]), ['Tue: set the dues.']);
  assert.deepEqual(sessionProblems([{ include: true, name: 'Tue', dues_amount: 5, total_weeks: 8 }, { include: false, name: '' }]), []);
  assert.equal(sessionIsOver({ start_date: '2026-09-01', total_weeks: 2 }, '2026-09-09'), true);
  assert.equal(sessionIsOver({ start_date: '2026-09-01', total_weeks: 2 }, '2026-09-08'), false);
  assert.equal(sessionIsOver({ current_week: 12, total_weeks: 12 }), true);
  assert.equal(sessionIsOver(null), false);
});
