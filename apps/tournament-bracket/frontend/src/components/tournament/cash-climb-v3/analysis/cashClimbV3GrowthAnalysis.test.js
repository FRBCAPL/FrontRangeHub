import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Config } from '../cashClimbV3Config.js';
import { cashClimbV3Budget } from '../cashClimbV3Budget.js';
import { ladderOptimizerInput, ladderProblems } from '../cashClimbV3Ladder.js';
import { selectCashClimbV3Ladder } from '../cashClimbV3Optimizer.js';
import { earningsProtectionProblems } from '../cashClimbV3Protection.js';
import { bruteForceSelect } from '../cashClimbV3BruteForce.js';
import { GROWTH_FLOORS, meetsFloor, meetsRules, selectWithGrowthFloor, selectWithRules } from './cashClimbV3GrowthSearch.js';
import { CANDIDATE_RULES } from './cashClimbV3CandidateRules.js';
import { collectReferenceTies, referenceUnder } from './cashClimbV3ReferenceTies.js';

const setup = (N, E, R = 7, A = 0) => {
  const c = cashClimbV3Config({ entrants: N, entryFeeCents: E * 100, raceTo: R, addedMoneyCents: A * 100 });
  const budget = cashClimbV3Budget(c);
  return { budget, input: ladderOptimizerInput(budget, c.entryFeeCents) };
};

const RET90_ALL = CANDIDATE_RULES.find((c) => c.id === 'ret90-all').rules;

describe('Task 2C/2D analysis tools (not production)', () => {
  it('with the adopted 90% every-stage retention rule, reproduces the production optimizer exactly', () => {
    const cases = [];
    for (let N = 8; N <= 32; N += 1) cases.push([N, 20]);
    cases.push([48, 100], [64, 125, 9], [127, 125], [128, 125], [128, 100, 11, 5000], [128, 125, 13, 20000], [128, 125, 7, 16000]);
    for (const [N, E, R, A] of cases) {
      const { input } = setup(N, E, R, A);
      const prod = selectCashClimbV3Ladder(input);
      assert.deepEqual(selectWithRules(input, prod.reference.ladder, RET90_ALL).ladder, prod.ladder, `N${N} E${E}`);
    }
  });

  it('agrees with the independent brute force under every floor (weekly and small budgets)', () => {
    let infeasible = 0;
    const configs = [];
    for (let N = 8; N <= 32; N += 1) configs.push([N, 20, 7, 0]);
    for (const [E, R, A] of [[10, 5, 0], [13, 9, 7], [17, 3, 0]]) for (let N = 8; N <= 32; N += 3) configs.push([N, E, R, A]);
    for (const [N, E, R, A] of configs) {
      const { budget, input } = setup(N, E, R, A);
      if (budget.laterBudget > 500) continue;
      for (const g of GROWTH_FLOORS) {
        const label = `N${N} E${E} R${R} A${A} ${g.label}`;
        const bf = bruteForceSelect(input, { retention: null, growthFloor: g });
        const r = selectWithGrowthFloor(input, bf.reference, g);
        assert.equal(r.status, bf.status, label);
        assert.deepEqual(r.ladder, bf.ladder, label);
        if (r.status === 'found') {
          assert.deepEqual(ladderProblems(budget, r.ladder), [], label);
          assert.deepEqual(earningsProtectionProblems(bf.reference, r.ladder), [], label);
          assert.ok(meetsFloor(r.ladder, g), label);
        } else infeasible += 1;
      }
    }
    assert.ok(infeasible > 0, 'some floors are infeasible for small fields');
  });

  it('agrees with the brute force under every Task 2D candidate rule, checked by an independent predicate', () => {
    // Independent re-statement of each rule with BigInt cross-multiplication.
    const accept = ({ retention, cap }) => (p, ref) => {
      if (cap && BigInt(p[0]) * BigInt(cap.den) > BigInt(cap.num) * BigInt(ref[0])) return false;
      if (!retention) return true;
      const last = retention.scope === 'first' ? 1 : p.length - 1;
      for (let j = 1; j <= last; j += 1) {
        if (BigInt(p[j]) * BigInt(ref[j - 1]) * BigInt(retention.den) < BigInt(retention.num) * BigInt(ref[j]) * BigInt(p[j - 1])) return false;
      }
      return true;
    };
    let changed = 0;
    const configs = [];
    for (let N = 8; N <= 32; N += 1) configs.push([N, 20, 7, 0]);
    for (const [E, R, A] of [[10, 5, 0], [13, 9, 7], [17, 3, 0], [23, 7, 230]]) for (let N = 8; N <= 32; N += 2) configs.push([N, E, R, A]);
    for (const [N, E, R, A] of configs) {
      const { budget, input } = setup(N, E, R, A);
      if (budget.laterBudget > 600) continue;
      const base = selectWithRules(input, bruteForceSelect(input).reference, {});
      for (const c of CANDIDATE_RULES) {
        const label = `N${N} E${E} R${R} A${A} ${c.id}`;
        const bf = bruteForceSelect(input, { retention: null, accept: accept(c.rules) });
        const r = selectWithRules(input, bf.reference, c.rules);
        assert.equal(r.status, 'found', `${label}: the reference always qualifies`);
        assert.deepEqual(r.ladder, bf.ladder, label);
        assert.deepEqual(ladderProblems(budget, r.ladder), [], label);
        assert.deepEqual(earningsProtectionProblems(bf.reference, r.ladder), [], label);
        assert.ok(meetsRules(r.ladder, bf.reference, c.rules), label);
        assert.deepEqual(selectWithRules(input, bf.reference, c.rules), r, `${label} repeat`);
        if (r.ladder.join() !== base.ladder.join()) changed += 1;
      }
    }
    assert.ok(changed > 0, 'the candidate rules change some small-budget ladders');
  });

  it('collects exactly the tied reference ladders the brute force finds', () => {
    const input = { counts: [4, 2, 1], total: 123, minFirst: 1, ceiling: { units: 30000, decimals: 4, value: 3 } };
    const ties = collectReferenceTies(input);
    assert.deepEqual(ties, bruteForceSelect(input).tiedReferences.sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    assert.deepEqual(referenceUnder(ties, 'lexicographic'), [8, 20, 51]);
    assert.deepEqual(referenceUnder(ties, 'growth'), [8, 20, 51]);
    for (let N = 8; N <= 32; N += 1) {
      const { input: w } = setup(N, 20);
      assert.equal(collectReferenceTies(w).length, bruteForceSelect(w).referenceTies, `N${N}`);
    }
  });
});
