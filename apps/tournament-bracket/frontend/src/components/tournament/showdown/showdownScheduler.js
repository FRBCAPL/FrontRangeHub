/**
 * Table assignment. Matches start whenever both players are free and a table is open —
 * no waiting for a whole wave. A player can never be on two tables at once.
 */

const ROUND_ORDER = ['qualifying', 'opening', 'quarterfinal', 'semifinal', 'final'];

export function busyPlayerIds(matches) {
  const busy = new Set();
  matches.forEach((m) => {
    if (m.status === 'on-table') { busy.add(m.p1); busy.add(m.p2); }
  });
  return busy;
}

export function usedTables(matches) {
  return new Set(matches.filter((m) => m.status === 'on-table' && m.table != null).map((m) => m.table));
}

export function freeTables(matches, tableCount) {
  const used = usedTables(matches);
  const out = [];
  for (let t = 1; t <= tableCount; t += 1) if (!used.has(t)) out.push(t);
  return out;
}

/** Why a match cannot start right now ('' when it can). */
export function notReadyReason(match, matches) {
  if (!match) return 'Match not found.';
  if (match.status === 'completed') return 'This match is finished.';
  if (match.status === 'on-table') return 'This match is already on a table.';
  if (!match.p1 || !match.p2) return 'Both players are not known yet.';
  if (match.hold) return 'This match is on hold.';
  const busy = busyPlayerIds(matches);
  if (busy.has(match.p1) || busy.has(match.p2)) return 'A player in this match is on another table.';
  return '';
}

export function readyMatches(matches) {
  return matches.filter((m) => !notReadyReason(m, matches));
}

function lastFinished(matches, playerId) {
  let last = '';
  matches.forEach((m) => {
    if (m.status === 'completed' && m.completedAt && (m.p1 === playerId || m.p2 === playerId) && m.completedAt > last) last = m.completedAt;
  });
  return last;
}

function playedCount(matches, playerId) {
  return matches.filter((m) => m.status === 'completed' && (m.p1 === playerId || m.p2 === playerId)).length;
}

/**
 * Players for whom this is their labelled Round 2 match while their Round 1 match is unfinished.
 * Only V3 qualifying matches carry labels, so this is always 0 for V1 and V2.
 */
function round2First(matches, m) {
  if (!m.p1Round) return 0;
  return [[m.p1, m.p1Round], [m.p2, m.p2Round]].filter(([id, round]) => round === 2 && matches.some((x) => x.id !== m.id
    && x.status !== 'completed' && ((x.p1 === id && x.p1Round === 1) || (x.p2 === id && x.p2Round === 1)))).length;
}

/**
 * Suggested next match: earlier round first, then (V3) matches that keep each player's Round 1 before
 * their Round 2, then players who have played least, then players idle longest, then schedule order.
 * The Round 1 preference only orders suggestions; any ready match can still be started.
 */
export function suggestNextMatch(matches) {
  const ready = readyMatches(matches);
  if (!ready.length) return null;
  const score = (m) => ({
    round: ROUND_ORDER.indexOf(m.roundKey),
    early: round2First(matches, m),
    played: playedCount(matches, m.p1) + playedCount(matches, m.p2),
    idle: [lastFinished(matches, m.p1), lastFinished(matches, m.p2)].sort().pop(),
    slot: m.slot,
  });
  return [...ready].sort((a, b) => {
    const x = score(a);
    const y = score(b);
    return x.round - y.round || x.early - y.early || x.played - y.played || (x.idle < y.idle ? -1 : x.idle > y.idle ? 1 : 0) || x.slot - y.slot;
  })[0];
}

export function assignTable(matches, matchId, table, tableCount, now) {
  const match = matches.find((m) => m.id === matchId);
  const reason = notReadyReason(match, matches);
  if (reason) throw new Error(reason);
  const t = Number(table);
  if (!Number.isInteger(t) || t < 1 || t > tableCount) throw new Error(`Pick a table from 1 to ${tableCount}.`);
  if (usedTables(matches).has(t)) throw new Error(`Table ${t} is in use.`);
  return matches.map((m) => (m.id === matchId ? { ...m, status: 'on-table', table: t, startedAt: now } : m));
}

export function moveTable(matches, matchId, table, tableCount) {
  const match = matches.find((m) => m.id === matchId);
  if (match?.status !== 'on-table') throw new Error('Only a match on a table can be moved.');
  const t = Number(table);
  if (!Number.isInteger(t) || t < 1 || t > tableCount) throw new Error(`Pick a table from 1 to ${tableCount}.`);
  if (usedTables(matches.filter((m) => m.id !== matchId)).has(t)) throw new Error(`Table ${t} is in use.`);
  return matches.map((m) => (m.id === matchId ? { ...m, table: t } : m));
}

export function unassignTable(matches, matchId) {
  return matches.map((m) => (m.id === matchId && m.status === 'on-table'
    ? { ...m, status: 'waiting', table: null, startedAt: null }
    : m));
}

export function setHold(matches, matchId, hold) {
  const match = matches.find((m) => m.id === matchId);
  if (!match || match.status !== 'waiting') throw new Error('Only a waiting match can be held or released.');
  return matches.map((m) => (m.id === matchId ? { ...m, hold: Boolean(hold) } : m));
}
