import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createShowdownWithFormat, setupProblems } from '../showdown/showdownEngine.js';
import { v3FeasibilityProblems } from '../showdown/v3/showdownV3Plan.js';
import { candidateList, V3_GAMES, V3_RACES } from './builderCandidates.js';
import { eligibilityProblems, inputProblems } from './builderEligibility.js';

const SIZES = [6, 8, 12, 16, 20, 24, 25];
const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `P${i + 1}`, name: `Player ${i + 1}` }));

function engineProblems(c, { entrants, tables, entryFee }) {
  const settings = c.version === 3
    ? { qualifyingGames: c.qualifyingGames, playoffRaceTo: c.playoffRaceTo }
    : { qualifyingRaceTo: c.qualifyingRaceTo, playoffRaceTo: c.playoffRaceTo };
  const s = createShowdownWithFormat(
    { payoutVersion: c.version, confirmed: true, name: 'Parity', entryFee, tableCount: tables, players: players(entrants), ...settings },
    { now: '2026-01-01T00:00:00.000Z', by: 'test' },
  );
  const p = setupProblems(s);
  if (c.version === 3 && !p.length) p.push(...v3FeasibilityProblems({ entrants, entryFee, qualifyingGames: c.qualifyingGames, playoffRaceTo: c.playoffRaceTo }));
  return p;
}

test('candidate space: Cash Climb, V1, V2 and the full V3 grid; never V4', () => {
  const list = candidateList();
  assert.equal(list.filter((c) => c.family === 'cash-climb').length, 6);
  assert.deepEqual([...new Set(list.filter((c) => c.family === 'showdown').map((c) => c.version))].sort(), [1, 2, 3]);
  assert.equal(list.filter((c) => c.version === 3).length, V3_GAMES.length * V3_RACES.length);
  assert.equal(V3_GAMES[0], 3);
  assert.equal(V3_GAMES.at(-1), 15);
  assert.deepEqual([V3_RACES[0], V3_RACES.at(-1)], [3, 9]);
  assert.equal(new Set(list.map((c) => c.id)).size, list.length);
  assert.ok(list.every((c) => c.version !== 4));
});

test('Showdown eligibility equals setupProblems + v3FeasibilityProblems across the grid', () => {
  const showdown = candidateList().filter((c) => c.family === 'showdown');
  let accepted = 0;
  let rejected = 0;
  SIZES.forEach((entrants) => [20, 30].forEach((entryFee) => [2, 4].forEach((tables) => showdown.forEach((c) => {
    const inputs = { entrants, tables, entryFee };
    const ours = eligibilityProblems(c, inputs);
    const theirs = engineProblems(c, inputs);
    assert.equal(ours.length === 0, theirs.length === 0, `${c.id} at ${entrants}/${tables}/$${entryFee}`);
    assert.deepEqual([...new Set(ours)].sort(), [...new Set(theirs)].sort());
    if (ours.length) rejected += 1; else accepted += 1;
  }))));
  assert.ok(accepted > 0 && rejected > 0, 'the grid exercises both outcomes');
});

test('Showdown fee rules come from the engine; Cash Climb accepts any fee', () => {
  const v1 = candidateList().find((c) => c.id === 'v1');
  const cc = candidateList().find((c) => c.id === 'cc-1-2');
  [19, 20.5].forEach((entryFee) => {
    assert.ok(eligibilityProblems(v1, { entrants: 8, tables: 4, entryFee }).length > 0, String(entryFee));
    assert.deepEqual(eligibilityProblems(cc, { entrants: 8, tables: 4, entryFee }), []);
  });
});

test('Cash Climb uses requireRaceTo and the setup screen\u2019s player and table checks', () => {
  const cc = (raceTo, kohRaceTo) => ({ family: 'cash-climb', id: 'cc', raceTo, kohRaceTo });
  const ok = { entrants: 8, tables: 4, entryFee: 20 };
  assert.deepEqual(eligibilityProblems(cc(1, 1), ok), []);
  assert.deepEqual(eligibilityProblems(cc(21, 21), ok), []);
  assert.deepEqual(eligibilityProblems(cc(0, 2), ok), ['Enter a race-to of at least 1.']);
  assert.deepEqual(eligibilityProblems(cc(2, 22), ok), ['Race-to cannot be more than 21.']);
  assert.deepEqual(eligibilityProblems(cc(1, 2), { ...ok, entrants: 1 }), ['Add at least 2 players.']);
  assert.deepEqual(eligibilityProblems(cc(1, 2), { ...ok, entrants: 2 }), []);
  assert.deepEqual(eligibilityProblems(cc(1, 2), { ...ok, tables: 0 }), ['Enter a table count of at least 1.']);
});

test('tripwire: the Cash Climb setup checks mirrored by the Builder are unchanged', () => {
  const src = readFileSync(new URL('../cash-climb/CashClimbSetup.jsx', import.meta.url), 'utf8');
  assert.match(src, /requireRaceTo\(raceTo\);\s*requireRaceTo\(kohRaceTo\);/);
  assert.match(src, /tables < 1\) \{\s*alert\('Enter a table count of at least 1\.'\)/);
  assert.match(src, /players\.length < 2\) \{\s*alert\('Add at least 2 players\.'\)/);
});

test('Builder input checks', () => {
  assert.deepEqual(inputProblems({ entrants: 8, tables: 4, entryFee: 20, targetMin: 300 }), []);
  assert.equal(inputProblems({ entrants: 8.5, tables: 0, entryFee: -1, targetMin: 0 }).length, 4);
});
