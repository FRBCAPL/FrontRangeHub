/**
 * The V3 payout plan, locked when the event starts: rates, reserves, the playoff ladder, the chosen
 * championship tier, the selection trace and the finish-order check. Nothing in it depends on results,
 * so it never changes after the start; v3PlanChangeProblem refuses any attempt to swap it.
 */
import { SHOWDOWN_PAYOUT_V3 } from '../showdownRules.js';
import { ladderProblems } from '../showdownPayout.js';
import { selectV3Rates } from './showdownV3Rates.js';
import { v3FinishOrderChecks } from './showdownV3Guarantees.js';
import { maxPlayoffGames, isHalfUnit } from './showdownV3Rules.js';

/** Problems that stop a V3 configuration from starting (empty when it is financially feasible). */
export function v3FeasibilityProblems(settings) {
  return selectV3Rates(settings).problems;
}

/** Builds the plan to lock at the start. Throws when the configuration cannot meet the payout rules. */
export function buildV3Plan(settings) {
  const sel = selectV3Rates(settings);
  if (!sel.ok) throw new Error(sel.problems[0]);
  const { settings: s, field, choice } = sel;
  const rates = { r1: choice.r1, r2: choice.r2, playoff: choice.playoffRate };
  const guarantees = v3FinishOrderChecks({
    template: field.template, ladder: choice.ladder, rates, qualifyingGames: s.qualifyingGames, playoffRaceTo: s.playoffRaceTo,
  });
  return {
    payoutVersion: SHOWDOWN_PAYOUT_V3,
    entrants: s.entrants,
    entryFee: s.entryFee,
    qualifyingGames: s.qualifyingGames,
    playoffRaceTo: s.playoffRaceTo,
    templateId: field.templateId,
    qualifiers: field.qualifiers,
    byes: field.byes,
    playoffMatches: field.playoffMatches,
    poolCents: choice.pool,
    rates,
    reserves: {
      qualifying: choice.qualifying,
      playoffGames: choice.playoffGames,
      playoffGamesPerMatch: maxPlayoffGames(s.playoffRaceTo),
      ladder: choice.ladderCents,
      leftover: choice.leftoverCents,
    },
    ladder: choice.ladder,
    championshipTierPct: sel.tierPct,
    guarantees,
    trace: sel.trace,
  };
}

/** Internal consistency of a stored plan. Empty when every reserve adds up to the pool. */
export function v3PlanProblems(plan) {
  const problems = [];
  if (!plan || plan.payoutVersion !== SHOWDOWN_PAYOUT_V3) return ['This is not a V3 payout plan.'];
  const { reserves: r, rates } = plan;
  if (r.qualifying + r.playoffGames + r.ladder + r.leftover !== plan.poolCents) problems.push('The plan reserves do not add up to the prize pool.');
  if (r.ladder !== plan.ladder.budget * 100) problems.push('The playoff ladder does not match its reserve.');
  if (![rates.r1, rates.r2, rates.playoff, r.leftover].every(isHalfUnit)) problems.push('Every rate must be a multiple of 50\u00a2.');
  if (rates.playoff !== rates.r2) problems.push('Playoff games must pay the Round 2 rate.');
  problems.push(...ladderProblems(plan.ladder));
  return problems;
}

const LOCKED_KEYS = ['entrants', 'entryFee', 'qualifyingGames', 'playoffRaceTo', 'templateId', 'poolCents', 'championshipTierPct'];

/**
 * '' when `next` is the same plan as the locked one. After the start the ladder, rates and reserves may
 * not change; corrections go through audited adjustments instead.
 */
export function v3PlanChangeProblem(locked, next) {
  if (!locked) return '';
  const same = LOCKED_KEYS.every((k) => locked[k] === next?.[k])
    && JSON.stringify(locked.rates) === JSON.stringify(next?.rates)
    && JSON.stringify(locked.reserves) === JSON.stringify(next?.reserves)
    && JSON.stringify(locked.ladder) === JSON.stringify(next?.ladder);
  return same ? '' : 'The V3 payout plan was locked when the event started and cannot be changed. Record an audited adjustment instead.';
}
