import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPayments } from './duezyMath.js';
import { groupTeams, matchesSearch, teamCounts } from './duezyTeamGroups.js';

const teams = [
  { id: 'a', name: 'Sharks', captain: 'Sam' },
  { id: 'b', name: 'Bombers', captain: 'Lee' },
  { id: 'c', name: 'Cue Balls', captain: 'Ana' },
  { id: 'd', name: 'Dragons', captain: 'Joe' },
  { id: 'e', name: 'Eagles', captain: 'Kim' },
];
const paymentIndex = indexPayments([
  { team_id: 'a', week: 2, status: 'paid', amount: 20 },
  { team_id: 'b', week: 2, status: 'bye', amount: 0 },
  { team_id: 'c', week: 2, status: 'partial', amount: 5 },
  { team_id: 'e', week: 2, status: 'paid', amount: 20 },
]);
const ids = (list) => list.map((t) => t.id);
const base = { teams, week: 2, paymentIndex };

test('counts by bucket (partial counts as not paid yet)', () => {
  assert.deepEqual(teamCounts(teams, 2, paymentIndex), { all: 5, open: 2, paid: 2, makeup: 0, bye: 1 });
});

test('"all" lists teams to collect first, byes next, paid in their own group', () => {
  const g = groupTeams(base);
  assert.deepEqual(ids(g.main), ['c', 'd', 'b']);
  assert.deepEqual(ids(g.paid), ['a', 'e']);
});

test('held teams stay in place until released', () => {
  const g = groupTeams({ ...base, hold: new Set(['a']) });
  assert.deepEqual(ids(g.main), ['a', 'c', 'd', 'b']);
  assert.deepEqual(ids(g.paid), ['e']);
});

test('filters show one bucket, expanded', () => {
  assert.deepEqual(ids(groupTeams({ ...base, filter: 'open' }).main), ['c', 'd']);
  assert.deepEqual(ids(groupTeams({ ...base, filter: 'paid' }).main), ['a', 'e']);
  assert.deepEqual(ids(groupTeams({ ...base, filter: 'bye' }).main), ['b']);
  assert.deepEqual(groupTeams({ ...base, filter: 'paid' }).paid, []);
});

test('search matches team or captain and works with filters', () => {
  assert.equal(matchesSearch(teams[0], ' sha '), true);
  assert.equal(matchesSearch(teams[0], 'sam'), true);
  assert.equal(matchesSearch(teams[0], 'zz'), false);
  const g = groupTeams({ ...base, query: 'ag' });
  assert.deepEqual(ids(g.main), ['d']);
  assert.deepEqual(ids(g.paid), ['e']);
  assert.deepEqual(ids(groupTeams({ ...base, query: 'ag', filter: 'paid' }).main), ['e']);
});
