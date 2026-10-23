/**
 * The escalating (D10) V3 payout plan, locked at the start (`formula: V3_ESCALATING_FORMULA`, 25¢ unit).
 * It has no match-win ladder (`ladder: null`): playoff games pay `rates.byRound[stage]`, each confirmed
 * opening-round bye earns `byeCreditCents`, and `reserves.championFund` is the initial Champion Fund.
 * Unearned reserves join the fund; at completion the champion receives it (showdownV3Settlement.js).
 */
import { SHOWDOWN_PAYOUT_V3 } from '../showdownRules.js';
import { playoffTemplate } from '../showdownPlayoffTemplates.js';
import { selectV3Escalating, climbsEnough } from './showdownV3Escalating.js';
import { v3EscalatingBounds, v3ByeCreditCents } from './showdownV3EscalatingBounds.js';
import { maxPlayoffGames, isUnitMultiple, V3_ESCALATING, V3_ESCALATING_FORMULA } from './showdownV3Rules.js';

export const V3_ESCALATING_SCOPE = 'The champion out-earns every other player in every completed event, including forfeits, walkovers and withdrawals at any stage. The other finishing-order relationships are reported for events where nobody withdraws during qualifying and every playoff match is played to completion. Audited operator adjustments are outside every guarantee.';

const LABELS = {
  championOverEveryone: 'The champion out-earns every other player',
  runnerUpOverSemifinalLoser: 'The runner-up out-earns every semifinal loser',
  semifinalLoserOverQuarterfinalLoser: 'Every semifinal loser out-earns every quarterfinal loser',
  qualifierOverNonQualifier: 'Every qualifier earns at least as much as every non-qualifier',
};

function guarantees(bounds) {
  const ok = { championOverEveryone: bounds.champion.marginCents > 0, runnerUpOverSemifinalLoser: bounds.runnerUp.marginCents > 0 };
  if (bounds.semifinalOverQuarterfinal) ok.semifinalLoserOverQuarterfinalLoser = bounds.semifinalOverQuarterfinal.marginCents > 0;
  ok.qualifierOverNonQualifier = true;
  const checks = {};
  Object.entries(ok).forEach(([key, v]) => { checks[key] = { ok: v, label: LABELS[key], hard: key === 'championOverEveryone' }; });
  return {
    checks,
    warnings: Object.entries(ok).filter(([, v]) => !v).map(([key]) => `Not guaranteed: ${LABELS[key].toLowerCase()}. It usually holds, but a large qualifying gap can outweigh one playoff stage.`),
    scope: V3_ESCALATING_SCOPE,
    margins: {
      championCents: bounds.champion.marginCents,
      runnerUpCents: bounds.runnerUp.marginCents,
      semifinalOverQuarterfinalCents: bounds.semifinalOverQuarterfinal?.marginCents ?? null,
    },
    championMinCents: bounds.champion.minTotalCents,
  };
}

/** Builds the plan to lock at the start. Throws when no qualifying rate keeps the champion first. */
export function buildV3EscalatingPlan(settings) {
  const sel = selectV3Escalating(settings);
  if (!sel.ok) throw new Error(sel.problems[0]);
  const { settings: s, field, choice: c } = sel;
  const keys = field.template.rounds.map((r) => r.key);
  return {
    payoutVersion: SHOWDOWN_PAYOUT_V3,
    formula: V3_ESCALATING_FORMULA,
    unitCents: V3_ESCALATING.unitCents,
    entrants: s.entrants,
    entryFee: s.entryFee,
    qualifyingGames: s.qualifyingGames,
    playoffRaceTo: s.playoffRaceTo,
    templateId: field.templateId,
    qualifiers: field.qualifiers,
    byes: field.byes,
    playoffMatches: field.playoffMatches,
    poolCents: c.pool,
    rates: { r1: c.q, r2: c.q, playoff: null, byRound: Object.fromEntries(keys.map((k, i) => [k, c.rates[i]])), stepCents: c.step },
    byeCreditCents: c.byeCredit,
    reserves: {
      qualifying: c.qualifying,
      playoffGames: c.playoffGames,
      playoffGamesPerMatch: maxPlayoffGames(s.playoffRaceTo),
      byeCredits: c.byeCredits,
      championFund: c.fund,
    },
    ladder: null,
    championshipTierPct: null,
    guarantees: guarantees(c.bounds),
    trace: sel.trace,
  };
}

/** Internal consistency of a stored escalating plan, including the champion-first bound. Empty when sound. */
export function v3EscalatingPlanProblems(plan) {
  const problems = [];
  const unit = V3_ESCALATING.unitCents;
  const { rates = {}, reserves: r = {} } = plan;
  const template = playoffTemplate(plan.templateId);
  if (!template) return ['The plan names an unknown playoff bracket.'];
  const keys = template.rounds.map((x) => x.key);
  const stageRates = keys.map((k) => rates.byRound?.[k]);
  const k = plan.playoffRaceTo;
  if (plan.unitCents !== unit) problems.push(`An escalating plan pays in ${unit}\u00a2 units.`);
  if (plan.ladder !== null) problems.push('An escalating plan has no match-win ladder.');
  if (!(rates.r1 > 0 && rates.r1 === rates.r2 && isUnitMultiple(rates.r1, unit))) problems.push('Both qualifying matches must pay the same positive rate.');
  if (Object.keys(rates.byRound || {}).length !== keys.length || !stageRates.every((x) => isUnitMultiple(x, unit) && x > 0)) {
    problems.push(`Every playoff stage needs a positive rate in ${unit}\u00a2 steps.`);
    return problems;
  }
  if (!climbsEnough(rates.r1, stageRates)) problems.push(`Each playoff stage must pay at least ${V3_ESCALATING.minStepPct}% more per game than the stage before.`);
  const expectedBye = template.byes ? v3ByeCreditCents(k, stageRates[0]) : 0;
  if (plan.byeCreditCents !== expectedBye) problems.push('The bye credit must be half a full opening-round win, to the nearest 25\u00a2.');
  if (r.qualifying !== plan.entrants * plan.qualifyingGames * rates.r1) problems.push('The qualifying reserve must cover every qualifying game.');
  const playoff = template.rounds.reduce((s, x, i) => s + x.matches * maxPlayoffGames(k) * stageRates[i], 0);
  if (r.playoffGames !== playoff || r.playoffGamesPerMatch !== maxPlayoffGames(k)) problems.push('The playoff reserve must cover every possible playoff game.');
  if (r.byeCredits !== plan.byeCreditCents * template.byes) problems.push('The bye reserve must cover every bye credit.');
  if (!(r.championFund >= 0) || !isUnitMultiple(r.championFund, unit)) problems.push('The Champion Fund cannot be negative.');
  if (r.qualifying + r.playoffGames + r.byeCredits + r.championFund !== plan.poolCents) problems.push('The plan reserves do not add up to the prize pool.');
  if (problems.length) return problems;
  const bounds = v3EscalatingBounds({
    entrants: plan.entrants, qualifyingGames: plan.qualifyingGames, playoffRaceTo: k, qualifiers: template.size, byes: template.byes,
    q: rates.r1, stageKeys: keys, rates: stageRates, byeCreditCents: plan.byeCreditCents, fundCents: r.championFund,
  });
  if (bounds.champion.marginCents <= 0) problems.push('The Champion Fund does not keep the champion ahead of every other player.');
  return problems;
}
