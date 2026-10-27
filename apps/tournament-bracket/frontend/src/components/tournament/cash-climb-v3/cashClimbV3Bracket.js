/**
 * Cash Climb V3 single-elimination structure: B = 2^floor(log2 N); N - B preliminary matches feed a main
 * bracket of B slots, so 2B - N entrants skip the preliminary round. Then B/2 main opening matches and
 * later rounds of B/4, B/8, ..., 1.
 *
 * Seeding and preliminary-bye assignment are NOT decided here. The existing elimination draw pads to the
 * next power of two with trailing "Bye" slots, which does not fit this structure, so placement is an
 * explicit input:
 *   placement.preliminary: N - B pairs of entrant ids, [[a, b], ...]
 *   placement.main: B slots, each { entrant: id } (skipped the preliminary round)
 *                   or { preliminary: k } (winner of preliminary match k, 0-based)
 * Main opening match i is main[2i] vs main[2i + 1].
 */

/** Largest power of two <= n, by integer doubling. */
export function bracketSizeFor(n) {
  if (!Number.isSafeInteger(n) || n < 2) throw new RangeError('A bracket needs at least 2 entrants.');
  let size = 1;
  while (size * 2 <= n) size *= 2;
  return size;
}

export function laterRoundLabel(matches) {
  if (matches === 1) return 'Championship';
  if (matches === 2) return 'Semifinal';
  if (matches === 4) return 'Quarterfinal';
  return `Round of ${matches * 2}`;
}

/** Match counts for every stage. Later rounds are in play order, ending with the championship. */
export function cashClimbV3Shape(entrants) {
  const B = bracketSizeFor(entrants);
  const laterRounds = [];
  for (let m = B / 4; m >= 1; m /= 2) laterRounds.push({ matches: m, label: laterRoundLabel(m) });
  return Object.freeze({
    entrants,
    bracketSize: B,
    preliminaryMatches: entrants - B,
    preliminaryByes: 2 * B - entrants,
    mainOpeningMatches: B / 2,
    laterRounds: Object.freeze(laterRounds),
    totalMatches: entrants - 1,
  });
}

/** Plain-English reasons an explicit placement does not fit the entrants. Empty when valid. */
export function placementProblems(entrantIds, placement) {
  if (!Array.isArray(entrantIds) || entrantIds.length < 2) return ['Entrants are missing.'];
  if (new Set(entrantIds).size !== entrantIds.length) return ['Entrant ids must be unique.'];
  const shape = cashClimbV3Shape(entrantIds.length);
  const prelim = Array.isArray(placement?.preliminary) ? placement.preliminary : null;
  const main = Array.isArray(placement?.main) ? placement.main : null;
  if (!prelim || !main) return ['Placement needs a preliminary list and a main bracket list.'];
  const problems = [];
  if (prelim.length !== shape.preliminaryMatches) problems.push(`There must be ${shape.preliminaryMatches} preliminary matches.`);
  if (main.length !== shape.bracketSize) problems.push(`The main bracket must have ${shape.bracketSize} slots.`);
  const known = new Set(entrantIds);
  const seen = new Map();
  const see = (id) => seen.set(id, (seen.get(id) || 0) + 1);
  prelim.forEach((pair, k) => {
    if (!Array.isArray(pair) || pair.length !== 2) problems.push(`Preliminary match ${k + 1} must have two entrants.`);
    else pair.forEach(see);
  });
  const prelimRefs = new Map();
  main.forEach((slot, i) => {
    if (slot && 'entrant' in slot) see(slot.entrant);
    else if (slot && Number.isSafeInteger(slot.preliminary)) prelimRefs.set(slot.preliminary, (prelimRefs.get(slot.preliminary) || 0) + 1);
    else problems.push(`Main bracket slot ${i + 1} must name an entrant or a preliminary match.`);
  });
  [...seen.keys()].filter((id) => !known.has(id)).forEach((id) => problems.push(`Unknown entrant: ${id}.`));
  [...seen.entries()].filter(([, n]) => n > 1).forEach(([id]) => problems.push(`Entrant ${id} is placed more than once.`));
  entrantIds.filter((id) => !seen.has(id)).forEach((id) => problems.push(`Entrant ${id} is not placed.`));
  for (const [k, n] of prelimRefs) {
    if (k < 0 || k >= prelim.length) problems.push(`Main bracket refers to a preliminary match that does not exist (${k + 1}).`);
    else if (n > 1) problems.push(`Preliminary match ${k + 1} feeds more than one slot.`);
  }
  prelim.forEach((_, k) => { if (!prelimRefs.has(k)) problems.push(`Preliminary match ${k + 1} does not feed the main bracket.`); });
  return problems;
}

/** Match skeleton for an explicit placement. Later-round match k takes the winners of matches 2k and 2k+1. */
export function buildCashClimbV3Bracket(entrantIds, placement) {
  const problems = placementProblems(entrantIds, placement);
  if (problems.length) throw new Error(problems.join(' '));
  const shape = cashClimbV3Shape(entrantIds.length);
  const preliminary = placement.preliminary.map((pair, k) => ({ id: `P${k + 1}`, stage: 'preliminary', players: [...pair] }));
  const slot = (s) => ('entrant' in s ? { entrant: s.entrant } : { winnerOf: `P${s.preliminary + 1}` });
  const opening = [];
  for (let i = 0; i < shape.mainOpeningMatches; i += 1) {
    opening.push({ id: `O${i + 1}`, stage: 'opening', slots: [slot(placement.main[2 * i]), slot(placement.main[2 * i + 1])] });
  }
  const later = [];
  let prev = opening;
  shape.laterRounds.forEach((round, r) => {
    const matches = [];
    for (let k = 0; k < round.matches; k += 1) {
      matches.push({ id: `L${r + 1}-${k + 1}`, stage: 'later', round: r, slots: [{ winnerOf: prev[2 * k].id }, { winnerOf: prev[2 * k + 1].id }] });
    }
    later.push({ ...round, round: r, matches });
    prev = matches;
  });
  return { shape, preliminary, opening, later };
}
