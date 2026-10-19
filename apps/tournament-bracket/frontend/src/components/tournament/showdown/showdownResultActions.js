import { playedResult, forfeitResult } from './showdownResults.js';
import { assignTable, moveTable, unassignTable, setHold } from './showdownScheduler.js';
import { syncPlayoffPlayers, downstreamOf } from './showdownPlayoff.js';
import { applyWalkovers } from './showdownWalkovers.js';
import { raceToFor, isPayoutV3 } from './showdownPayoutVersion.js';
import { context, findMatch, requireStatus, withAudit, qualifyingMatches, playoffMatches, replaceMatches, playerIds, withdrawnIds } from './showdownState.js';
import { v3PlayedFor, v3ForfeitFor } from './v3/showdownV3Matches.js';
import { v3CorrectionProblem } from './v3/showdownV3Corrections.js';

function phaseStatus(match) {
  return match.phase === 'qualifying' ? ['qualifying'] : ['playoffs'];
}

function tableAction(state, matchId, fn, action, ctxIn) {
  const c = context(ctxIn);
  const match = findMatch(state, matchId);
  requireStatus(state, phaseStatus(match), 'That match is not open right now.');
  return withAudit({ ...state, matches: fn(state.matches, c) }, c, action, [matchId]);
}

export function startOnTable(state, matchId, table, ctxIn) {
  return tableAction(state, matchId, (m, c) => assignTable(m, matchId, table, state.settings.tableCount, c.now), 'assign-table', ctxIn);
}

export function changeTable(state, matchId, table, ctxIn) {
  return tableAction(state, matchId, (m) => moveTable(m, matchId, table, state.settings.tableCount), 'move-table', ctxIn);
}

export function takeOffTable(state, matchId, ctxIn) {
  return tableAction(state, matchId, (m) => unassignTable(m, matchId), 'unassign-table', ctxIn);
}

export function holdMatch(state, matchId, hold, ctxIn) {
  return tableAction(state, matchId, (m) => setHold(m, matchId, hold), hold ? 'hold' : 'release', ctxIn);
}

/**
 * A playoff result can change only while nothing it feeds has started. Automatic results
 * (withdrawal walkovers, empty-position advancements) are re-derived, so they never block.
 */
export function startedDownstream(state, matchId) {
  const ids = downstreamOf(playoffMatches(state), matchId);
  return state.matches.filter((m) => ids.includes(m.id) && !m.auto && (m.status === 'on-table' || m.status === 'completed'));
}

function saveResult(state, match, next, c, action) {
  const correcting = match.status === 'completed';
  const winner = state.players.find((p) => p.id === next.winnerId);
  if (match.phase === 'playoff' && winner?.withdrawnAt) {
    throw new Error(`${winner.name} has withdrawn and cannot advance in the playoffs.`);
  }
  if (match.phase === 'playoff' && correcting && startedDownstream(state, match.id).length) {
    throw new Error('A later match has already started. Use Undo from here to change this result.');
  }
  let matches = state.matches.map((m) => (m.id === match.id ? next : m));
  let nextState = { ...state, matches };
  if (match.phase === 'playoff') {
    matches = replaceMatches(nextState, 'playoff', syncPlayoffPlayers(playoffMatches(nextState)));
    nextState = applyWalkovers({ ...nextState, matches }, c);
  }
  const detail = correcting
    ? { from: { result: match.result, score1: match.score1, score2: match.score2, winnerId: match.winnerId }, to: { result: next.result, score1: next.score1, score2: next.score2, winnerId: next.winnerId } }
    : { result: next.result, score1: next.score1, score2: next.score2, winnerId: next.winnerId };
  if (typeof next.voluntaryForfeit === 'boolean') detail.voluntary = next.voluntaryForfeit;
  return withAudit(nextState, c, correcting ? `correct-${action}` : action, [match.id], detail);
}

function openMatch(state, matchId) {
  const match = findMatch(state, matchId);
  requireStatus(state, phaseStatus(match), match.phase === 'qualifying'
    ? 'Qualifying is locked. Reopen qualifying to change it.'
    : 'Playoff results can only change while playoffs are running.');
  if (!match.p1 || !match.p2) throw new Error('Both players are not known yet.');
  return match;
}

function raceFor(state, match) {
  return raceToFor(state, match.phase);
}

/** V3 corrections are checked against the score rules and every budget before they replace a result. */
function checkedV3(state, next) {
  const problem = v3CorrectionProblem(state.payoutPlan, playerIds(state), state.matches, next, {
    byeIds: (state.playoff?.byes || []).map((b) => b.playerId), withdrawnIds: withdrawnIds(state),
  });
  if (problem) throw new Error(problem);
  return next;
}

export function recordResult(state, matchId, { score1, score2 }, ctxIn) {
  const c = context(ctxIn);
  const match = openMatch(state, matchId);
  if (isPayoutV3(state)) return saveResult(state, match, checkedV3(state, v3PlayedFor(state, match, score1, score2, c.now)), c, 'result');
  return saveResult(state, match, playedResult(match, score1, score2, raceFor(state, match), c.now), c, 'result');
}

/**
 * `entry` (V3 only, required): { score1, score2 } already played, or { noGamesPlayed: true }; both players
 * keep the games they won. `entry.voluntary` records that the player chose to forfeit.
 * V1 and V2 forfeits always record the race won to nil.
 */
export function recordForfeit(state, matchId, forfeitingIds, ctxIn, entry) {
  const c = context(ctxIn);
  const match = openMatch(state, matchId);
  if (isPayoutV3(state)) return saveResult(state, match, checkedV3(state, v3ForfeitFor(state, match, forfeitingIds, entry, c.now)), c, 'forfeit');
  return saveResult(state, match, forfeitResult(match, forfeitingIds, raceFor(state, match), c.now), c, 'forfeit');
}

export function qualifyingComplete(state) {
  return qualifyingMatches(state).every((m) => m.status === 'completed');
}
