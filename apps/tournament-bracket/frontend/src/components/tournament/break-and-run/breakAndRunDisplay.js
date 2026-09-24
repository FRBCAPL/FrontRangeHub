import { eventSnapshot, formatMoney, formatTournamentDate, sanitizeBreakAndRun } from './breakAndRunEngine.js';
import { formatTurnDate } from './breakAndRunTurns.js';
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

export function tournamentFromDisplayRow(row) {
  if (!row) return null;
  const fromCloud = tournamentFromEventRow(row);
  return fromCloud ? sanitizeBreakAndRun(fromCloud) : null;
}

function turnLine(turn) {
  if (!turn) return '';
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

export function buildBreakAndRunPublicBoard(tournament) {
  const clean = sanitizeBreakAndRun(tournament);
  if (!clean) return null;
  const snapshot = eventSnapshot(clean);
  const turns = (clean.turns || []).slice(0, 8).map((turn) => ({
    id: turn.id,
    playerName: turn.playerName,
    dateLabel: formatTurnDate(turn.date),
    attemptLabel: turn.isRebuyTurn || turn.attempt > 1
      ? `Rebuy #${Math.max(1, (turn.attempt || 1) - 1)}`
      : 'First try',
    detail: turnLine(turn),
    amountWon: turn.amountWon,
    amountLabel: turn.amountWon > 0 ? formatMoney(turn.amountWon) : 'No payout',
  }));
  const winners = (clean.turns || [])
    .filter((turn) => Number(turn.amountWon) > 0)
    .slice(0, 12)
    .map((turn) => ({
      id: turn.id,
      playerName: turn.playerName,
      amountLabel: formatMoney(turn.amountWon),
      detail: turnLine(turn),
    }));
  return {
    id: clean.id,
    name: clean.name,
    dateLabel: formatTournamentDate(clean.startDate || clean.tournamentDate),
    startDateLabel: formatTournamentDate(clean.startDate || clean.tournamentDate),
    status: clean.status,
    live: clean.status === 'in-progress',
    currentPot: snapshot.currentPot,
    perBall: snapshot.perBall,
    earlyTenPays: snapshot.earlyTenPays,
    fullRunPays: snapshot.fullRunPays,
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
