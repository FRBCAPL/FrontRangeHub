import { playoffLadder } from './showdownPayout.js';
import { paysMatchWin } from './showdownResults.js';
import { isPayoutV1, isPayoutV2, isPayoutV3, noEngineError, requireSupportedFormat } from './showdownPayoutVersion.js';
import { lockPlayoffPlanV2 } from './showdownPlayoffPlanV2.js';
import { v3PlayoffPlanFor } from './v3/showdownV3Event.js';

/**
 * Qualifying money from recorded results: Q per paying win (played or forfeit).
 * A double forfeit pays nobody; that Q moves to the championship (showdownEarnings.js).
 */
export function qualifyingWinnings(state) {
  const q = state.payoutPlan?.q || 0;
  const byPlayer = {};
  (state.players || []).forEach((p) => { byPlayer[p.id] = 0; });
  let wins = 0;
  (state.matches || []).forEach((m) => {
    if (m.phase !== 'qualifying' || m.status !== 'completed' || !paysMatchWin(m)) return;
    byPlayer[m.winnerId] = (byPlayer[m.winnerId] || 0) + q;
    wins += 1;
  });
  return { byPlayer, wins, paid: wins * q };
}

/** Qualification guarantee: each qualifier is brought up to the entry fee. Never negative. */
export function qualificationTopUps(entryFee, qualifierIds, winningsById) {
  const out = {};
  qualifierIds.forEach((id) => { out[id] = Math.max(0, entryFee - (winningsById[id] || 0)); });
  return out;
}

/**
 * Locked once qualification is final:
 *   playoff budget = pool − qualifying payouts (N × Q) − top-ups, spread over the weighted playoff ladder.
 * Q not paid because of a qualifying double forfeit is not in the budget; it is added to the
 * championship, as before, so the pool is still paid out exactly.
 */
export function buildPlayoffPlan({ payoutPlan, qualifierIds, winningsById, qualifyingPaid = payoutPlan.qualifyingMatches * payoutPlan.q }) {
  const qualifyingScheduled = payoutPlan.qualifyingMatches * payoutPlan.q;
  const topUps = qualificationTopUps(payoutPlan.entryFee, qualifierIds, winningsById);
  const topUpTotal = Object.values(topUps).reduce((s, v) => s + v, 0);
  const budget = payoutPlan.pool - qualifyingScheduled - topUpTotal;
  if (budget < 0) throw new Error(`Qualifying pay and top-ups ($${qualifyingScheduled + topUpTotal}) exceed the $${payoutPlan.pool} pool.`);
  return {
    ...playoffLadder(payoutPlan.templateId, budget),
    qualifierIds: [...qualifierIds],
    qualifyingScheduled,
    qualifyingPaid,
    doubleForfeitTransfer: qualifyingScheduled - qualifyingPaid,
    topUps,
    topUpTotal,
  };
}

export function lockPlayoffPlan(state, qualifierIds, now = null) {
  requireSupportedFormat(state);
  if (isPayoutV2(state)) return lockPlayoffPlanV2(state, qualifierIds, now);
  if (isPayoutV3(state)) return v3PlayoffPlanFor(state, qualifierIds, now);
  if (!isPayoutV1(state)) throw noEngineError(state);
  const w = qualifyingWinnings(state);
  return { ...buildPlayoffPlan({ payoutPlan: state.payoutPlan, qualifierIds, winningsById: w.byPlayer, qualifyingPaid: w.paid }), lockedAt: now };
}

/**
 * Preview before qualification is final. Assumes every qualifying match pays and a typical spread:
 * about a quarter of the field goes 2–0 and those players qualify first, the other qualifiers are 1–1.
 */
export function estimatePlayoffPlan(payoutPlan) {
  const { entrants: n, qualifiers: k, q } = payoutPlan;
  const twoWin = Math.min(k, Math.floor(n / 4));
  const ids = Array.from({ length: k }, (_, i) => `q${i}`);
  const winningsById = Object.fromEntries(ids.map((id, i) => [id, (i < twoWin ? 2 : 1) * q]));
  return { ...buildPlayoffPlan({ payoutPlan, qualifierIds: ids, winningsById }), estimate: true, twoWin, entrants: n };
}
