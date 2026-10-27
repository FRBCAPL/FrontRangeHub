/**
 * ANALYSIS ONLY (Task 2D). Relative growth retention and first-award caps versus the current optimizer.
 * Run from this folder: node runRetentionAnalysis.mjs [summary|weekly|examples]
 */
import { cashClimbV3Config } from '../cashClimbV3Config.js';
import { cashClimbV3Budget } from '../cashClimbV3Budget.js';
import { ladderOptimizerInput } from '../cashClimbV3Ladder.js';
import { selectCashClimbV3Ladder } from '../cashClimbV3Optimizer.js';
import { championEarnings } from '../cashClimbV3Protection.js';
import { selectWithRules } from './cashClimbV3GrowthSearch.js';
import { CANDIDATE_RULES } from './cashClimbV3CandidateRules.js';

const baseFor = ([N, E, R, A]) => {
  const c = cashClimbV3Config({ entrants: N, entryFeeCents: E * 100, raceTo: R, addedMoneyCents: A * 100 });
  const input = ladderOptimizerInput(cashClimbV3Budget(c), c.entryFeeCents);
  return { key: [N, E, R, A], input, sel: selectCashClimbV3Ladder(input) };
};
const ratios = (p) => p.slice(1).map((v, i) => v / p[i]);
const retention = (p, ref) => { const a = ratios(p); const b = ratios(ref); return a.map((r, i) => r / b[i]); };
const pct = (xs, q) => xs[Math.min(xs.length - 1, Math.floor(xs.length * q))];

const weeklyKeys = Array.from({ length: 25 }, (_, i) => [i + 8, 20, 7, 0]);
const largeKeys = [];
for (let N = 33; N <= 128; N += 1) for (const E of [20, 50, 100, 125]) for (const R of [5, 7, 13]) for (const A of [0, N * E]) largeKeys.push([N, E, R, A]);

function evaluate(bases, rule) {
  const out = { feasible: 0, infeasible: 0, changed: 0, firstLoss: [0, ''], champLoss: [0, ''], champLossPct: [0, ''], minGrowth: Infinity, retAvg: 0, retWorst: [Infinity, ''], firstRetAvg: 0, times: [], changedKeys: [] };
  for (const b of bases) {
    const t = performance.now();
    const r = selectWithRules(b.input, b.sel.reference.ladder, rule.rules);
    out.times.push(performance.now() - t);
    if (r.status !== 'found') { out.infeasible += 1; continue; }
    out.feasible += 1;
    const tag = `${b.key.join('/')} ${b.sel.ladder.join('/')} -> ${r.ladder.join('/')}`;
    if (r.ladder.join() !== b.sel.ladder.join()) { out.changed += 1; out.changedKeys.push(tag); }
    const df = b.sel.ladder[0] - r.ladder[0];
    const hc = championEarnings(b.sel.ladder);
    const dc = hc - championEarnings(r.ladder);
    if (df > out.firstLoss[0]) out.firstLoss = [df, tag];
    if (dc > out.champLoss[0]) out.champLoss = [dc, tag];
    if (dc / hc > out.champLossPct[0]) out.champLossPct = [dc / hc, tag];
    out.minGrowth = Math.min(out.minGrowth, ...ratios(r.ladder));
    const ret = retention(r.ladder, b.sel.reference.ladder);
    const worst = Math.min(...ret);
    out.retAvg += worst / bases.length;
    out.firstRetAvg += ret[0] / bases.length;
    if (worst < out.retWorst[0]) out.retWorst = [worst, tag];
  }
  out.times.sort((a, b) => a - b);
  return out;
}

function summary() {
  const all = [...weeklyKeys, ...largeKeys].map(baseFor);
  const weekly = all.slice(0, 25);
  const large = all.slice(25);
  for (const rule of CANDIDATE_RULES) {
    const w = evaluate(weekly, rule);
    const l = evaluate(large, rule);
    console.log(JSON.stringify({
      rule: rule.id,
      weeklyChanged: w.changed,
      weeklyChanges: w.changedKeys,
      largeFeasible: l.feasible,
      largeInfeasible: l.infeasible + w.infeasible,
      largeChanged: l.changed,
      maxFirstLoss: l.firstLoss,
      maxChampLoss: l.champLoss,
      maxChampLossPct: [(100 * l.champLossPct[0]).toFixed(2), l.champLossPct[1]],
      minGrowth: l.minGrowth.toFixed(3),
      avgWorstStageRetention: (100 * l.retAvg).toFixed(1),
      avgFirstStepRetention: (100 * l.firstRetAvg).toFixed(1),
      worstRetention: [(100 * l.retWorst[0]).toFixed(1), l.retWorst[1]],
      ms: { median: pct(l.times, 0.5).toFixed(2), p99: pct(l.times, 0.99).toFixed(1), max: l.times[l.times.length - 1].toFixed(1) },
    }));
  }
}

function examples() {
  const keys = [[16, 20, 7, 0], [24, 20, 7, 0], [32, 20, 7, 0], [64, 125, 7, 0], [127, 125, 7, 0], [128, 125, 7, 0], [128, 125, 7, 16000]];
  for (const key of keys) {
    const b = baseFor(key);
    console.log(`\n${key.join('/')}  reference ${b.sel.reference.ladder.join('/')} (champion ${championEarnings(b.sel.reference.ladder)})`);
    for (const rule of CANDIDATE_RULES) {
      const r = selectWithRules(b.input, b.sel.reference.ladder, rule.rules);
      const ret = retention(r.ladder, b.sel.reference.ladder).map((x) => `${(100 * x).toFixed(0)}%`).join(',');
      console.log(`  ${rule.id.padEnd(13)} ${r.ladder.join('/').padEnd(28)} champ ${championEarnings(r.ladder)}  growth ${ratios(r.ladder).map((x) => x.toFixed(2)).join(',')}  retention ${ret}`);
    }
  }
}

({ summary, examples })[process.argv[2] || 'summary']();
