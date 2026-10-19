/** View data for payouts: the ladder, each player's earnings, and reconciliation. */
import * as E from '../showdownEngine.js';
import { playoffTemplate, finalRound } from '../showdownPlayoffTemplates.js';
import { matchView } from './showdownView.js';
import { moneyViewV2, payoutLadderV2 } from './showdownMoneyViewV2.js';

/**
 * Every payout line and its total. `ladder` is the locked playoff plan, or an estimate before
 * qualification is final. The total always equals the pool.
 */
export function payoutLadder(payoutPlan, ladder, doubleForfeits = 0) {
  const template = payoutPlan ? playoffTemplate(payoutPlan.templateId) : null;
  if (!template || !ladder) return null;
  const finalKey = finalRound(template).key;
  const fee = payoutPlan.entryFee;
  const rows = [
    { key: 'qualifying', label: 'Qualifying match win', count: payoutPlan.qualifyingMatches - doubleForfeits, each: payoutPlan.q },
    { key: 'topUp', label: `Qualifier top-up (to the ${'$'}${fee} entry fee)`, count: payoutPlan.qualifiers, each: null, total: ladder.topUpTotal },
  ];
  if (ladder.byes) rows.push({ key: 'bye', label: 'Quarterfinal bye (half a quarterfinal win)', count: ladder.byes, each: ladder.bye });
  template.rounds.forEach((r) => {
    const each = r.key === finalKey ? ladder.perRound[finalKey] + payoutPlan.q * doubleForfeits : ladder.perRound[r.key];
    rows.push({ key: r.key, label: `${r.label} win`, count: r.matches, each });
  });
  const withTotals = rows.map((r) => ({ ...r, total: r.total ?? r.count * r.each }));
  return {
    payoutVersion: 1,
    rows: withTotals,
    total: withTotals.reduce((s, r) => s + r.total, 0),
    pool: payoutPlan.pool,
    entryFee: fee,
    q: payoutPlan.q,
    qualifiers: payoutPlan.qualifiers,
    byes: ladder.byes,
    templateId: payoutPlan.templateId,
    budget: ladder.budget,
    finalRemainder: ladder.finalRemainder,
    doubleForfeitShift: payoutPlan.q * doubleForfeits,
    estimate: Boolean(ladder.estimate),
    twoWin: ladder.twoWin || 0,
  };
}

/** Safe preview for setup: the plan and an estimated ladder for N entrants at a fee, or the reason there is none. */
export function payoutPreview(entrants, entryFee, payoutVersion) {
  if (payoutVersion !== 1 && payoutVersion !== 2) {
    return { plan: null, ladder: null, problem: E.formatFor(payoutVersion)?.notReady || 'This format has no payout schedule in this version of the app.' };
  }
  try {
    const plan = E.buildPayoutPlan({ entrants, entryFee });
    const ladder = payoutVersion === 2 ? payoutLadderV2(plan, E.estimatePlayoffPlanV2(plan)) : payoutLadder(plan, E.estimatePlayoffPlan(plan));
    return { plan, ladder, problem: '' };
  } catch (err) {
    return { plan: null, ladder: null, problem: err.message };
  }
}

function estimateOrNull(plan) {
  try {
    return plan ? E.estimatePlayoffPlan(plan) : null;
  } catch {
    return null;
  }
}

export function moneyView(state) {
  if (E.formatSupportProblem(state)) return { payoutVersion: null, unsupported: true };
  if (E.isPayoutV2(state)) return moneyViewV2(state);
  if (!E.isPayoutV1(state)) return { payoutVersion: E.payoutVersionOf(state), unsupported: true };
  const e = E.computeEarnings(state);
  const plan = state.payoutPlan;
  const locked = Boolean(state.playoffPlan);
  const ladderPlan = state.playoffPlan || estimateOrNull(plan);
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
  const qualifyingPaid = players.reduce((s, p) => s + p.qualifying, 0);
  return {
    payoutVersion: 1,
    ladder: payoutLadder(plan, ladderPlan, e.doubleForfeits),
    locked,
    players,
    pool,
    q: plan?.q || 0,
    entryFee: plan?.entryFee || state.settings.entryFee,
    qualifyingPaid,
    topUps: e.topUps,
    playoffBudget: state.playoffPlan?.budget ?? null,
    paid: e.paid,
    remaining: pool - e.paid,
    doubleForfeits: e.doubleForfeits,
    championship: e.championship,
    playoffTransfers: e.transfers.playoff.map((t) => ({ ...t, label: matchView(state, state.matches.find((m) => m.id === t.matchId)).label })),
    reconciled: plan ? E.reconciliationProblem(state) === '' : false,
    reconciliationMessage: plan ? E.reconciliationProblem(state) : '',
  };
}
