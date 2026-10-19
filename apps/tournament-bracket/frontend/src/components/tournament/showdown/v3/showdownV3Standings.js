/**
 * V3 qualifying standings. Criteria, in order:
 *   1. qualifying dollars (actual game pay plus valid administrative credits)
 *   2. actual Round 2 game wins (the bridge counts only for the player for whom it is Round 2)
 *   3. head-to-head: more actual games won in the two players' own match (two-player ties only)
 *   4. opponent strength: the combined qualifying dollars of both scheduled opponents
 * A criterion that splits a tie fixes the order of the parts and every part still tied starts again at
 * criterion 1. A tie no criterion splits stays a group; the existing shootouts decide it only when it
 * crosses the qualifying line or the bye line (resolveQualification / resolveByes).
 */
import { resolveQualification, resolveByes } from '../showdownQualification.js';
import { gamesPlayed } from './showdownV3Results.js';

export const V3_TIEBREAKERS = [
  { key: 'totalCents', label: 'Qualifying dollars' },
  { key: 'actualRound2Wins', label: 'Round 2 games won' },
  { key: 'headToHead', label: 'Head-to-head' },
  { key: 'opponentCents', label: 'Opponent strength' },
];

function headToHead([a, b], matches) {
  const m = matches.find((x) => x.status === 'completed' && gamesPlayed(x) > 0
    && ((x.p1 === a && x.p2 === b) || (x.p1 === b && x.p2 === a)));
  if (!m) return null;
  const aWon = m.p1 === a ? m.score1 : m.score2;
  const bWon = m.p1 === a ? m.score2 : m.score1;
  if (aWon === bWon) return null;
  return aWon > bWon ? [[a], [b]] : [[b], [a]];
}

function split(ids, key, stats, matches) {
  if (key === 'headToHead') return (ids.length === 2 && headToHead(ids, matches)) || [ids];
  const sorted = [...ids].sort((x, y) => stats[y][key] - stats[x][key]);
  const parts = [];
  sorted.forEach((id) => {
    const last = parts[parts.length - 1];
    if (last && stats[last[0]][key] === stats[id][key]) last.push(id); else parts.push([id]);
  });
  return parts;
}

function resolveGroup(ids, separatedBy, stats, matches) {
  if (ids.length < 2) return [{ ids, separatedBy }];
  for (const { key } of V3_TIEBREAKERS) {
    const parts = split(ids, key, stats, matches);
    if (parts.length > 1) return parts.flatMap((p, i) => resolveGroup(p, i === 0 ? separatedBy : key, stats, matches));
  }
  return [{ ids, separatedBy }];
}

/** Ordered tie groups and display rows. Withdrawn players keep their results but rank after everyone else. */
export function rankV3Standings(ledger, playerIds, qualifyingMatches, { excludedIds = [] } = {}) {
  const stats = {};
  playerIds.forEach((id) => {
    const r = ledger.rows[id];
    stats[id] = { ...r, opponentCents: r.opponents.reduce((s, o) => s + (ledger.rows[o]?.totalCents || 0), 0) };
  });
  const order = new Map(playerIds.map((id, i) => [id, i]));
  const out = new Set(excludedIds);
  const groups = [playerIds.filter((id) => !out.has(id)), playerIds.filter((id) => out.has(id))]
    .filter((ids) => ids.length)
    .flatMap((ids) => resolveGroup(ids, null, stats, qualifyingMatches));
  groups.forEach((g) => g.ids.sort((a, b) => order.get(a) - order.get(b)));
  const rows = [];
  let position = 0;
  groups.forEach((g) => {
    g.ids.forEach((id, i) => rows.push({ ...stats[id], rank: position + 1, tied: g.ids.length > 1, separatedBy: i === 0 ? g.separatedBy : null }));
    position += g.ids.length;
  });
  return { groups: groups.map((g) => [...g.ids]), rows, stats };
}

/** Who qualifies and who holds the byes, using the existing cutoff and bye shootouts. */
export function resolveV3Qualifiers(plan, standings, { withdrawnIds = [], shootouts = [] } = {}) {
  const cutoff = resolveQualification({
    groups: standings.groups, spots: plan.qualifiers, withdrawnIds, shootouts: shootouts.filter((s) => s.kind !== 'bye'),
  });
  if (cutoff.status !== 'resolved') return { status: cutoff.status, cutoff };
  const byes = resolveByes({
    groups: standings.groups, qualifierIds: cutoff.qualifiedIds, byes: plan.byes, shootouts: shootouts.filter((s) => s.kind === 'bye'),
  });
  if (byes.status !== 'resolved') return { status: 'needs-bye-shootout', cutoff, byes };
  return { status: 'resolved', qualifierIds: cutoff.qualifiedIds, byeIds: byes.byeIds, cutoff, byes };
}
