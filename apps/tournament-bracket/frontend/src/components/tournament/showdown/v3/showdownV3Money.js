/**
 * V3 earnings for a saved event, in the shape the shared code expects (`byPlayer[id].total` in dollars),
 * with every amount also in cents. Derived only from the locked plan, recorded results, the finalized
 * credit snapshot, confirmed byes, audited adjustments and the recorded outcome.
 */
import { SHOWDOWN_PAYOUT_V3 } from '../showdownRules.js';
import { computeV3Earnings } from './showdownV3Earnings.js';
import { v3StandingsFor, v3CreditSnapshotOf } from './showdownV3Event.js';

function rankingExcluded(state) {
  return (state.players || []).filter((p) => p.withdrawnAt && p.withdrawnPhase === 'qualifying').map((p) => p.id);
}

/** Outcome used for the money: the recorded one, else completed once the event is completed, else in progress. */
export function v3OutcomeOf(state) {
  if (state.v3Outcome?.kind) return state.v3Outcome.kind;
  return state.status === 'completed' ? 'completed' : 'in-progress';
}

export function computeEarningsV3(state, { outcome = v3OutcomeOf(state), adjustments = state.v3Adjustments || [] } = {}) {
  const playerIds = (state.players || []).map((p) => p.id);
  const confirmed = Boolean(state.playoff?.confirmedAt);
  const standings = v3StandingsFor(state, rankingExcluded(state));
  const e = computeV3Earnings({
    plan: state.payoutPlan,
    playerIds,
    matches: state.matches || [],
    byeIds: confirmed ? (state.playoff.byes || []).map((b) => b.playerId) : [],
    qualifierIds: confirmed ? state.qualification?.qualifierIds || [] : [],
    withdrawnIds: (state.players || []).filter((p) => p.withdrawnAt).map((p) => p.id),
    seedOrder: standings.rows.map((r) => r.playerId),
    outcome,
    adjustments,
    creditSnapshot: v3CreditSnapshotOf(state),
  });
  const s = e.settlement;
  const byPlayer = {};
  playerIds.forEach((id) => {
    const r = s.rows[id];
    byPlayer[id] = {
      ...r,
      matchWins: e.playoffs.rows[id]?.matchWins || 0,
      total: r.totalCents / 100,
      beforePlayoffs: (r.qualifyingActualCents + r.qualifyingCreditCents) / 100,
    };
  });
  return {
    payoutVersion: SHOWDOWN_PAYOUT_V3,
    byPlayer,
    paid: s.paidCents / 100,
    pool: s.poolCents / 100,
    paidCents: s.paidCents,
    poolCents: s.poolCents,
    settlement: s,
    qualifying: e.qualifying,
    playoffs: e.playoffs,
    status: e.status,
    standings,
  };
}

/** '' when the event can be (or was) settled under `outcome` with every cent accounted for. */
export function reconciliationProblemV3(state, outcome) {
  const s = computeEarningsV3(state, outcome ? { outcome } : {}).settlement;
  return s.ok ? '' : s.problems[0];
}

/** Compact settlement record saved with the event. */
export function v3SettlementSnapshot(settlement, at) {
  const totals = {};
  Object.values(settlement.rows).forEach((r) => { if (r.totalCents) totals[r.playerId] = r.totalCents; });
  return {
    at,
    outcome: settlement.outcome,
    poolCents: settlement.poolCents,
    paidCents: settlement.paidCents,
    remainderCents: settlement.remainderCents,
    unawardedCents: settlement.unawardedCents,
    unresolvedCents: settlement.unresolvedCents,
    proposedOperatorRetainedCents: settlement.proposedOperatorRetainedCents,
    retentionApproved: settlement.retentionApproved,
    recipients: settlement.bonusRecipients,
    pendingApproval: settlement.pendingApproval,
    disclosures: settlement.disclosures,
    totals,
  };
}
