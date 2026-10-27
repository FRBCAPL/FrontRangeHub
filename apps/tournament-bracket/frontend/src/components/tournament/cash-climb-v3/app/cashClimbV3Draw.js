/**
 * Random draw for Cash Climb (V3). The entrant count fixes the structure: how many preliminary matches,
 * how many players skip the preliminary round, and which main-bracket positions preliminary winners fill
 * (spread evenly over the opening matches). The draw only decides which player sits in each position.
 *
 * Randomness: an unbiased Fisher–Yates shuffle driven by `randomInt(n)` (0..n-1). The default uses the
 * browser's secure random source with rejection sampling; tests pass a seeded source.
 */
import { cashClimbV3Shape, placementProblems } from '../cashClimbV3Bracket.js';

const TWO_32 = 2 ** 32;

/** Uniform integer 0..n-1 from crypto.getRandomValues (rejection sampling, no modulo bias). */
export function cryptoRandomInt(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > TWO_32) throw new RangeError('randomInt needs a whole number from 1 to 2^32.');
  const source = globalThis.crypto;
  if (!source?.getRandomValues) throw new Error('This device has no secure random source, so a random draw cannot be made.');
  const limit = Math.floor(TWO_32 / n) * n;
  const buf = new Uint32Array(1);
  do source.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
}

export function shuffled(items, randomInt = cryptoRandomInt) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Main-bracket slots filled by preliminary winners, in slot order; preliminary k feeds the k-th one. */
export function preliminaryFeedSlots(entrants) {
  const { preliminaryMatches: P, mainOpeningMatches: M } = cashClimbV3Shape(entrants);
  const spread = (count) => Array.from({ length: count }, (_, j) => Math.floor((j * M) / count));
  const second = spread(Math.min(P, M)).map((m) => 2 * m + 1);
  const first = P > M ? spread(P - M).map((m) => 2 * m) : [];
  return [...first, ...second].sort((a, b) => a - b);
}

/** A fresh random placement for the entrants. */
export function randomPlacement(entrantIds, randomInt = cryptoRandomInt) {
  const shape = cashClimbV3Shape(entrantIds.length);
  const order = shuffled(entrantIds, randomInt);
  const preliminary = Array.from({ length: shape.preliminaryMatches }, (_, k) => [order[2 * k], order[2 * k + 1]]);
  const main = Array.from({ length: shape.bracketSize }, () => null);
  preliminaryFeedSlots(entrantIds.length).forEach((slot, k) => { main[slot] = { preliminary: k }; });
  let next = 2 * shape.preliminaryMatches;
  for (let i = 0; i < main.length; i += 1) {
    if (!main[i]) { main[i] = { entrant: order[next] }; next += 1; }
  }
  return { preliminary, main };
}

/** Swaps two placed players. The bracket structure never changes. Returns the placement unchanged when either is not placed. */
export function swapEntrants(placement, a, b) {
  if (a === b) return placement;
  const swap = (id) => (id === a ? b : id === b ? a : id);
  const next = {
    preliminary: placement.preliminary.map((pair) => pair.map(swap)),
    main: placement.main.map((s) => (s && 'entrant' in s ? { entrant: swap(s.entrant) } : s)),
  };
  const placed = (p, id) => p.preliminary.some((pair) => pair.includes(id)) || p.main.some((s) => s?.entrant === id);
  return placed(placement, a) && placed(placement, b) ? next : placement;
}

function dropPreliminary(placement, k, filler) {
  const main = placement.main.map((s) => {
    if (!s || !('preliminary' in s)) return s;
    if (s.preliminary === k) return { entrant: filler };
    return s.preliminary > k ? { preliminary: s.preliminary - 1 } : s;
  });
  return { preliminary: placement.preliminary.filter((_, i) => i !== k), main };
}

const checked = (placement, entrantIds) => (placementProblems(entrantIds, placement).length ? null : placement);

/**
 * The placement with one player removed, keeping everyone else where possible. A preliminary opponent
 * takes the main position that match fed; a removed main-bracket player is replaced from a random
 * preliminary match. Null when the bracket size changes (a fresh draw is needed).
 */
export function placementWithout(placement, id, remainingIds, randomInt = cryptoRandomInt) {
  const P = placement.preliminary.length;
  if (P === 0) return null;
  const k = placement.preliminary.findIndex((pair) => pair.includes(id));
  if (k >= 0) return checked(dropPreliminary(placement, k, placement.preliminary[k].find((x) => x !== id)), remainingIds);
  const i = placement.main.findIndex((s) => s?.entrant === id);
  if (i < 0) return null;
  const j = randomInt(P);
  const [a, b] = randomInt(2) ? [...placement.preliminary[j]].reverse() : placement.preliminary[j];
  const main = placement.main.map((s, x) => (x === i ? { entrant: a } : s));
  return checked(dropPreliminary({ ...placement, main }, j, b), remainingIds);
}

/**
 * The placement with one player added, keeping everyone else where possible: the new player meets a
 * random main-bracket player in a new preliminary match (preferring opening matches that have no
 * preliminary winner yet). Null when the bracket size changes (a fresh draw is needed).
 */
export function placementWith(placement, id, allIds, randomInt = cryptoRandomInt) {
  if (allIds.length >= 2 * placement.main.length) return null;
  const direct = placement.main.map((s, i) => (s && 'entrant' in s ? i : -1)).filter((i) => i >= 0);
  const calm = direct.filter((i) => placement.main[i ^ 1] && 'entrant' in placement.main[i ^ 1]);
  const pool = calm.length ? calm : direct;
  if (!pool.length) return null;
  const i = pool[randomInt(pool.length)];
  const pair = randomInt(2) ? [id, placement.main[i].entrant] : [placement.main[i].entrant, id];
  const k = placement.preliminary.length;
  const main = placement.main.map((s, x) => (x === i ? { preliminary: k } : s));
  return checked({ preliminary: [...placement.preliminary, pair], main }, allIds);
}
