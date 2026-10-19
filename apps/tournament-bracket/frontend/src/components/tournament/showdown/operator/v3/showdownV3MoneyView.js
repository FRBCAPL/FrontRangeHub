/**
 * V3 money for the operator, in cents: every player's pay by kind, the locked plan, and the reconciliation
 * of the pool into paid, held (still to be won), unawarded and unresolved amounts.
 */
import * as E from '../../showdownEngine.js';
import { formatCents } from '../../v3/showdownV3Rules.js';
import { v3OutcomeOf } from '../../v3/showdownV3Money.js';
import { nameOf } from '../showdownView.js';
import { v3PlanView } from './showdownV3PlanView.js';

export const V3_OUTCOME_LABELS = {
  'in-progress': 'In progress',
  completed: 'Completed',
  'interrupted-final': 'Interrupted during the final',
  interrupted: 'Interrupted',
  abandoned: 'Voluntary abandonment',
};

const cents = (n) => (n ? formatCents(n) : '\u2014');

export function moneyViewV3(state) {
  const e = E.computeEarnings(state);
  const s = e.settlement;
  const outcome = v3OutcomeOf(state);
  const qualifiers = new Set(state.qualification?.qualifierIds || []);
  const byeIds = new Set((state.playoff?.byes || []).map((b) => b.playerId));
  const players = state.players.map((p) => {
    const r = s.rows[p.id];
    return {
      playerId: p.id,
      name: p.name,
      withdrawn: Boolean(p.withdrawnAt),
      qualified: qualifiers.has(p.id),
      hasBye: byeIds.has(p.id),
      totalCents: r.totalCents,
      qualifying: cents(r.qualifyingActualCents),
      credit: cents(r.qualifyingCreditCents),
      playoffGames: cents(r.playoffGameCents),
      matchWins: cents(r.playoffMatchWinCents),
      bye: cents(r.byeCents),
      adjustment: cents(r.adjustmentCents),
      settlement: cents(r.settlementCents),
      total: formatCents(r.totalCents),
    };
  }).sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name));
  const credits = e.qualifying.credits.filter((c) => c.games).map((c) => ({
    matchId: c.matchId,
    text: `${nameOf(state, c.playerId)}: ${c.games} credit game${c.games === 1 ? '' : 's'} (${formatCents(c.cents || 0)}) for ${c.unplayed} unplayed after ${nameOf(state, c.forfeitedBy)} forfeited${c.provisional ? ' \u00b7 provisional until qualifying locks' : ''}`,
  }));
  return {
    payoutVersion: 3,
    plan: v3PlanView(state.payoutPlan),
    outcome,
    outcomeLabel: V3_OUTCOME_LABELS[outcome] || outcome,
    players,
    credits,
    pool: formatCents(s.poolCents),
    paid: formatCents(s.paidCents),
    held: formatCents(s.heldCents),
    heldCents: s.heldCents,
    unawarded: formatCents(s.unawardedCents),
    unawardedCents: s.unawardedCents,
    unresolved: formatCents(s.unresolvedCents),
    unresolvedCents: s.unresolvedCents,
    qualifyingPaid: formatCents(e.qualifying.paidCents),
    qualifyingReserve: formatCents(e.qualifying.reservedCents),
    playoffGamesPaid: formatCents(e.playoffs.gameCents),
    playoffGameReserve: formatCents(state.payoutPlan.reserves.playoffGames),
    recipients: s.bonusRecipients.map((id) => nameOf(state, id)),
    disclosures: s.disclosures,
    pendingApproval: s.pendingApproval,
    reconciled: s.ok,
    problems: s.problems,
    adjustments: (state.v3Adjustments || []).map((a) => ({ ...a, name: nameOf(state, a.playerId), amount: formatCents(a.amountCents) })),
    availableCents: s.remainderCents,
    available: formatCents(Math.max(0, s.remainderCents)),
  };
}

/** Amounts in dollars (as stored in final standings) shown in V3 cents format. */
export const v3Dollars = (d) => formatCents(Math.round(Number(d || 0) * 100));

/** The one thing to do next. V3 events end through completion, an interruption or an abandonment. */
export function v3CompletedStep(state) {
  const snap = state.v3Settlement || {};
  const label = V3_OUTCOME_LABELS[state.v3Outcome?.kind] || 'Completed';
  if (snap.unresolvedCents) return `${label}. ${formatCents(snap.unresolvedCents)} is unresolved and needs your review on the End & settle tab.`;
  if (snap.unawardedCents) return `${label}. ${formatCents(snap.unawardedCents)} was not awarded; retaining it is not approved.`;
  return `${label}. Every cent of the ${formatCents(snap.poolCents || state.payoutPlan.poolCents)} pool is accounted for.`;
}
