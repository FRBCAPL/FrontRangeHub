import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildV3EqualRatePlan, v3PlanProblems, v3PlanChangeProblem, v3FeasibilityProblems, v3ExpectedPlan, canonicalJson,
} from './showdownV3Plan.js';
import { buildV3LegacyPlan } from './showdownV3PlanLegacy.js';
import { buildV3EscalatingPlan as buildV3Plan } from './showdownV3PlanEscalating.js';
import { selectV3Escalating, v3EscalatingCandidate, v3MinStepCents } from './showdownV3Escalating.js';
import { v3ByeCreditCents } from './showdownV3EscalatingBounds.js';
import { V3_ESCALATING_FORMULA, V3_EQUAL_RATE_FORMULA, isEscalatingPlan, v3UnitCents, maxPlayoffGames } from './showdownV3Rules.js';
import { playoffTemplate } from '../showdownPlayoffTemplates.js';

const S = (entrants, entryFee, qualifyingGames, playoffRaceTo) => ({ entrants, entryFee, qualifyingGames, playoffRaceTo });

const GOLDEN = [
  [S(17, 20, 3, 5), { t: 'p7', q: 250, byRound: { quarterfinal: 300, semifinal: 350, final: 400 }, step: 50, bye: 750, fund: 2500, margin: 1400, min: 7000 }],
  [S(12, 20, 8, 5), { t: 'p5', q: 125, byRound: { quarterfinal: 175, semifinal: 225, final: 275 }, step: 50, bye: 450, fund: 2550, margin: 825, min: 5500 }],
  [S(16, 50, 7, 5), { t: 'p7', q: 400, byRound: { quarterfinal: 475, semifinal: 550, final: 625 }, step: 75, bye: 1200, fund: 5650, margin: 675, min: 12725 }],
  [S(8, 20, 15, 5), { t: 'p4', q: 75, byRound: { semifinal: 150, final: 225 }, step: 75, bye: 0, fund: 2275, margin: 250, min: 4150 }],
  [S(24, 250, 15, 9), { t: 'p8', q: 1125, byRound: { quarterfinal: 1275, semifinal: 1425, final: 1575 }, step: 150, bye: 0, fund: 33075, margin: 900, min: 71550 }],
  [S(13, 25, 9, 5), { t: 'p5', q: 150, byRound: { quarterfinal: 225, semifinal: 300, final: 375 }, step: 75, bye: 575, fund: 2425, margin: 100, min: 6375 }],
];

describe('D10 escalating plan: golden plans', () => {
  for (const [s, g] of GOLDEN) {
    it(`${s.entrants} players, $${s.entryFee}, ${s.qualifyingGames} games, race to ${s.playoffRaceTo}`, () => {
      const plan = buildV3Plan(s);
      assert.equal(plan.formula, V3_ESCALATING_FORMULA);
      assert.equal(plan.unitCents, 25);
      assert.equal(v3UnitCents(plan), 25);
      assert.ok(isEscalatingPlan(plan));
      assert.equal(plan.templateId, g.t);
      assert.deepEqual(plan.rates, { r1: g.q, r2: g.q, playoff: null, byRound: g.byRound, stepCents: g.step });
      assert.equal(plan.byeCreditCents, g.bye);
      assert.equal(plan.reserves.championFund, g.fund);
      assert.equal(plan.guarantees.margins.championCents, g.margin);
      assert.equal(plan.guarantees.championMinCents, g.min);
      assert.equal(plan.ladder, null);
      assert.equal(plan.guarantees.checks.championOverEveryone.ok, true);
      assert.equal(plan.guarantees.checks.championOverEveryone.hard, true);
      assert.deepEqual(v3PlanProblems(plan), []);
      assert.deepEqual(buildV3Plan(s), plan, 'same settings, same plan');
    });
  }

  it('the 17-player $20 event: reserves add up to the $340 pool', () => {
    const plan = buildV3Plan(S(17, 20, 3, 5));
    assert.deepEqual(plan.reserves, { qualifying: 12750, playoffGames: 18000, playoffGamesPerMatch: 9, byeCredits: 750, championFund: 2500 });
    assert.equal(plan.poolCents, 34000);
    assert.deepEqual(plan.guarantees.margins, { championCents: 1400, runnerUpCents: -650, semifinalOverQuarterfinalCents: -700 });
    assert.equal(plan.guarantees.warnings.length, 2, 'runner-up and semifinal order are reported, not promised');
  });
});

describe('D10 selection rules', () => {
  it('bye credit: half of k games at the opening rate, nearest 25\u00a2, halves rounded up', () => {
    const cases = [[5, 175, 450], [5, 300, 750], [3, 250, 375], [4, 275, 550], [7, 225, 800], [5, 125, 325], [9, 1275, 5750], [3, 25, 50]];
    for (const [k, rate, want] of cases) {
      assert.equal(v3ByeCreditCents(k, rate), want, `k ${k} at ${rate}\u00a2`);
      const exact = (k * rate) / 2;
      assert.ok(Math.abs(want - exact) <= 12.5 && want % 25 === 0);
    }
  });

  it('on a sampled grid: integer 25\u00a2 rates, equal qualifying rate, \u226510% climb per stage, reserves exact, q and step maximal', () => {
    for (const fee of [20, 33, 75, 250]) for (const n of [8, 11, 12, 14, 16, 19, 24]) for (const g of [3, 7, 15]) for (const k of [3, 5, 9]) {
      const s = S(n, fee, g, k);
      const sel = selectV3Escalating(s);
      if (!sel.ok) { assert.ok(v3FeasibilityProblems(s, V3_ESCALATING_FORMULA).length > 0); continue; }
      const plan = buildV3Plan(s);
      const where = `${n}/$${fee}/G${g}/k${k}`;
      const t = playoffTemplate(plan.templateId);
      const stage = t.rounds.map((r) => plan.rates.byRound[r.key]);
      assert.ok([plan.rates.r1, ...stage].every((c) => Number.isInteger(c) && c > 0 && c % 25 === 0), where);
      let prev = plan.rates.r1;
      stage.forEach((r) => { assert.ok(r * 10 >= prev * 11 && r > prev, `${where}: ${prev} \u2192 ${r}`); prev = r; });
      assert.equal(plan.reserves.qualifying, n * g * plan.rates.r1, where);
      assert.equal(plan.reserves.playoffGames, t.rounds.reduce((sum, r, i) => sum + r.matches * (2 * k - 1) * stage[i], 0), where);
      assert.equal(plan.reserves.byeCredits, t.byes * plan.byeCreditCents, where);
      assert.equal(plan.reserves.qualifying + plan.reserves.playoffGames + plan.reserves.byeCredits + plan.reserves.championFund, n * fee * 100, where);
      assert.ok(plan.reserves.championFund >= 0, where);
      assert.ok(plan.guarantees.margins.championCents > 0, where);
      const up = v3EscalatingCandidate(sel.settings, sel.field, plan.rates.r1 + 25, v3MinStepCents(plan.rates.r1 + 25, t.rounds.length));
      assert.notEqual(up.status, 'valid', `${where}: a higher qualifying rate was possible`);
      const steeper = v3EscalatingCandidate(sel.settings, sel.field, plan.rates.r1, plan.rates.stepCents + 25);
      assert.notEqual(steeper.status, 'valid', `${where}: a steeper climb was possible`);
    }
  });

  it('no match-win pay, no 4\u00d7 minimum: the plan has no ladder, tier or design target', () => {
    const plan = buildV3Plan(S(16, 50, 7, 5));
    assert.equal(plan.ladder, null);
    assert.equal(plan.championshipTierPct, null);
    assert.equal(plan.design, undefined);
  });
});

describe('D10 plan validation and versioning', () => {
  const plan = buildV3Plan(S(12, 30, 7, 5));

  it('rejects tampered plans', () => {
    const bad = (p, re) => assert.ok(v3PlanProblems(p).some((x) => re.test(x)), `${re}: ${v3PlanProblems(p).join(' | ')}`);
    const br = plan.rates.byRound;
    bad({ ...plan, rates: { ...plan.rates, r2: plan.rates.r1 + 25 } }, /same positive rate/);
    bad({ ...plan, rates: { ...plan.rates, byRound: { ...br, semifinal: br.quarterfinal } } }, /at least 10% more/);
    bad({ ...plan, rates: { ...plan.rates, byRound: { ...br, final: br.final + 10 } } }, /25\u00a2 steps/);
    bad({ ...plan, byeCreditCents: plan.byeCreditCents + 25 }, /bye credit/);
    bad({ ...plan, unitCents: 50 }, /25\u00a2 units/);
    bad({ ...plan, ladder: { perRound: {} } }, /no match-win ladder/);
    bad({ ...plan, reserves: { ...plan.reserves, championFund: plan.reserves.championFund + 100 } }, /add up/);
    const fund = plan.reserves.championFund;
    const drained = { ...plan, poolCents: plan.poolCents - fund, reserves: { ...plan.reserves, championFund: 0 } };
    bad(drained, /keep the champion ahead/);
    bad({ ...plan, formula: 'escalating-d11' }, /Unknown V3 payout formula/);
  });

  it('a locked plan is re-derived with its own formula; changes are refused; key order does not matter', () => {
    const s = S(12, 30, 7, 5);
    assert.deepEqual(v3ExpectedPlan(plan, s), plan);
    const equal = buildV3EqualRatePlan(s);
    assert.equal(equal.formula, V3_EQUAL_RATE_FORMULA);
    assert.deepEqual(v3ExpectedPlan(equal, s), equal, 'an equal-rate plan stays equal-rate');
    const legacy = buildV3LegacyPlan(s);
    assert.deepEqual(v3ExpectedPlan(legacy, s), legacy, 'an original plan stays original');
    assert.match(v3PlanChangeProblem(equal, plan), /locked/);
    assert.match(v3PlanChangeProblem(plan, equal), /locked/);
    assert.match(v3PlanChangeProblem(plan, { ...plan, byeCreditCents: plan.byeCreditCents + 25 }), /locked/);
    const reorder = (v) => {
      if (Array.isArray(v)) return v.map(reorder);
      if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().reverse().map((k) => [k, reorder(v[k])]));
      return v;
    };
    const reloaded = reorder(JSON.parse(JSON.stringify(plan)));
    assert.notEqual(JSON.stringify(reloaded.rates), JSON.stringify(plan.rates));
    assert.equal(canonicalJson(reloaded), canonicalJson(plan));
    assert.equal(v3PlanChangeProblem(plan, reloaded), '');
    assert.equal(v3PlanChangeProblem(reloaded, v3ExpectedPlan(reloaded, s)), '');
    assert.deepEqual(v3PlanProblems(reloaded), []);
  });

  it('the playoff reserve per match is the longest possible race', () => {
    for (let k = 3; k <= 9; k += 1) assert.equal(buildV3Plan(S(12, 50, 5, k)).reserves.playoffGamesPerMatch, maxPlayoffGames(k));
  });
});
