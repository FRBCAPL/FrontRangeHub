/**
 * Equal-rate V3 rate selection (docs/showdown/SHOWDOWN_V3_PAYOUT_SPEC.md §7). Integer cents throughout.
 * One game rate q for Round 1, Round 2 and the playoffs, tried in 25¢ steps:
 *   Q = N × G × q, P = M × (2k − 1) × q, ladder budget B = ⌊(pool − Q − P) / $1⌋, leftover L = the cents below.
 * Hard rules: the ladder rules, opening win ≥ 50% of F, championship win ≥ 100% of F, the champion strictly
 * out-earns the runner-up (existing finish-order check and the exact bound), and the runner-up strictly
 * out-earns either semifinal loser (exact bound). When the standard ladder breaks only the runner-up rule,
 * semifinal weights 130, 140, 150 are tried in order before the rate is rejected.
 * Design targets (never a reason to reject): qualifying up to 60% of the pool (the search ceiling) and a
 * design champion of 4× the fee. The largest valid q meeting 4× wins; otherwise the valid q with the largest
 * design champion (ties: the smaller q), marked below target.
 */
import { finalRound } from '../showdownPlayoffTemplates.js';
import { v3SettingsProblems, v3Field } from './showdownV3Rates.js';
import { v3FinishOrderChecks } from './showdownV3Guarantees.js';
import { v3Ladder, canRebalance } from './showdownV3Ladder.js';
import { v3ExactBounds } from './showdownV3Bounds.js';
import { V3_EQUAL_RATE as R, maxPlayoffGames } from './showdownV3Rules.js';

/** Lowest total of a champion who won half their qualifying games, every playoff match at full length. */
export function v3DesignChampionCents(template, ladder, q, s, leftoverCents) {
  const all = template.rounds.reduce((sum, r) => sum + ladder.perRound[r.key] * 100, 0);
  const paths = [{ matches: template.rounds.length, ladderCents: all }];
  if (template.byes) paths.push({ matches: template.rounds.length - 1, ladderCents: all - ladder.perRound[template.rounds[0].key] * 100 + ladder.bye * 100 });
  return Math.min(...paths.map((p) => s.qualifyingGames * q + p.matches * s.playoffRaceTo * q + p.ladderCents + leftoverCents));
}

/** Every hard rule for one ladder at rate q. `status` is 'valid' or the first rule broken. */
function checkLadder(s, field, q, ladder, leftoverCents) {
  const t = field.template;
  const opening = ladder.perRound[t.rounds[0].key] * 100;
  const championship = ladder.perRound[finalRound(t).key] * 100;
  const out = { ladder, opening, championship };
  if (opening * 100 < R.openingMinPct * s.entryFee * 100) return { ...out, status: 'opening-below-minimum' };
  if (championship * 100 < R.championshipMinPct * s.entryFee * 100) return { ...out, status: 'championship-below-minimum' };
  const rates = { r1: q, r2: q, playoff: q };
  const finishOrder = v3FinishOrderChecks({ template: t, ladder, rates, qualifyingGames: s.qualifyingGames, playoffRaceTo: s.playoffRaceTo });
  const bounds = v3ExactBounds({
    template: t, qualifiers: field.qualifiers, ladder, rate: q, leftoverCents,
    entrants: s.entrants, qualifyingGames: s.qualifyingGames, playoffRaceTo: s.playoffRaceTo,
  });
  const full = { ...out, finishOrder, bounds };
  if (!finishOrder.checks.championOverRunnerUp.ok || bounds.champion.marginCents <= 0) return { ...full, status: 'champion-order' };
  if (bounds.runnerUp.marginCents <= 0) return { ...full, status: 'runner-up-order' };
  return { ...full, status: 'valid' };
}

/** One rate priced out, with the ladder it would use. */
export function v3EqualRateCandidate(s, field, q) {
  const pool = s.entrants * s.entryFee * 100;
  const qualifying = s.entrants * s.qualifyingGames * q;
  const playoffGames = field.playoffMatches * maxPlayoffGames(s.playoffRaceTo) * q;
  const base = { q, pool, qualifying, playoffGames };
  if (qualifying * 100 > R.qualifyingCapPct * pool) return { ...base, status: 'qualifying-above-cap' };
  const budgetCents = pool - qualifying - playoffGames;
  if (budgetCents < 0) return { ...base, status: 'over-budget' };
  const budget = Math.floor(budgetCents / 100);
  const leftoverCents = budgetCents - budget * 100;
  const priced = { ...base, budgetCents, ladderCents: budget * 100, leftoverCents };
  let standard;
  try { standard = v3Ladder(field.template, budget); } catch (e) { return { ...priced, status: 'ladder-rules', detail: e.message }; }
  let result = checkLadder(s, field, q, standard, leftoverCents);
  if (result.status === 'runner-up-order' && canRebalance(field.template)) {
    for (const w of R.rebalanceSemifinalWeights) {
      let ladder;
      try { ladder = v3Ladder(field.template, budget, w); } catch { continue; }
      const next = checkLadder(s, field, q, ladder, leftoverCents);
      if (next.status === 'valid') { result = next; break; }
    }
  }
  const out = { ...priced, ...result };
  return out.status === 'valid' ? { ...out, designChampionCents: v3DesignChampionCents(field.template, out.ladder, q, s, leftoverCents) } : out;
}

/** Picks the rate. Returns { ok, problems, settings, field, choice, targetMet, trace }. */
export function selectV3EqualRate(settings) {
  const s = {
    entrants: Number(settings.entrants),
    entryFee: Number(settings.entryFee),
    qualifyingGames: Number(settings.qualifyingGames),
    playoffRaceTo: Number(settings.playoffRaceTo),
  };
  const problems = v3SettingsProblems(s);
  if (problems.length) return { ok: false, problems, settings: s };
  const field = v3Field(s.entrants);
  const target = R.championTargetPct * s.entryFee;
  const tried = [];
  let best = null; let fallback = null;
  for (let q = R.unitCents; ; q += R.unitCents) {
    const c = v3EqualRateCandidate(s, field, q);
    if (c.status === 'qualifying-above-cap' || c.status === 'over-budget') break;
    tried.push({ rateCents: q, status: c.status, semifinalWeight: c.ladder?.semifinalWeight ?? null });
    if (c.status !== 'valid') continue;
    if (c.designChampionCents >= target) best = c;
    if (!fallback || c.designChampionCents > fallback.designChampionCents) fallback = c;
  }
  const choice = best || fallback;
  if (!choice) {
    return {
      ok: false,
      problems: ['This configuration cannot meet the V3 payout rules: no game rate pays the playoff minimums with the champion and runner-up protected. Use fewer qualifying games, a shorter playoff race or a higher entry fee.'],
      settings: s, field, trace: { tried: tried.length, valid: 0, higherRejected: tried.slice(0, 5) },
    };
  }
  const trace = {
    tried: tried.length,
    valid: tried.filter((t) => t.status === 'valid').length,
    chosenRateCents: choice.q,
    semifinalWeight: choice.ladder.semifinalWeight,
    targetMet: Boolean(best),
    higherRejected: tried.filter((t) => t.rateCents > choice.q).slice(0, 5),
  };
  return { ok: true, problems: [], settings: s, field, choice, targetMet: Boolean(best), trace };
}
