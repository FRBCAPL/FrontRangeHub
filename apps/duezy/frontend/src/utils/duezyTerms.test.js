import test from 'node:test';
import assert from 'node:assert/strict';
import { groupSeasons, leagueTitle, seasonFieldsToSave, seasonTerms } from './duezyTerms.js';

test('season vs session wording', () => {
  assert.deepEqual(seasonTerms(null), { one: 'season', One: 'Season', many: 'seasons', Many: 'Seasons' });
  assert.equal(seasonTerms({ season_word: 'session' }).Many, 'Sessions');
  assert.equal(seasonTerms({ season_word: 'weird' }).one, 'season');
});

test('league title adds the season label', () => {
  assert.equal(leagueTitle({ name: 'Front Range 8-Ball', season_label: 'Fall 2026' }), 'Front Range 8-Ball · Fall 2026');
  assert.equal(leagueTitle({ name: 'Darts', season_label: '  ' }), 'Darts');
  assert.equal(leagueTitle({ name: 'Darts' }), 'Darts');
});

test('season fields only save once the columns exist', () => {
  assert.deepEqual(seasonFieldsToSave({ name: 'x' }), {});
  assert.deepEqual(seasonFieldsToSave({ season_label: ' Fall 2026 ', season_word: 'session' }), { season_label: 'Fall 2026', season_word: 'session' });
  assert.deepEqual(seasonFieldsToSave({ season_label: '', season_word: null }), { season_label: null, season_word: 'season' });
});

test('seasons group under their newest active league', () => {
  const a1 = { id: 'a1', archived: true, created_at: '2025-01-01' };
  const a2 = { id: 'a2', archived: true, previous_league_id: 'a1', created_at: '2025-06-01' };
  const a3 = { id: 'a3', archived: false, previous_league_id: 'a2', created_at: '2026-01-01' };
  const b1 = { id: 'b1', archived: false, created_at: '2026-02-01' };
  const lone = { id: 'z', archived: true, created_at: '2024-01-01' };
  const { cards, archived } = groupSeasons([a3, b1], [a2, a1, lone]);
  assert.deepEqual(cards.map((c) => [c.league.id, c.past.map((p) => p.id)]), [['a3', ['a2', 'a1']], ['b1', []]]);
  assert.deepEqual(archived.map((l) => l.id), ['z']);
});

test('two active seasons in one family: past goes to the newest; dead families are archived', () => {
  const old = { id: 'o', archived: false, created_at: '2025-01-01' };
  const cur = { id: 'c', archived: false, previous_league_id: 'o', created_at: '2026-01-01' };
  const gone = { id: 'g', archived: true, previous_league_id: 'missing', created_at: '2024-01-01' };
  const prev = { id: 'p', archived: true, previous_league_id: 'g', created_at: '2024-06-01' };
  const { cards, archived } = groupSeasons([cur, old], [gone, prev]);
  assert.deepEqual(cards.map((c) => [c.league.id, c.past.length]), [['c', 0], ['o', 0]]);
  assert.deepEqual(archived.map((l) => l.id), ['p', 'g']);
});

test('a looped link does not hang', () => {
  const x = { id: 'x', archived: false, previous_league_id: 'y', created_at: '2026-01-01' };
  const y = { id: 'y', archived: true, previous_league_id: 'x', created_at: '2025-01-01' };
  const { cards } = groupSeasons([x], [y]);
  assert.equal(cards[0].past.length, 1);
});
