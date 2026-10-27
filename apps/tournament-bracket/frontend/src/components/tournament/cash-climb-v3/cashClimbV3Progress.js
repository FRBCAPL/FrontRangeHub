/**
 * Cash Climb V3 match progression.
 *
 * A slot's occupant is derived, never stored: an entrant is a player; "winner of X" is pending until X is
 * resolved, then the winner of X, or vacant when X ended with no winner (double forfeit, double
 * withdrawal, both positions vacant). A vacant position is never a player and never earns money.
 *
 * Match statuses: open, completed, forfeit, double-forfeit, withdrawal, double-withdrawal,
 * walkover (one position vacant: the other player advances) and void (both vacant). Walkover and void are
 * applied automatically, cascading, as soon as both positions are known.
 *
 * Recording is pure (returns a new event). Re-submitting the identical result is a no-op; a different
 * result for a resolved match is rejected, so advancement and earnings are never duplicated.
 */
import { normalizeResult, sameResult } from './cashClimbV3Results.js';
import { matchEntries } from './cashClimbV3Payouts.js';
import { resolveMatchInLedger } from './cashClimbV3Ledger.js';

const PENDING = Object.freeze({ kind: 'pending' });
const VACANT = Object.freeze({ kind: 'vacant' });

export function slotOccupant(event, slot) {
  if (slot.entrant) return { kind: 'player', id: slot.entrant };
  const up = event.matches[slot.winnerOf];
  if (up.status === 'open') return PENDING;
  return up.winner ? { kind: 'player', id: up.winner } : VACANT;
}

export const matchOccupants = (event, matchId) => event.matches[matchId].slots.map((s) => slotOccupant(event, s));

export function matchReadiness(event, matchId) {
  const m = event.matches[matchId];
  if (m.status !== 'open') return 'resolved';
  const occ = matchOccupants(event, matchId);
  if (occ.some((o) => o.kind === 'pending')) return 'waiting';
  return occ.every((o) => o.kind === 'player') ? 'ready' : 'automatic';
}

export const readyMatchIds = (event) => event.order.filter((id) => matchReadiness(event, id) === 'ready');

function resolve(event, matchId, result) {
  const match = event.matches[matchId];
  const entries = matchEntries(event.config, match, result);
  event.ledger = resolveMatchInLedger(event.ledger, matchId, entries);
  event.matches[matchId] = { ...match, status: result.outcome, result, winner: result.winner };
}

/** Applies walkovers and voids until none remain. Matches are in play order, so one pass suffices. */
function applyVacancies(event) {
  const auto = [];
  event.order.forEach((id) => {
    if (matchReadiness(event, id) !== 'automatic') return;
    const players = matchOccupants(event, id).filter((o) => o.kind === 'player');
    resolve(event, id, players.length ? { outcome: 'walkover', winner: players[0].id } : { outcome: 'void', winner: null });
    auto.push(id);
  });
  return auto;
}

/** Resolves vacancies already present at creation (none in a valid placement, but kept total). */
export function startCashClimbV3Event(event) {
  const next = structuredClone(event);
  applyVacancies(next);
  return next;
}

/**
 * @returns {{ event, changed: boolean, autoResolved: string[] }}
 * Throws a plain-English error for an invalid or conflicting submission.
 */
export function recordMatchResult(event, matchId, submitted) {
  const match = event.matches[matchId];
  if (!match) throw new Error(`Unknown match ${matchId}.`);
  if (event.settlement) throw new Error('The event is already settled.');
  const occ = matchOccupants(event, matchId);
  if (match.status !== 'open') {
    const players = occ.filter((o) => o.kind === 'player').map((o) => o.id);
    let normalized = null;
    try { normalized = players.length === 2 ? normalizeResult(submitted, players, event.config.raceTo) : null; } catch { normalized = null; }
    if (normalized && sameResult(normalized, match.result)) return { event, changed: false, autoResolved: [] };
    throw new Error(`Match ${matchId} already has a result; corrections are not supported.`);
  }
  if (occ.some((o) => o.kind !== 'player')) throw new Error(`Match ${matchId} is not ready: both players must be known.`);
  const result = normalizeResult(submitted, occ.map((o) => o.id), event.config.raceTo);
  const next = structuredClone(event);
  resolve(next, matchId, result);
  return { event: next, changed: true, autoResolved: applyVacancies(next) };
}

/** Players who are still alive: not eliminated and not withdrawn/forfeited. */
export function survivors(event) {
  const alive = new Set();
  event.order.forEach((id) => {
    const m = event.matches[id];
    if (m.status === 'open') matchOccupants(event, id).forEach((o) => { if (o.kind === 'player') alive.add(o.id); });
  });
  const champ = event.matches[event.championshipId];
  if (champ.status !== 'open' && champ.winner) alive.add(champ.winner);
  return [...alive];
}
