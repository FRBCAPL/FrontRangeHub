import { shuffled } from './showdownRandom.js';

/** Random circular order of player ids. */
export function buildCircle(playerIds, random = Math.random) {
  const ids = [...playerIds];
  if (new Set(ids).size !== ids.length) throw new Error('Each player can only be entered once.');
  if (ids.length < 3) throw new Error('A qualifying circle needs at least 3 players.');
  return shuffled(ids, random);
}

/** One match per neighboring pair in the circle (including last vs first): exactly N matches. */
export function circleMatches(circle) {
  return circle.map((p1, i) => ({
    id: `q${i + 1}`,
    phase: 'qualifying',
    roundKey: 'qualifying',
    slot: i + 1,
    p1,
    p2: circle[(i + 1) % circle.length],
    table: null,
    hold: false,
    status: 'waiting',
    result: null,
    score1: null,
    score2: null,
    winnerId: null,
    loserId: null,
    forfeitedBy: [],
    startedAt: null,
    completedAt: null,
  }));
}

export function pairKey(a, b) {
  return [String(a), String(b)].sort().join('|');
}

/** The two scheduled qualifying opponents of each player. */
export function scheduledOpponents(qualifyingMatches) {
  const map = {};
  qualifyingMatches.forEach((m) => {
    (map[m.p1] ||= []).push(m.p2);
    (map[m.p2] ||= []).push(m.p1);
  });
  return map;
}

/** Returns a list of problems; empty means the schedule meets every qualifying rule. */
export function qualifyingScheduleProblems(matches, playerIds) {
  const problems = [];
  const n = playerIds.length;
  if (matches.length !== n) problems.push(`Expected ${n} qualifying matches, found ${matches.length}.`);
  const seen = new Set();
  matches.forEach((m) => {
    if (!m.p1 || !m.p2) problems.push(`Match ${m.id} has a bye.`);
    if (m.p1 === m.p2) problems.push(`Match ${m.id} pairs a player with themselves.`);
    const key = pairKey(m.p1, m.p2);
    if (seen.has(key)) problems.push(`Duplicate pairing ${key}.`);
    seen.add(key);
  });
  const opponents = scheduledOpponents(matches);
  playerIds.forEach((id) => {
    const opp = opponents[id] || [];
    if (opp.length !== 2) problems.push(`${id} has ${opp.length} qualifying matches.`);
    else if (opp[0] === opp[1]) problems.push(`${id} plays the same opponent twice.`);
  });
  return problems;
}
