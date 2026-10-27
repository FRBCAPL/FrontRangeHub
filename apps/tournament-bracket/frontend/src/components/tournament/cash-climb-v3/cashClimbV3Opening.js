/**
 * Opening Score-Split payouts and opening-match reserves.
 *
 * With u = E / (2R) and L the loser's racks (0 <= L < R), a main opening match pays
 *   winner W = round_half_up[(R + 0.5(R - L)) u + S], S = E/4 when L = 0, else 0
 *   loser  D = round_half_up(L u)
 * Exactly: W = [(3R - L) E + (L = 0 ? R E : 0)] / (4R) and D = 2 L E / (4R).
 * A preliminary match pays half of each unrounded component, rounded the same way (denominator 8R).
 * Each player is rounded independently to whole dollars, halves up. E is in cents here, hence 100 x.
 */
import { roundHalfUpRatio } from './cashClimbV3Money.js';

function checkLosingRacks(raceTo, losingRacks) {
  if (!Number.isSafeInteger(losingRacks) || losingRacks < 0 || losingRacks >= raceTo) {
    throw new RangeError(`The losing player's racks must be a whole number from 0 to ${raceTo - 1}.`);
  }
}

/** Whole-dollar payouts for one completed opening match. */
export function openingScoreSplit({ entryFeeCents, raceTo }, losingRacks, { preliminary = false } = {}) {
  checkLosingRacks(raceTo, losingRacks);
  const R = raceTo;
  const L = losingRacks;
  const den = (preliminary ? 800 : 400) * R;
  const winnerNum = (3 * R - L) * entryFeeCents + (L === 0 ? R * entryFeeCents : 0);
  const loserNum = 2 * L * entryFeeCents;
  return {
    losingRacks: L,
    winner: roundHalfUpRatio(winnerNum, den),
    loser: roundHalfUpRatio(loserNum, den),
  };
}

/** Every valid score R-0 ... R-(R-1), with the combined payout. */
export function openingScoreSplitTable(config, options = {}) {
  const rows = [];
  for (let L = 0; L < config.raceTo; L += 1) {
    const s = openingScoreSplit(config, L, options);
    rows.push({ ...s, combined: s.winner + s.loser });
  }
  return rows;
}

function reserveOf(rows) {
  const dollars = Math.max(...rows.map((r) => r.combined));
  return { dollars, losingRacks: rows.filter((r) => r.combined === dollars).map((r) => r.losingRacks) };
}

/**
 * M = max(W + D) over main scores; H = max over preliminary scores (never assumed to be E/2).
 * `losingRacks` lists every score that reaches the maximum.
 */
export function openingReserves(config) {
  return {
    main: reserveOf(openingScoreSplitTable(config)),
    preliminary: reserveOf(openingScoreSplitTable(config, { preliminary: true })),
  };
}
