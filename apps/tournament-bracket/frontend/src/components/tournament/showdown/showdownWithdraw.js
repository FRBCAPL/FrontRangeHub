import { forfeitResult, clearResult } from './showdownResults.js';
import { activeShootout, refreshQualification } from './showdownAdvance.js';
import { applyWalkovers } from './showdownWalkovers.js';
import { earningsTotals } from './showdownEarnings.js';
import { context, withAudit, qualifyingMatches, withdrawnIds, replaceMatches } from './showdownState.js';

/**
 * Every unfinished qualifying match of a withdrawn player becomes an administrative forfeit.
 * When both players have withdrawn it is a double forfeit (no winner, Q moves to the championship).
 * Finished matches are never rewritten by a withdrawal.
 */
function forfeitQualifying(state, c) {
  const out = new Set(withdrawnIds(state));
  const matches = qualifyingMatches(state).map((m) => {
    if (m.status === 'completed') return m;
    const gone = [m.p1, m.p2].filter((id) => out.has(id));
    if (!gone.length) return m;
    return { ...forfeitResult(m, gone, state.settings.qualifyingRaceTo, c.now), auto: 'withdrawal' };
  });
  return { ...state, matches: replaceMatches(state, 'qualifying', matches) };
}

function markWithdrawn(state, playerId, c) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found.');
  if (player.withdrawnAt) throw new Error(`${player.name} has already withdrawn.`);
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, withdrawnAt: c.now, withdrawnPhase: state.status } : p)),
  };
}

/** True when this player's withdrawal can change who reaches the playoffs or how they are seeded. */
function affectsPlayoffField(state, playerId) {
  const q = state.qualification || {};
  const active = activeShootout(state);
  return (q.qualifierIds || []).includes(playerId)
    || (q.tie?.tiedIds || []).includes(playerId)
    || Boolean(active?.groupIds.includes(playerId));
}

function shootoutStarted(shootout) {
  return Boolean(shootout && (shootout.lagWinnerId || shootout.rackWinners.length));
}

/**
 * Withdraws a player under the approved policy:
 * - qualifying: remaining qualifying matches are forfeited (3–0 to the opponent, or double forfeit)
 * - before bracket confirmation: the vacancy goes to the next eligible player (shootout only on a crossing tie);
 *   a player outside the playoff picture changes nothing and any drawn bracket stands
 * - during a started shootout: a qualifier's vacancy is filled once the shootout finishes
 * - after bracket confirmation: the opponent advances by walkover; an earned bye is kept
 */
export function withdrawPlayer(state, playerId, ctxIn) {
  const c = context(ctxIn);
  if (state.status === 'setup') throw new Error('Before the start, remove the player instead.');
  if (state.status === 'completed' || state.status === 'ended') throw new Error('This event is finished.');

  const active = activeShootout(state);
  if (state.status === 'shootout' && active?.groupIds.includes(playerId) && shootoutStarted(active)) {
    throw new Error('This player is in a shootout that has started. Undo its racks first.');
  }

  let next = markWithdrawn(state, playerId, c);
  let effect = 'none';

  if (state.status === 'qualifying') {
    next = forfeitQualifying(next, c);
    effect = 'forfeits';
  } else if ((state.status === 'shootout' || state.status === 'bracket') && affectsPlayoffField(state, playerId)) {
    if (state.status === 'shootout' && shootoutStarted(active)) {
      effect = 'after-shootout';
    } else {
      next = { ...next, playoff: null, matches: next.matches.filter((m) => m.phase === 'qualifying') };
      next = refreshQualification(next, c);
      effect = state.playoff ? 'redraw' : 'requalify';
    }
  } else if (state.status === 'playoffs') {
    next = applyWalkovers(next, c);
    effect = 'walkovers';
  }
  const detail = { phase: state.status, effect };
  if (effect === 'redraw' || effect === 'requalify') detail.earningsBefore = earningsTotals(state);
  return withAudit(next, c, 'withdraw', [playerId], detail);
}

/**
 * Undoes a withdrawal made by mistake while qualifying is still open: the automatic forfeits
 * that withdrawal created are cleared, then re-applied for anyone still withdrawn.
 */
export function reinstatePlayer(state, playerId, ctxIn) {
  const c = context(ctxIn);
  if (state.status !== 'qualifying') throw new Error('A withdrawal can only be undone while qualifying is open.');
  const player = state.players.find((p) => p.id === playerId);
  if (!player?.withdrawnAt) throw new Error('That player has not withdrawn.');
  let next = { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, withdrawnAt: null, withdrawnPhase: null } : p)) };
  const matches = qualifyingMatches(next).map((m) => (m.auto === 'withdrawal' && m.forfeitedBy.includes(playerId) ? clearResult(m) : m));
  next = forfeitQualifying({ ...next, matches: replaceMatches(next, 'qualifying', matches) }, c);
  return withAudit(next, c, 'reinstate', [playerId]);
}
