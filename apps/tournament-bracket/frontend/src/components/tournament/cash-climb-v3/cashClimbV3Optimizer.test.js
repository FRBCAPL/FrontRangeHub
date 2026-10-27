import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Config } from './cashClimbV3Config.js';
import { cashClimbV3Budget } from './cashClimbV3Budget.js';
import { ladderOptimizerInput, ladderProblems } from './cashClimbV3Ladder.js';
import { selectCashClimbV3Ladder, CASH_CLIMB_V3_PRODUCTION_OPTIMIZER } from './cashClimbV3Optimizer.js';
import { findReferenceLadder, referenceDeviation } from './cashClimbV3Reference.js';
import { championEarnings, championShare, cumulativeEarnings, protectionProblems } from './cashClimbV3Protection.js';
import { championshipSplit } from './cashClimbV3Championship.js';
import { cashClimbV3Plan } from './cashClimbV3Plan.js';

const setup = (N, E, R = 7, A = 0) => {
  const config = cashClimbV3Config({ entrants: N, entryFeeCents: E * 100, raceTo: R, addedMoneyCents: A * 100 });
  const budget = cashClimbV3Budget(config);
  return { config, budget, input: ladderOptimizerInput(budget, config.entryFeeCents) };
};

/** Asserts every mandatory rule and protection for a selection. */
function assertSelection({ budget, input }, r, label) {
  assert.equal(r.status, 'found', label);
  assert.deepEqual(ladderProblems(budget, r.reference.ladder), [], `${label} reference`);
  assert.deepEqual(ladderProblems(budget, r.ladder), [], `${label} optimized`);
  assert.deepEqual(protectionProblems(r.reference.ladder, r.ladder), [], label);
  assert.ok(r.ladder[0] >= r.reference.ladder[0], `${label}: first award never below the reference`);
  assert.equal(r.championEarnings, championEarnings(r.ladder), label);
  assert.equal(r.meetsPreferredFirst, r.ladder[0] >= input.preferredFirst, label);
}

// $20 entry, no added money, race to 7. [reference, optimized] for every field size 8-32.
const WEEKLY = {
  8: ['22/36', '22/36'], 9: ['24/42', '24/42'], 10: ['27/46', '27/46'], 11: ['29/52', '29/52'],
  12: ['31/58', '32/56'], 13: ['34/62', '34/62'], 14: ['36/68', '37/66'], 15: ['38/74', '39/72'],
  16: ['14/26/52', '14/26/52'], 17: ['15/28/54', '15/28/54'], 18: ['15/30/60', '15/30/60'],
  19: ['16/32/62', '16/32/62'], 20: ['17/33/66', '17/33/66'], 21: ['17/35/72', '17/35/72'],
  22: ['18/37/74', '19/36/72'], 23: ['19/38/78', '20/37/76'], 24: ['19/40/84', '20/39/82'],
  25: ['20/41/88', '20/41/88'], 26: ['21/43/90', '21/43/90'], 27: ['21/45/96', '21/45/96'],
  28: ['22/46/100', '22/46/100'], 29: ['23/48/102', '23/48/102'], 30: ['23/50/108', '24/49/106'],
  31: ['24/51/112', '24/51/112'], 32: ['9/19/41/90', '9/19/41/90'],
};

describe('Cash Climb V3 reference objective', () => {
  it('measures D(p) = min_a sum c_i |p_i - a 2.45^i| exactly, scaled by 980^(K-1)', () => {
    const d = referenceDeviation([4, 2, 1], [14, 26, 52]);
    assert.equal(d.scale, 980n ** 2n);
    // Best a = 26 / 2.45 (anchor j = 1): 4 |14 - 10.6122..| + 0 + |52 - 63.7| = 13.5510.. + 11.7.
    // Scaled by 960400: 4 x |13445600 - 10192000| + 11.7 x 960400 = 13014400 + 11236680.
    assert.equal(d.anchor, 1);
    assert.equal(d.scaled, 24251080n);
    assert.ok(Math.abs(d.dollars - (4 * (14 - 26 / 2.45) + (26 * 2.45 - 52))) < 1e-9);
    assert.equal(referenceDeviation([2, 1], [20, 49]).scaled, 0n, 'an exact 2.45x ladder has zero deviation');
  });

  it('breaks exact ties by the lexicographically smallest ladder (8/20/51 vs 8/21/49)', () => {
    const input = { counts: [4, 2, 1], total: 123, minFirst: 1, ceiling: { units: 30000, decimals: 4, value: 3 } };
    assert.equal(referenceDeviation(input.counts, [8, 20, 51]).scaled, referenceDeviation(input.counts, [8, 21, 49]).scaled);
    assert.deepEqual(findReferenceLadder(input).ladder, [8, 20, 51]);
  });

  it('reports no ladder for an infeasible budget', () => {
    const input = { counts: [4, 2, 1], total: 4 * 25 + 2 * 26 + 26, minFirst: 25, ceiling: { units: 20000, decimals: 4, value: 2 } };
    assert.equal(findReferenceLadder(input).status, 'none');
    assert.equal(selectCashClimbV3Ladder(input).status, 'none');
    assert.equal(CASH_CLIMB_V3_PRODUCTION_OPTIMIZER.solve(input), null);
  });
});

describe('Cash Climb V3 optimizer: weekly $20, race to 7, no added money', () => {
  for (let N = 8; N <= 32; N += 1) {
    it(`${N} players: ${WEEKLY[N][0]} -> ${WEEKLY[N][1]}`, () => {
      const s = setup(N, 20);
      const r = selectCashClimbV3Ladder(s.input);
      assertSelection(s, r, `N${N}`);
      assert.equal(r.reference.ladder.join('/'), WEEKLY[N][0]);
      assert.equal(r.ladder.join('/'), WEEKLY[N][1]);
      assert.deepEqual(selectCashClimbV3Ladder(s.input), r, 'repeat calls are identical');
    });
  }

  it('reconciles the five earlier weekly simulation ladders: each is valid, protected, and is the optimized choice', () => {
    const history = { 8: [22, 36], 12: [32, 56], 16: [14, 26, 52], 24: [20, 39, 82], 32: [9, 19, 41, 90] };
    for (const [n, ladder] of Object.entries(history)) {
      const s = setup(Number(n), 20);
      const r = selectCashClimbV3Ladder(s.input);
      assert.deepEqual(ladderProblems(s.budget, ladder), [], `N${n}`);
      assert.deepEqual(protectionProblems(r.reference.ladder, ladder), [], `N${n}`);
      assert.deepEqual(r.ladder, ladder, `N${n}`);
    }
  });
});

describe('Cash Climb V3 optimizer: selection priorities', () => {
  it('raises the first award as far as the 99% champion protection allows (16 players, $100: 67 -> 69)', () => {
    const s = setup(16, 100);
    const r = selectCashClimbV3Ladder(s.input);
    assert.deepEqual(r.reference.ladder, [67, 133, 266]);
    assert.deepEqual(r.ladder, [69, 131, 262]);
    // 70 / 130 / 260 is valid but gives the champion 408 < 99% of 413.
    assert.deepEqual(ladderProblems(s.budget, [70, 130, 260]), []);
    assert.ok(protectionProblems(r.reference.ladder, [70, 130, 260]).some((p) => p.includes('Champion')));
  });

  it('the 98% cumulative protection can bind instead of the champion protection', () => {
    const s = setup(128, 125, 13, 20000);
    const r = selectCashClimbV3Ladder(s.input);
    assert.deepEqual(r.ladder, [95, 210, 462, 1192, 2921, 7294]);
    const c = cumulativeEarnings(r.ladder);
    const cr = cumulativeEarnings(r.reference.ladder);
    assert.ok(100 * c[2] >= 98 * cr[2] && 100 * (c[2] - 1) < 98 * cr[2], 'stage-3 cumulative is at its floor');
  });

  it('champion share matches the championship split, including rounding boundaries', () => {
    for (let a = 1; a <= 3000; a += 1) assert.equal(championShare(a), championshipSplit(a).champion, `$${a}`);
    assert.deepEqual([2, 3, 7, 8, 13].map(championShare), [2, 2, 6, 6, 10]);
  });
});

describe('Cash Climb V3 optimizer: expanded validation', () => {
  it('selects a valid, protected, deterministic ladder across entry fees, races, added money and 8-128 entrants', () => {
    for (const E of [10, 13, 20, 37, 50, 100, 125]) {
      for (const N of [8, 15, 16, 17, 31, 32, 33, 63, 64, 65, 100, 127, 128]) {
        for (const [R, A] of [[5, 0], [7, 0], [11, 0], [7, 7], [9, 1000]]) {
          const s = setup(N, E, R, A);
          const label = `N${N} E${E} R${R} A${A}`;
          assert.deepEqual(s.budget.problems, [], label);
          const r = selectCashClimbV3Ladder(s.input);
          assertSelection(s, r, label);
          assert.deepEqual(selectCashClimbV3Ladder(s.input).ladder, r.ladder, label);
        }
      }
    }
  });

  it('plans reject invalid settings before any ladder is chosen', () => {
    assert.equal(cashClimbV3Plan({ entrants: 7, entryFeeCents: 2000, raceTo: 7 }).status, 'invalid');
    assert.equal(cashClimbV3Plan({ entrants: 16, entryFeeCents: 2050, raceTo: 7 }).status, 'invalid');
  });
});
