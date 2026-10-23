/**
 * V3 playoff ledger (cents), from recorded playoff results, the locked plan and the confirmed byes.
 *   games    — every game actually won pays the playoff rate of its stage (one rate for every stage in plans
 *              locked before the escalating formula), to both players, in every result (played, walkover
 *              after a partial match, double forfeit, interruption)
 *   matchWin — plans with a match-win ladder only: the locked round pay for each result that pays a match win
 *              (played, walkover, champion by walkover). A walkover pays the match win but no unplayed games.
 *   bye      — the locked bye pay (escalating plans: the bye credit) for each confirmed bye holder. It is not
 *              a game won; it stays with the holder whether they later win, lose or withdraw.
 * Each match is reserved (2k − 1) games; what is not used stays in the remainder for settlement.
 */
import { paysMatchWin } from '../showdownResults.js';
import { gamesPlayed } from './showdownV3Results.js';
import { v3PlayoffRateCents, v3MatchWinCents, v3ByeCents } from './showdownV3Pay.js';

function emptyRow(playerId) {
  return { playerId, gameWins: 0, gameCents: 0, matchWinCents: 0, byeCents: 0, matchWins: 0 };
}

export function v3PlayoffLedger(plan, playoffMatches, { byeIds = [] } = {}) {
  const rows = {};
  const row = (id) => (rows[id] ||= emptyRow(id));
  const cap = plan.reserves.playoffGamesPerMatch;
  const problems = [];
  let gameCents = 0;
  let matchWinCents = 0;

  playoffMatches.forEach((m) => {
    if (m.status !== 'completed') return;
    const rate = v3PlayoffRateCents(plan, m.roundKey);
    const played = gamesPlayed(m);
    if (played > cap || (Number(m.score1) || 0) > plan.playoffRaceTo || (Number(m.score2) || 0) > plan.playoffRaceTo) {
      problems.push(`Playoff match ${m.id} records more games than a race to ${plan.playoffRaceTo} allows.`);
    }
    [[m.p1, m.score1], [m.p2, m.score2]].forEach(([id, score]) => {
      const won = Number(score) || 0;
      if (!id || !won) return;
      row(id).gameWins += won;
      row(id).gameCents += won * rate;
      gameCents += won * rate;
    });
    if (paysMatchWin(m) && m.winnerId) {
      const pay = v3MatchWinCents(plan, m.roundKey);
      row(m.winnerId).matchWinCents += pay;
      if (m.result === 'played') row(m.winnerId).matchWins += 1;
      matchWinCents += pay;
    }
  });
  const byeCents = v3ByeCents(plan);
  byeIds.forEach((id) => { row(id).byeCents += byeCents; });

  Object.values(rows).forEach((r) => { r.totalCents = r.gameCents + r.matchWinCents + r.byeCents; });
  if (gameCents > plan.reserves.playoffGames) problems.push('Playoff games paid exceed the playoff game reserve.');
  return {
    rows,
    gameCents,
    matchWinCents,
    byeTotalCents: byeCents * byeIds.length,
    unusedGameReserveCents: plan.reserves.playoffGames - gameCents,
    paidCents: gameCents + matchWinCents + byeCents * byeIds.length,
    problems,
  };
}
