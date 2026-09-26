import { canTakeTurn } from './breakAndRunTurns.js';

function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Players who can still take a turn this session, in join order. */
export function eligibleTablePlayers(state) {
  if (!state || state.status === 'completed' || state.status === 'ended') return [];
  return (state.players || [])
    .filter((player) => canTakeTurn(state, player.id).ok)
    .map((player) => {
      const gate = canTakeTurn(state, player.id);
      return {
        id: String(player.id),
        name: String(player.name || '').trim() || 'Player',
        isRebuy: Boolean(gate.isRebuyTurn),
        attempt: gate.attempt || 1,
      };
    });
}

/**
 * At the table = explicit atTablePlayerId when still eligible.
 * Up next = other eligible players in join order.
 */
export function buildTableLineup(state) {
  const eligible = eligibleTablePlayers(state);
  const atId = String(state?.atTablePlayerId || '').trim();
  const atTable = atId ? (eligible.find((p) => p.id === atId) || null) : null;
  const upNext = eligible.filter((p) => !atTable || p.id !== atTable.id);
  return { atTable, upNext, eligible };
}

export function setAtTablePlayer(state, playerId = '') {
  const next = clone(state);
  const id = String(playerId || '').trim();
  if (!id) {
    next.atTablePlayerId = '';
    return next;
  }
  const gate = canTakeTurn(next, id);
  if (!gate.ok) {
    throw new Error(gate.reason || 'That player cannot take a turn right now.');
  }
  next.atTablePlayerId = id;
  return next;
}

export function clearAtTablePlayer(state) {
  const next = clone(state);
  next.atTablePlayerId = '';
  return next;
}

/** After a turn, move the table to the next eligible player (join order). */
export function advanceAtTableAfterTurn(state, justPlayedId = '') {
  const next = clone(state);
  const played = String(justPlayedId || next.atTablePlayerId || '').trim();
  const eligible = eligibleTablePlayers(next);
  if (!eligible.length) {
    next.atTablePlayerId = '';
    return next;
  }
  if (!played) {
    next.atTablePlayerId = eligible[0].id;
    return next;
  }
  const idx = eligible.findIndex((p) => p.id === played);
  if (idx >= 0 && idx < eligible.length - 1) {
    next.atTablePlayerId = eligible[idx + 1].id;
    return next;
  }
  // Played player is done or was last — start from the top of remaining.
  const remaining = eligible.filter((p) => p.id !== played);
  next.atTablePlayerId = remaining[0]?.id || eligible[0].id || '';
  return next;
}
