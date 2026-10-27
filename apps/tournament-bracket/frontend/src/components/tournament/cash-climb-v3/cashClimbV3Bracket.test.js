import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bracketSizeFor, cashClimbV3Shape, placementProblems, buildCashClimbV3Bracket } from './cashClimbV3Bracket.js';

const ids = (n) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/** A valid placement for test purposes only: the first 2(N-B) entrants play preliminaries, in order. */
function simplePlacement(entrants) {
  const shape = cashClimbV3Shape(entrants.length);
  const preliminary = [];
  for (let k = 0; k < shape.preliminaryMatches; k += 1) preliminary.push([entrants[2 * k], entrants[2 * k + 1]]);
  const main = preliminary.map((_, k) => ({ preliminary: k }));
  entrants.slice(2 * shape.preliminaryMatches).forEach((id) => main.push({ entrant: id }));
  return { preliminary, main };
}

describe('Cash Climb V3 bracket shape', () => {
  it('matches the spec counts for every field size 8-32', () => {
    const expectedB = (n) => (n >= 32 ? 32 : n >= 16 ? 16 : 8);
    for (let n = 8; n <= 32; n += 1) {
      const s = cashClimbV3Shape(n);
      const B = expectedB(n);
      assert.equal(s.bracketSize, B, `N${n}`);
      assert.equal(s.preliminaryMatches, n - B);
      assert.equal(s.preliminaryByes, 2 * B - n);
      assert.equal(s.mainOpeningMatches, B / 2);
      assert.deepEqual(s.laterRounds.map((r) => r.matches), B === 8 ? [2, 1] : B === 16 ? [4, 2, 1] : [8, 4, 2, 1]);
      assert.equal(s.laterRounds.at(-1).label, 'Championship');
      assert.equal(2 * s.preliminaryMatches + s.preliminaryByes, n, 'every entrant plays a preliminary or skips it');
      assert.equal(s.preliminaryMatches + s.preliminaryByes, B, 'the main bracket is full');
      const all = s.preliminaryMatches + s.mainOpeningMatches + s.laterRounds.reduce((a, r) => a + r.matches, 0);
      assert.equal(all, n - 1, 'single elimination: one match per eliminated player');
      assert.equal(s.totalMatches, n - 1);
    }
  });

  it('power-of-two fields have no preliminary matches; everyone skips the preliminary round', () => {
    for (const n of [8, 16, 32, 64]) {
      const s = cashClimbV3Shape(n);
      assert.equal(s.preliminaryMatches, 0);
      assert.equal(s.preliminaryByes, n);
    }
  });

  it('computes B by integer doubling for large and edge sizes', () => {
    assert.equal(bracketSizeFor(8), 8);
    assert.equal(bracketSizeFor(15), 8);
    assert.equal(bracketSizeFor(63), 32);
    assert.equal(bracketSizeFor(1024), 1024);
    assert.equal(bracketSizeFor(1025), 1024);
    assert.throws(() => bracketSizeFor(1));
  });
});

describe('Cash Climb V3 explicit placement', () => {
  it('accepts a complete placement and builds every match with its feeds', () => {
    const entrants = ids(11);
    const b = buildCashClimbV3Bracket(entrants, simplePlacement(entrants));
    assert.equal(b.preliminary.length, 3);
    assert.equal(b.opening.length, 4);
    assert.deepEqual(b.later.map((r) => r.matches.length), [2, 1]);
    assert.deepEqual(b.opening[0].slots, [{ winnerOf: 'P1' }, { winnerOf: 'P2' }]);
    assert.deepEqual(b.opening[1].slots, [{ winnerOf: 'P3' }, { entrant: 'p7' }]);
    assert.deepEqual(b.later[1].matches[0].slots, [{ winnerOf: 'L1-1' }, { winnerOf: 'L1-2' }]);
  });

  it('accepts placements for every field size 8-32', () => {
    for (let n = 8; n <= 32; n += 1) assert.deepEqual(placementProblems(ids(n), simplePlacement(ids(n))), [], `N${n}`);
  });

  it('rejects a wrong preliminary count, missing, duplicate or unknown entrants, and bad preliminary references', () => {
    const entrants = ids(11);
    const good = simplePlacement(entrants);
    const has = (placement, text) => assert.ok(placementProblems(entrants, placement).some((p) => p.includes(text)), text);
    has({ ...good, preliminary: good.preliminary.slice(1) }, 'must be 3 preliminary');
    has({ ...good, main: good.main.slice(1) }, 'must have 8 slots');
    has({ ...good, main: good.main.map((s, i) => (i === 7 ? { entrant: 'p4' } : s)) }, 'more than once');
    has({ ...good, main: good.main.map((s, i) => (i === 7 ? { entrant: 'zz' } : s)) }, 'Unknown entrant');
    has({ ...good, main: good.main.map((s, i) => (i === 2 ? { preliminary: 0 } : s)) }, 'feeds more than one');
    has({ ...good, main: good.main.map((s, i) => (i === 2 ? { preliminary: 9 } : s)) }, 'does not exist');
    has({ ...good, main: good.main.map((s, i) => (i === 2 ? {} : s)) }, 'must name an entrant');
    has({ preliminary: [] }, 'needs a preliminary list');
    assert.throws(() => buildCashClimbV3Bracket(entrants, { ...good, preliminary: [] }));
  });
});
