/**
 * V3 qualifying ledger (cents). Each player is paid at their own fixed round rate for every game they
 * actually won, including games won before either player forfeited, plus any administrative credit.
 * Actual wins and credits are tracked in separate columns. No match ever pays more than
 * G × the higher of its two round rates, which is what the plan reserved for it.
 */
import { v3RoundLabels, v3RateFor } from './showdownV3Rounds.js';
import { v3Credits } from './showdownV3Credits.js';
import { gamesPlayed } from './showdownV3Results.js';

function emptyRow(playerId) {
  return {
    playerId, actualWins: 0, actualRound2Wins: 0, actualCents: 0,
    creditWins: 0, creditCents: 0, gamesPlayed: 0, matchesCompleted: 0, opponents: [],
  };
}

/** `snapshot`: credits finalized when qualifying locked; used instead of recomputing them. */
export function v3QualifyingLedger(plan, playerIds, qualifyingMatches, { final = false, snapshot = null } = {}) {
  const labels = v3RoundLabels(qualifyingMatches);
  const rows = {};
  playerIds.forEach((id) => { rows[id] = emptyRow(id); });
  const credits = snapshot
    ? snapshot.map((c) => ({ ...c }))
    : v3Credits(qualifyingMatches, plan.qualifyingGames, { final });
  const creditByMatch = new Map(credits.map((c) => [c.matchId, c]));
  const matches = [];

  qualifyingMatches.forEach((m) => {
    const l = labels[m.id];
    const sides = [[m.p1, m.score1, l.p1Round], [m.p2, m.score2, l.p2Round]];
    sides.forEach(([id], i) => { const opp = sides[1 - i][0]; if (rows[id] && opp) rows[id].opponents.push(opp); });
    if (m.status !== 'completed') return;
    let paid = 0;
    sides.forEach(([id, score, round]) => {
      const row = rows[id];
      const won = Number(score) || 0;
      const cents = won * v3RateFor(plan, round);
      paid += cents;
      if (!row) return;
      row.actualWins += won;
      if (round === 2) row.actualRound2Wins += won;
      row.actualCents += cents;
      row.gamesPlayed += gamesPlayed(m);
      row.matchesCompleted += 1;
    });
    const credit = creditByMatch.get(m.id);
    if (credit) {
      const round = credit.playerId === m.p1 ? l.p1Round : l.p2Round;
      credit.round = round;
      credit.cents = credit.games * v3RateFor(plan, round);
      paid += credit.cents;
      const row = rows[credit.playerId];
      if (row) { row.creditWins += credit.games; row.creditCents += credit.cents; }
    }
    const budget = plan.qualifyingGames * Math.max(v3RateFor(plan, l.p1Round), v3RateFor(plan, l.p2Round));
    matches.push({ matchId: m.id, bridge: l.bridge, result: m.result, paid, budget, withinBudget: paid <= budget });
  });

  Object.values(rows).forEach((r) => { r.totalCents = r.actualCents + r.creditCents; });
  const paidCents = Object.values(rows).reduce((s, r) => s + r.totalCents, 0);
  return {
    rows, credits, matches, labels,
    reservedCents: plan.reserves.qualifying,
    paidCents,
    unusedCents: plan.reserves.qualifying - paidCents,
    final: final || Boolean(snapshot),
  };
}
