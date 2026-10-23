import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildV3Plan, buildV3EqualRatePlan, v3PlanProblems, v3PlanChangeProblem, v3FeasibilityProblems, v3ExpectedPlan, canonicalJson,
} from './showdownV3Plan.js';
import { buildV3LegacyPlan } from './showdownV3PlanLegacy.js';
import { V3_EQUAL_RATE_FORMULA, v3UnitCents } from './showdownV3Rules.js';
import { V3_ENGINE_READY, V3_STARTS_ENABLED } from './showdownV3Format.js';
import { formatFor } from '../showdownFormats.js';

const FEES = [20, 25, 30, 50, 100, 200];
const S = (entrants, entryFee, qualifyingGames, playoffRaceTo) => ({ entrants, entryFee, qualifyingGames, playoffRaceTo });

function legacyOrNull(settings) {
  try { return buildV3LegacyPlan(settings); } catch { return null; }
}

function proofTally(raceTo) {
  const tally = {};
  for (const fee of FEES) for (let g = 5; g <= 15; g += 1) for (let n = 8; n <= 24; n += 1) {
    const plan = legacyOrNull(S(n, fee, g, raceTo));
    if (!plan) continue;
    Object.entries(plan.guarantees.checks).forEach(([k, v]) => {
      (tally[k] ||= { yes: 0, total: 0 }); tally[k].total += 1; if (v.ok) tally[k].yes += 1;
    });
  }
  return tally;
}

describe('V3 locked plan (original formula, kept for events locked before the equal-rate formula)', () => {
  it('records rates, reserves, ladder, tier and trace that add up to the pool', () => {
    const plan = buildV3LegacyPlan(S(16, 50, 7, 5));
    assert.equal(plan.payoutVersion, 3);
    assert.equal(plan.formula, undefined);
    assert.equal(v3UnitCents(plan), 50);
    assert.deepEqual(plan.rates, { r1: 200, r2: 300, playoff: 300 });
    assert.equal(plan.poolCents, 80000);
    assert.deepEqual(plan.reserves, { qualifying: 28000, playoffGames: 16200, playoffGamesPerMatch: 9, ladder: 35800, leftover: 0 });
    assert.equal(plan.championshipTierPct, 150);
    assert.ok(plan.trace.candidates.length > 0 && plan.trace.tiers[0].pct === 150);
    assert.deepEqual(v3PlanProblems(plan), []);
  });

  it('throws for a configuration that cannot meet the original payout rules', () => {
    assert.throws(() => buildV3LegacyPlan(S(8, 20, 15, 5)), /cannot meet the V3 payout rules/);
  });

  it('a locked original plan is re-derived with the original formula, never the new one', () => {
    const plan = buildV3LegacyPlan(S(12, 30, 7, 5));
    assert.deepEqual(v3ExpectedPlan(plan, S(12, 30, 7, 5)), plan);
    assert.equal(v3PlanChangeProblem(plan, v3ExpectedPlan(plan, S(12, 30, 7, 5))), '');
    assert.match(v3PlanChangeProblem(plan, buildV3Plan(S(12, 30, 7, 5))), /locked/);
  });

  it('still rejects an original plan whose playoff rate differs from Round 2 or is not in 50¢ units', () => {
    const plan = buildV3LegacyPlan(S(12, 30, 7, 5));
    assert.ok(v3PlanProblems({ ...plan, rates: { ...plan.rates, playoff: plan.rates.r2 + 50 } }).some((p) => /Round 2 rate/.test(p)));
    const quarter = { ...plan, rates: { r1: plan.rates.r1 + 25, r2: plan.rates.r2, playoff: plan.rates.playoff } };
    assert.ok(v3PlanProblems(quarter).some((p) => /multiple of 50/.test(p)));
  });

  it('the engine can run started V3 events and operators can start one', () => {
    assert.equal(V3_ENGINE_READY, true);
    assert.equal(V3_STARTS_ENABLED, true);
    assert.equal(formatFor(3).startable, true);
  });
});

describe('V3 finish-order guarantees (original formula)', () => {
  it('race to 5 reproduces the research proofs (graded rule)', () => {
    const t = proofTally(5);
    assert.deepEqual(t.championOverRunnerUp, { yes: 1104, total: 1104 });
    assert.deepEqual(t.runnerUpOverSemifinalLoser, { yes: 1084, total: 1104 });
    assert.deepEqual(t.semifinalLoserOverQuarterfinalLoser, { yes: 743, total: 845 });
    assert.deepEqual(t.qualifierOverNonQualifier, { yes: 1104, total: 1104 });
  });

  it('every plan carries a warning for each check it cannot guarantee', () => {
    for (let k = 3; k <= 9; k += 1) {
      const plan = buildV3LegacyPlan(S(20, 50, 13, k));
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

describe('V3 locked plan (equal-rate formula)', () => {
  it('records one game rate, 25¢ units, reserves, ladder, design champion and trace that add up to the pool', () => {
    const plan = buildV3EqualRatePlan(S(16, 50, 7, 5));
    assert.equal(plan.payoutVersion, 3);
    assert.equal(plan.formula, V3_EQUAL_RATE_FORMULA);
    assert.equal(plan.unitCents, 25);
    assert.equal(v3UnitCents(plan), 25);
    assert.deepEqual(plan.rates, { r1: 275, r2: 275, playoff: 275 });
    assert.deepEqual(plan.reserves, { qualifying: 30800, playoffGames: 14850, playoffGamesPerMatch: 9, ladder: 34300, leftover: 50 });
    assert.deepEqual(plan.ladder.perRound, { quarterfinal: 45, semifinal: 54, final: 78 });
    assert.equal(plan.ladder.bye, 22);
    assert.equal(plan.ladder.semifinalWeight, 120);
    assert.equal(plan.championshipTierPct, null);
    assert.deepEqual(plan.design, { championCents: 20125, championTargetCents: 20000, targetMet: true });
    assert.deepEqual(plan.guarantees.margins, { championCents: 4450, runnerUpCents: 2000 });
    assert.deepEqual(plan.guarantees.warnings, []);
    assert.match(plan.guarantees.scope, /Walkovers, withdrawals during qualifying and operator adjustments are exceptions/);
    assert.equal(plan.trace.chosenRateCents, 275);
    assert.deepEqual(v3PlanProblems(plan), []);
  });

  it('settings the original formula rejected now start', () => {
    assert.equal(legacyOrNull(S(8, 20, 15, 5)), null);
    assert.deepEqual(v3FeasibilityProblems(S(8, 20, 15, 5)), []);
    const plan = buildV3EqualRatePlan(S(8, 20, 15, 5));
    assert.equal(plan.rates.r1, 25);
    assert.deepEqual(v3PlanProblems(plan), []);
  });

  it('rejects settings outside the supported ranges', () => {
    assert.ok(v3FeasibilityProblems(S(7, 20, 7, 5)).length > 0);
    assert.ok(v3FeasibilityProblems(S(12, 19, 7, 5)).length > 0);
    assert.throws(() => buildV3EqualRatePlan(S(25, 20, 7, 5)));
  });

  it('refuses any change to the plan after the start', () => {
    const plan = buildV3EqualRatePlan(S(12, 30, 7, 5));
    assert.equal(v3PlanChangeProblem(plan, buildV3EqualRatePlan(S(12, 30, 7, 5))), '');
    assert.match(v3PlanChangeProblem(plan, buildV3EqualRatePlan(S(12, 30, 7, 7))), /locked/);
    const tampered = { ...plan, ladder: { ...plan.ladder, perRound: { ...plan.ladder.perRound, final: plan.ladder.perRound.final + 1 } } };
    assert.match(v3PlanChangeProblem(plan, tampered), /locked/);
    assert.ok(v3PlanProblems(tampered).length > 0);
    assert.match(v3PlanChangeProblem(plan, { ...plan, formula: undefined }), /locked/);
    assert.match(v3PlanChangeProblem(plan, { ...plan, unitCents: 50 }), /locked/);
  });

  it('rejects unequal rates, rates off the 25¢ grid, a wrong unit and an unknown formula', () => {
    const plan = buildV3EqualRatePlan(S(12, 30, 7, 5));
    const r = plan.rates.r1;
    assert.ok(v3PlanProblems({ ...plan, rates: { r1: r, r2: r + 25, playoff: r + 25 } }).some((p) => /same rate/.test(p)));
    assert.ok(v3PlanProblems({ ...plan, rates: { r1: r + 10, r2: r + 10, playoff: r + 10 } }).some((p) => /multiple of 25/.test(p)));
    assert.ok(v3PlanProblems({ ...plan, unitCents: 50 }).some((p) => /25\u00a2 units/.test(p)));
    assert.ok(v3PlanProblems({ ...plan, formula: 'something-else' }).some((p) => /Unknown V3 payout formula/.test(p)));
    assert.ok(v3PlanProblems({ ...plan, reserves: { ...plan.reserves, leftover: 100, ladder: plan.reserves.ladder - 100 } }).length > 0);
  });

  it('a locked plan reloaded from the database with its keys reordered is still the same plan', () => {
    const reorder = (v) => {
      if (Array.isArray(v)) return v.map(reorder);
      if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().reverse().map((k) => [k, reorder(v[k])]));
      return v;
    };
    for (const plan of [buildV3EqualRatePlan(S(16, 50, 7, 5)), buildV3LegacyPlan(S(16, 50, 7, 5))]) {
      const reloaded = reorder(JSON.parse(JSON.stringify(plan)));
      assert.notEqual(JSON.stringify(reloaded.ladder), JSON.stringify(plan.ladder));
      assert.equal(canonicalJson(reloaded), canonicalJson(plan));
      assert.equal(v3PlanChangeProblem(plan, reloaded), '');
      assert.equal(v3PlanChangeProblem(reloaded, v3ExpectedPlan(reloaded, S(16, 50, 7, 5))), '');
    }
  });
});
