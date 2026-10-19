/**
 * V3 administrative credits for qualifying forfeits. Credits are derived from stored results, never stored.
 *
 * Match m of G games; one player forfeits after p games were played, so u = G − p games are unplayed.
 * The non-forfeiting player B is credited
 *     c = min(u, ⌊u × W / P + ½⌋)          (rounded half up to whole games)
 * W / P is B's own actual qualifying win rate: games actually won over games actually played in all of
 * B's completed qualifying matches, including the games played in m and excluding every credit.
 * When B has played no games, the rate is ½. Credits are paid at B's own round rate in m.
 * Double forfeits and interruptions give no credit. A credit stays if B later withdraws.
 * While qualifying is open the credit is provisional: B's other match can still change W / P.
 */
import { gamesPlayed } from './showdownV3Results.js';

/** Whole-game credit for `unplayed` games at a win rate of wins / played (½ when nothing was played). */
export function v3CreditGames(unplayed, wins, played) {
  if (unplayed <= 0) return 0;
  const raw = played > 0 ? Math.floor((2 * unplayed * wins + played) / (2 * played)) : Math.floor((unplayed + 1) / 2);
  return Math.min(unplayed, raw);
}

/** Actual games won and played per player in completed qualifying matches. */
export function v3ActualRecord(qualifyingMatches) {
  const rec = {};
  const add = (id, won, played) => {
    if (!id) return;
    const r = (rec[id] ||= { wins: 0, played: 0 });
    r.wins += won; r.played += played;
  };
  qualifyingMatches.forEach((m) => {
    if (m.status !== 'completed') return;
    const p = gamesPlayed(m);
    add(m.p1, Number(m.score1) || 0, p);
    add(m.p2, Number(m.score2) || 0, p);
  });
  return rec;
}

/** One credit record per single-player qualifying forfeit. */
export function v3Credits(qualifyingMatches, games, { final = false } = {}) {
  const rec = v3ActualRecord(qualifyingMatches);
  return qualifyingMatches
    .filter((m) => m.status === 'completed' && m.result === 'forfeit' && m.winnerId)
    .map((m) => {
      const playerId = m.winnerId;
      const unplayed = Math.max(0, games - gamesPlayed(m));
      const { wins = 0, played = 0 } = rec[playerId] || {};
      return {
        matchId: m.id,
        playerId,
        forfeitedBy: m.loserId,
        unplayed,
        rate: { wins, played, fallback: played === 0 },
        games: v3CreditGames(unplayed, wins, played),
        provisional: !final,
      };
    });
}
