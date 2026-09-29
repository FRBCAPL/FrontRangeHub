import { canTakeTurn } from './breakAndRunTurns.js';

function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Line position: explicit queuedAt when set, otherwise roster (join) order. */
export function lineQueueKey(player, index) {
  const key = Number(player?.queuedAt);
  return Number.isFinite(key) ? key : index;
}

/**
 * Move a player to the end of the line (mutates state). Returns the previous
 * queuedAt (null when unset) so undo can restore it.
 */
export function moveToBackOfLine(state, playerId) {
  const players = state?.players || [];
  const player = players.find((p) => String(p.id) === String(playerId));
  if (!player) return null;
  const previous = Number.isFinite(Number(player.queuedAt)) ? Number(player.queuedAt) : null;
  const maxKey = players.reduce((max, p, i) => Math.max(max, lineQueueKey(p, i)), -1);
  player.queuedAt = maxKey + 1;
  return previous;
}

export function restoreLinePosition(player, previous) {
  if (!player) return;
  if (previous == null) delete player.queuedAt;
  else player.queuedAt = previous;
}

/** Players who can still take a turn this session, in line order. */
export function eligibleTablePlayers(state) {
  if (!state || state.status === 'completed' || state.status === 'ended') return [];
  return (state.players || [])
    .map((player, index) => ({ player, key: lineQueueKey(player, index) }))
    .filter(({ player }) => canTakeTurn(state, player.id).ok)
    .sort((a, b) => a.key - b.key)
    .map(({ player }) => {
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
 * Up next = other eligible players in line order.
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

/** After a turn, move the table to the next eligible player (line order). */
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
