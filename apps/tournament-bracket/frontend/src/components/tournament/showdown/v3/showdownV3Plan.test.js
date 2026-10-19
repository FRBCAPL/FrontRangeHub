import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildV3Plan, v3PlanProblems, v3PlanChangeProblem, v3FeasibilityProblems } from './showdownV3Plan.js';
import { V3_ENGINE_READY, V3_STARTS_ENABLED } from './showdownV3Format.js';
import { formatFor } from '../showdownFormats.js';

const FEES = [20, 25, 30, 50, 100, 200];

function proofTally(raceTo) {
  const tally = {};
  for (const fee of FEES) for (let g = 5; g <= 15; g += 1) for (let n = 8; n <= 24; n += 1) {
    if (v3FeasibilityProblems({ entrants: n, entryFee: fee, qualifyingGames: g, playoffRaceTo: raceTo }).length) continue;
    const plan = buildV3Plan({ entrants: n, entryFee: fee, qualifyingGames: g, playoffRaceTo: raceTo });
    Object.entries(plan.guarantees.checks).forEach(([k, v]) => {
      (tally[k] ||= { yes: 0, total: 0 }); tally[k].total += 1; if (v.ok) tally[k].yes += 1;
    });
  }
  return tally;
}

describe('V3 locked plan', () => {
  it('records rates, reserves, ladder, tier and trace that add up to the pool', () => {
    const plan = buildV3Plan({ entrants: 16, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5 });
    assert.equal(plan.payoutVersion, 3);
    assert.deepEqual(plan.rates, { r1: 200, r2: 300, playoff: 300 });
    assert.equal(plan.poolCents, 80000);
    assert.deepEqual(plan.reserves, { qualifying: 28000, playoffGames: 16200, playoffGamesPerMatch: 9, ladder: 35800, leftover: 0 });
    assert.equal(plan.championshipTierPct, 150);
    assert.ok(plan.trace.candidates.length > 0 && plan.trace.tiers[0].pct === 150);
    assert.deepEqual(v3PlanProblems(plan), []);
  });

  it('throws for a configuration that cannot meet the payout rules', () => {
    assert.throws(() => buildV3Plan({ entrants: 8, entryFee: 20, qualifyingGames: 15, playoffRaceTo: 5 }), /cannot meet the V3 payout rules/);
    assert.equal(v3FeasibilityProblems({ entrants: 8, entryFee: 20, qualifyingGames: 15, playoffRaceTo: 5 }).length, 1);
  });

  it('refuses any change to the plan after the start', () => {
    const plan = buildV3Plan({ entrants: 12, entryFee: 30, qualifyingGames: 7, playoffRaceTo: 5 });
    assert.equal(v3PlanChangeProblem(plan, buildV3Plan({ entrants: 12, entryFee: 30, qualifyingGames: 7, playoffRaceTo: 5 })), '');
    assert.match(v3PlanChangeProblem(plan, buildV3Plan({ entrants: 12, entryFee: 30, qualifyingGames: 7, playoffRaceTo: 7 })), /locked/);
    const tampered = { ...plan, ladder: { ...plan.ladder, perRound: { ...plan.ladder.perRound, final: plan.ladder.perRound.final + 1 } } };
    assert.match(v3PlanChangeProblem(plan, tampered), /locked/);
    assert.ok(v3PlanProblems(tampered).length > 0);
  });

  it('the engine can run started V3 events, but operators still cannot start one', () => {
    assert.equal(V3_ENGINE_READY, true);
    assert.equal(V3_STARTS_ENABLED, false);
    assert.equal(formatFor(3).startable, false);
  });
});

describe('V3 finish-order guarantees', () => {
  it('race to 5 reproduces the research proofs (graded rule)', () => {
    const t = proofTally(5);
    assert.deepEqual(t.championOverRunnerUp, { yes: 1104, total: 1104 });
    assert.deepEqual(t.runnerUpOverSemifinalLoser, { yes: 1084, total: 1104 });
    assert.deepEqual(t.semifinalLoserOverQuarterfinalLoser, { yes: 743, total: 845 });
    assert.deepEqual(t.qualifierOverNonQualifier, { yes: 1104, total: 1104 });
  });

  it('every plan carries a warning for each check it cannot guarantee', () => {
    for (let k = 3; k <= 9; k += 1) {
      const plan = buildV3Plan({ entrants: 20, entryFee: 50, qualifyingGames: 13, playoffRaceTo: k });
      const failing = Object.values(plan.guarantees.checks).filter((c) => !c.ok).length;
      assert.equal(plan.guarantees.warnings.length, failing);
    }
  });

  it('champion over runner-up holds for every feasible configuration at every race length', () => {
    for (let k = 3; k <= 9; k += 1) {
      const t = proofTally(k);
      assert.equal(t.championOverRunnerUp.yes, t.championOverRunnerUp.total, `race to ${k}`);
    }
  });
});
