/**
 * V2 earnings (payoutVersion 2), derived only from recorded results, the locked plan and the confirmed byes.
 *   qualifyingRacks — $1 per rack won in a played qualifying match (winner and loser)
 *   qualifying      — Q per paying qualifying win
 *   playoffRacks    — $1 per rack won in a played playoff match (winner and loser)
 *   playoff         — locked round pay per paying playoff win (the championship pays its base amount)
 *   bye             — half an opening win, once the bracket is confirmed
 *   championBonus   — at valid completion only: unused playoff rack reserve + every unawarded match-win
 *                     payout (Q from qualifying double forfeits, round pay nobody won)
 * Until completion that bonus is held, so totals never exceed the pool and never include it early.
 */
import { playoffTemplate, finalRound } from './showdownPlayoffTemplates.js';
import { paysMatchWin } from './showdownResults.js';
import { championshipStatus } from './showdownChampionship.js';
import { playedRacks } from './showdownPlayoffPlanV2.js';
import { SHOWDOWN_PAYOUT_V2 } from './showdownRules.js';

const FIELDS = ['qualifyingRacks', 'qualifying', 'playoffRacks', 'playoff', 'bye', 'championBonus'];

function emptyRow(playerId) {
  const row = { playerId, topUp: 0, beforePlayoffs: 0, total: 0, matchWins: 0 };
  FIELDS.forEach((f) => { row[f] = 0; });
  return row;
}

export function computeEarningsV2(state) {
  const plan = state.payoutPlan;
  const ladder = state.playoffPlan;
  const matches = state.matches || [];
  const byPlayer = {};
  (state.players || []).forEach((p) => { byPlayer[p.id] = emptyRow(p.id); });
  const credit = (id, field, amount) => {
    const row = byPlayer[id];
    if (!row || !amount) return;
    row[field] += amount;
    row.total += amount;
  };
  const doubleForfeits = matches.filter((m) => m.phase === 'qualifying' && m.result === 'double-forfeit').length;
  const template = plan ? playoffTemplate(plan.templateId) : null;
  const finalKey = template ? finalRound(template).key : null;
  let playoffRacksPaid = 0;

  matches.forEach((m) => {
    if (m.status !== 'completed') return;
    const { r1, r2 } = playedRacks(m);
    const field = m.phase === 'qualifying' ? 'qualifyingRacks' : 'playoffRacks';
    credit(m.p1, field, r1);
    credit(m.p2, field, r2);
    if (m.phase === 'playoff') playoffRacksPaid += r1 + r2;
    if (!paysMatchWin(m)) return;
    if (m.result === 'played' && byPlayer[m.winnerId]) byPlayer[m.winnerId].matchWins += 1;
    if (m.phase === 'qualifying') credit(m.winnerId, 'qualifying', plan?.q || 0);
    else if (ladder) credit(m.winnerId, 'playoff', ladder.perRound[m.roundKey] || 0);
  });
  if (ladder && state.playoff?.confirmedAt) (state.playoff.byes || []).forEach((b) => credit(b.playerId, 'bye', ladder.bye));

  const playoffUnpaid = ladder
    ? matches.filter((m) => m.phase === 'playoff' && m.status === 'completed' && m.roundKey !== finalKey && !paysMatchWin(m))
      .map((m) => ({ matchId: m.id, roundKey: m.roundKey, result: m.result, amount: ladder.perRound[m.roundKey] || 0 }))
    : [];
  const rackReserve = ladder?.rackReserve || 0;
  const unusedReserve = rackReserve - playoffRacksPaid;
  const unawarded = (plan?.q || 0) * doubleForfeits + playoffUnpaid.reduce((s, u) => s + u.amount, 0);
  const championBonus = ladder ? unusedReserve + unawarded : 0;
  const champ = ladder ? championshipStatus(state) : { status: 'pending' };
  const bonusAwarded = Boolean(ladder) && state.status === 'completed' && champ.status === 'decided';
  if (bonusAwarded) credit(champ.championId, 'championBonus', championBonus);

  Object.values(byPlayer).forEach((row) => { row.beforePlayoffs = row.qualifying + row.qualifyingRacks; });
  const paid = Object.values(byPlayer).reduce((sum, row) => sum + row.total, 0);
  return {
    payoutVersion: SHOWDOWN_PAYOUT_V2,
    byPlayer,
    paid,
    pool: plan?.pool || 0,
    doubleForfeits,
    championship: ladder && finalKey ? ladder.perRound[finalKey] : 0,
    topUps: 0,
    transfers: { qualifying: (plan?.q || 0) * doubleForfeits, playoff: playoffUnpaid },
    rackReserve,
    playoffRacksPaid,
    unusedReserve,
    unawarded,
    championBonus,
    bonusAwarded,
    held: bonusAwarded ? 0 : championBonus,
  };
}

/** '' when the event can be (or was) completed with every dollar of the pool paid exactly once. */
export function reconciliationProblemV2(state) {
  if (!state.playoffPlan) return 'The playoff payouts are not locked yet.';
  const e = computeEarningsV2(state);
  if (e.unusedReserve < 0) return `Playoff games won ($${e.playoffRacksPaid}) exceed the $${e.rackReserve} game reserve.`;
  if (Object.values(e.byPlayer).some((r) => FIELDS.some((f) => r[f] < 0))) return 'A payout is negative.';
  if (e.paid > e.pool) return `Paid $${e.paid} but the pool is only $${e.pool}.`;
  const settled = e.paid + (e.bonusAwarded ? 0 : e.championBonus);
  if (settled !== e.pool) return `Paid $${e.paid} plus the $${e.championBonus} champion bonus is $${settled}, but the pool is $${e.pool}.`;
  return '';
}
