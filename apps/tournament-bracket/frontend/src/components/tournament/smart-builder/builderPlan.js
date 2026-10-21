/**
 * Smart Builder entry point (pure; not connected to the app): inputs → eligible candidates → seeded
 * estimates → fit classes → recommendation. Longer V3 settings are skipped once a shorter one is already
 * Over, because more qualifying games or a longer playoff race can never make an event shorter.
 */
import { candidateList, V3_GAMES, V3_RACES } from './builderCandidates.js';
import { eligibilityProblems, inputProblems } from './builderEligibility.js';
import { evaluateCandidate } from './builderEvaluate.js';
import { recommend } from './builderRank.js';
import { assumptionsWith } from './builderTiming.js';
import { CLOSE_MARGIN_MIN, DEFAULT_RUNS, UNCALIBRATED_NOTE } from './builderFlags.js';

/** Inputs with defaults, input problems, timing assumptions and the eligible / ineligible split. */
export function prepareInputs({ entrants, tables = 4, entryFee = 20, targetMin, minutesPerGame = 10, field = 'mixed' }) {
  const inputs = { entrants, tables, entryFee, targetMin };
  const problems = inputProblems(inputs);
  if (targetMin === undefined) problems.push('Enter a target time.');
  let a = null;
  try { a = assumptionsWith({ minutesPerGame, field }); } catch (err) { problems.push(err.message); }
  const ineligible = [];
  const eligible = [];
  if (!problems.length) {
    candidateList().forEach((c) => {
      const p = eligibilityProblems(c, inputs);
      if (p.length) ineligible.push({ candidate: c, problems: p }); else eligible.push(c);
    });
  }
  return { inputs, problems, a, eligible, ineligible };
}

export function runSmartBuilder(raw, { runs = DEFAULT_RUNS } = {}) {
  const { inputs, problems, a, eligible, ineligible } = prepareInputs(raw);
  if (problems.length) return { inputs, problems, ineligible: [], evaluated: [], skipped: [], recommendation: null, note: UNCALIBRATED_NOTE };
  const { targetMin } = inputs;

  const evaluated = eligible.filter((c) => c.version !== 3).map((c) => evaluateCandidate(c, inputs, a, { runs }));
  const skipped = [];
  const v3 = new Map(eligible.filter((c) => c.version === 3).map((c) => [c.id, c]));
  const overAt = targetMin + CLOSE_MARGIN_MIN;
  let shortestOverForAllRaces = false;
  for (const k of V3_RACES) {
    if (shortestOverForAllRaces) { V3_GAMES.forEach((g) => v3.has(`v3-${g}-${k}`) && skipped.push(v3.get(`v3-${g}-${k}`))); continue; }
    let over = false;
    V3_GAMES.forEach((g, i) => {
      const c = v3.get(`v3-${g}-${k}`);
      if (!c) return;
      if (over) { skipped.push(c); return; }
      const m = evaluateCandidate(c, inputs, a, { runs });
      evaluated.push(m);
      if (m.p80 > overAt) { over = true; if (i === 0) shortestOverForAllRaces = true; }
    });
  }

  return {
    inputs,
    assumptions: a,
    problems: [],
    ineligible,
    evaluated,
    skipped: skipped.map((c) => ({ candidate: c, reason: 'Over target: a shorter setting of the same kind is already more than 30 minutes over.' })),
    recommendation: recommend(evaluated, targetMin),
    note: UNCALIBRATED_NOTE,
  };
}
