/**
 * V2 playoff plan (payoutVersion 2). Locked when qualifying closes:
 *   budget = pool − qualifying win pay (N × Q) − qualifying racks won − playoff rack reserve
 *   rack reserve = $9 × every scheduled playoff match (the most racks a race-to-5 match can have)
 * The budget is spread over the existing weighted ladder. It does not depend on who qualified,
 * so deciding or reopening a shootout never changes it; reopening qualifying clears it.
 */
import { playoffLadder } from './showdownPayout.js';
import { playoffTemplate } from './showdownPlayoffTemplates.js';
import { paysMatchWin } from './showdownResults.js';
import { SHOWDOWN_PAYOUT_V2, V2_RACK_PAY, V2_RACK_RESERVE_PER_MATCH, V2_QUALIFYING_RACE_TO } from './showdownRules.js';

/** Racks credited for one match: only a normally played result counts; forfeits and automatic results never do. */
export function playedRacks(match) {
  if (match?.status !== 'completed' || match.result !== 'played') return { r1: 0, r2: 0 };
  return { r1: (match.score1 || 0) * V2_RACK_PAY, r2: (match.score2 || 0) * V2_RACK_PAY };
}

export function qualifyingRacksWon(state) {
  return (state.matches || []).filter((m) => m.phase === 'qualifying').reduce((sum, m) => {
    const { r1, r2 } = playedRacks(m);
    return sum + r1 + r2;
  }, 0);
}

export function scheduledPlayoffMatches(templateId) {
  return playoffTemplate(templateId).rounds.reduce((sum, r) => sum + r.matches, 0);
}

export function rackReserveFor(templateId) {
  return scheduledPlayoffMatches(templateId) * V2_RACK_RESERVE_PER_MATCH;
}

function qualifyingPaidOf(state) {
  const q = state.payoutPlan.q;
  return (state.matches || []).filter((m) => m.phase === 'qualifying' && m.status === 'completed' && paysMatchWin(m)).length * q;
}

export function buildPlayoffPlanV2({ payoutPlan, qualifyingRacks, qualifyingPaid = payoutPlan.qualifyingMatches * payoutPlan.q }) {
  const qualifyingScheduled = payoutPlan.qualifyingMatches * payoutPlan.q;
  const rackReserve = rackReserveFor(payoutPlan.templateId);
  const budget = payoutPlan.pool - qualifyingScheduled - qualifyingRacks - rackReserve;
  if (budget < 0) {
    throw new Error(`Qualifying pay, qualifying games won and the playoff game reserve ($${qualifyingScheduled + qualifyingRacks + rackReserve}) exceed the $${payoutPlan.pool} pool.`);
  }
  return {
    ...playoffLadder(payoutPlan.templateId, budget),
    payoutVersion: SHOWDOWN_PAYOUT_V2,
    qualifyingScheduled,
    qualifyingPaid,
    doubleForfeitTransfer: qualifyingScheduled - qualifyingPaid,
    qualifyingRacks,
    rackReserve,
    rackReservePerMatch: V2_RACK_RESERVE_PER_MATCH,
    playoffMatches: scheduledPlayoffMatches(payoutPlan.templateId),
    topUps: {},
    topUpTotal: 0,
  };
}

/**
 * Locks (or keeps) the V2 plan. An existing plan built from the same qualifying results is kept as is,
 * so a shootout decided, undone or reopened leaves the locked payouts untouched.
 */
export function lockPlayoffPlanV2(state, qualifierIds, now = null) {
  const qualifyingRacks = qualifyingRacksWon(state);
  const qualifyingPaid = qualifyingPaidOf(state);
  const existing = state.playoffPlan;
  if (existing?.payoutVersion === SHOWDOWN_PAYOUT_V2 && existing.qualifyingRacks === qualifyingRacks && existing.qualifyingPaid === qualifyingPaid) {
    return { ...existing, qualifierIds: [...qualifierIds] };
  }
  return { ...buildPlayoffPlanV2({ payoutPlan: state.payoutPlan, qualifyingRacks, qualifyingPaid }), qualifierIds: [...qualifierIds], lockedAt: now };
}

/**
 * Provisional preview before qualifying closes. Qualifying racks are not known yet, so the budget is a range:
 * every qualifying match 3–2 (most racks, lowest budget) to every match 3–0 (fewest racks, highest budget).
 * Forfeits leave even fewer racks, which can only raise playoff pay. The rows shown use the lowest budget.
 */
export function estimatePlayoffPlanV2(payoutPlan) {
  const n = payoutPlan.qualifyingMatches;
  const most = n * (2 * V2_QUALIFYING_RACE_TO - 1) * V2_RACK_PAY;
  const fewest = n * V2_QUALIFYING_RACE_TO * V2_RACK_PAY;
  const low = buildPlayoffPlanV2({ payoutPlan, qualifyingRacks: most });
  const high = buildPlayoffPlanV2({ payoutPlan, qualifyingRacks: fewest });
  const pick = (p) => ({ budget: p.budget, perRound: { ...p.perRound }, bye: p.bye, qualifyingRacks: p.qualifyingRacks });
  return { ...low, estimate: true, provisional: true, range: { low: pick(low), high: pick(high) }, entrants: payoutPlan.entrants };
}
