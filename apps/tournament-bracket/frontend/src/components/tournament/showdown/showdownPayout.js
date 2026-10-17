import { MIN_ENTRY_FEE } from './showdownRules.js';
import { fieldRuleFor, unsupportedFieldMessage } from './showdownFieldRules.js';
import { playoffTemplate, finalRound } from './showdownPlayoffTemplates.js';

/** Whole-number validation for an entry fee. Returns an error string or ''. */
export function entryFeeProblem(entryFee) {
  const fee = Number(entryFee);
  if (!Number.isInteger(fee)) return 'Entry fee must be a whole-dollar amount.';
  if (fee < MIN_ENTRY_FEE) return `Entry fee must be at least $${MIN_ENTRY_FEE}.`;
  return '';
}

/** Qualifying match-win pay: 25% of the entry fee, rounded down to whole dollars. */
export function qualifyingWinPay(entryFee) {
  return Math.floor(Number(entryFee) / 4);
}

/**
 * Plan locked at the start: pool, qualifying win pay and the playoff field.
 * Top-ups and the playoff ladder are locked later, once qualification is final (showdownPlayoffPlan.js).
 */
export function buildPayoutPlan({ entrants, entryFee }) {
  const n = Number(entrants);
  const fee = Number(entryFee);
  const feeProblem = entryFeeProblem(fee);
  if (feeProblem) throw new Error(feeProblem);
  const rule = fieldRuleFor(n);
  if (!rule) throw new Error(unsupportedFieldMessage(n));
  const template = playoffTemplate(rule.templateId);
  return {
    entrants: n,
    entryFee: fee,
    pool: n * fee,
    q: qualifyingWinPay(fee),
    qualifyingMatches: n,
    templateId: template.id,
    qualifiers: rule.qualifiers,
    byes: template.byes,
  };
}

/** Sum of every payout on a playoff ladder, byes included. */
export function ladderTotal(ladder) {
  const template = playoffTemplate(ladder.templateId);
  return template.rounds.reduce((sum, r) => sum + ladder.perRound[r.key] * r.matches, 0) + ladder.bye * ladder.byes;
}

/** Every rule a playoff ladder must meet. Returns a list of problems (empty when valid). */
export function ladderProblems(ladder) {
  const template = playoffTemplate(ladder.templateId);
  const problems = [];
  const amounts = template.rounds.map((r) => ladder.perRound[r.key]);
  if (![...amounts, ladder.bye].every((v) => Number.isInteger(v) && v >= 0)) problems.push('Every payout must be a whole number of dollars.');
  if (amounts[0] < 1) problems.push(`A ${template.rounds[0].label.toLowerCase()} win must pay at least $1.`);
  amounts.slice(1).forEach((v, i) => {
    if (v <= amounts[i]) problems.push(`${template.rounds[i + 1].label} pay must be more than ${template.rounds[i].label.toLowerCase()} pay.`);
  });
  if (ladder.byes) {
    const opening = ladder.perRound[template.byeRoundKey];
    if (ladder.bye !== Math.floor(opening / 2)) problems.push('A bye must pay half an opening win, rounded down.');
    if (ladder.bye >= opening) problems.push('A bye must pay less than an opening win.');
  }
  if (ladderTotal(ladder) !== ladder.budget) problems.push(`The ladder pays $${ladderTotal(ladder)} but the playoff budget is $${ladder.budget}.`);
  return problems;
}

/**
 * Whole-dollar playoff ladder that pays out the entire budget.
 * Weights are ×100 and the denominator is doubled so a half-weight bye stays whole:
 *   round pay = floor(2 × budget × w / D2), D2 = Σ 2 × w × matches + byes × w(bye round)
 *   bye = floor(opening / 2); the championship takes the rest (every rounding dollar).
 * Throws when the result would break a payout rule.
 */
export function playoffLadder(templateId, budget) {
  const template = playoffTemplate(templateId);
  if (!template) throw new Error('Unknown playoff layout.');
  if (!Number.isInteger(budget) || budget < 0) throw new Error(`The playoff budget ($${budget}) must be a whole number of dollars, at least $0.`);
  const byeRound = template.byes ? template.rounds.find((r) => r.key === template.byeRoundKey) : null;
  const denominator2 = template.rounds.reduce((sum, r) => sum + 2 * r.weightX100 * r.matches, 0)
    + (byeRound ? template.byes * byeRound.weightX100 : 0);

  const perRound = {};
  template.rounds.forEach((r) => { perRound[r.key] = Math.floor((2 * budget * r.weightX100) / denominator2); });
  const bye = byeRound ? Math.floor(perRound[byeRound.key] / 2) : 0;
  const last = finalRound(template);
  const finalBase = perRound[last.key];
  const others = template.rounds.filter((r) => r.key !== last.key).reduce((sum, r) => sum + perRound[r.key] * r.matches, 0)
    + bye * template.byes;
  perRound[last.key] = budget - others;

  const ladder = { templateId: template.id, budget, perRound, bye, byes: template.byes, finalBase, finalRemainder: perRound[last.key] - finalBase };
  const problems = ladderProblems(ladder);
  if (problems.length) throw new Error(`The playoff payouts cannot meet the approved rules: ${problems[0]}`);
  return ladder;
}
