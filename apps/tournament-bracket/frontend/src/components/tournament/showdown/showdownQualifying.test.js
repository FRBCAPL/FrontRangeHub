import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCircle, circleMatches, qualifyingScheduleProblems, scheduledOpponents, pairKey } from './showdownQualifying.js';
import { seededRandom } from './showdownRandom.js';

const ids = (n) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

describe('showdown qualifying circle', () => {
  for (let n = 8; n <= 24; n += 1) {
    it(`${n} entrants: N matches, two distinct opponents each, no byes or duplicates`, () => {
      for (let seed = 1; seed <= 25; seed += 1) {
        const players = ids(n);
        const circle = buildCircle(players, seededRandom(seed * 31 + n));
        assert.deepEqual([...circle].sort(), [...players].sort());
        const matches = circleMatches(circle);
        assert.equal(matches.length, n);
        assert.deepEqual(qualifyingScheduleProblems(matches, players), []);
        const opp = scheduledOpponents(matches);
        players.forEach((p) => {
          assert.equal(opp[p].length, 2);
          assert.notEqual(opp[p][0], opp[p][1]);
        });
        assert.equal(new Set(matches.map((m) => pairKey(m.p1, m.p2))).size, n);
      }
    });
  }

  it('is randomized between events', () => {
    const players = ids(12);
    const a = buildCircle(players, seededRandom(1)).join();
    const b = buildCircle(players, seededRandom(2)).join();
    assert.notEqual(a, b);
  });

  it('pairs neighbors including last with first', () => {
    const matches = circleMatches(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    assert.deepEqual(matches.map((m) => `${m.p1}${m.p2}`), ['AB', 'BC', 'CD', 'DE', 'EF', 'FG', 'GH', 'HA']);
  });

  it('rejects duplicate entrants and tiny circles', () => {
    assert.throws(() => buildCircle(['A', 'A', 'B']));
    assert.throws(() => buildCircle(['A', 'B']));
  });

  it('detects a broken schedule', () => {
    const matches = circleMatches(['A', 'B', 'C', 'D']);
    matches[3] = { ...matches[3], p2: 'B' };
    assert.ok(qualifyingScheduleProblems(matches, ['A', 'B', 'C', 'D']).length > 0);
  });
});
