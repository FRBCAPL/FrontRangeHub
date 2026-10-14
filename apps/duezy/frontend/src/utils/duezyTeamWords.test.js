import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateOf, entryWords, isSingles } from './duezyTeamWords.js';

test('singles divisions talk about players', () => {
  assert.equal(isSingles({ dues_basis: 'player', players_per_match: 1 }), true);
  assert.equal(isSingles({ dues_basis: 'player', players_per_match: '1' }), true);
  assert.equal(isSingles({ dues_basis: 'player', players_per_match: 4 }), false);
  assert.equal(isSingles({ dues_basis: 'team', players_per_match: 1 }), false);
  assert.equal(isSingles(null), false);
  assert.deepEqual(entryWords(false, 'pool'), { one: 'team', One: 'Team', many: 'teams', Many: 'Teams' });
  assert.equal(entryWords(true, 'darts').One, 'Player');
  assert.equal(entryWords(true, 'golf').many, 'golfers');
});

test('duplicate names ignore case, spaces and the team being edited', () => {
  const names = ['Sharks', 'Cue Crew'];
  assert.equal(duplicateOf(' sharks ', names), 'Sharks');
  assert.equal(duplicateOf('Sharks', names, 'Sharks'), '');
  assert.equal(duplicateOf('Bandits', names), '');
  assert.equal(duplicateOf('  ', names), '');
});
