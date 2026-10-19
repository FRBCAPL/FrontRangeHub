import { recordRack, replayShootout, setLagWinner, undoRack } from './showdownShootout.js';
import { activeShootout, refreshQualification } from './showdownAdvance.js';
import { qualifyingComplete } from './showdownResultActions.js';
import { earningsTotals } from './showdownEarnings.js';
import { context, requireConfirm, requireStatus, withAudit, playoffMatches } from './showdownState.js';
import { isPayoutV3 } from './showdownPayoutVersion.js';
import { v3CreditSnapshot, v3ReopenProblem } from './v3/showdownV3Event.js';

/** A V3 settlement belongs to the bracket it settled; reopening an earlier stage discards it. */
const V3_CLEARED = { v3Outcome: null, v3Settlement: null, v3Adjustments: [] };

/** Locks qualifying and works out qualifiers (opening a shootout if a tie crosses the cutoff). */
export function lockQualifying(state, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['qualifying'], 'Qualifying is not open.');
  if (!qualifyingComplete(state)) throw new Error('Finish every qualifying match first.');
  const v3Credits = isPayoutV3(state) ? v3CreditSnapshot(state, c.now) : null;
  const locked = { ...state, qualification: { lockedAt: c.now, qualifierIds: [], tie: null, short: 0, ...(v3Credits ? { v3Credits } : {}) } };
  const next = refreshQualification(locked, c);
  return withAudit(next, c, 'lock-qualifying', [], {
    ...(v3Credits ? { v3Credits: v3Credits.credits } : {}),
    status: next.status,
    tie: next.qualification.tie,
    byeTie: next.qualification.byeTie,
    byeIds: next.qualification.byeIds,
    playoffBudget: next.playoffPlan?.budget ?? null,
    topUps: next.playoffPlan?.topUps ?? null,
    ...(next.playoffPlan?.rackReserve ? { qualifyingRacks: next.playoffPlan.qualifyingRacks, rackReserve: next.playoffPlan.rackReserve } : {}),
  });
}

function hasDependents(state) {
  return (state.shootouts || []).some((s) => s.lagWinnerId || s.rackWinners.length) || Boolean(state.playoff) || Boolean(state.playoffPlan);
}

/**
 * Reopens qualifying for corrections. Clears shootouts, the bracket, playoff results and
 * bye assignments; earnings follow automatically because they are derived.
 */
export function reopenQualifying(state, confirmText, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['shootout', 'bracket', 'playoffs', 'completed'], 'Qualifying is already open.');
  const v3Problem = isPayoutV3(state) ? v3ReopenProblem(state) : '';
  if (v3Problem) throw new Error(v3Problem);
  if (hasDependents(state)) requireConfirm(confirmText);
  const cleared = playoffMatches(state).map((m) => m.id);
  const next = {
    ...state,
    status: 'qualifying',
    qualification: null,
    shootouts: [],
    playoff: null,
    playoffPlan: null,
    matches: state.matches.filter((m) => m.phase === 'qualifying'),
    championId: null,
    completedAt: null,
    ...(isPayoutV3(state) ? V3_CLEARED : {}),
  };
  return withAudit(next, c, 'reopen-qualifying', cleared, {
    shootoutsCleared: (state.shootouts || []).length,
    bracketCleared: Boolean(state.playoff),
    playoffPlanCleared: Boolean(state.playoffPlan),
    earningsBefore: earningsTotals(state),
  });
}

function updateActive(state, fn) {
  const active = activeShootout(state);
  if (!active) throw new Error('No shootout is running.');
  const updated = fn(active);
  return { ...state, shootouts: [...state.shootouts.slice(0, -1), updated] };
}

export function shootoutLag(state, playerId, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['shootout'], 'No shootout is running.');
  return withAudit(updateActive(state, (s) => setLagWinner(s, playerId)), c, 'shootout-lag', [playerId]);
}

/** Records a rack winner. When the shootout is decided, qualification moves on automatically. */
export function shootoutRack(state, winnerId, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['shootout'], 'No shootout is running.');
  const next = updateActive(state, (s) => recordRack(s, winnerId));
  const last = next.shootouts[next.shootouts.length - 1];
  const replay = replayShootout(last);
  const rack = replay.racks[replay.racks.length - 1];
  let out = withAudit(next, c, 'shootout-rack', [rack.winnerId, rack.loserId], rack);
  if (replay.status === 'complete') out = withAudit(refreshQualification(out, c), c, 'shootout-decided', replay.survivors);
  return out;
}

export function shootoutUndo(state, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['shootout'], 'No shootout is running.');
  return withAudit(updateActive(state, undoRack), c, 'shootout-undo');
}

/**
 * Reopens the most recently finished shootout by undoing its deciding rack.
 * Invalidates any drawn or confirmed bracket and its results.
 */
export function reopenShootout(state, confirmText, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['bracket', 'playoffs', 'completed'], 'There is no finished shootout to reopen.');
  if (activeShootout(state)) throw new Error('A shootout is already running.');
  const list = state.shootouts || [];
  const last = list[list.length - 1];
  if (!last || !last.rackWinners.length) throw new Error('There is no finished shootout to reopen.');
  const v3Problem = isPayoutV3(state) ? v3ReopenProblem(state) : '';
  if (v3Problem) throw new Error(v3Problem);
  if (state.playoff || state.playoffPlan) requireConfirm(confirmText);
  const cleared = playoffMatches(state).map((m) => m.id);
  const next = refreshQualification({
    ...state,
    shootouts: [...list.slice(0, -1), undoRack(last)],
    playoff: null,
    matches: state.matches.filter((m) => m.phase === 'qualifying'),
    championId: null,
    completedAt: null,
    ...(isPayoutV3(state) ? V3_CLEARED : {}),
  }, c);
  return withAudit(next, c, 'reopen-shootout', cleared, { earningsBefore: earningsTotals(state) });
}
