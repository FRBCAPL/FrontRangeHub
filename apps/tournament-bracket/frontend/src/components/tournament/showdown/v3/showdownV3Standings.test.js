import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankV3Standings, resolveV3Qualifiers } from './showdownV3Standings.js';

function ledger(rows) {
  const out = {};
  Object.entries(rows).forEach(([id, [totalCents, actualRound2Wins, opponents]]) => {
    out[id] = { playerId: id, totalCents, actualRound2Wins, opponents };
  });
  return { rows: out };
}
const done = (id, p1, p2, score1, score2) => ({ id, phase: 'qualifying', status: 'completed', result: 'played', p1, p2, score1, score2 });

describe('V3 standings', () => {
  it('ranks by qualifying dollars, credits included', () => {
    const l = ledger({ A: [900, 3, ['B', 'C']], B: [1200, 0, ['A', 'C']], C: [1000, 5, ['A', 'B']] });
    assert.deepEqual(rankV3Standings(l, ['A', 'B', 'C'], []).groups, [['B'], ['C'], ['A']]);
  });

  it('ties: Round 2 games, then head-to-head, then opponent strength', () => {
    const l = ledger({
      A: [1000, 3, ['X', 'Y']], B: [1000, 4, ['X', 'Y']],
      C: [800, 2, ['D', 'X']], D: [800, 2, ['C', 'Y']],
      E: [500, 1, ['X', 'Y']], F: [500, 1, ['X', 'Z']],
      X: [100, 0, []], Y: [300, 0, []], Z: [50, 0, []],
    });
    const matches = [done('q1', 'C', 'D', 3, 4)];
    const s = rankV3Standings(l, ['A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'Z'], matches);
    assert.deepEqual(s.groups.slice(0, 6), [['B'], ['A'], ['D'], ['C'], ['E'], ['F']]);
    const sep = Object.fromEntries(s.rows.map((r) => [r.playerId, r.separatedBy]));
    assert.equal(sep.A, 'actualRound2Wins');
    assert.equal(sep.C, 'headToHead');
    assert.equal(sep.F, 'opponentCents');
  });

  it('a tied head-to-head falls through to opponent strength; an unresolved tie stays grouped', () => {
    const l = ledger({ A: [600, 2, ['B', 'X']], B: [600, 2, ['A', 'X']], X: [0, 0, []] });
    const s = rankV3Standings(l, ['A', 'B', 'X'], [done('q1', 'A', 'B', 3, 3)]);
    assert.deepEqual(s.groups, [['A', 'B'], ['X']]);
  });

  it('withdrawn players rank last; a tie crossing the qualifying line needs a shootout', () => {
    const rows = {};
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((id, i) => { rows[id] = [i < 3 ? 1000 - i : 500, 0, []]; });
    rows.W = [5000, 9, []];
    const l = ledger(rows);
    const all = [...Object.keys(rows)];
    const s = rankV3Standings(l, all, [], { excludedIds: ['W'] });
    assert.deepEqual(s.groups[s.groups.length - 1], ['W']);
    const plan = { qualifiers: 4, byes: 0 };
    const r = resolveV3Qualifiers(plan, s, { withdrawnIds: ['W'] });
    assert.equal(r.status, 'needs-shootout');
    assert.equal(r.cutoff.openSpots, 1);
    assert.equal(r.cutoff.tiedIds.length, 5);
    const shootouts = [{ status: 'complete', kind: 'cutoff', groupIds: r.cutoff.tiedIds, spots: 1, survivors: ['F'] }];
    const done2 = resolveV3Qualifiers(plan, s, { withdrawnIds: ['W'], shootouts });
    assert.deepEqual(done2.qualifierIds, ['A', 'B', 'C', 'F']);
  });

  it('byes go to the top-ranked qualifiers', () => {
    const rows = {};
    Array.from({ length: 12 }, (_, i) => `P${i + 1}`).forEach((id, i) => { rows[id] = [2000 - i * 10, 0, []]; });
    const s = rankV3Standings(ledger(rows), Object.keys(rows), []);
    const r = resolveV3Qualifiers({ qualifiers: 5, byes: 3 }, s);
    assert.deepEqual(r.qualifierIds, ['P1', 'P2', 'P3', 'P4', 'P5']);
    assert.deepEqual(r.byeIds, ['P1', 'P2', 'P3']);
  });
});
