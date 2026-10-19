/**
 * V3 event-state helpers used by the shared engine actions: settings, the locked plan, labels, standings,
 * the finalized credit snapshot and the corrections that V3 refuses.
 */
import { fieldRuleFor } from '../showdownFieldRules.js';
import { selectV3Rates } from './showdownV3Rates.js';
import { buildV3Plan, v3PlanProblems, v3PlanChangeProblem } from './showdownV3Plan.js';
import { withRoundLabels } from './showdownV3Rounds.js';
import { v3Credits } from './showdownV3Credits.js';
import { v3QualifyingLedger } from './showdownV3Qualifying.js';
import { rankV3Standings } from './showdownV3Standings.js';
import { V3_QUALIFYING_GAMES, V3_PLAYOFF_RACE_TO } from './showdownV3Rules.js';

const qualifying = (state) => (state.matches || []).filter((m) => m.phase === 'qualifying');
const ids = (state) => (state.players || []).map((p) => p.id);

export function v3SettingsOf(state) {
  const s = state.settings || {};
  return { entrants: (state.players || []).length, entryFee: s.entryFee, qualifyingGames: s.qualifyingGames, playoffRaceTo: s.playoffRaceTo };
}

/** Setup problems specific to V3: game and race ranges, and payout feasibility for the current field. */
export function v3SetupProblems(state) {
  const s = v3SettingsOf(state);
  const problems = [];
  const g = Number(s.qualifyingGames); const k = Number(s.playoffRaceTo);
  if (!Number.isInteger(g) || g < V3_QUALIFYING_GAMES.min || g > V3_QUALIFYING_GAMES.max) {
    problems.push(`Games per qualifying match must be a whole number from ${V3_QUALIFYING_GAMES.min} to ${V3_QUALIFYING_GAMES.max}.`);
  }
  if (!Number.isInteger(k) || k < V3_PLAYOFF_RACE_TO.min || k > V3_PLAYOFF_RACE_TO.max) {
    problems.push(`The playoff race must be to ${V3_PLAYOFF_RACE_TO.min}\u2013${V3_PLAYOFF_RACE_TO.max} games.`);
  }
  if (!problems.length && fieldRuleFor(s.entrants)) {
    const sel = selectV3Rates(s);
    if (!sel.ok) problems.push(...sel.problems.filter((p) => !/Entry fee/.test(p)));
  }
  return problems;
}

/** Plan and labelled qualifying matches for the start. Throws when the payout rules cannot be met. */
export function v3StartFields(state, matches) {
  return { payoutPlan: buildV3Plan(v3SettingsOf(state)), matches: withRoundLabels(matches) };
}

/** '' while the stored plan is intact and still the plan these locked settings produce. */
export function v3LockedPlanProblem(state) {
  const plan = state.payoutPlan;
  const internal = v3PlanProblems(plan);
  if (internal.length) return `The locked V3 payout plan is damaged: ${internal[0]}`;
  let expected;
  try { expected = buildV3Plan(v3SettingsOf(state)); } catch (e) { return e.message; }
  return v3PlanChangeProblem(plan, expected);
}

/** The playoff payouts were locked with the plan at the start; this only records who qualified. */
export function v3PlayoffPlanFor(state, qualifierIds, now) {
  const plan = state.payoutPlan;
  return {
    ...plan.ladder,
    payoutVersion: plan.payoutVersion,
    playoffGameReserveCents: plan.reserves.playoffGames,
    playoffRaceTo: plan.playoffRaceTo,
    qualifierIds: [...qualifierIds],
    lockedAt: state.playoffPlan?.lockedAt || now,
  };
}

export function v3CreditSnapshotOf(state) {
  return state.qualification?.v3Credits?.credits || null;
}

export function v3Ledger(state) {
  const snapshot = v3CreditSnapshotOf(state);
  return v3QualifyingLedger(state.payoutPlan, ids(state), qualifying(state), { snapshot });
}

export function v3StandingsFor(state, excludedIds) {
  return rankV3Standings(v3Ledger(state), ids(state), qualifying(state), { excludedIds });
}

/** Credits finalized at the qualifying lock and stored with the event. */
export function v3CreditSnapshot(state, now) {
  return { finalizedAt: now, credits: v3Credits(qualifying(state), state.payoutPlan.qualifyingGames, { final: true }) };
}

/**
 * Why qualifying (or a decided shootout) cannot be reopened, or ''. Once any playoff result exists the
 * bracket and the money it earned stand; a settled interruption or abandonment is final.
 */
export function v3ReopenProblem(state) {
  if (state.v3Outcome && state.v3Outcome.kind !== 'completed') return 'This V3 event has been settled as interrupted or abandoned and cannot be reopened.';
  if ((state.matches || []).some((m) => m.phase === 'playoff' && m.status === 'completed')) {
    return 'A playoff result has been recorded, so qualifying can no longer be reopened in a V3 event. Correct playoff results instead.';
  }
  return '';
}
