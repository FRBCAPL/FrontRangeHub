/**
 * Two-pass search, written as a generator so the worker can pause between simulations to read cancel
 * messages. Steps: { type: 'progress' } after every simulation, one { type: 'preliminary', result } and
 * then one { type: 'final', result }. Only the final result is built from refined estimates.
 *
 * Pass 1 plays every eligible candidate `pass1Runs` times, except:
 *   - a candidate stops early once its P80 must exceed target + 30 + REFINE_BAND_MIN (exact, see certainlyAbove);
 *   - V3 settings longer than one already that far over are skipped (more games or a longer playoff race
 *     never shortens an event; builderSearch.test.js checks no fitting or Close setting is lost).
 * Pass 2 extends the refine set (builderRefine.js) to `pass2Runs`, then keeps refining until every shown
 * option is refined. Run i of a candidate always uses the same seed, so results are repeatable.
 */
import { prepareInputs } from './builderPlan.js';
import { simulateOnce, summarize, runSeed } from './builderEvaluate.js';
import { recommend } from './builderRank.js';
import { refineIds, shownOptions } from './builderRefine.js';
import { V3_GAMES, V3_RACES } from './builderCandidates.js';
import { percentile } from './builderTiming.js';
import { CLOSE_MARGIN_MIN, PASS1_RUNS, PASS2_RUNS, REFINE_BAND_MIN, UNCALIBRATED_NOTE } from './builderFlags.js';

const SKIP_REASON = 'Over target: a shorter setting of the same kind is already more than 45 minutes over.';

/** True once so many runs exceed `limit` that the P80 of `planned` runs exceeds it whatever the rest do. */
export function certainlyAbove(totals, planned, limit) {
  return totals.filter((t) => t > limit).length >= planned - Math.ceil(0.8 * planned) + 1;
}

export function* searchSteps(raw, { pass1Runs = PASS1_RUNS, pass2Runs = PASS2_RUNS } = {}) {
  const { inputs, problems, a, eligible, ineligible } = prepareInputs(raw);
  if (problems.length) {
    yield { type: 'final', result: { status: 'final', preliminary: false, inputs, problems, ineligible: [], evaluated: [], skipped: [], recommendation: null, note: UNCALIBRATED_NOTE } };
    return;
  }
  const limit = inputs.targetMin + CLOSE_MARGIN_MIN + REFINE_BAND_MIN;
  const entries = new Map();
  const skipped = [];
  let simulations = 0;

  function* extend(c, to, stopAbove) {
    if (!entries.has(c.id)) entries.set(c.id, { c, rs: [], earlyStop: false });
    const e = entries.get(c.id);
    e.earlyStop = false;
    for (let i = e.rs.length; i < to; i += 1) {
      e.rs.push(simulateOnce(c, inputs, a, runSeed(c, inputs, i)));
      simulations += 1;
      yield { type: 'progress', simulations };
      if (stopAbove !== undefined && certainlyAbove(e.rs.map((r) => r.total), to, stopAbove)) { e.earlyStop = true; return; }
    }
  }
  const isOver = (e) => e.earlyStop || percentile(e.rs.map((r) => r.total), 80) > limit;

  for (const c of eligible.filter((x) => x.version !== 3)) yield* extend(c, pass1Runs, limit);
  const v3 = new Map(eligible.filter((x) => x.version === 3).map((x) => [x.id, x]));
  let longerRacesOver = false;
  for (const k of V3_RACES) {
    let rowOver = longerRacesOver;
    for (const [i, g] of V3_GAMES.entries()) {
      const c = v3.get(`v3-${g}-${k}`);
      if (!c) continue;
      if (rowOver) { skipped.push(c); continue; }
      yield* extend(c, pass1Runs, limit);
      if (isOver(entries.get(c.id))) { rowOver = true; if (i === 0) longerRacesOver = true; }
    }
  }

  const assemble = (status) => {
    const evaluated = [...entries.values()].map((e) => ({ ...summarize(e.c, inputs, e.rs), earlyStop: e.earlyStop, refined: e.rs.length >= pass2Runs }));
    return {
      status,
      preliminary: status === 'preliminary',
      inputs,
      assumptions: a,
      problems: [],
      ineligible,
      evaluated,
      skipped: skipped.map((c) => ({ candidate: c, reason: SKIP_REASON })),
      recommendation: recommend(evaluated, inputs.targetMin),
      runs: { pass1: pass1Runs, pass2: pass2Runs, simulations },
      note: UNCALIBRATED_NOTE,
    };
  };

  const preliminary = assemble('preliminary');
  yield { type: 'preliminary', result: preliminary };
  for (const id of refineIds(preliminary.recommendation)) yield* extend(entries.get(id).c, pass2Runs);
  let final = assemble('final');
  for (let missing = shownOptions(final.recommendation).filter((m) => !m.refined); missing.length;
    missing = shownOptions(final.recommendation).filter((m) => !m.refined)) {
    for (const m of missing) yield* extend(entries.get(m.id).c, pass2Runs);
    final = assemble('final');
  }
  yield { type: 'final', result: final };
}

/** Runs the whole search synchronously (tests and benchmarks; the app uses the worker). */
export function searchSync(raw, options, onStep = () => {}) {
  let preliminary = null;
  for (const step of searchSteps(raw, options)) {
    onStep(step);
    if (step.type === 'preliminary') preliminary = step.result;
    if (step.type === 'final') return { preliminary, final: step.result };
  }
  throw new Error('Smart Builder search ended without a final result.');
}
