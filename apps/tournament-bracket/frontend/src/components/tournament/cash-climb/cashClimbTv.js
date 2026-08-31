import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import {
  formatMoney,
  formatTournamentDate,
  getCurrentRound,
  getRoundMatches,
  sortStandings,
} from './cashClimbEngine.js';
import { splitByTables } from './cashClimbProgress.js';

export const CASH_CLIMB_TV_HASH = '/tournament-bracket/tv';
export const CASH_CLIMB_TV_LAYOUT_KEY = 'frontrange-cash-climb-tv-layout';

export function parseTvLayout(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'portrait' || raw === '9x16' || raw === '9:16') return 'portrait';
  return 'landscape';
}

export function readStoredTvLayout() {
  try {
    return parseTvLayout(localStorage.getItem(CASH_CLIMB_TV_LAYOUT_KEY));
  } catch {
    return 'landscape';
  }
}

export function storeTvLayout(layout) {
  try {
    localStorage.setItem(CASH_CLIMB_TV_LAYOUT_KEY, parseTvLayout(layout));
  } catch {
    /* ignore */
  }
}

export function cashClimbTvHref(layout = 'landscape') {
  const resolved = parseTvLayout(layout);
  storeTvLayout(resolved);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${CASH_CLIMB_TV_HASH}?layout=${resolved}`;
}

export function openCashClimbTv(layout = 'landscape') {
  const url = cashClimbTvHref(layout);
  const opened = window.open(url, 'frontrange-cash-climb-tv');
  if (!opened) window.location.assign(url);
}

export function matchResultLine(match) {
  if (!match) return '';
  if (match.is_bye) return `${match.winner_name || match.player1_name} — bye`;
  const score = match.score ? ` ${match.score}` : '';
  if (match.winner_name && match.loser_name) {
    return `${match.winner_name} def. ${match.loser_name}${score}`;
  }
  return `${match.player1_name} vs ${match.player2_name || 'Bye'}`;
}

function isLiveMatch(match, stats) {
  if (!match || match.status !== 'pending') return false;
  if (match.is_bye || !match.player2_id) return false;
  const p1 = stats.find((p) => p.player_id === match.player1_id);
  const p2 = stats.find((p) => p.player_id === match.player2_id);
  if (p1?.eliminated || p2?.eliminated) return false;
  return true;
}

export function buildCashClimbTvBoard(tournament) {
  if (!tournament) return null;

  const stats = tournament.stats || [];
  const round = getCurrentRound(tournament);
  const roundMatches = round ? getRoundMatches(tournament, round.id) : [];
  const liveAll = roundMatches.filter((m) => isLiveMatch(m, stats));
  const { atTable, onDeck } = splitByTables(liveAll, tournament.tableCount);
  const byes = roundMatches.filter((m) => m.is_bye && m.status !== 'cancelled');
  const roundDone = roundMatches.filter((m) => m.status === 'completed' && !m.is_bye);
  const kohStarted = (tournament.rounds || []).some(
    (r) => r.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName
  );
  const paidOut = stats.reduce((sum, p) => sum + (p.total_payout || 0), 0);

  return {
    name: tournament.name || 'Cash Climb',
    dateLabel: formatTournamentDate(tournament.tournamentDate),
    status: tournament.status,
    message: tournament.message || '',
    gameType: tournament.gameType,
    raceTo: tournament.raceTo,
    kohRaceTo: tournament.kohRaceTo,
    tableCount: tournament.tableCount,
    pool: formatMoney(tournament.totalPrizePool),
    paid: formatMoney(paidOut),
    winner: tournament.winner || null,
    chopped: Boolean(tournament.chopped),
    chopPlayers: stats.filter((p) => p.chopped),
    roundName: round?.round_name || (tournament.status === 'completed' ? 'Final' : 'Standings'),
    kohStarted,
    live: atTable,
    onDeck,
    byes,
    roundDone,
    standings: sortStandings(stats),
  };
}

export function playerRecord(board, playerId) {
  const player = (board?.standings || []).find((p) => p.player_id === playerId);
  return { wins: player?.wins || 0, losses: player?.losses || 0 };
}

export function matchGridColumns(layout, matchCount) {
  const n = Math.max(1, Number(matchCount) || 1);
  if (parseTvLayout(layout) === 'portrait') return 2;
  return n <= 1 ? 1 : 2;
}

export function tickerRoundLabel(match, rounds) {
  const round = (rounds || []).find((r) => r.id === match?.round_id);
  if (round?.koh_round_number != null || round?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName) {
    const n = round.koh_round_number;
    return n ? `KOH ${n}` : 'KOH';
  }
  const n = round?.round_number || match?.round_number;
  if (n) return `Round ${n}`;
  return round?.round_name || '';
}

function tickerRoundSortKey(match, rounds) {
  const round = (rounds || []).find((r) => r.id === match?.round_id);
  if (round?.koh_round_number != null || round?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName) {
    return 10000 + (Number(round.koh_round_number) || 0);
  }
  return Number(round?.round_number || match?.round_number || 0);
}

export function tickerResultItems(matches, rounds) {
  const items = (matches || [])
    .filter((m) => m.status === 'completed')
    .map((match) => {
      const round = tickerRoundLabel(match, rounds);
      const roundId = match.round_id || round || 'unknown';
      const sortKey = tickerRoundSortKey(match, rounds);
      const meta = {
        round,
        roundId,
        sortKey,
        bye: Boolean(match.is_bye),
        completed_at: match.completed_at || '',
        match_number: match.match_number || 0,
      };
      if (match.is_bye) {
        const winner = match.winner_name || match.player1_name || '';
        return winner ? { kind: 'bye', winner, text: `${winner} — bye`, ...meta } : null;
      }
      const winner = match.winner_name || '';
      const loser = match.loser_name || '';
      if (!winner || !loser) return null;
      const score = match.score ? String(match.score) : '';
      return {
        kind: 'played',
        winner,
        loser,
        score,
        text: `${winner} vs ${loser}${score ? ` ${score}` : ''}`,
        ...meta,
      };
    })
    .filter(Boolean);

  items.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    if (a.bye !== b.bye) return a.bye ? 1 : -1;
    const byTime = String(a.completed_at).localeCompare(String(b.completed_at));
    if (byTime) return byTime;
    return a.match_number - b.match_number;
  });
  return items;
}

export function tickerResultGroups(matches, rounds) {
  const groups = [];
  tickerResultItems(matches, rounds).forEach((item) => {
    const last = groups[groups.length - 1];
    if (last && last.roundId === item.roundId) last.items.push(item);
    else groups.push({ roundId: item.roundId, round: item.round, items: [item] });
  });
  return groups;
}

export function tickerResultLines(matches, rounds) {
  return tickerResultGroups(matches, rounds).flatMap((group) =>
    group.items.map((item, index) => (index === 0 && group.round ? `${group.round}  ${item.text}` : item.text))
  );
}

export function tickerCopy(lines) {
  return (lines || []).filter(Boolean).join('    •    ');
}

export function tickerGroupsCopy(groups) {
  return (groups || []).map((group) => {
    const body = group.items.map((item) => item.text).join('    •    ');
    return group.round ? `${group.round}  ${body}` : body;
  }).join('    |    ');
}

export function tickerDurationSec(text, travelPx = 0) {
  if (travelPx > 0) return Math.max(10, Math.min(42, travelPx / 90));
  const chars = Math.max(24, String(text || '').length);
  return Math.max(10, Math.min(42, chars / 8));
}
