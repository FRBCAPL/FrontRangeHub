import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  weeklyDues,
  matchesToSave,
  money,
  indexPayments,
  owedThrough,
  weekSummary,
  teamsBehind,
  reminderText,
  parseTeamLines,
} from './duezyMath.js';

const teams = [
  { id: 'a', name: 'Sharks' },
  { id: 'b', name: 'Hustlers' },
  { id: 'c', name: 'Nine Lives' },
];

test('weekly dues by team or by player', () => {
  assert.equal(weeklyDues({ dues_amount: 40, dues_basis: 'team' }), 40);
  assert.equal(weeklyDues({ dues_amount: 8, dues_basis: 'player', players_per_match: 5 }), 40);
  assert.equal(weeklyDues({ dues_amount: 7.5, dues_basis: 'player', players_per_match: 3 }), 22.5);
});

test('double play charges dues for each match', () => {
  assert.equal(weeklyDues({ dues_amount: 20, dues_basis: 'team', matches_per_night: 2 }), 40);
  assert.equal(weeklyDues({ dues_amount: 5, dues_basis: 'player', players_per_match: 4, matches_per_night: 2 }), 40);
  assert.equal(weeklyDues({ dues_amount: 20, dues_basis: 'team', matches_per_night: null }), 20);
  assert.deepEqual(matchesToSave({}), {});
  assert.deepEqual(matchesToSave({ matches_per_night: 2 }), { matches_per_night: 2 });
});

test('money formatting', () => {
  assert.equal(money(40), '$40');
  assert.equal(money(22.5), '$22.50');
});

test('owed skips byes, counts partials, and never goes negative', () => {
  const idx = indexPayments([
    { team_id: 'a', week: 1, status: 'paid', amount: 40 },
    { team_id: 'a', week: 2, status: 'bye', amount: 0 },
    { team_id: 'a', week: 3, status: 'partial', amount: 15 },
    { team_id: 'b', week: 1, status: 'paid', amount: 120 },
  ]);
  assert.equal(owedThrough('a', 3, 40, idx), 25);
  assert.equal(owedThrough('a', 4, 40, idx), 65);
  assert.equal(owedThrough('b', 3, 40, idx), 0);
  assert.equal(owedThrough('c', 2, 40, idx), 80);
});

test('week summary', () => {
  const idx = indexPayments([
    { team_id: 'a', week: 2, status: 'paid', amount: 40 },
    { team_id: 'b', week: 2, status: 'partial', amount: 10 },
    { team_id: 'c', week: 2, status: 'bye', amount: 0 },
  ]);
  assert.deepEqual(weekSummary(teams, 2, 40, idx), {
    paid: 1, partial: 1, bye: 1, unpaid: 0, collected: 50, expected: 80,
  });
});

test('teams behind are sorted by amount and the reminder lists them', () => {
  const idx = indexPayments([{ team_id: 'a', week: 1, status: 'paid', amount: 40 }]);
  const behind = teamsBehind(teams, 1, 40, idx);
  assert.deepEqual(behind.map((x) => x.team.name), ['Hustlers', 'Nine Lives']);
  const text = reminderText({ name: 'Tuesday 8-Ball', payment_note: 'Venmo @league' }, 1, behind);
  assert.match(text, /Tuesday 8-Ball dues check after week 1/);
  assert.match(text, /- Hustlers: \$40/);
  assert.match(text, /Venmo @league/);
  assert.equal(reminderText({ name: 'x' }, 1, []), '');
});

test('parse pasted team lines', () => {
  assert.deepEqual(parseTeamLines('Sharks, Bobby K.\n\n  Slop Shots \nA, B, C\nRails, Kim, 719-555-0123\nJets, jo@x.com'), [
    { name: 'Sharks', captain: 'Bobby K.', contact: null },
    { name: 'Slop Shots', captain: null, contact: null },
    { name: 'A', captain: 'B, C', contact: null },
    { name: 'Rails', captain: 'Kim', contact: '719-555-0123' },
    { name: 'Jets', captain: null, contact: 'jo@x.com' },
  ]);
});
