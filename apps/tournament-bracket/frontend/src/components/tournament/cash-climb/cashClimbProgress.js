import { OPEN_TOURNAMENT_STRUCTURE, getKOHThreshold } from './openTournamentStructure.js';
import { formatMoney, getActivePlayers, getCurrentRound, getRoundMatches, roundReadyToContinue } from './cashClimbEngine.js';
import { canChopKoh, chopRemainingPreview } from './cashClimbKohSettle.js';

export function playableRoundMatches(matches) {
  return (matches || []).filter((m) => !m.is_bye && m.player2_id && m.status !== 'cancelled');
}

export function roundByeMatches(matches) {
  return (matches || []).filter((m) => (m.is_bye || !m.player2_id) && m.status !== 'cancelled');
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

export function splitByTables(matches, tableCount) {
  const tables = Math.max(0, Number(tableCount) || 0);
  const list = matches || [];
  if (!tables) {
    return { atTable: list.map((m) => ({ ...m, tableNumber: null })), onDeck: [] };
  }
  return {
    atTable: list.slice(0, tables).map((m, i) => ({ ...m, tableNumber: i + 1 })),
    onDeck: list.slice(tables).map((m) => ({ ...m, tableNumber: null })),
  };
}

export function matchTableLabel(index, tableCount) {
  const tables = Math.max(0, Number(tableCount) || 0);
  if (!tables || index >= tables) return 'On deck';
  return `Table ${index + 1}`;
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

export function cashClimbContinueLabel(tournament) {
  if (!roundReadyToContinue(tournament)) return '';
  const active = getActivePlayers(tournament).length;
  if (active <= 1) return 'Complete tournament';
  const round = getCurrentRound(tournament);
  if (round?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName) return 'Continue King of the Hill';
  const started = (tournament.stats || []).length;
  if (active <= getKOHThreshold(started, tournament)) return 'Start King of the Hill';
  return 'Continue to next round';
}

export function cashClimbChopLabel(tournament) {
  if (!canChopKoh(tournament)) return '';
  return `Chop remaining ${formatMoney(chopRemainingPreview(tournament))}`;
}
