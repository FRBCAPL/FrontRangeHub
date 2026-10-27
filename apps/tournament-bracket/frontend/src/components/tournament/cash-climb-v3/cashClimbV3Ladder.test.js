import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Config } from './cashClimbV3Config.js';
import { cashClimbV3Budget } from './cashClimbV3Budget.js';
import { cashClimbV3Ceiling, withinCeiling, ceilingFloor } from './cashClimbV3Ceiling.js';
import { ladderProblems, ladderWeightedTotal, proposeLaterRoundLadder, PRODUCTION_LADDER_OPTIMIZER } from './cashClimbV3Ladder.js';
import { EXPERIMENTAL_GEOMETRIC_OPTIMIZER } from './cashClimbV3LadderExperimental.js';
import { cashClimbV3Plan } from './cashClimbV3Plan.js';

const config = (entrants, entry, raceTo, added = 0) => cashClimbV3Config({ entrants, entryFeeCents: entry * 100, addedMoneyCents: added * 100, raceTo });

describe('Cash Climb V3 adaptive ceiling', () => {
  it('r = min(3, 2 + 0.23 log2(N/16) + 0.35 A/(N E))', () => {
    const r = (n, e, a) => cashClimbV3Ceiling({ entrants: n, entryFeeCents: e * 100, addedMoneyCents: a * 100 }).value;
    assert.ok(Math.abs(r(16, 100, 0) - 2) < 1e-12);
    assert.ok(Math.abs(r(8, 100, 0) - 1.77) < 1e-12);
    assert.ok(Math.abs(r(32, 100, 0) - 2.23) < 1e-12);
    const c20 = cashClimbV3Ceiling({ entrants: 20, entryFeeCents: 5000, addedMoneyCents: 0 });
    assert.ok(Math.abs(c20.mathematical - (2 + 0.23 * Math.log2(20 / 16))) < 1e-12);
    assert.equal(r(20, 50, 0), 2.074);
    assert.ok(Math.abs(r(16, 100, 400) - (2 + 0.35 * 400 / 1600)) < 1e-12);
    assert.equal(r(16, 10, 100000), 3);
  });

  it('is exact at the boundary when N is a power of two: 223 <= 2.23 x 100 passes, 224 fails', () => {
    const c = cashClimbV3Ceiling({ entrants: 32, entryFeeCents: 10000, addedMoneyCents: 0 });
    assert.equal(c.exactSource, true);
    assert.equal(c.units, 22300);
    assert.equal(withinCeiling(100, 223, c), true);
    assert.equal(withinCeiling(100, 224, c), false);
    assert.equal(ceilingFloor(100, c), 223);
    const capped = cashClimbV3Ceiling({ entrants: 16, entryFeeCents: 1000, addedMoneyCents: 100000 });
    assert.equal(capped.capped, true);
    assert.equal(ceilingFloor(7, capped), 21);
  });

  it('uses a 4-decimal ceiling rounded down, never above the mathematical value', () => {
    const c = cashClimbV3Ceiling({ entrants: 20, entryFeeCents: 5000, addedMoneyCents: 0 });
    assert.equal(c.exactSource, false);
    assert.equal(c.units, 20740);
    assert.ok(c.value <= c.mathematical);
    assert.equal(withinCeiling(10000, 20740, c), true);
    assert.equal(withinCeiling(10000, 20741, c), false);
    for (let n = 8; n <= 64; n += 1) {
      for (const a of [0, 7, 333, 5000]) {
        const k = cashClimbV3Ceiling({ entrants: n, entryFeeCents: 2300, addedMoneyCents: a * 100 });
        assert.ok(k.value <= k.mathematical + 1e-12, `N${n} A${a}`);
        assert.ok(k.mathematical - k.value < 1e-4 + 1e-12, `N${n} A${a}`);
      }
    }
  });

  it('rounds an exact rational ceiling down: 16 players, $30, $7 added is 2.0051 (2.005104...)', () => {
    const c = cashClimbV3Ceiling({ entrants: 16, entryFeeCents: 3000, addedMoneyCents: 700 });
    assert.equal(c.units, 20051);
  });
});

describe('Cash Climb V3 ladder constraints', () => {
  const budget = cashClimbV3Budget(config(16, 100, 7));
  const ok = budget.feasibility.witness;

  it('the feasibility witness itself meets every constraint', () => {
    assert.deepEqual(ladderProblems(budget, ok), []);
    assert.equal(ladderWeightedTotal(budget.counts, ok), budget.laterBudget);
  });

  it('flags each mandatory constraint', () => {
    const has = (ladder, text) => assert.ok(ladderProblems(budget, ladder).some((p) => p.includes(text)), `${text}: ${ladder}`);
    has([10, 20], 'must have 3 payouts');
    has([100, 0, 400], 'positive whole-dollar');
    has([100.5, 150, 199], 'positive whole-dollar');
    has([24, 100, 504], 'at least $25');
    has([100, 100, 200], 'more than payout 1');
    has([60, 70, 450], 'ceiling');
    has([100, 150, 199], 'not the $800 budget');
  });
});

describe('Cash Climb V3 optimizer interface', () => {
  it('plans use the production optimizer by default, with its reference and protections checked', () => {
    assert.equal(PRODUCTION_LADDER_OPTIMIZER.experimental, false);
    const plan = cashClimbV3Plan({ entrants: 16, entryFeeCents: 10000, raceTo: 7 });
    assert.equal(plan.status, 'valid');
    assert.equal(plan.ladder.status, 'valid');
    assert.deepEqual(plan.ladder.reference, [67, 133, 266]);
    assert.deepEqual(plan.ladder.ladder, [69, 131, 262]);
    assert.deepEqual(plan.ladder.unverified, []);
  });

  it('plans still accept an explicit ladder (validated only) or no optimizer at all', () => {
    const settings = { entrants: 16, entryFeeCents: 10000, raceTo: 7 };
    const explicit = cashClimbV3Plan(settings, { ladder: [70, 130, 260] });
    assert.equal(explicit.ladder.source, 'explicit');
    assert.equal(explicit.ladder.status, 'valid');
    assert.deepEqual(explicit.ladder.ladder, [70, 130, 260]);
    assert.equal(cashClimbV3Plan(settings, { ladder: [70, 130, 261] }).ladder.status, 'invalid');
    assert.equal(cashClimbV3Plan(settings, { optimizer: null }).ladder.status, 'unavailable');
  });

  it('rejects an optimizer ladder that breaks a constraint', () => {
    const budget = cashClimbV3Budget(config(16, 100, 7));
    const liar = { id: 'test-liar', experimental: true, solve: () => [100, 150, 199] };
    const r = proposeLaterRoundLadder(budget, 10000, liar);
    assert.equal(r.status, 'invalid');
    assert.ok(r.problems.length > 0);
  });

  it('EXPERIMENTAL optimizer: is labelled experimental and returns a valid ladder across 8-32 entrants', () => {
    assert.equal(EXPERIMENTAL_GEOMETRIC_OPTIMIZER.experimental, true);
    for (let n = 8; n <= 32; n += 1) {
      for (const entry of [10, 15, 20, 33, 50, 100, 125, 250]) {
        for (const raceTo of [3, 5, 7, 9]) {
          for (const added of [0, 100, 1000]) {
            const c = config(n, entry, raceTo, added);
            const budget = cashClimbV3Budget(c);
            const r = proposeLaterRoundLadder(budget, c.entryFeeCents, EXPERIMENTAL_GEOMETRIC_OPTIMIZER);
            const label = `N${n} E${entry} R${raceTo} A${added}`;
            assert.equal(r.status, 'valid', `${label}: ${r.problems.join(' | ')}`);
            assert.equal(r.optimizer.experimental, true);
            assert.equal(ladderWeightedTotal(budget.counts, r.ladder), budget.laterBudget, label);
            assert.ok(r.ladder[0] >= budget.minimumFirstWin, label);
            for (let i = 1; i < r.ladder.length; i += 1) {
              assert.ok(r.ladder[i] > r.ladder[i - 1], label);
              assert.ok(withinCeiling(r.ladder[i - 1], r.ladder[i], budget.ceiling), label);
            }
          }
        }
      }
    }
  });

  it('EXPERIMENTAL optimizer is deterministic', () => {
    const budget = cashClimbV3Budget(config(24, 100, 7, 200));
    const a = proposeLaterRoundLadder(budget, 10000, EXPERIMENTAL_GEOMETRIC_OPTIMIZER).ladder;
    const b = proposeLaterRoundLadder(budget, 10000, EXPERIMENTAL_GEOMETRIC_OPTIMIZER).ladder;
    assert.deepEqual(a, b);
  });
});
