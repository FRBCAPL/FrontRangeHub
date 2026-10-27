import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Config } from './cashClimbV3Config.js';
import { cashClimbV3Budget } from './cashClimbV3Budget.js';
import { explicitLaterRoundLadder, ladderOptimizerInput, ladderProblems } from './cashClimbV3Ladder.js';
import { selectCashClimbV3Ladder } from './cashClimbV3Optimizer.js';
import { earningsProtectionProblems, protectionProblems, retainsGrowth, retentionFloor } from './cashClimbV3Protection.js';
import { bruteForceSelect } from './cashClimbV3BruteForce.js';
import { cashClimbV3Plan } from './cashClimbV3Plan.js';

const setup = (N, E, R = 7, A = 0) => {
  const config = cashClimbV3Config({ entrants: N, entryFeeCents: E * 100, raceTo: R, addedMoneyCents: A * 100 });
  const budget = cashClimbV3Budget(config);
  return { config, budget, input: ladderOptimizerInput(budget, config.entryFeeCents) };
};
const synthetic = (counts, total, units, minFirst = 3) => ({ counts, total, minFirst, ceiling: { units, decimals: 4, value: units / 1e4 } });
/** Exact equality 10 p[j] ref[j-1] = 9 p[j-1] ref[j] at some transition. */
const exactlyBinding = (ref, p) => p.slice(1).some((v, i) => 10 * v * ref[i] === 9 * p[i] * ref[i + 1]);

describe('Cash Climb V3 90% growth retention: the rule', () => {
  it('uses exact integer cross-multiplication, including the equality boundary', () => {
    assert.equal(retainsGrowth(70, 155, 63, 155), true, '127 players: exactly 90%');
    assert.equal(retainsGrowth(70, 154, 63, 155), false);
    assert.equal(retentionFloor(70, 63, 155), 155);
    assert.equal(retentionFloor(75, 63, 155), 167, 'ceil(0.9 x 75 x 155 / 63) = ceil(166.07)');
    assert.equal(retentionFloor(32, 30, 75), 72, 'an exact quotient is not rounded up');
    for (let prev = 1; prev <= 300; prev += 7) {
      for (const [a, b] of [[63, 155], [30, 75], [1043, 2556], [19, 38]]) {
        const f = retentionFloor(prev, a, b);
        assert.ok(retainsGrowth(prev, f, a, b) && !retainsGrowth(prev, f - 1, a, b), `${prev} ${a}/${b}`);
      }
    }
  });
});

describe('Cash Climb V3 90% growth retention: larger events', () => {
  const cases = [
    { label: '64 players, $125', args: [64, 125], ladder: [35, 77, 189, 464, 1140] },
    { label: '127 players, $125', args: [127, 125], ladder: [70, 155, 362, 911, 2276] },
    { label: '128 players, $125, no added money', args: [128, 125], ladder: [35, 56, 129, 328, 805, 2030] },
    { label: '128 players, $125, $16,000 added', args: [128, 125, 7, 16000], ladder: [81, 179, 397, 1022, 2505, 6270] },
  ];
  for (const c of cases) {
    it(`${c.label}: ${c.ladder.join(' / ')}`, () => {
      const s = setup(...c.args);
      const r = selectCashClimbV3Ladder(s.input);
      assert.deepEqual(r.ladder, c.ladder);
      assert.deepEqual(ladderProblems(s.budget, r.ladder), []);
      assert.deepEqual(protectionProblems(r.reference.ladder, r.ladder), []);
      assert.ok(r.growthRetention.every((x) => x >= 90 - 1e-9));
      assert.deepEqual(selectCashClimbV3Ladder(s.input), r, 'repeat calls are identical');
    });
  }

  it('127 players binds the rule exactly at stage 2 (70 -> 155 vs reference 63 -> 155)', () => {
    const r = selectCashClimbV3Ladder(setup(127, 125).input);
    assert.deepEqual(r.reference.ladder, [63, 155, 380, 930, 2278]);
    assert.ok(exactlyBinding(r.reference.ladder, r.ladder));
    assert.ok(Math.abs(r.growthRetention[0] - 90) < 1e-9);
  });

  it('the previous 127-player choice keeps both earnings protections but is rejected for growth only', () => {
    const s = setup(127, 125);
    const old = [75, 139, 373, 911, 2280];
    const ref = selectCashClimbV3Ladder(s.input).reference.ladder;
    assert.deepEqual(ladderProblems(s.budget, old), []);
    assert.deepEqual(earningsProtectionProblems(ref, old), []);
    assert.deepEqual(protectionProblems(ref, old), ['Growth from stage 1 to stage 2 keeps less than 90% of the reference growth.']);
  });

  it('retention and the 98% cumulative protection bind together (128 players, $125, race 13, $20,000 added)', () => {
    const r = selectCashClimbV3Ladder(setup(128, 125, 13, 20000).input);
    assert.deepEqual(r.reference.ladder, [83, 203, 496, 1216, 2981, 7302]);
    assert.equal(r.ladder[1], retentionFloor(95, 83, 203), 'stage 2 sits at its retention floor');
  });
});

describe('Cash Climb V3 90% growth retention vs independent brute force', () => {
  it('matches at exactly binding configurations, where the rule changes the ladder and where it does not', () => {
    for (const [input, ref, ladder] of [
      [synthetic([4, 2, 1], 453, 26000), [30, 75, 183], [32, 72, 181]],
      [synthetic([4, 2, 1], 454, 30000, 1), [30, 75, 184], [32, 72, 182]],
      [synthetic([2, 1], 76, 20000), [19, 38], [20, 36]],
      [synthetic([2, 1], 153, 26000), [34, 85], [36, 81]],
    ]) {
      const label = `${input.counts} ${input.total}`;
      const bf = bruteForceSelect(input);
      const r = selectCashClimbV3Ladder(input);
      assert.deepEqual([bf.reference, bf.ladder], [ref, ladder], `${label} brute`);
      assert.deepEqual([r.reference.ladder, r.ladder], [ref, ladder], `${label} production`);
      assert.ok(exactlyBinding(ref, ladder), label);
      assert.deepEqual(selectCashClimbV3Ladder(input), r, `${label} repeat`);
    }
    const without = bruteForceSelect(synthetic([4, 2, 1], 453, 26000), { retention: null });
    assert.deepEqual(without.ladder, [32, 71, 183], 'without retention the brute force picks a 71 / 30 < 0.9 x 75 / 32 ladder');
  });

  it('agrees on a synthetic sweep, with retention changing and exactly binding some selections', () => {
    let changed = 0;
    let exact = 0;
    for (const counts of [[2, 1], [4, 2, 1]]) {
      for (let total = 40; total <= 470; total += 3) {
        for (const units of [20000, 26000, 30000]) {
          const input = synthetic(counts, total, units);
          const bf = bruteForceSelect(input);
          const r = selectCashClimbV3Ladder(input);
          assert.equal(r.status, bf.status, `${counts} ${total} ${units}`);
          if (bf.status !== 'found') continue;
          assert.deepEqual(r.ladder, bf.ladder, `${counts} ${total} ${units}`);
          if (bruteForceSelect(input, { retention: null }).ladder.join() !== bf.ladder.join()) changed += 1;
          if (exactlyBinding(bf.reference, bf.ladder)) exact += 1;
        }
      }
    }
    assert.ok(changed > 0, 'retention changes some selections');
    assert.ok(exact > 0, 'some selections sit exactly at 90%');
  });
});

describe('Cash Climb V3 explicit ladders: structural validity vs production eligibility', () => {
  const settings = { entrants: 16, entryFeeCents: 10000, raceTo: 7 };

  it('an injected ladder stays structurally valid while eligibility reports the protections', () => {
    const plan = cashClimbV3Plan(settings, { ladder: [70, 130, 260] });
    assert.equal(plan.ladder.status, 'valid');
    assert.deepEqual(plan.ladder.problems, []);
    assert.equal(plan.ladder.ladder.join(), '70,130,260');
    assert.equal(plan.ladder.eligibility.status, 'ineligible');
    assert.deepEqual(plan.ladder.eligibility.reference, [67, 133, 266]);
    assert.ok(plan.ladder.eligibility.problems.some((p) => p.includes('Champion')));
    assert.equal(cashClimbV3Plan(settings, { ladder: [69, 131, 262] }).ladder.eligibility.status, 'eligible');
  });

  it('a growth-only failure is structurally valid but ineligible', () => {
    const s = setup(127, 125);
    const r = explicitLaterRoundLadder(s.budget, [75, 139, 373, 911, 2280], s.config.entryFeeCents);
    assert.equal(r.status, 'valid');
    assert.equal(r.eligibility.status, 'ineligible');
    assert.equal(r.eligibility.problems.length, 1);
    assert.ok(r.eligibility.problems[0].startsWith('Growth from stage 1 to stage 2'));
  });

  it('a structurally invalid ladder is invalid and ineligible', () => {
    const r = cashClimbV3Plan(settings, { ladder: [70, 130, 261] }).ladder;
    assert.equal(r.status, 'invalid');
    assert.equal(r.eligibility.status, 'ineligible');
  });
});
