/**
 * V3 playoff ladder with an optional heavier semifinal weight (whole dollars). The standard weight is the
 * shared playoffLadder, unchanged. A rebalanced ladder uses the same arithmetic with only the semifinal
 * weight replaced, and must pass the same ladder rules (escalating rounds, the bye rule, pays the budget):
 *   D2 = Σ 2 × weight × matches + byes × weight(bye round)
 *   round pay = ⌊2 × budget × weight / D2⌋, bye = ⌊opening / 2⌋, the final takes every rounding dollar.
 * Only 8-slot layouts (with a quarterfinal) can be rebalanced; a 4-player layout's semifinal is its opening.
 */
import { playoffLadder, ladderProblems } from '../showdownPayout.js';
import { finalRound } from '../showdownPlayoffTemplates.js';
import { V3_EQUAL_RATE } from './showdownV3Rules.js';

export const canRebalance = (template) => template.rounds.some((r) => r.key === 'quarterfinal');

/** The ladder for `budget` whole dollars with semifinal weight `weight` (×100). Throws when it breaks a ladder rule. */
export function v3Ladder(template, budget, weight = V3_EQUAL_RATE.standardSemifinalWeight) {
  if (weight === V3_EQUAL_RATE.standardSemifinalWeight) {
    return { ...playoffLadder(template.id, budget), semifinalWeight: weight };
  }
  if (!canRebalance(template)) throw new Error('This playoff layout cannot be rebalanced.');
  const rounds = template.rounds.map((r) => (r.key === 'semifinal' ? { ...r, weightX100: weight } : r));
  const byeRound = template.byes ? rounds.find((r) => r.key === template.byeRoundKey) : null;
  const d2 = rounds.reduce((s, r) => s + 2 * r.weightX100 * r.matches, 0) + (byeRound ? template.byes * byeRound.weightX100 : 0);
  const perRound = {};
  rounds.forEach((r) => { perRound[r.key] = Math.floor((2 * budget * r.weightX100) / d2); });
  const bye = byeRound ? Math.floor(perRound[byeRound.key] / 2) : 0;
  const last = finalRound(template);
  const finalBase = perRound[last.key];
  const others = rounds.filter((r) => r.key !== last.key).reduce((s, r) => s + perRound[r.key] * r.matches, 0) + bye * template.byes;
  perRound[last.key] = budget - others;
  const ladder = { templateId: template.id, budget, perRound, bye, byes: template.byes, finalBase, finalRemainder: perRound[last.key] - finalBase, semifinalWeight: weight };
  const problems = ladderProblems(ladder);
  if (problems.length) throw new Error(`The playoff payouts cannot meet the approved rules: ${problems[0]}`);
  return ladder;
}
