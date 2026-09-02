import {
  getMatchById,
  getMatchInLoserBracket,
  setLoserAndAdvance,
  setLoserBracketWinner,
  setWinnerAndAdvance,
} from './bracketLogic.js';
import { withElimStatus } from './elimStatus.js';
import { isElimNamedPlayer } from './elimScore.js';

function namedPlayer(name) {
  return isElimNamedPlayer(name);
}

function fromRound(round, bracket) {
  return (round?.matches || []).map((m) => ({
    id: m.matchId,
    matchId: m.matchId,
    player1_id: m.slot1 || '',
    player1_name: m.slot1 || '',
    player2_id: m.slot2 || '',
    player2_name: m.slot2 || '',
    winner: m.winner || '',
    score: m.score || '',
    round_name: round.name || '',
    bracket: bracket || '',
  }));
}

export function listElimMatches(tournament) {
  if (!tournament) return [];
  if (tournament.type === 'double') {
    const gf = tournament.grandFinal;
    const grand = gf
      ? [{
        id: gf.matchId || 'gf',
        matchId: gf.matchId || 'gf',
        player1_id: gf.slot1 || '',
        player1_name: gf.slot1 || '',
        player2_id: gf.slot2 || '',
        player2_name: gf.slot2 || '',
        winner: gf.winner || '',
        score: gf.score || '',
        round_name: 'Grand Final',
        bracket: 'Grand Final',
      }]
      : [];
    return [
      ...(tournament.winnersRounds || []).flatMap((round) => fromRound(round, "Winner's")),
      ...(tournament.loserRounds || []).flatMap((round) => fromRound(round, "Loser's")),
      ...grand,
    ];
  }
  return (tournament.rounds || []).flatMap((round) => fromRound(round, ''));
}

export function playableElimMatches(tournament) {
  return listElimMatches(tournament).filter((m) => (
    !m.winner && namedPlayer(m.player1_name) && namedPlayer(m.player2_name)
  ));
}

export function findElimMatch(tournament, matchId) {
  const id = String(matchId || '');
  return listElimMatches(tournament).find((m) => String(m.id) === id) || null;
}

export function applyElimWinner(tournament, matchId, winnerName, score = '') {
  if (!tournament || !matchId || !winnerName) return tournament;
  const next = JSON.parse(JSON.stringify(tournament));
  const id = String(matchId);

  if (next.type === 'double') {
    if (id === 'gf' || id === next.grandFinal?.matchId) {
      if (next.grandFinal) {
        next.grandFinal.winner = winnerName;
        if (score) next.grandFinal.score = score;
      }
      return withElimStatus(next);
    }
    if (getMatchById(next.winnersRounds || [], id)) {
      setWinnerAndAdvance(next.winnersRounds, id, winnerName, next.grandFinal);
      setLoserAndAdvance(next.winnersRounds, id, next.loserRounds, next.grandFinal);
      setMatchScore(next.winnersRounds, id, score);
      return withElimStatus(next);
    }
    if (getMatchInLoserBracket(next.loserRounds, next.grandFinal, id)) {
      setLoserBracketWinner(next.loserRounds, id, winnerName, next.grandFinal);
      setMatchScore(next.loserRounds, id, score);
      return withElimStatus(next);
    }
    return tournament;
  }

  setWinnerAndAdvance(next.rounds || [], id, winnerName);
  setMatchScore(next.rounds || [], id, score);
  return withElimStatus(next);
}

function setMatchScore(rounds, matchId, score) {
  if (!score) return;
  const match = getMatchById(rounds, matchId);
  if (match) match.score = score;
}
