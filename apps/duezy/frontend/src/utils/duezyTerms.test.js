import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSessionLabel, divisionTitle, seasonTerms, seasonWordToSave, sessionLabel } from './duezyTerms.js';

test('season vs session wording', () => {
  assert.deepEqual(seasonTerms(null), { one: 'season', One: 'Season', many: 'seasons', Many: 'Seasons' });
  assert.equal(seasonTerms({ season_word: 'session' }).Many, 'Sessions');
  assert.equal(seasonTerms({ season_word: 'weird' }).one, 'season');
});

test('division title adds its session label', () => {
  assert.equal(divisionTitle({ name: 'Tuesday 8-Ball', session_label: 'Fall 2026' }), 'Tuesday 8-Ball · Fall 2026');
  assert.equal(divisionTitle({ name: 'Darts', session_label: '  ' }), 'Darts');
  assert.equal(divisionTitle({ name: 'Darts' }), 'Darts');
  assert.equal(sessionLabel(null), '');
  assert.equal(cleanSessionLabel(`  ${'x'.repeat(50)}`).length, 40);
});

test('season word only saves once the column exists', () => {
  assert.deepEqual(seasonWordToSave({ name: 'x' }), {});
  assert.deepEqual(seasonWordToSave({ season_word: 'session' }), { season_word: 'session' });
  assert.deepEqual(seasonWordToSave({ season_word: null }), { season_word: 'season' });
});
