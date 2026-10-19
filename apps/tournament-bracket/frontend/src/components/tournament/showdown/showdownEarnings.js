import { playoffTemplate, finalRound } from './showdownPlayoffTemplates.js';
import { paysMatchWin } from './showdownResults.js';
import { isPayoutV1, isPayoutV2, isPayoutV3, noEngineError, requireSupportedFormat } from './showdownPayoutVersion.js';
import { computeEarningsV2, reconciliationProblemV2 } from './showdownEarningsV2.js';
import { computeEarningsV3, reconciliationProblemV3, v3OutcomeOf } from './v3/showdownV3Money.js';
import { SHOWDOWN_PAYOUT_V3 } from './showdownRules.js';

/** A V3 event that started under a V3 plan; anything else V3 has no money to show. */
function hasV3Plan(state) {
  return isPayoutV3(state) && state.payoutPlan?.payoutVersion === SHOWDOWN_PAYOUT_V3;
}

/**
 * Non-championship playoff payouts nobody earned (double forfeits and empty-position results).
 * Each moves to the championship match-win payout.
 */
function unpaidPlayoffPayouts(ladder, matches, finalKey) {
  return matches
    .filter((m) => m.phase === 'playoff' && m.status === 'completed' && m.roundKey !== finalKey && !paysMatchWin(m))
    .map((m) => ({ matchId: m.id, roundKey: m.roundKey, result: m.result, amount: ladder.perRound[m.roundKey] || 0 }));
}

/**
 * Earnings derived only from recorded results, the locked playoff plan and the confirmed bye list.
 * Nothing is accumulated, so corrections and reloads can never double-pay.
 *   qualifying — Q per paying qualifying win (kept whether or not the player qualifies)
 *   topUp      — qualification guarantee, credited once the playoff plan is locked
 *   bye        — credited once the bracket is confirmed
 *   playoff    — round pay; the championship adds Q per qualifying double forfeit and every unpaid playoff payout
 */
export function computeEarnings(state) {
  requireSupportedFormat(state);
  if (isPayoutV2(state)) return computeEarningsV2(state);
  if (hasV3Plan(state)) return computeEarningsV3(state);
  if (!isPayoutV1(state)) throw noEngineError(state);
  const plan = state.payoutPlan;
  const ladder = state.playoffPlan;
  const byPlayer = {};
  (state.players || []).forEach((p) => {
    byPlayer[p.id] = { playerId: p.id, qualifying: 0, topUp: 0, bye: 0, playoff: 0, beforePlayoffs: 0, total: 0, matchWins: 0 };
  });
  const matches = state.matches || [];
  const doubleForfeits = matches.filter((m) => m.phase === 'qualifying' && m.result === 'double-forfeit').length;
  const empty = { byPlayer, paid: 0, doubleForfeits, championship: 0, pool: plan?.pool || 0, topUps: 0, transfers: { qualifying: 0, playoff: [] } };
  const template = plan ? playoffTemplate(plan.templateId) : null;
  if (!template) return empty;

  const finalKey = finalRound(template).key;
  const playoffUnpaid = ladder ? unpaidPlayoffPayouts(ladder, matches, finalKey) : [];
  const championship = ladder
    ? ladder.perRound[finalKey] + plan.q * doubleForfeits + playoffUnpaid.reduce((sum, u) => sum + u.amount, 0)
    : 0;
  const credit = (id, field, amount) => {
    const row = byPlayer[id];
    if (!row) return;
    row[field] += amount;
    row.total += amount;
  };

  matches.forEach((m) => {
    if (m.status !== 'completed' || !paysMatchWin(m)) return;
    if (m.phase === 'qualifying') credit(m.winnerId, 'qualifying', plan.q);
    else if (ladder) credit(m.winnerId, 'playoff', m.roundKey === finalKey ? championship : ladder.perRound[m.roundKey] || 0);
    if (m.result === 'played' && byPlayer[m.winnerId]) byPlayer[m.winnerId].matchWins += 1;
  });
  if (ladder) Object.entries(ladder.topUps || {}).forEach(([id, amount]) => credit(id, 'topUp', amount));
  if (ladder && state.playoff?.confirmedAt) {
    (state.playoff.byes || []).forEach((b) => credit(b.playerId, 'bye', ladder.bye));
  }
  Object.values(byPlayer).forEach((row) => { row.beforePlayoffs = row.qualifying + row.topUp; });

  const paid = Object.values(byPlayer).reduce((sum, row) => sum + row.total, 0);
  return {
    byPlayer,
    paid,
    doubleForfeits,
    championship,
    pool: plan.pool,
    topUps: ladder?.topUpTotal || 0,
    transfers: { qualifying: plan.q * doubleForfeits, playoff: playoffUnpaid },
  };
}

/** Each player's total earnings, for audit snapshots taken before a correction. Zero totals are left out. */
export function earningsTotals(state) {
  const out = {};
  Object.values(computeEarnings(state).byPlayer).forEach((r) => { if (r.total) out[r.playerId] = r.total; });
  return out;
}

/**
 * Players whose total would go down between two snapshots. The app does not record cash handed out,
 * so a drop after money was paid has to be settled by the operator in person.
 */
export function earningsDrops(before, after) {
  return Object.entries(before)
    .filter(([id, amount]) => (after[id] || 0) < amount)
    .map(([playerId, amount]) => ({ playerId, before: amount, after: after[playerId] || 0 }));
}

/**
 * Reconciliation for a finished event: every dollar of the pool went to a player.
 * Returns '' when the totals match the pool exactly, otherwise a description.
 */
export function reconciliationProblem(state) {
  requireSupportedFormat(state);
  if (isPayoutV2(state)) return reconciliationProblemV2(state);
  if (hasV3Plan(state)) return reconciliationProblemV3(state, v3OutcomeOf(state) === 'in-progress' ? 'completed' : undefined);
  if (!isPayoutV1(state)) throw noEngineError(state);
  const { paid, pool } = computeEarnings(state);
  if (!state.playoffPlan) return 'The playoff payouts are not locked yet.';
  if (paid !== pool) return `Paid $${paid} but the pool is $${pool}.`;
  return '';
}
