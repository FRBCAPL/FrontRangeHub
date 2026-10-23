/**
 * Escalating (D10) V3 rate selection. Integer cents, 25¢ steps. One qualifying rate q for both qualifying
 * matches; playoff stage i (1-based) pays q + i × step, an even climb in which every stage pays at least
 * 10% more per game than the stage before.
 *
 *   Qualifying reserve  Q = N × G × q                       (every qualifying game, N matches of G games)
 *   Playoff reserve     P = Σ stage matches × (2k − 1) × stage rate
 *   Bye credits         B = byes × ½ × k × opening-stage rate, to the nearest 25¢ (halves up)
 *   Champion Fund       pool − Q − P − B                    (must not be negative)
 *
 * A candidate is valid when the champion strictly out-earns every other player in the worst case
 * (showdownV3EscalatingBounds.js). Selection: the highest valid q with the smallest step allowed at that q,
 * tried from the affordability ceiling downward; then, at that q, the step is raised 25¢ at a time while the
 * plan stays valid. There is no champion minimum and no match-win pay.
 */
import { v3SettingsProblems, v3Field } from './showdownV3Rates.js';
import { maxPlayoffGames, V3_ESCALATING as D } from './showdownV3Rules.js';
import { v3EscalatingBounds, v3ByeCreditCents } from './showdownV3EscalatingBounds.js';

const U = D.unitCents;

export function v3StageRates(q, step, stages) {
  return Array.from({ length: stages }, (_, i) => q + (i + 1) * step);
}

/** True when every stage pays at least minStepPct more per game than the one before (qualifying first). */
export function climbsEnough(q, rates) {
  let prev = q;
  return rates.every((r) => { const ok = r * 100 >= prev * (100 + D.minStepPct) && r > prev; prev = r; return ok; });
}

/** Smallest even step (a multiple of 25¢) whose climb meets the minimum at qualifying rate q. */
export function v3MinStepCents(q, stages) {
  let step = U;
  while (!climbsEnough(q, v3StageRates(q, step, stages))) step += U;
  return step;
}

/** One (q, step) pair priced and checked. `status` is 'valid', 'over-budget' or 'champion-order'. */
export function v3EscalatingCandidate(s, field, q, step) {
  const N = s.entrants; const G = s.qualifyingGames; const k = s.playoffRaceTo;
  const stages = field.template.rounds;
  const rates = v3StageRates(q, step, stages.length);
  const pool = N * s.entryFee * 100;
  const qualifying = N * G * q;
  const playoffGames = stages.reduce((sum, r, i) => sum + r.matches * maxPlayoffGames(k) * rates[i], 0);
  const byeCredit = field.byes ? v3ByeCreditCents(k, rates[0]) : 0;
  const byeCredits = byeCredit * field.byes;
  const fund = pool - qualifying - playoffGames - byeCredits;
  const base = { q, step, rates, pool, qualifying, playoffGames, byeCredit, byeCredits, fund };
  if (fund < 0) return { ...base, status: 'over-budget' };
  const bounds = v3EscalatingBounds({
    entrants: N, qualifyingGames: G, playoffRaceTo: k, qualifiers: field.qualifiers, byes: field.byes,
    q, stageKeys: stages.map((r) => r.key), rates, byeCreditCents: byeCredit, fundCents: fund,
  });
  return { ...base, bounds, status: bounds.champion.marginCents > 0 ? 'valid' : 'champion-order' };
}

/** Picks q and the climb. Returns { ok, problems, settings, field, choice, trace }. */
export function selectV3Escalating(settings) {
  const s = {
    entrants: Number(settings.entrants),
    entryFee: Number(settings.entryFee),
    qualifyingGames: Number(settings.qualifyingGames),
    playoffRaceTo: Number(settings.playoffRaceTo),
  };
  const problems = v3SettingsProblems(s);
  if (problems.length) return { ok: false, problems, settings: s };
  const field = v3Field(s.entrants);
  const stages = field.template.rounds.length;
  const pool = s.entrants * s.entryFee * 100;
  const slots = s.entrants * s.qualifyingGames + field.playoffMatches * maxPlayoffGames(s.playoffRaceTo);
  const ceiling = Math.floor(pool / slots / U) * U;
  const tried = [];
  let choice = null;
  for (let q = ceiling; q >= U && !choice; q -= U) {
    const c = v3EscalatingCandidate(s, field, q, v3MinStepCents(q, stages));
    tried.push({ rateCents: q, stepCents: c.step, status: c.status });
    if (c.status === 'valid') choice = c;
  }
  if (!choice) {
    return {
      ok: false,
      problems: ['This configuration cannot meet the V3 payout rules: no qualifying rate keeps the champion ahead of every other player. Use fewer qualifying games, a shorter playoff race or a higher entry fee.'],
      settings: s, field, trace: { ceilingRateCents: ceiling, tried: tried.length, higherRejected: tried.slice(0, 5) },
    };
  }
  const minStep = choice.step;
  for (let step = minStep + U; ; step += U) {
    const c = v3EscalatingCandidate(s, field, choice.q, step);
    if (c.status !== 'valid') break;
    choice = c;
  }
  const trace = {
    ceilingRateCents: ceiling,
    tried: tried.length,
    chosenRateCents: choice.q,
    minStepCents: minStep,
    stepCents: choice.step,
    higherRejected: tried.filter((t) => t.rateCents > choice.q).slice(0, 5),
  };
  return { ok: true, problems: [], settings: s, field, choice, trace };
}
