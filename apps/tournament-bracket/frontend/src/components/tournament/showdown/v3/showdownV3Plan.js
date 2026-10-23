/**
 * The V3 payout plan, locked when the event starts: rates, reserves, the guarantees and the selection trace.
 * Nothing in it depends on results, so it never changes after the start; v3PlanChangeProblem refuses any
 * attempt to swap it.
 *
 * New events lock the formula chosen in showdownV3Activation.js: equal-rate (`formula: V3_EQUAL_RATE_FORMULA`,
 * 25¢ unit) or escalating D10 (`formula: V3_ESCALATING_FORMULA`, showdownV3PlanEscalating.js).
 * Every locked plan keeps the formula it was locked with and keeps being checked, re-derived and settled
 * exactly as it was locked, whatever the switch says; a plan without a formula marker by the original
 * formula (showdownV3PlanLegacy.js).
 */
import { SHOWDOWN_PAYOUT_V3 } from '../showdownRules.js';
import { ladderProblems } from '../showdownPayout.js';
import { selectV3EqualRate } from './showdownV3EqualRate.js';
import { selectV3Escalating } from './showdownV3Escalating.js';
import { buildV3LegacyPlan } from './showdownV3PlanLegacy.js';
import { buildV3EscalatingPlan, v3EscalatingPlanProblems } from './showdownV3PlanEscalating.js';
import { v3NewEventFormula } from './showdownV3Activation.js';
import {
  maxPlayoffGames, isHalfUnit, isUnitMultiple, isEqualRatePlan, isEscalatingPlan, V3_EQUAL_RATE, V3_EQUAL_RATE_FORMULA,
  V3_ESCALATING_FORMULA,
} from './showdownV3Rules.js';

export const V3_GUARANTEE_SCOPE = 'These finishing-order guarantees apply when every playoff match is played to completion. Walkovers, withdrawals during qualifying and operator adjustments are exceptions.';

/** The selection a new event would lock under `formula` (default: the activation switch). */
export function selectV3ForNewEvent(settings, formula = v3NewEventFormula()) {
  return formula === V3_ESCALATING_FORMULA ? selectV3Escalating(settings) : selectV3EqualRate(settings);
}

/** Problems that stop a new V3 configuration from starting (empty when it is financially feasible). */
export function v3FeasibilityProblems(settings, formula = v3NewEventFormula()) {
  return selectV3ForNewEvent(settings, formula).problems;
}

function equalRateGuarantees(choice) {
  const label = (key) => choice.finishOrder.checks[key].label;
  const checks = {
    championOverRunnerUp: { ok: true, label: label('championOverRunnerUp') },
    runnerUpOverSemifinalLoser: { ok: true, label: label('runnerUpOverSemifinalLoser') },
  };
  const sfOverQf = choice.finishOrder.checks.semifinalLoserOverQuarterfinalLoser;
  if (sfOverQf) checks.semifinalLoserOverQuarterfinalLoser = { ok: sfOverQf.ok, label: sfOverQf.label };
  checks.qualifierOverNonQualifier = { ok: true, label: label('qualifierOverNonQualifier') };
  return {
    checks,
    warnings: [],
    scope: V3_GUARANTEE_SCOPE,
    margins: { championCents: choice.bounds.champion.marginCents, runnerUpCents: choice.bounds.runnerUp.marginCents },
  };
}

/** The plan a new event locks under `formula` (default: the activation switch). Throws when infeasible. */
export function buildV3Plan(settings, formula = v3NewEventFormula()) {
  return formula === V3_ESCALATING_FORMULA ? buildV3EscalatingPlan(settings) : buildV3EqualRatePlan(settings);
}

/** The equal-rate plan, kept so plans locked by it are re-derived exactly. Throws like the other builders. */
export function buildV3EqualRatePlan(settings) {
  const sel = selectV3EqualRate(settings);
  if (!sel.ok) throw new Error(sel.problems[0]);
  const { settings: s, field, choice } = sel;
  return {
    payoutVersion: SHOWDOWN_PAYOUT_V3,
    formula: V3_EQUAL_RATE_FORMULA,
    unitCents: V3_EQUAL_RATE.unitCents,
    entrants: s.entrants,
    entryFee: s.entryFee,
    qualifyingGames: s.qualifyingGames,
    playoffRaceTo: s.playoffRaceTo,
    templateId: field.templateId,
    qualifiers: field.qualifiers,
    byes: field.byes,
    playoffMatches: field.playoffMatches,
    poolCents: choice.pool,
    rates: { r1: choice.q, r2: choice.q, playoff: choice.q },
    reserves: {
      qualifying: choice.qualifying,
      playoffGames: choice.playoffGames,
      playoffGamesPerMatch: maxPlayoffGames(s.playoffRaceTo),
      ladder: choice.ladderCents,
      leftover: choice.leftoverCents,
    },
    ladder: choice.ladder,
    championshipTierPct: null,
    design: {
      championCents: choice.designChampionCents,
      championTargetCents: V3_EQUAL_RATE.championTargetPct * s.entryFee,
      targetMet: sel.targetMet,
    },
    guarantees: equalRateGuarantees(choice),
    trace: sel.trace,
  };
}

/** The plan these settings produce under the formula `locked` was built with. Throws like the builders. */
export function v3ExpectedPlan(locked, settings) {
  if (isEscalatingPlan(locked)) return buildV3EscalatingPlan(settings);
  return isEqualRatePlan(locked) ? buildV3EqualRatePlan(settings) : buildV3LegacyPlan(settings);
}

function equalRateProblems(plan) {
  const problems = [];
  const { rates, reserves: r } = plan;
  const unit = V3_EQUAL_RATE.unitCents;
  if (plan.unitCents !== unit) problems.push(`An equal-rate plan pays in ${unit}\u00a2 units.`);
  if (!(rates.r1 > 0 && rates.r1 === rates.r2 && rates.r2 === rates.playoff)) problems.push('Every game must pay the same rate.');
  if (![rates.r1, r.leftover].every((c) => isUnitMultiple(c, unit))) problems.push(`Every rate must be a multiple of ${unit}\u00a2.`);
  if (r.leftover < 0 || r.leftover > 99) problems.push('The leftover must be less than $1.');
  return problems;
}

/** Internal consistency of a stored plan. Empty when every reserve adds up to the pool. */
export function v3PlanProblems(plan) {
  if (!plan || plan.payoutVersion !== SHOWDOWN_PAYOUT_V3) return ['This is not a V3 payout plan.'];
  if (isEscalatingPlan(plan)) return v3EscalatingPlanProblems(plan);
  if (plan.formula !== undefined && !isEqualRatePlan(plan)) return [`Unknown V3 payout formula "${plan.formula}".`];
  if (!plan.ladder || !plan.reserves || !plan.rates) return ['The plan is missing its rates, reserves or playoff ladder.'];
  const problems = [];
  const { reserves: r, rates } = plan;
  if (r.qualifying + r.playoffGames + r.ladder + r.leftover !== plan.poolCents) problems.push('The plan reserves do not add up to the prize pool.');
  if (r.ladder !== plan.ladder.budget * 100) problems.push('The playoff ladder does not match its reserve.');
  if (isEqualRatePlan(plan)) problems.push(...equalRateProblems(plan));
  else {
    if (![rates.r1, rates.r2, rates.playoff, r.leftover].every(isHalfUnit)) problems.push('Every rate must be a multiple of 50\u00a2.');
    if (rates.playoff !== rates.r2) problems.push('Playoff games must pay the Round 2 rate.');
  }
  problems.push(...ladderProblems(plan.ladder));
  return problems;
}

const LOCKED_KEYS = ['formula', 'unitCents', 'entrants', 'entryFee', 'qualifyingGames', 'playoffRaceTo', 'templateId', 'poolCents', 'championshipTierPct', 'byeCreditCents'];

/** JSON with object keys sorted, so a plan reloaded from the database (jsonb reorders keys) compares equal. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * '' when `next` is the same plan as the locked one. After the start the rates, reserves and any ladder may
 * not change; corrections go through audited adjustments instead.
 */
export function v3PlanChangeProblem(locked, next) {
  if (!locked) return '';
  const same = LOCKED_KEYS.every((k) => locked[k] === next?.[k])
    && canonicalJson(locked.rates) === canonicalJson(next?.rates)
    && canonicalJson(locked.reserves) === canonicalJson(next?.reserves)
    && canonicalJson(locked.ladder) === canonicalJson(next?.ladder);
  return same ? '' : 'The V3 payout plan was locked when the event started and cannot be changed. Record an audited adjustment instead.';
}
