import { idsEqual } from './cashClimbSubmit.js';
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { getRoundGameType } from './cashClimbSchedule.js';
import { playedGameFromMatch } from './cashClimbPlayedGame.js';

function involved(match, playerId) {
  return idsEqual(match.player1_id, playerId)
    || idsEqual(match.player2_id, playerId)
    || idsEqual(match.winner_id, playerId);
}

function matchHistoryGame(match, tournament, round) {
  const played = playedGameFromMatch(match);
  if (played) return played;
  const n = Math.max(1, Number(round?.round_number || match?.round_number) || 1);
  return getRoundGameType(n, tournament?.gameType) || '';
}

function historyRoundLabel(round, match, tournament) {
  const game = matchHistoryGame(match, tournament, round);
  if (round?.koh_round_number != null || round?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName) {
    return game
      ? `${OPEN_TOURNAMENT_STRUCTURE.finalStageName} (${game})`
      : OPEN_TOURNAMENT_STRUCTURE.finalStageName;
  }
  const n = Math.max(1, Number(round?.round_number || match?.round_number) || 1);
  return game ? `Round ${n} (${game})` : `Round ${n}`;
}

export function playerMatchHistory(tournament, playerId) {
  if (!playerId) return [];
  const rounds = tournament?.rounds || [];
  return (tournament?.matches || [])
    .filter((match) => match.status === 'completed' && involved(match, playerId))
    .map((match) => {
      const round = rounds.find((r) => idsEqual(r.id, match.round_id));
      const bye = Boolean(match.is_bye) || !match.player2_id;
      const won = idsEqual(match.winner_id, playerId);
      const opponent = idsEqual(match.player1_id, playerId)
        ? (match.player2_name || 'Bye')
        : (match.player1_name || '');
      const game = matchHistoryGame(match, tournament, round);
      return {
        id: match.id,
        roundLabel: historyRoundLabel(round, match, tournament),
        opponent: bye ? 'Bye' : opponent,
        result: bye ? 'Bye' : won ? 'Win' : 'Loss',
        score: match.score || '',
        game,
        paid: won ? Number(match.payout_amount) || 0 : 0,
        completedAt: match.completed_at || '',
        sortKey: `${match.completed_at || ''} ${String(match.round_number || 0).padStart(4, '0')}`,
      };
    })
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
}
