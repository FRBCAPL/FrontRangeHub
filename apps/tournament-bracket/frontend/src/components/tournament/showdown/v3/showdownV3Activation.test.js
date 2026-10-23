import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { V3_D10_FOR_NEW_EVENTS, v3NewEventFormula, v3NewEventsUseD10 } from './showdownV3Activation.js';
import { buildV3Plan, buildV3EqualRatePlan, v3FeasibilityProblems, selectV3ForNewEvent } from './showdownV3Plan.js';
import { buildV3EscalatingPlan } from './showdownV3PlanEscalating.js';
import { v3SettingsProblems, v3LockedPlanProblem } from './showdownV3Event.js';
import { V3_ESCALATING_FORMULA as D10, V3_EQUAL_RATE_FORMULA as EQUAL, isEscalatingPlan } from './showdownV3Rules.js';
import { v3Op, createV3, startV3, runV3, toPlayoffsV3, playPlayoffsV3, money } from './showdownV3WorkflowKit.js';
import { v3PlanPreview, v3PlanView } from '../operator/v3/showdownV3PlanView.js';
import { formatFor } from '../showdownFormats.js';
import { showdownGuideFor } from '../public/guide/showdownGuides.js';
const S = (entrants, entryFee, qualifyingGames, playoffRaceTo) => ({ entrants, entryFee, qualifyingGames, playoffRaceTo });
const GRID = [];
for (const n of [8, 12, 13, 16, 17, 24]) for (const fee of [19, 20, 25, 50]) for (const g of [3, 7, 15]) for (const k of [3, 5, 9]) GRID.push(S(n, fee, g, k));

describe('D10 activation switch', () => {
  it('maps the switch to a formula; new events use it', () => {
    assert.equal(v3NewEventFormula(false), EQUAL);
    assert.equal(v3NewEventFormula(true), D10);
    assert.equal(v3NewEventFormula(), V3_D10_FOR_NEW_EVENTS ? D10 : EQUAL);
    assert.equal(v3NewEventsUseD10(), V3_D10_FOR_NEW_EVENTS);
    assert.equal(buildV3Plan(S(17, 20, 3, 5)).formula, v3NewEventFormula());
    assert.equal(startV3(12, { seed: 2 }).s.payoutPlan.formula, v3NewEventFormula());
  });

  it('either formula can be built explicitly, independent of the switch', () => {
    assert.deepEqual(buildV3Plan(S(17, 20, 3, 5), D10), buildV3EscalatingPlan(S(17, 20, 3, 5)));
    assert.deepEqual(buildV3Plan(S(17, 20, 3, 5), EQUAL), buildV3EqualRatePlan(S(17, 20, 3, 5)));
  });

  it('feasibility, setup checks, the preview and the start all use the same formula', () => {
    for (const s of GRID) {
      const sel = selectV3ForNewEvent(s);
      assert.deepEqual(v3FeasibilityProblems(s), sel.problems, JSON.stringify(s));
      assert.deepEqual(v3SettingsProblems(s), sel.problems.filter((p) => !/Entry fee/.test(p)), JSON.stringify(s));
      if (sel.ok) assert.equal(buildV3Plan(s).formula, v3NewEventFormula());
      else assert.throws(() => buildV3Plan(s));
    }
    const op = v3Op(3);
    const setup = createV3(12, { fee: 20, games: 7, raceTo: 5 }, op);
    const preview = v3PlanPreview(setup).view;
    assert.equal(Boolean(preview.escalating), v3NewEventsUseD10());
    assert.deepEqual(v3PlanView(E.startShowdown(setup, op()).payoutPlan), preview);
  });

  it('the generic V3 copy describes the switch formula', () => {
    const copy = JSON.stringify([formatFor(3).summary, showdownGuideFor(3)]);
    assert.equal(copy.includes('Champion Fund'), v3NewEventsUseD10());
    assert.equal(copy.includes('bonus that grows'), !v3NewEventsUseD10());
  });
});

describe('events keep their own formula whatever the switch says (rollback safety)', () => {
  for (const formula of [D10, EQUAL]) {
    it(`${formula}: loads, displays, resumes from JSON and settles exactly`, () => {
      const { s: po, op } = toPlayoffsV3(13, { seed: 11, formula });
      const reloaded = E.clone(po);
      assert.equal(reloaded.payoutPlan.formula, formula);
      assert.equal(v3LockedPlanProblem(reloaded), '');
      assert.equal(Boolean(v3PlanView(reloaded.payoutPlan).escalating), formula === D10);
      const done = E.completeShowdown(playPlayoffsV3(reloaded, op), op());
      assert.equal(done.status, 'completed');
      assert.equal(v3LockedPlanProblem(done), '');
      assert.equal(E.reconciliationProblem(done), '');
      const m = money(done);
      assert.equal(m.paidCents, m.poolCents);
      assert.equal(isEscalatingPlan(done.payoutPlan), formula === D10);
    });
  }

  it('a completed D10 event reloaded from JSON reports the same money', () => {
    const { s } = runV3(17, { seed: 5, games: 3, formula: D10 });
    const reloaded = E.clone(s);
    assert.deepEqual(money(reloaded).byPlayer, money(s).byPlayer);
    assert.equal(E.reconciliationProblem(reloaded), '');
    assert.equal(v3LockedPlanProblem(reloaded), '');
  });

  it('a started event cannot be switched to the other formula', () => {
    const { s: po, op } = toPlayoffsV3(12, { seed: 4, formula: D10 });
    const s = playPlayoffsV3(po, op);
    const swapped = { ...s, payoutPlan: buildV3EqualRatePlan({ entrants: 12, entryFee: 20, qualifyingGames: 7, playoffRaceTo: 5 }) };
    assert.match(v3LockedPlanProblem(swapped), /locked/);
    assert.throws(() => E.completeShowdown(swapped, op()), /locked|damaged/);
  });
});
