import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Config } from './cashClimbV3Config.js';
import { cashClimbV3Budget } from './cashClimbV3Budget.js';
import { ladderOptimizerInput } from './cashClimbV3Ladder.js';
import { selectCashClimbV3Ladder } from './cashClimbV3Optimizer.js';
import { referenceDeviation } from './cashClimbV3Reference.js';
import { bruteDeviation, bruteForceSelect } from './cashClimbV3BruteForce.js';

function agree(input, label) {
  const bf = bruteForceSelect(input);
  const r = selectCashClimbV3Ladder(input);
  assert.equal(r.status, bf.status, label);
  if (bf.status !== 'found') return bf;
  assert.deepEqual(r.reference.ladder, bf.reference, `${label} reference`);
  assert.deepEqual(r.ladder, bf.ladder, `${label} optimized`);
  return bf;
}

describe('Cash Climb V3 optimizer vs independent brute force', () => {
  it('selects the same reference and optimized ladders for all 25 weekly $20 configurations', () => {
    for (let N = 8; N <= 32; N += 1) {
      const c = cashClimbV3Config({ entrants: N, entryFeeCents: 2000, raceTo: 7 });
      agree(ladderOptimizerInput(cashClimbV3Budget(c), c.entryFeeCents), `N${N}`);
    }
  });

  it('agrees across odd entry fees, race lengths and added money (small budgets), including optimized-ladder ties', () => {
    let ties = 0;
    let checked = 0;
    for (const E of [10, 11, 13, 17, 23]) {
      for (const [R, A] of [[3, 0], [5, 7], [9, 40]]) {
        for (let N = 8; N <= 32; N += 1) {
          const c = cashClimbV3Config({ entrants: N, entryFeeCents: E * 100, raceTo: R, addedMoneyCents: A * 100 });
          const budget = cashClimbV3Budget(c);
          if (budget.laterBudget > 500) continue;
          const bf = agree(ladderOptimizerInput(budget, c.entryFeeCents), `N${N} E${E} R${R} A${A}`);
          if (bf.optimizedTies > 1) ties += 1;
          checked += 1;
        }
      }
    }
    assert.ok(checked > 300, `checked ${checked}`);
    assert.ok(ties > 0, 'at least one configuration exercises the optimized-ladder lexicographic tie-break');
  });

  it('agrees on synthetic inputs, including exact reference ties', () => {
    for (const counts of [[2, 1], [4, 2, 1]]) {
      for (let total = 20; total <= 130; total += 3) {
        for (const units of [17700, 20000, 26000, 30000]) {
          agree({ counts, total, minFirst: 3, ceiling: { units, decimals: 4, value: units / 1e4 } }, `${counts} ${total} ${units}`);
        }
      }
    }
    for (const [total, units] of [[123, 30000], [244, 26000]]) {
      const tie = agree({ counts: [4, 2, 1], total, minFirst: 1, ceiling: { units, decimals: 4, value: units / 1e4 } }, `tie ${total}`);
      assert.equal(tie.referenceTies, 2, `exact reference tie at $${total}`);
    }
  });

  it('the production exact deviation equals the independent fraction deviation', () => {
    for (const [counts, p] of [[[2, 1], [22, 36]], [[4, 2, 1], [14, 26, 52]], [[8, 4, 2, 1], [9, 19, 41, 90]], [[32, 16, 8, 4, 2, 1], [32, 56, 136, 335, 821, 2010]]]) {
      const prod = referenceDeviation(counts, p);
      const brute = bruteDeviation(counts, p);
      assert.equal(prod.scaled * brute.d, brute.n * prod.scale, p.join('/'));
    }
  });
});
