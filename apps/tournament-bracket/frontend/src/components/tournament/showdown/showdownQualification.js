/**
 * Who qualifies, given ordered statistical tie groups.
 * Withdrawn players are skipped so a vacancy falls to the next eligible player.
 * Completed shootouts for a crossing tie are applied in order: their surviving, still-eligible
 * players qualify first; shootout losers stay in the pool for any later vacancy.
 */

function same(a, b) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function resolveQualification({ groups, spots, withdrawnIds = [], shootouts = [] }) {
  const out = new Set(withdrawnIds);
  const qualified = [];
  const notQualified = [];
  let remaining = spots;
  let pending = null;

  groups.forEach((group) => {
    const eligible = group.filter((id) => !out.has(id));
    if (!eligible.length) return;
    if (remaining <= 0) { notQualified.push(...eligible); return; }
    if (eligible.length <= remaining) {
      qualified.push(...eligible);
      remaining -= eligible.length;
      return;
    }
    const groupSet = new Set(group);
    let pool = [...eligible];
    shootouts
      .filter((s) => s.status === 'complete' && s.groupIds.every((id) => groupSet.has(id)))
      .forEach((s) => {
        const winners = s.survivors.filter((id) => pool.includes(id));
        if (winners.length > remaining) return;
        qualified.push(...winners);
        remaining -= winners.length;
        pool = pool.filter((id) => !winners.includes(id));
      });
    if (remaining <= 0) { notQualified.push(...pool); return; }
    if (pool.length <= remaining) {
      qualified.push(...pool);
      remaining -= pool.length;
      return;
    }
    pending = { tiedIds: pool, openSpots: remaining };
    remaining = 0;
  });

  if (pending) {
    return { status: 'needs-shootout', qualifiedIds: qualified, ...pending, notQualifiedIds: notQualified };
  }
  if (remaining > 0) {
    return { status: 'short', qualifiedIds: qualified, missing: remaining, notQualifiedIds: notQualified };
  }
  return { status: 'resolved', qualifiedIds: qualified, notQualifiedIds: notQualified };
}

/** True when an in-progress shootout of this kind matches the tie that currently needs resolving. */
export function shootoutMatchesTie(shootout, tie, kind = 'cutoff') {
  return Boolean(shootout && tie && (shootout.kind === 'bye' ? 'bye' : 'cutoff') === kind
    && shootout.spots === tie.openSpots && same(shootout.groupIds, tie.tiedIds));
}

/**
 * Opening byes go to the highest-ranked qualifiers by the six statistical tiebreakers.
 * A whole tied group gets byes when it fits; a group larger than the byes left is decided by a
 * bye shootout among those tied qualifiers only (same rules as a cutoff, applied to byes).
 * Players who lose a bye shootout stay in the playoffs without a bye.
 */
export function resolveByes({ groups, qualifierIds, byes, shootouts = [] }) {
  if (!byes) return { status: 'resolved', byeIds: [] };
  const q = new Set(qualifierIds);
  const qualifierGroups = groups.map((g) => g.filter((id) => q.has(id))).filter((g) => g.length);
  const outcome = resolveQualification({ groups: qualifierGroups, spots: byes, shootouts });
  if (outcome.status === 'needs-shootout') {
    return { status: 'needs-shootout', byeIds: outcome.qualifiedIds, tiedIds: outcome.tiedIds, openSpots: outcome.openSpots };
  }
  if (outcome.status === 'short') throw new Error('There are fewer qualifiers than byes.');
  return { status: 'resolved', byeIds: outcome.qualifiedIds };
}
