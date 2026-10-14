import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findStartRow, guessLayout, layoutToTeams, looksPerPlayer, playerRowsToTeams, recallLayout, rememberLayout,
} from './duezyRosterLayout.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
};

test('title rows above the headings are skipped', () => {
  const rows = [['Fall 2026 Roster'], ['Updated Sept 1'], ['Team', 'Captain', 'Phone'], ['Sharks', 'Bobby', '719-555-0123']];
  assert.equal(findStartRow(rows), 2);
  const layout = guessLayout(rows);
  assert.equal(layout.hasHeadings, true);
  assert.deepEqual(layoutToTeams(rows, layout).map((t) => [t.name, t.captain]), [['Sharks', 'Bobby']]);
});

test('one row per player is spotted and grouped; blank team cells mean the team above', () => {
  const rows = [
    ['Team', 'Player', 'Phone', 'Captain?'],
    ['Sharks', 'Ana Ruiz', '', ''],
    ['', 'Bobby King', '7195550123', 'Y'],
    ['', 'Lee Park', '', ''],
    ['Rails', 'Kim Shaw', 'kim@x.com', ''],
    ['Rails', 'Jo Bell', '', ''],
  ];
  const layout = guessLayout(rows);
  assert.equal(layout.perPlayer, true);
  assert.deepEqual(layoutToTeams(rows, layout), [
    { name: 'Sharks', captain: 'Bobby King', contact: '719-555-0123', players: ['Ana Ruiz', 'Lee Park'], division: null },
    { name: 'Rails', captain: 'Kim Shaw', contact: 'kim@x.com', players: ['Jo Bell'], division: null },
  ]);
});

test('player mode: first + last name columns join; a captain-name column wins', () => {
  const kinds = ['name', 'players', 'players', 'captain', 'division'];
  const teams = playerRowsToTeams([
    ['Jets', 'Sam', 'Cole', 'Lee Park', 'Thu'],
    ['Jets', 'Lee', 'Park', '', ''],
  ], kinds);
  assert.deepEqual(teams, [{ name: 'Jets', captain: 'Lee Park', contact: null, players: ['Sam Cole'], division: 'Thu' }]);
});

test('a normal team-per-row sheet stays team-per-row', () => {
  const rows = [['Team', 'Captain', 'Player'], ['Sharks', 'Bobby', 'Ana'], ['Rails', 'Kim', 'Jo'], ['Jets', 'Lee', '']];
  assert.equal(guessLayout(rows).perPlayer, false);
  assert.equal(looksPerPlayer([['A'], ['B']], ['name']), false);
});

test('layouts are remembered by heading row', () => {
  const storage = memoryStorage();
  const heading = ['Squad', 'Who', 'Digits'];
  assert.equal(recallLayout(heading, storage), null);
  rememberLayout(heading, { kinds: ['name', 'captain', 'contact'], perPlayer: false }, storage);
  assert.deepEqual(recallLayout([' squad ', 'WHO', 'Digits'], storage).kinds, ['name', 'captain', 'contact']);
  assert.equal(recallLayout(['Squad', 'Who'], storage), null);
});
