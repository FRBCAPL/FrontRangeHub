import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildV3EqualRatePlan as buildV3Plan, v3PlanProblems } from './showdownV3Plan.js';
import { selectV3EqualRate, v3EqualRateCandidate } from './showdownV3EqualRate.js';
import { v3Ladder, canRebalance } from './showdownV3Ladder.js';
import { v3ExactBounds, minWinsAtRank } from './showdownV3Bounds.js';
import { v3FinishOrderChecks } from './showdownV3Guarantees.js';
import { v3Field } from './showdownV3Rates.js';
import { ladderProblems, playoffLadder } from '../showdownPayout.js';
import { playoffTemplate, finalRound } from '../showdownPlayoffTemplates.js';

const S = (entrants, entryFee, qualifyingGames, playoffRaceTo) => ({ entrants, entryFee, qualifyingGames, playoffRaceTo });

/** [settings, rate, reserves {qualifying, playoffGames, ladder, leftover}, ladder perRound + bye, semifinal weight, design champion]. */
const GOLDEN = [
  [S(16, 50, 7, 5), 275, [30800, 14850, 34300, 50], { quarterfinal: 45, semifinal: 54, final: 78, bye: 22 }, 120, 20125],
  [S(12, 30, 7, 5), 125, [10500, 4500, 21000, 0], { quarterfinal: 32, semifinal: 38, final: 54, bye: 16 }, 120, 12925],
  [S(8, 20, 15, 5), 25, [3000, 675, 12300, 25], { semifinal: 37, final: 49, bye: 0 }, 120, 9250],
  [S(8, 20, 5, 3), 100, [4000, 1500, 10500, 0], { semifinal: 32, final: 41, bye: 0 }, 120, 8400],
  [S(10, 25, 9, 5), 100, [9000, 2700, 13300, 0], { semifinal: 40, final: 53, bye: 0 }, 120, 11200],
  [S(13, 30, 9, 5), 125, [14625, 4500, 19800, 75], { quarterfinal: 30, semifinal: 36, final: 51, bye: 15 }, 120, 12650],
  [S(15, 40, 9, 7), 175, [23625, 11375, 25000, 0], { quarterfinal: 35, semifinal: 42, final: 62, bye: 17 }, 120, 16125],
  [S(17, 25, 11, 5), 100, [18700, 5400, 18400, 0], { quarterfinal: 24, semifinal: 29, final: 42, bye: 12 }, 120, 10400],
  [S(19, 20, 14, 7), 75, [19950, 6825, 11200, 25], { quarterfinal: 14, semifinal: 16, final: 24, bye: 0 }, 120, 8050],
  [S(20, 20, 15, 7), 75, [22500, 6825, 10600, 75], { quarterfinal: 12, semifinal: 17, final: 24, bye: 0 }, 140, 8075],
  [S(22, 40, 15, 9), 150, [49500, 17850, 20600, 50], { quarterfinal: 23, semifinal: 35, final: 44, bye: 0 }, 150, 16550],
  [S(24, 100, 9, 7), 600, [129600, 54600, 55800, 0], { quarterfinal: 69, semifinal: 83, final: 116, bye: 0 }, 120, 44800],
];

describe('V3 equal-rate golden plans', () => {
  for (const [s, q, [qualifying, playoffGames, ladder, leftover], perRound, w, design] of GOLDEN) {
    it(`${s.entrants} players, $${s.entryFee}, ${s.qualifyingGames} games, race to ${s.playoffRaceTo}`, () => {
      const plan = buildV3Plan(s);
      assert.deepEqual(plan.rates, { r1: q, r2: q, playoff: q });
      assert.deepEqual(
        [plan.reserves.qualifying, plan.reserves.playoffGames, plan.reserves.ladder, plan.reserves.leftover],
        [qualifying, playoffGames, ladder, leftover],
      );
      const { bye, ...rounds } = perRound;
      assert.deepEqual(plan.ladder.perRound, rounds);
      assert.equal(plan.ladder.bye, bye);
      assert.equal(plan.ladder.semifinalWeight, w);
      assert.equal(plan.design.championCents, design);
      assert.equal(plan.design.targetMet, true);
      assert.deepEqual(v3PlanProblems(plan), []);
      assert.deepEqual(buildV3Plan(s), plan, 'same settings, same plan');
    });
  }
});

describe('V3 ladder rebalance', () => {
  const s = S(22, 40, 15, 9);
  const field = v3Field(22);
  const t = field.template;
  const bounds = (ladder) => {
    const b = v3ExactBounds({ template: t, qualifiers: field.qualifiers, ladder, rate: 150, leftoverCents: 50, entrants: 22, qualifyingGames: 15, playoffRaceTo: 9 });
    const coarse = v3FinishOrderChecks({ template: t, ladder, rates: { r1: 150, r2: 150, playoff: 150 }, qualifyingGames: 15, playoffRaceTo: 9 });
    return { runnerUp: b.runnerUp.marginCents, champion: b.champion.marginCents, coarseChampion: coarse.checks.championOverRunnerUp.ok };
  };

  it('the standard weight is the shared ladder, unchanged', () => {
    for (const budget of [100, 206, 1234]) {
      const { semifinalWeight, ...ladder } = v3Ladder(t, budget);
      assert.equal(semifinalWeight, 120);
      assert.deepEqual(ladder, playoffLadder(t.id, budget));
    }
  });

  it('reproduces the specification example: $1.50, standard ladder fails the runner-up rule, weight 150 fixes it', () => {
    const standard = v3Ladder(t, 206);
    assert.deepEqual(standard.perRound, { quarterfinal: 25, semifinal: 30, final: 46 });
    assert.equal(bounds(standard).runnerUp, -150);
    assert.ok(bounds(standard).champion > 0 && bounds(standard).coarseChampion);
    for (const w of [130, 140]) assert.equal(bounds(v3Ladder(t, 206, w)).coarseChampion, false, `weight ${w}`);
    const heavy = v3Ladder(t, 206, 150);
    assert.deepEqual(heavy.perRound, { quarterfinal: 23, semifinal: 35, final: 44 });
    assert.equal(bounds(heavy).runnerUp, 350);
    assert.deepEqual(ladderProblems(heavy), []);
    const c = v3EqualRateCandidate({ ...s }, field, 150);
    assert.equal(c.status, 'valid');
    assert.equal(c.ladder.semifinalWeight, 150);
  });

  it('a rebalanced ladder pays exactly the same budget and still escalates', () => {
    for (const id of ['p5', 'p6', 'p7', 'p8']) {
      const tpl = playoffTemplate(id);
      for (let budget = 40; budget <= 2000; budget += 7) {
        for (const w of [130, 140, 150]) {
          let ladder;
          try { ladder = v3Ladder(tpl, budget, w); } catch { continue; }
          assert.deepEqual(ladderProblems(ladder), [], `${id} $${budget} w${w}`);
          const paid = tpl.rounds.reduce((sum, r) => sum + ladder.perRound[r.key] * r.matches, 0) + ladder.bye * tpl.byes;
          assert.equal(paid, budget);
        }
      }
    }
  });

  it('the 4-player layout is never rebalanced', () => {
    const t4 = v3Field(8).template;
    assert.equal(canRebalance(t4), false);
    assert.throws(() => v3Ladder(t4, 100, 130), /cannot be rebalanced/);
  });
});

/** Every hard rule (spec H1–H6), re-checked on the locked plan without the selection code. */
function hardProblems(s, plan) {
  const out = [];
  const field = v3Field(s.entrants);
  const t = field.template;
  const q = plan.rates.r1;
  const r = plan.reserves;
  const pool = s.entrants * s.entryFee * 100;
  if (!(q > 0 && q % 25 === 0 && plan.rates.r2 === q && plan.rates.playoff === q)) out.push('rate');
  if (r.qualifying !== s.entrants * s.qualifyingGames * q) out.push('qualifying reserve');
  if (r.playoffGames !== field.playoffMatches * (2 * s.playoffRaceTo - 1) * q) out.push('playoff reserve');
  if (r.qualifying + r.playoffGames + r.ladder + r.leftover !== pool || r.leftover < 0 || r.leftover > 99) out.push('100%');
  if (r.qualifying * 100 > 60 * pool) out.push('qualifying cap');
  if (ladderProblems(plan.ladder).length || plan.ladder.budget * 100 !== r.ladder) out.push('ladder');
  if (plan.ladder.perRound[t.rounds[0].key] * 2 < s.entryFee) out.push('opening minimum');
  if (plan.ladder.perRound[finalRound(t).key] < s.entryFee) out.push('championship minimum');
  const b = v3ExactBounds({ template: t, qualifiers: field.qualifiers, ladder: plan.ladder, rate: q, leftoverCents: r.leftover, entrants: s.entrants, qualifyingGames: s.qualifyingGames, playoffRaceTo: s.playoffRaceTo });
  const coarse = v3FinishOrderChecks({ template: t, ladder: plan.ladder, rates: plan.rates, qualifyingGames: s.qualifyingGames, playoffRaceTo: s.playoffRaceTo });
  if (!(b.champion.marginCents > 0) || !coarse.checks.championOverRunnerUp.ok) out.push('champion over runner-up');
  if (!(b.runnerUp.marginCents > 0)) out.push('runner-up over semifinal loser');
  return out;
}

describe('V3 equal-rate hard rules on the supported grid (sampled fees; the full grid is in the spec check)', () => {
  for (const fee of [20, 37, 100]) {
    it(`entry $${fee}: every entrant count, game count and race length starts and meets every hard rule`, () => {
      for (let n = 8; n <= 24; n += 1) for (let g = 5; g <= 15; g += 1) for (let k = 3; k <= 9; k += 1) {
        const s = S(n, fee, g, k);
        const plan = buildV3Plan(s);
        assert.deepEqual(hardProblems(s, plan), [], `${n}/${fee}/${g}/${k}`);
        assert.ok(plan.design.championCents >= 4 * fee * 100, `${n}/${fee}/${g}/${k} design target`);
      }
    });
  }

  it('the chosen rate is the largest valid 25\u00a2 step whose design champion reaches 4\u00d7 the fee', () => {
    for (const n of [8, 12, 16, 22]) for (const g of [5, 10, 15]) for (const k of [3, 6, 9]) for (const fee of [20, 50]) {
      const s = S(n, fee, g, k);
      const sel = selectV3EqualRate(s);
      const field = v3Field(n);
      for (let q = sel.choice.q + 25; ; q += 25) {
        const c = v3EqualRateCandidate(sel.settings, field, q);
        if (c.status === 'qualifying-above-cap' || c.status === 'over-budget') break;
        assert.ok(c.status !== 'valid' || c.designChampionCents < 4 * fee * 100, `${n}/${fee}/${g}/${k} at ${q}\u00a2`);
      }
    }
  });
});

/** Every qualifying result of an N-player circle with G-game matches: calls back with each player's wins. */
function everyQualifying(n, g, cb) {
  const a = new Array(n).fill(0);
  const wins = new Array(n);
  for (;;) {
    for (let i = 0; i < n; i += 1) wins[i] = a[i] + (g - a[(i + n - 1) % n]);
    cb(wins);
    let i = 0;
    while (i < n && a[i] === g) { a[i] = 0; i += 1; }
    if (i === n) return;
    a[i] += 1;
  }
}

describe('V3 finishing-order bounds against brute force', () => {
  for (const [n, g] of [[8, 5], [12, 1], [13, 2], [9, 3]]) {
    it(`${n} players, ${g}-game matches: no player ranked r ever has fewer than the bound's qualifying wins`, () => {
      const lowest = new Array(n).fill(Infinity);
      everyQualifying(n, g, (wins) => {
        const sorted = [...wins].sort((x, y) => y - x);
        for (let r = 0; r < n; r += 1) if (sorted[r] < lowest[r]) lowest[r] = sorted[r];
      });
      for (let r = 1; r <= n; r += 1) assert.ok(lowest[r - 1] >= minWinsAtRank(n, g, r), `rank ${r}: ${lowest[r - 1]} < ${minWinsAtRank(n, g, r)}`);
    });
  }

  it('8 players, 5 games: the exact runner-up and champion margins never exceed the worst case over every result', () => {
    let gap = Infinity;
    everyQualifying(8, 5, (wins) => {
      const top = [...wins].sort((x, y) => y - x).slice(0, 4);
      gap = Math.min(gap, top[3] - top[0]);
    });
    for (const fee of [20, 35, 80]) for (let k = 3; k <= 9; k += 1) {
      const plan = buildV3Plan(S(8, fee, 5, k));
      const q = plan.rates.r1;
      const L = plan.ladder.perRound;
      const worstRunnerUp = gap * q + L.semifinal * 100 + k * q - (k - 1) * q;
      const worstChampion = gap * q + L.final * 100 + k * q - (k - 1) * q + plan.reserves.leftover;
      assert.ok(plan.guarantees.margins.runnerUpCents <= worstRunnerUp, `$${fee} race ${k}`);
      assert.ok(plan.guarantees.margins.championCents <= worstChampion, `$${fee} race ${k}`);
      assert.ok(worstRunnerUp > 0 && worstChampion > 0);
    }
  });
});
