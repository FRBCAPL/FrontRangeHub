import { TIEBREAKERS } from './showdownRules.js';
import { scheduledOpponents } from './showdownQualifying.js';

/**
 * Qualifying stats from completed qualifying matches.
 * Played matches and administrative forfeits (3–0) count; a double forfeit adds nothing,
 * but both players remain each other's scheduled opponents for criteria 5–6.
 */
export function computeQualifyingStats(playerIds, qualifyingMatches) {
  const stats = {};
  playerIds.forEach((id) => {
    stats[id] = { playerId: id, matchWins: 0, gamesWon: 0, gamesLost: 0, completed: 0, oppMatchWins: 0, oppGameDiff: 0 };
  });
  qualifyingMatches.forEach((m) => {
    if (m.status !== 'completed') return;
    [m.p1, m.p2].forEach((id) => { if (stats[id]) stats[id].completed += 1; });
    if (m.result === 'double-forfeit') return;
    const a = stats[m.p1];
    const b = stats[m.p2];
    if (a) { a.gamesWon += m.score1 || 0; a.gamesLost += m.score2 || 0; }
    if (b) { b.gamesWon += m.score2 || 0; b.gamesLost += m.score1 || 0; }
    if (m.winnerId && stats[m.winnerId]) stats[m.winnerId].matchWins += 1;
  });
  const opponents = scheduledOpponents(qualifyingMatches);
  playerIds.forEach((id) => {
    const s = stats[id];
    s.opponents = opponents[id] || [];
    s.oppMatchWins = s.opponents.reduce((sum, o) => sum + (stats[o]?.matchWins || 0), 0);
    s.oppGameDiff = s.opponents.reduce((sum, o) => sum + ((stats[o]?.gamesWon || 0) - (stats[o]?.gamesLost || 0)), 0);
  });
  return stats;
}

function headToHeadWinner(a, b, qualifyingMatches) {
  const match = qualifyingMatches.find((m) => m.status === 'completed' && m.winnerId
    && ((m.p1 === a && m.p2 === b) || (m.p1 === b && m.p2 === a)));
  return match ? match.winnerId : null;
}

function splitByValue(group, stats, key) {
  const lowerIsBetter = key === 'gamesLost';
  const sorted = [...group.ids].sort((x, y) => (lowerIsBetter
    ? stats[x][key] - stats[y][key]
    : stats[y][key] - stats[x][key]));
  const parts = [];
  sorted.forEach((id) => {
    const last = parts[parts.length - 1];
    if (last && stats[last[0]][key] === stats[id][key]) last.push(id);
    else parts.push([id]);
  });
  return parts;
}

function splitIds(ids, criterion, stats, qualifyingMatches) {
  if (criterion !== 'headToHead') return splitByValue({ ids }, stats, criterion);
  if (ids.length !== 2) return [ids];
  const [a, b] = ids;
  const winner = headToHeadWinner(a, b, qualifyingMatches);
  return winner ? [[winner], [winner === a ? b : a]] : [ids];
}

/**
 * Restart on reduction: the first criterion that splits a tied group fixes the order of the parts,
 * and every part still tied starts again at criterion 1. Each step works on a strictly smaller group,
 * so it always ends; a group no criterion splits stays an unresolved tie for the shootouts.
 * `separatedBy` on a group is the criterion that split it from the player directly above.
 */
function resolveGroup(ids, separatedBy, stats, qualifyingMatches) {
  if (ids.length < 2) return [{ ids, separatedBy }];
  for (const { key } of TIEBREAKERS) {
    const parts = splitIds(ids, key, stats, qualifyingMatches);
    if (parts.length > 1) {
      return parts.flatMap((part, i) => resolveGroup(part, i === 0 ? separatedBy : key, stats, qualifyingMatches));
    }
  }
  return [{ ids, separatedBy }];
}

/**
 * Ranks players with the six tiebreakers, restarting on every reduced tie.
 * `excludedIds` (players who withdrew before qualifying was locked) keep their results and still count
 * as opponents for criteria 5–6, but are ranked after everyone else so they never sit in an eligible tie.
 * Returns ordered tie groups and display rows. Unresolved ties share a rank.
 */
export function rankStandings(playerIds, qualifyingMatches, { excludedIds = [] } = {}) {
  const stats = computeQualifyingStats(playerIds, qualifyingMatches);
  const orderIndex = new Map(playerIds.map((id, i) => [id, i]));
  const out = new Set(excludedIds);
  const eligible = playerIds.filter((id) => !out.has(id));
  const excluded = playerIds.filter((id) => out.has(id));
  const groups = [eligible, excluded]
    .filter((ids) => ids.length)
    .flatMap((ids) => resolveGroup(ids, null, stats, qualifyingMatches));
  groups.forEach((g) => g.ids.sort((a, b) => orderIndex.get(a) - orderIndex.get(b)));

  const rows = [];
  let position = 0;
  groups.forEach((g) => {
    g.ids.forEach((id, i) => {
      rows.push({
        ...stats[id],
        rank: position + 1,
        tied: g.ids.length > 1,
        separatedBy: i === 0 ? g.separatedBy : null,
      });
    });
    position += g.ids.length;
  });
  return { groups: groups.map((g) => [...g.ids]), rows, stats };
}
