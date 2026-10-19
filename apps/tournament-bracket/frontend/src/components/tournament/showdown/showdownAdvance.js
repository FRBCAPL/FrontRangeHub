import { rankStandings } from './showdownStandings.js';
import { resolveQualification, resolveByes, shootoutMatchesTie } from './showdownQualification.js';
import { createShootout, replayShootout, shootoutSummary } from './showdownShootout.js';
import { lockPlayoffPlan } from './showdownPlayoffPlan.js';
import { playerIds, qualifyingMatches, withdrawnIds } from './showdownState.js';
import { isPayoutV2, isPayoutV3 } from './showdownPayoutVersion.js';
import { v3StandingsFor } from './v3/showdownV3Event.js';

/**
 * Players who withdrew while qualifying was open are left out of the eligible ties. A withdrawal after
 * qualifying is locked does not re-rank anyone: the locked ties and any shootouts decided on them stand.
 */
function rankingExcludedIds(state) {
  return (state.players || []).filter((p) => p.withdrawnAt && p.withdrawnPhase === 'qualifying').map((p) => p.id);
}

/** V3 ranks by qualifying dollars first; V1 and V2 use the six match-win tiebreakers. */
export function standingsFor(state) {
  if (isPayoutV3(state)) return v3StandingsFor(state, rankingExcludedIds(state));
  return rankStandings(playerIds(state), qualifyingMatches(state), { excludedIds: rankingExcludedIds(state) });
}

function hasProgress(shootout) {
  return Boolean(shootout.lagWinnerId || shootout.rackWinners.length);
}

export function activeShootout(state) {
  const list = state.shootouts || [];
  const last = list[list.length - 1];
  return last && replayShootout(last).status !== 'complete' ? last : null;
}

function finishedOfKind(shootouts, kind) {
  return shootouts.map(shootoutSummary).filter((s) => s.status === 'complete' && s.kind === kind);
}

/** The tie (if any) the current standings, withdrawals and finished cutoff shootouts leave open. */
export function qualificationOutcome(state, shootouts = state.shootouts || []) {
  const { groups } = standingsFor(state);
  return resolveQualification({
    groups,
    spots: state.payoutPlan.qualifiers,
    withdrawnIds: withdrawnIds(state),
    shootouts: finishedOfKind(shootouts, 'cutoff'),
  });
}

/** Which qualifiers earn the opening byes, or the tie a bye shootout must decide. */
export function byeOutcome(state, qualifierIds, shootouts = state.shootouts || []) {
  return resolveByes({
    groups: standingsFor(state).groups,
    qualifierIds,
    byes: state.payoutPlan.byes || 0,
    shootouts: finishedOfKind(shootouts, 'bye'),
  });
}

/** Keeps the running shootout if it matches the open tie; otherwise replaces an untouched one. */
function withShootoutFor(state, kind, tie, c) {
  const active = activeShootout(state);
  let shootouts = state.shootouts || [];
  if (shootoutMatchesTie(active, tie, kind)) return shootouts;
  if (active && hasProgress(active)) throw new Error('A shootout is under way. Undo its games before changing who is tied.');
  if (active) shootouts = shootouts.slice(0, -1);
  return [...shootouts, createShootout({ id: c.newId('so'), kind, groupIds: tie.tiedIds, spots: tie.openSpots, random: c.random, now: c.now })];
}

function withoutUntouchedShootout(state) {
  const active = activeShootout(state);
  const shootouts = state.shootouts || [];
  if (!active) return shootouts;
  if (hasProgress(active)) throw new Error('A shootout is under way. Undo its games before changing who is tied.');
  return shootouts.slice(0, -1);
}

/**
 * Re-derives qualification after qualifying is locked or something it depends on changes.
 * 1. A tie crossing the cutoff opens a cutoff shootout.
 * 2. Once the qualifiers are known the playoff plan (top-ups and ladder) is locked.
 * 3. A tie crossing the last bye opens a bye shootout; otherwise the event moves to the bracket draw.
 * Refuses to discard a shootout that already has a lag or racks recorded.
 */
export function refreshQualification(state, c) {
  const outcome = qualificationOutcome(state);
  const base = { ...state.qualification, byeTie: null, byeIds: [] };
  /** V2 payouts depend only on qualifying results, so they stay locked while a shootout or a short field is sorted out. */
  const heldPlan = () => (isPayoutV2(state) ? lockPlayoffPlan(state, outcome.qualifiedIds, c.now) : null);

  if (outcome.status === 'needs-shootout') {
    const tie = { tiedIds: outcome.tiedIds, openSpots: outcome.openSpots };
    return {
      ...state,
      status: 'shootout',
      shootouts: withShootoutFor(state, 'cutoff', tie, c),
      playoffPlan: heldPlan(),
      qualification: { ...base, qualifierIds: outcome.qualifiedIds, tie, short: 0 },
    };
  }

  if (outcome.status === 'short') {
    return {
      ...state,
      status: 'bracket',
      shootouts: withoutUntouchedShootout(state),
      playoffPlan: heldPlan(),
      qualification: { ...base, qualifierIds: outcome.qualifiedIds, tie: null, short: outcome.missing },
    };
  }

  const qualifierIds = outcome.qualifiedIds;
  const playoffPlan = lockPlayoffPlan(state, qualifierIds, c.now);
  const byes = byeOutcome(state, qualifierIds);
  const qualification = { ...base, qualifierIds, tie: null, short: 0, byeIds: byes.byeIds };

  if (byes.status === 'needs-shootout') {
    const byeTie = { tiedIds: byes.tiedIds, openSpots: byes.openSpots };
    return {
      ...state,
      status: 'shootout',
      shootouts: withShootoutFor(state, 'bye', byeTie, c),
      playoffPlan,
      qualification: { ...qualification, byeTie },
    };
  }
  return { ...state, status: 'bracket', shootouts: withoutUntouchedShootout(state), playoffPlan, qualification };
}
