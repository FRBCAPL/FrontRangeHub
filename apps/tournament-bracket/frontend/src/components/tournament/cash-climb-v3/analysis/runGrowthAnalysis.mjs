/**
 * ANALYSIS ONLY (Task 2C). Read-only payout-shape report for candidate minimum growth floors.
 * Run from this folder: node runGrowthAnalysis.mjs [weekly|large|ties]
 */
import { cashClimbV3Config } from '../cashClimbV3Config.js';
import { cashClimbV3Budget } from '../cashClimbV3Budget.js';
import { ladderOptimizerInput } from '../cashClimbV3Ladder.js';
import { selectCashClimbV3Ladder } from '../cashClimbV3Optimizer.js';
import { championShare } from '../cashClimbV3Protection.js';
import { GROWTH_FLOORS, meetsFloor, selectWithGrowthFloor } from './cashClimbV3GrowthSearch.js';
import { collectReferenceTies, referenceUnder } from './cashClimbV3ReferenceTies.js';

const setup = (N, E, R, A) => {
  const c = cashClimbV3Config({ entrants: N, entryFeeCents: E * 100, raceTo: R, addedMoneyCents: A * 100 });
  const budget = cashClimbV3Budget(c);
  return { budget, input: ladderOptimizerInput(budget, c.entryFeeCents) };
};
const fixed = (p) => {
  const before = p.slice(0, -1).reduce((s, v) => s + v, 0);
  const champ = championShare(p[p.length - 1]);
  return { champion: before + champ, runnerUp: before + p[p.length - 1] - champ };
};
const minGrowth = (p) => Math.min(...p.slice(1).map((v, i) => v / p[i]));
const pct = (xs, q) => xs[Math.min(xs.length - 1, Math.floor(xs.length * q))];

function weekly() {
  for (let N = 8; N <= 32; N += 1) {
    const { input } = setup(N, 20, 7, 0);
    const base = selectCashClimbV3Ladder(input);
    const fb = fixed(base.ladder);
    const cells = GROWTH_FLOORS.map((g) => {
      if (meetsFloor(base.ladder, g)) return 'same';
      const r = selectWithGrowthFloor(input, base.reference.ladder, g);
      if (r.status !== 'found') return `INFEASIBLE${r.belowReferenceFirst ? ` (only ${r.belowReferenceFirst.join('/')} below ref first)` : ''}`;
      const f = fixed(r.ladder);
      const d = r.ladder.map((v, i) => v - base.ladder[i]);
      return `${r.ladder.join('/')} [${d.map((x) => (x >= 0 ? `+${x}` : x)).join(',')}] champ ${f.champion - fb.champion >= 0 ? '+' : ''}${f.champion - fb.champion} ru ${f.runnerUp - fb.runnerUp >= 0 ? '+' : ''}${f.runnerUp - fb.runnerUp}`;
    });
    console.log(`| ${N} | ${base.ladder.join('/')} | ${minGrowth(base.ladder).toFixed(2)} | ${fb.champion}/${fb.runnerUp} | ${cells.join(' | ')} |`);
  }
}

function large() {
  const configs = [];
  for (let N = 33; N <= 128; N += 1) {
    for (const E of [20, 50, 100, 125]) for (const R of [5, 7, 13]) for (const A of [0, N * E]) configs.push([N, E, R, A]);
  }
  const base = configs.map(([N, E, R, A]) => {
    const s = setup(N, E, R, A);
    return { key: [N, E, R, A], ...s, sel: selectCashClimbV3Ladder(s.input) };
  });
  const baseGrowth = base.map((b) => minGrowth(b.sel.ladder));
  const refGrowth = base.map((b) => minGrowth(b.sel.reference.ladder));
  console.log(`configs ${configs.length}; baseline min growth ${Math.min(...baseGrowth).toFixed(3)}; reference min growth ${Math.min(...refGrowth).toFixed(3)}`);
  for (const g of GROWTH_FLOORS) {
    let feasible = 0; let infeasible = 0; let changed = 0; let rescued = 0; let refBelow = 0;
    let minG = Infinity; let champLoss = [0, '']; let champLossPct = [0, '']; let firstLoss = [0, ''];
    const times = [];
    const examples = [];
    for (const b of base) {
      if (!meetsFloor(b.sel.reference.ladder, g)) refBelow += 1;
      const t = performance.now();
      const r = meetsFloor(b.sel.ladder, g) ? { status: 'found', ladder: b.sel.ladder } : selectWithGrowthFloor(b.input, b.sel.reference.ladder, g);
      times.push(performance.now() - t);
      if (r.status !== 'found') { infeasible += 1; if (r.belowReferenceFirst) rescued += 1; if (examples.length < 3) examples.push(`${b.key.join('/')} infeasible`); continue; }
      feasible += 1;
      minG = Math.min(minG, minGrowth(r.ladder));
      if (r.ladder.join() === b.sel.ladder.join()) continue;
      changed += 1;
      const dc = fixed(b.sel.ladder).champion - fixed(r.ladder).champion;
      const dcp = dc / fixed(b.sel.ladder).champion;
      const df = b.sel.ladder[0] - r.ladder[0];
      const tag = `${b.key.join('/')} ${b.sel.ladder.join('/')} -> ${r.ladder.join('/')}`;
      if (dc > champLoss[0]) champLoss = [dc, tag];
      if (dcp > champLossPct[0]) champLossPct = [dcp, tag];
      if (df > firstLoss[0]) firstLoss = [df, tag];
    }
    times.sort((a, b) => a - b);
    console.log(JSON.stringify({
      floor: g.label, evaluated: base.length, feasible, infeasible, infeasibleButFeasibleBelowRefFirst: rescued, referenceItselfBelowFloor: refBelow, changed,
      minGrowth: minG.toFixed(3), largestChampionLoss: champLoss, largestChampionLossPct: [(100 * champLossPct[0]).toFixed(2), champLossPct[1]],
      largestFirstWinLoss: firstLoss, ms: { median: pct(times, 0.5).toFixed(1), p99: pct(times, 0.99).toFixed(1), max: times[times.length - 1].toFixed(1) }, examples,
    }));
  }
}

function ties() {
  const configs = [];
  for (let N = 8; N <= 32; N += 1) configs.push([N, 20, 7, 0]);
  for (let N = 33; N <= 128; N += 1) {
    for (const E of [20, 50, 100, 125]) for (const R of [5, 7, 13]) for (const A of [0, N * E]) configs.push([N, E, R, A]);
  }
  let tied = 0;
  const differs = { growth: 0, ratio: 0, champion: 0 };
  const optDiffers = { growth: 0, ratio: 0, champion: 0 };
  const examples = [];
  const t0 = performance.now();
  for (const [N, E, R, A] of configs) {
    const { input } = setup(N, E, R, A);
    const list = collectReferenceTies(input, 50);
    if (list.length < 2) continue;
    tied += 1;
    const lexRef = referenceUnder(list, 'lexicographic');
    const lexOpt = selectWithGrowthFloor(input, lexRef, null).ladder;
    const row = [`${N}/${E}/${R}/${A}`, `${list.length} tied`, `lex ${lexRef.join('/')} -> ${lexOpt.join('/')}`];
    for (const rule of ['growth', 'ratio', 'champion']) {
      const ref = referenceUnder(list, rule);
      if (ref.join() === lexRef.join()) continue;
      differs[rule] += 1;
      const opt = selectWithGrowthFloor(input, ref, null).ladder;
      if (opt.join() !== lexOpt.join()) optDiffers[rule] += 1;
      row.push(`${rule} ${ref.join('/')} -> ${opt.join('/')}`);
    }
    if (examples.length < 12) examples.push(row.join(' | '));
  }
  console.log(JSON.stringify({ configs: configs.length, tied, referenceDiffersFromLex: differs, optimizedDiffersFromLex: optDiffers, ms: (performance.now() - t0).toFixed(0) }));
  examples.forEach((e) => console.log(e));
}

const mode = process.argv[2] || 'weekly';
({ weekly, large, ties })[mode]();
