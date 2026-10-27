import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Config } from './cashClimbV3Config.js';
import { cashClimbV3Budget, ladderFeasibility, minimumFirstWin, preferredFirstWin, minimumLadderTotal } from './cashClimbV3Budget.js';
import { openingScoreSplitTable } from './cashClimbV3Opening.js';
import { cashClimbV3Ceiling } from './cashClimbV3Ceiling.js';

const config = (entrants, entry, raceTo, added = 0) => cashClimbV3Config({ entrants, entryFeeCents: entry * 100, addedMoneyCents: added * 100, raceTo });
const maxCombined = (c, preliminary) => Math.max(...openingScoreSplitTable(c, { preliminary }).map((r) => r.winner + r.loser));

describe('Cash Climb V3 budget', () => {
  it('P, T and Q follow the formulas exactly for 8-32 entrants, odd fees, several races and added money', () => {
    for (let n = 8; n <= 32; n += 1) {
      for (const entry of [10, 11, 15, 25, 33, 100, 125]) {
        for (const raceTo of [1, 3, 5, 7, 9]) {
          for (const added of [0, 7, 250]) {
            const c = config(n, entry, raceTo, added);
            const b = cashClimbV3Budget(c);
            const B = n >= 32 ? 32 : n >= 16 ? 16 : 8;
            const M = maxCombined(c, false);
            const H = maxCombined(c, true);
            assert.equal(b.prizePool, n * entry + added);
            assert.equal(b.openingReserve, (n - B) * H + (B / 2) * M, `N${n} E${entry} R${raceTo}`);
            assert.equal(b.laterBudget, b.prizePool - b.openingReserve);
            assert.ok(Number.isInteger(b.laterBudget) && b.laterBudget > 0);
            assert.equal(b.feasibility.status, 'feasible');
            assert.deepEqual(b.problems, []);
          }
        }
      }
    }
  });

  it('$125 entry, race to 7, 12 entrants: 4 preliminaries at $63 and 4 openers at $125', () => {
    const b = cashClimbV3Budget(config(12, 125, 7));
    assert.equal(b.reserves.main.dollars, 125);
    assert.equal(b.reserves.preliminary.dollars, 63);
    assert.equal(b.prizePool, 1500);
    assert.equal(b.openingReserve, 4 * 63 + 4 * 125);
    assert.equal(b.laterBudget, 1500 - 752);
  });

  it('preliminary byes reserve nothing: a power-of-two field reserves only main openers', () => {
    const b = cashClimbV3Budget(config(16, 100, 7));
    assert.equal(b.openingReserve, 8 * 100);
    assert.equal(b.laterBudget, 1600 - 800);
  });

  it('first-win floor and target use exact ceilings', () => {
    assert.deepEqual([minimumFirstWin(1000), preferredFirstWin(1000)], [3, 3]);
    assert.deepEqual([minimumFirstWin(10000), preferredFirstWin(10000)], [25, 30]);
    assert.deepEqual([minimumFirstWin(12500), preferredFirstWin(12500)], [32, 38]);
    assert.deepEqual([minimumFirstWin(3300), preferredFirstWin(3300)], [9, 10]);
  });

  it('feasibility is exact: matches brute force on small budgets', () => {
    const ceiling = cashClimbV3Ceiling({ entrants: 8, entryFeeCents: 1000, addedMoneyCents: 0 });
    const counts = [2, 1];
    for (let total = 1; total <= 80; total += 1) {
      let any = false;
      for (let p1 = 3; p1 <= total; p1 += 1) {
        const p2 = total - 2 * p1;
        if (p2 > p1 && p2 * 100 <= 177 * p1) any = true;
      }
      assert.equal(ladderFeasibility({ counts, total, minFirst: 3, ceiling }).status === 'feasible', any, `total ${total}`);
    }
  });

  it('rejects a budget below the smallest valid ladder', () => {
    const ceiling = cashClimbV3Ceiling({ entrants: 16, entryFeeCents: 10000, addedMoneyCents: 0 });
    const counts = [4, 2, 1];
    const min = minimumLadderTotal(counts, 25);
    assert.equal(min, 4 * 25 + 2 * 26 + 27);
    assert.equal(ladderFeasibility({ counts, total: min - 1, minFirst: 25, ceiling }).status, 'infeasible');
    assert.deepEqual(ladderFeasibility({ counts, total: min, minFirst: 25, ceiling }).witness, [25, 26, 27]);
  });
});
