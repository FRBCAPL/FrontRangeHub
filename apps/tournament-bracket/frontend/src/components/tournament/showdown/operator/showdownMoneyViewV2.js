/** V2 payout view data: schedule rows that add up to the pool, player earnings by source, champion bonus. */
import * as E from '../showdownEngine.js';
import { playoffTemplate, finalRound } from '../showdownPlayoffTemplates.js';
import { V2_RACK_RESERVE_PER_MATCH } from '../showdownRules.js';
import { matchView } from './showdownView.js';

/**
 * Locked: every line uses the real qualifying racks. Provisional: the lowest-budget case (every qualifying
 * match 3–2) with the highest-budget case in `range`. Either way the rows total the pool.
 */
export function payoutLadderV2(payoutPlan, ladder, doubleForfeits = 0) {
  const template = payoutPlan ? playoffTemplate(payoutPlan.templateId) : null;
  if (!template || !ladder) return null;
  const finalKey = finalRound(template).key;
  const rows = [
    { key: 'qualifying', label: 'Qualifying match win', count: payoutPlan.qualifyingMatches - doubleForfeits, each: payoutPlan.q },
    { key: 'qualifyingRacks', label: ladder.estimate ? 'Qualifying games won ($1 each, if every match goes 3\u20132)' : 'Qualifying games won ($1 each)', count: ladder.qualifyingRacks, each: 1 },
  ];
  if (ladder.byes) rows.push({ key: 'bye', label: 'Quarterfinal bye (half a quarterfinal win)', count: ladder.byes, each: ladder.bye });
  template.rounds.forEach((r) => rows.push({ key: r.key, label: `${r.label} win`, count: r.matches, each: ladder.perRound[r.key] }));
  rows.push({ key: 'rackReserve', label: `Playoff game reserve ($1 a game, up to $${V2_RACK_RESERVE_PER_MATCH} a match; unused goes to the champion)`, count: ladder.playoffMatches, each: V2_RACK_RESERVE_PER_MATCH });
  if (doubleForfeits) rows.push({ key: 'unawardedQualifying', label: 'Qualifying double forfeits (to the champion bonus)', count: doubleForfeits, each: payoutPlan.q });
  const withTotals = rows.map((r) => ({ ...r, total: r.count * r.each }));
  return {
    payoutVersion: 2,
    rows: withTotals,
    total: withTotals.reduce((s, r) => s + r.total, 0),
    pool: payoutPlan.pool,
    entryFee: payoutPlan.entryFee,
    q: payoutPlan.q,
    qualifiers: payoutPlan.qualifiers,
    byes: ladder.byes,
    templateId: payoutPlan.templateId,
    budget: ladder.budget,
    finalKey,
    finalRemainder: ladder.finalRemainder,
    rackReserve: ladder.rackReserve,
    qualifyingRacks: ladder.qualifyingRacks,
    doubleForfeitShift: payoutPlan.q * doubleForfeits,
    estimate: Boolean(ladder.estimate),
    range: ladder.range || null,
  };
}

function estimateOrNull(plan) {
  try {
    return plan ? E.estimatePlayoffPlanV2(plan) : null;
  } catch {
    return null;
  }
}

export function moneyViewV2(state) {
  const e = E.computeEarnings(state);
  const plan = state.payoutPlan;
  const locked = Boolean(state.playoffPlan);
  const qualifiers = new Set(state.qualification?.qualifierIds || []);
  const byeIds = new Set((state.playoff?.byes || []).map((b) => b.playerId));
  const players = state.players.map((p) => ({
    ...e.byPlayer[p.id],
    name: p.name,
    withdrawn: Boolean(p.withdrawnAt),
    qualified: locked && qualifiers.has(p.id),
    hasBye: byeIds.has(p.id),
  })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const pool = e.pool || (state.players.length * state.settings.entryFee);
  const sum = (k) => players.reduce((s, p) => s + p[k], 0);
  const problem = plan ? E.reconciliationProblem(state) : '';
  return {
    payoutVersion: 2,
    ladder: payoutLadderV2(plan, state.playoffPlan || estimateOrNull(plan), e.doubleForfeits),
    locked,
    players,
    pool,
    q: plan?.q || 0,
    entryFee: plan?.entryFee || state.settings.entryFee,
    qualifyingPaid: sum('qualifying'),
    qualifyingRacksPaid: sum('qualifyingRacks'),
    playoffRacksPaid: e.playoffRacksPaid,
    playoffBudget: state.playoffPlan?.budget ?? null,
    rackReserve: e.rackReserve,
    unusedReserve: e.unusedReserve,
    championBonus: e.championBonus,
    bonusAwarded: e.bonusAwarded,
    held: e.held,
    topUps: 0,
    paid: e.paid,
    remaining: pool - e.paid,
    doubleForfeits: e.doubleForfeits,
    championship: e.championship,
    playoffTransfers: e.transfers.playoff.map((t) => ({ ...t, label: matchView(state, state.matches.find((m) => m.id === t.matchId)).label })),
    reconciled: plan ? problem === '' : false,
    reconciliationMessage: problem,
  };
}
