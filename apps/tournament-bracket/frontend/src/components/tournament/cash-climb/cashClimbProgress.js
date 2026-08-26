import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { getCurrentRound, getRoundMatches } from './cashClimbEngine.js';

export function playableRoundMatches(matches) {
  return (matches || []).filter((m) => !m.is_bye && m.player2_id && m.status !== 'cancelled');
}

export function pendingPlayableMatches(tournament, round) {
  const stats = tournament?.stats || [];
  return playableRoundMatches(round ? getRoundMatches(tournament, round.id) : []).filter((m) => {
    if (m.status !== 'pending') return false;
    const p1 = stats.find((p) => p.player_id === m.player1_id);
    const p2 = stats.find((p) => p.player_id === m.player2_id);
    return !p1?.eliminated && !p2?.eliminated;
  });
}

export function matchTableLabel(index, tableCount) {
  const tables = Math.max(0, Number(tableCount) || 0);
  if (!tables) return 'Table not assigned';
  return `Table ${(index % tables) + 1}`;
}

export function cashClimbProgress(tournament) {
  const round = getCurrentRound(tournament);
  if (!tournament || tournament.status === 'completed') {
    return {
      roundLabel: tournament?.status === 'completed' ? 'Event complete' : 'Not started',
      matchLabel: '',
      nextMatch: null,
      nextLabel: '',
    };
  }
  if (!round) {
    return { roundLabel: 'Waiting for the next round', matchLabel: '', nextMatch: null, nextLabel: '' };
  }

  const matches = getRoundMatches(tournament, round.id);
  const playable = playableRoundMatches(matches);
  const done = playable.filter((m) => m.status === 'completed').length;
  const total = playable.length;
  const pending = pendingPlayableMatches(tournament, round);
  const nextMatch = pending[0] || null;
  const koh = round.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName;
  const scheduled = (tournament.prizeSchedule || []).length;
  const roundOf = scheduled ? Math.max(scheduled, round.round_number) : null;
  const roundLabel = koh
    ? `King of the Hill${round.koh_round_number ? ` • KOH ${round.koh_round_number}` : ''}`
    : `Round ${round.round_number}${roundOf ? ` of ${roundOf}` : ''}`;

  return {
    roundLabel,
    matchLabel: total ? `${done} of ${total} matches complete` : '',
    nextMatch,
    nextLabel: nextMatch ? `${nextMatch.player1_name} vs ${nextMatch.player2_name}` : '',
  };
}
