/**
 * Fixed Round 1 / Round 2 labels for the circle schedule, set when the schedule is created.
 * Slot i pairs circle positions i and i + 1. Odd slots (1, 3, …) are Round 1 and even slots are Round 2.
 * In an odd field the last slot is the bridge: Round 1 for its first player (the last circle position,
 * whose other match is Round 2) and Round 2 for its second player (the first circle position, whose other
 * match is Round 1). Every player therefore has exactly one Round 1 and one Round 2 match.
 */

/** Qualifying matches with their labels stored on them, so a saved event keeps them. */
export function withRoundLabels(qualifyingMatches) {
  const labels = v3RoundLabels(qualifyingMatches);
  return qualifyingMatches.map((m) => ({ ...m, ...labels[m.id] }));
}

/**
 * { [matchId]: { p1Round, p2Round, bridge } }. Labels stored on a match (set at the start) win;
 * otherwise they come from the slot of a match built by circleMatches.
 */
export function v3RoundLabels(qualifyingMatches) {
  const n = qualifyingMatches.length;
  const labels = {};
  qualifyingMatches.forEach((m) => {
    if (m.p1Round && m.p2Round) {
      labels[m.id] = { p1Round: m.p1Round, p2Round: m.p2Round, bridge: Boolean(m.bridge) };
      return;
    }
    const bridge = n % 2 === 1 && m.slot === n;
    const round = m.slot % 2 === 1 ? 1 : 2;
    labels[m.id] = bridge ? { p1Round: 1, p2Round: 2, bridge: true } : { p1Round: round, p2Round: round, bridge: false };
  });
  return labels;
}

export function v3RoundOf(labels, match, playerId) {
  const l = labels[match.id];
  if (!l) return null;
  if (playerId === match.p1) return l.p1Round;
  if (playerId === match.p2) return l.p2Round;
  return null;
}

export function v3RateFor(plan, round) {
  return round === 1 ? plan.rates.r1 : plan.rates.r2;
}

/** Problems with the labels: each player must hold exactly one Round 1 and one Round 2 slot. */
export function v3RoundLabelProblems(qualifyingMatches, labels = v3RoundLabels(qualifyingMatches)) {
  const seen = {};
  qualifyingMatches.forEach((m) => {
    (seen[m.p1] ||= []).push(labels[m.id].p1Round);
    (seen[m.p2] ||= []).push(labels[m.id].p2Round);
  });
  return Object.entries(seen)
    .filter(([, rounds]) => [...rounds].sort().join() !== '1,2')
    .map(([id, rounds]) => `${id} has qualifying rounds ${rounds.join(' and ')}.`);
}
