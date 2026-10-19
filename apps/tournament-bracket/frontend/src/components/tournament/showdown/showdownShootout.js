import { SHOOTOUT_ELIMINATION_LOSSES } from './showdownRules.js';
import { shuffled } from './showdownRandom.js';

/**
 * Winner-stays-on-table, rotating-queue, two-loss shootout.
 * Stored inputs are only: random order, who starts the first game (`lagWinnerId`), and each game's
 * winner (`rackWinners`; the stored names predate the game-agnostic wording and are kept for saved events).
 * Everything else (holder, queue, losses, eliminations, who starts) is replayed from those,
 * which makes undo exact and keeps the queue free of duplicates by construction.
 */

/** kind: 'cutoff' decides who qualifies; 'bye' decides which tied qualifiers get the opening byes. */
export const SHOOTOUT_KINDS = ['cutoff', 'bye'];

export function shootoutKind(shootout) {
  return shootout?.kind === 'bye' ? 'bye' : 'cutoff';
}

export function createShootout({ id, groupIds, spots, kind = 'cutoff', random = Math.random, now = null }) {
  if (!SHOOTOUT_KINDS.includes(kind)) throw new Error('Unknown shootout kind.');
  const ids = [...new Set(groupIds)];
  if (ids.length !== groupIds.length) throw new Error('A player can only be in the shootout once.');
  if (ids.length < 2) throw new Error('A shootout needs at least 2 players.');
  if (!Number.isInteger(spots) || spots < 1 || spots >= ids.length) {
    throw new Error('Open spots must be at least 1 and fewer than the tied players.');
  }
  return {
    id,
    kind,
    groupIds: ids,
    spots,
    order: shuffled(ids, random),
    lagWinnerId: null,
    rackWinners: [],
    createdAt: now,
  };
}

/** Replays the shootout. Throws if the stored inputs are inconsistent. */
export function replayShootout(shootout) {
  const { order, spots, lagWinnerId, rackWinners } = shootout;
  const losses = Object.fromEntries(order.map((id) => [id, 0]));
  const eliminated = [];
  const racks = [];
  let holderId = order[0];
  let challengerId = order[1];
  let queue = order.slice(2);
  const alive = () => order.length - eliminated.length;

  if (!lagWinnerId) {
    return { status: 'lag', holderId, challengerId, breakerId: null, queue, losses, eliminated, racks, survivors: [] };
  }
  if (lagWinnerId !== holderId && lagWinnerId !== challengerId) throw new Error('The player who starts must be one of the first two players.');

  let breakerId = lagWinnerId;
  rackWinners.forEach((winnerId, i) => {
    if (alive() <= spots) throw new Error('The shootout was already decided.');
    if (winnerId !== holderId && winnerId !== challengerId) throw new Error(`Game ${i + 1} winner was not at the table.`);
    const loserId = winnerId === holderId ? challengerId : holderId;
    losses[loserId] += 1;
    const out = losses[loserId] >= SHOOTOUT_ELIMINATION_LOSSES;
    if (out) eliminated.push(loserId);
    else queue = [...queue, loserId];
    racks.push({
      n: i + 1,
      holderId,
      challengerId,
      breakerId,
      winnerId,
      loserId,
      eliminatedId: out ? loserId : null,
      lossesAfter: { ...losses },
    });
    holderId = winnerId;
    if (alive() > spots) {
      [challengerId] = queue;
      queue = queue.slice(1);
      breakerId = challengerId;
    } else {
      challengerId = null;
      breakerId = null;
    }
  });

  const done = alive() <= spots;
  const survivors = order.filter((id) => !eliminated.includes(id));
  return {
    status: done ? 'complete' : 'in-progress',
    holderId,
    challengerId: done ? null : challengerId,
    breakerId: done ? null : breakerId,
    queue: done ? [] : queue,
    losses,
    eliminated,
    racks,
    survivors: done ? survivors : [],
  };
}

export function setLagWinner(shootout, playerId) {
  if (shootout.rackWinners.length) throw new Error('Undo the shootout games before changing who starts.');
  if (playerId !== shootout.order[0] && playerId !== shootout.order[1]) {
    throw new Error('The player who starts must be one of the first two players.');
  }
  return { ...shootout, lagWinnerId: playerId };
}

export function recordRack(shootout, winnerId) {
  const state = replayShootout(shootout);
  if (state.status === 'lag') throw new Error('Record who starts the first game first.');
  if (state.status === 'complete') throw new Error('The shootout is already decided.');
  if (winnerId !== state.holderId && winnerId !== state.challengerId) throw new Error('That player is not at the table.');
  const next = { ...shootout, rackWinners: [...shootout.rackWinners, winnerId] };
  replayShootout(next);
  return next;
}

export function undoRack(shootout) {
  if (!shootout.rackWinners.length) {
    if (shootout.lagWinnerId) return { ...shootout, lagWinnerId: null };
    throw new Error('Nothing to undo.');
  }
  return { ...shootout, rackWinners: shootout.rackWinners.slice(0, -1) };
}

/** Summary used by qualification: complete shootouts expose their survivors. */
export function shootoutSummary(shootout) {
  const state = replayShootout(shootout);
  return { id: shootout.id, kind: shootoutKind(shootout), groupIds: shootout.groupIds, spots: shootout.spots, status: state.status, survivors: state.survivors };
}

/** Fewest and most games the shootout can take (each game hands out exactly one loss). */
export function rackBounds(players, spots) {
  const eliminations = players - spots;
  return { min: SHOOTOUT_ELIMINATION_LOSSES * eliminations, max: SHOOTOUT_ELIMINATION_LOSSES * eliminations + spots };
}
