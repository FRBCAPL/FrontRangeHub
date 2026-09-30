import {
  eventSnapshot,
  formatMoney,
  formatTournamentDate,
  isAttemptStarted,
  previewTurn,
  sanitizeBreakAndRun,
} from './breakAndRunEngine.js';
import { formatSessionDetails, hasOpenBreakAndRunSession } from './breakAndRunSessions.js';
import { currentSession, formatTurnDate } from './breakAndRunTurns.js';
import { buildTableLineup } from './breakAndRunTable.js';
import { attemptLiveView, describeCalledTurn } from './breakAndRunCalledTurn.js';
import { tournamentFromEventRow } from '../cash-climb/cashClimbSaved.js';

export const BREAK_AND_RUN_TV_BASE = '/tournament-bracket/break-and-run/tv';
export const BREAK_AND_RUN_PHONE_BASE = '/tournament-bracket/break-and-run/view';

export function breakAndRunTvHash(eventId = '') {
  const id = String(eventId || '').trim();
  return id ? `${BREAK_AND_RUN_TV_BASE}/${encodeURIComponent(id)}` : BREAK_AND_RUN_TV_BASE;
}

export function breakAndRunPhoneHash(eventId = '') {
  const id = String(eventId || '').trim();
  return id ? `${BREAK_AND_RUN_PHONE_BASE}/${encodeURIComponent(id)}` : BREAK_AND_RUN_PHONE_BASE;
}

export function breakAndRunTvHref(eventId = '') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${breakAndRunTvHash(eventId)}`;
}

export function breakAndRunPhoneHref(eventId = '') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${breakAndRunPhoneHash(eventId)}`;
}

export function openBreakAndRunTv(eventId = '') {
  const url = breakAndRunTvHref(eventId);
  const opened = window.open(url, 'frontrange-break-and-run-tv');
  if (!opened) window.location.assign(url);
}

export function openBreakAndRunPhone(eventId = '') {
  const url = breakAndRunPhoneHref(eventId);
  const opened = window.open(url, 'frontrange-break-and-run-phone');
  if (!opened) window.location.assign(url);
}

export function isBreakAndRunTvPath(pathname) {
  return String(pathname || '').startsWith(BREAK_AND_RUN_TV_BASE);
}

export function isBreakAndRunPhonePath(pathname) {
  return String(pathname || '').startsWith(BREAK_AND_RUN_PHONE_BASE);
}

export function isBreakAndRunDisplayPath(pathname) {
  return isBreakAndRunTvPath(pathname) || isBreakAndRunPhonePath(pathname);
}

export function breakAndRunDisplayEventId(pathname) {
  const path = String(pathname || '');
  const bases = [BREAK_AND_RUN_TV_BASE, BREAK_AND_RUN_PHONE_BASE];
  for (const base of bases) {
    if (!path.startsWith(base)) continue;
    const rest = path.slice(base.length).replace(/^\//, '');
    if (!rest) return '';
    try {
      return decodeURIComponent(rest.split('/')[0] || '');
    } catch {
      return rest.split('/')[0] || '';
    }
  }
  return '';
}

/**
 * Prefer React Router param, then parse the URL path.
 * Needed when App.jsx renders TV/phone outside the matched Route (useParams empty).
 */
export function resolveBreakAndRunDisplayEventId(routeParam = '', pathname = '') {
  const fromParam = String(routeParam || '').trim();
  if (fromParam) return fromParam;
  return breakAndRunDisplayEventId(pathname);
}

export function tournamentFromDisplayRow(row) {
  if (!row) return null;
  const fromCloud = tournamentFromEventRow(row);
  return fromCloud ? sanitizeBreakAndRun(fromCloud) : null;
}

function turnLine(turn) {
  if (!turn) return '';
  if (turn.payoutMode === 'called-ball') {
    if (turn.busted) return turn.bank > 0 ? `Bust · ${formatMoney(turn.bank)}` : 'Bust';
    return describeCalledTurn(turn);
  }
  if (turn.scratchOnBreak || turn.outcome === 'scratch-break') return 'Scratch on the break';
  if (turn.busted || turn.outcome === 'bust') {
    const balls = turn.payableBalls ?? turn.ballsMade;
    return balls > 0 ? `Bust · ${balls} at risk` : 'Bust';
  }
  const balls = turn.payableBalls ?? turn.ballsMade;
  const bits = [`Cash out · ${balls} payable`];
  if (turn.earlyTen) bits.push('early 10 (2×)');
  return bits.join(' · ');
}

function mapTurn(turn) {
  return {
    id: turn.id,
    playerName: turn.playerName,
    dateLabel: formatTurnDate(turn.date),
    attemptLabel: turn.isRebuyTurn || turn.attempt > 1
      ? `Rebuy #${Math.max(1, (turn.attempt || 1) - 1)}`
      : 'First try',
    detail: turnLine(turn),
    amountWon: turn.amountWon,
    amountLabel: turn.amountWon > 0 ? formatMoney(turn.amountWon) : 'No payout',
  };
}

function mapWinner(turn) {
  const balls = Number(turn.payableBalls ?? turn.ballsMade) || 0;
  let ballLabel = balls > 0
    ? `${balls} ball${balls === 1 ? '' : 's'}${turn.earlyTen ? ' · early 10' : ''}`
    : '';
  if (turn.finalTen) ballLabel = 'Final 10';
  else if (turn.earlyTen && !balls) ballLabel = 'Early 10';
  return {
    id: turn.id,
    playerName: turn.playerName,
    amountLabel: formatMoney(turn.amountWon),
    detail: turnLine(turn),
    ballLabel,
    finalTen: Boolean(turn.finalTen),
  };
}

/** Small note under the public pot amount, e.g. "+ $23 reserve held back · carries forward". */
export function potBreakdownLine(board) {
  if (!board || board.payoutMode !== 'called-ball' || !(board.reserve > 0)) return '';
  return `+ ${formatMoney(board.reserve)} reserve held back · carries forward`;
}

/** Rate tiles for the public/TV boards: [{ key, label, value, highlight }]. */
export function payoutRateTiles(board) {
  if (!board) return [];
  if (board.payoutMode === 'called-ball') {
    return [
      { key: 'called', label: 'Called ball', value: board.perBall },
      { key: 'lucky', label: 'Lucky ball', value: board.luckyBall },
      { key: 'early', label: 'Early 10 bonus', value: board.earlyTenPays },
      { key: 'final', label: 'Final 10 wins', value: board.finalTenPays, highlight: true },
    ];
  }
  return [
    { key: 'per', label: 'Per ball', value: board.perBall },
    { key: 'early', label: 'Early 10', value: board.earlyTenPays },
    { key: 'full', label: 'Clear rack', value: board.fullRunPays },
  ];
}

/** Values shown on every public display, for either payout mode. */
function payoutFields(snapshot) {
  const called = snapshot.payoutMode === 'called-ball';
  return {
    payoutMode: snapshot.payoutMode || 'flat',
    currentPot: snapshot.currentPot,
    /** Big "In the pot" number on public screens: what can be won (reserve excluded). */
    displayPot: called ? snapshot.payablePot : snapshot.currentPot,
    payablePot: snapshot.payablePot,
    reserve: snapshot.reserve ?? 0,
    perBall: snapshot.perBall,
    luckyBall: snapshot.luckyBall ?? 0,
    earlyTenPays: snapshot.earlyTenPays,
    fullRunPays: snapshot.fullRunPays,
    finalTenPays: snapshot.finalTenPays ?? snapshot.fullRunPays,
  };
}

function sessionTurns(clean, sessionId) {
  const sid = String(sessionId || '').trim();
  if (!sid) return [];
  return (clean.turns || []).filter((turn) => String(turn.sessionId || '') === sid);
}

export function buildBreakAndRunPublicBoard(tournament) {
  const clean = sanitizeBreakAndRun(tournament);
  if (!clean) return null;
  const snapshot = eventSnapshot(clean);
  const session = currentSession(clean);
  const sessionOpen = hasOpenBreakAndRunSession(clean);
  const potLive = clean.status === 'in-progress';
  const turns = (clean.turns || []).slice(0, 12).map(mapTurn);
  const winners = (clean.turns || [])
    .filter((turn) => Number(turn.amountWon) > 0)
    .slice(0, 12)
    .map(mapWinner);
  const sessionLabel = formatSessionDetails(session, { includeVenue: false });
  const sessionVenue = String(session?.venue || '').trim();
  return {
    id: clean.id,
    name: clean.name,
    dateLabel: formatTournamentDate(clean.startDate || clean.tournamentDate),
    startDateLabel: formatTournamentDate(clean.startDate || clean.tournamentDate),
    sessionLabel,
    sessionName: session?.name || '',
    sessionDateLabel: sessionLabel,
    sessionVenue,
    sessionOpen,
    status: clean.status,
    potLive,
    live: sessionOpen,
    statusLabel: sessionOpen ? 'Live' : (potLive ? 'Between sessions' : 'Complete'),
    ...payoutFields(snapshot),
    totalPaidOut: snapshot.totalPaidOut,
    startingSeed: snapshot.startingSeed,
    entryFees: snapshot.entryFees,
    memberFee: snapshot.memberFee ?? clean.memberFee,
    openFee: snapshot.openFee ?? clean.openFee,
    playerCount: snapshot.playerCount,
    turns,
    winners,
  };
}

/** TV board: current open session only — pot + session stats, no rules/history dump. */
export function buildBreakAndRunTvBoard(tournament) {
  const clean = sanitizeBreakAndRun(tournament);
  if (!clean) return null;
  const session = currentSession(clean);
  const sessionOpen = hasOpenBreakAndRunSession(clean);
  if (!sessionOpen || !session) {
    return {
      id: clean.id,
      name: clean.name,
      sessionOpen: false,
      live: false,
      ...payoutFields(eventSnapshot(clean)),
    };
  }
  const snapshot = eventSnapshot(clean);
  const turnsInSession = sessionTurns(clean, session.id);
  const sessionPaidOut = turnsInSession.reduce((sum, turn) => sum + (Number(turn.amountWon) || 0), 0);
  const sessionAttempts = turnsInSession.length;
  const winners = turnsInSession
    .filter((turn) => Number(turn.amountWon) > 0)
    .slice(0, 10)
    .map(mapWinner);
  const turns = turnsInSession.slice(0, 12).map(mapTurn);
  const lineup = buildTableLineup(clean);
  const atTableId = lineup.atTable?.id;
  const playingFor = atTableId && isAttemptStarted(clean, atTableId)
    ? previewTurn(clean, atTableId, { outcome: 'bust' }).payablePot
    : 0;
  return {
    id: clean.id,
    name: clean.name,
    sessionLabel: formatSessionDetails(session, { includeVenue: false }),
    sessionVenue: String(session.venue || '').trim(),
    sessionOpen: true,
    live: true,
    statusLabel: 'Live',
    ...payoutFields(snapshot),
    sessionPaidOut,
    sessionAttempts,
    playerCount: snapshot.playerCount,
    turns,
    winners,
    atTable: lineup.atTable,
    attemptLive: atTableId && isAttemptStarted(clean, atTableId) ? attemptLiveView(clean) : null,
    playingFor,
    upNext: lineup.upNext,
  };
}

export { hasOpenBreakAndRunSession };
