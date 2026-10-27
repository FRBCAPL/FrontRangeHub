/**
 * Manual bracket placement for the setup screen. No seeding policy exists yet, so the operator places
 * every entrant explicitly: the preliminary pairs and each main-bracket slot (a player who skips the
 * preliminary round, or the winner of a preliminary match). The engine validates the result.
 *
 * Select values: '' (empty), 'e:<entrant id>' or 'p:<preliminary index>'.
 */
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';

export function blankPlacement(entrants) {
  if (!Number.isSafeInteger(entrants) || entrants < 2) return { preliminary: [], main: [] };
  const s = cashClimbV3Shape(entrants);
  return {
    preliminary: Array.from({ length: s.preliminaryMatches }, () => ['', '']),
    main: Array.from({ length: s.bracketSize }, () => null),
  };
}

/** The same placement when it still fits `entrants`, otherwise a blank one. */
export function placementFor(placement, entrants) {
  const blank = blankPlacement(entrants);
  const fits = placement && placement.preliminary?.length === blank.preliminary.length && placement.main?.length === blank.main.length;
  return fits ? placement : blank;
}

export const slotValue = (slot) => {
  if (!slot) return '';
  return 'entrant' in slot ? `e:${slot.entrant}` : `p:${slot.preliminary}`;
};

export function slotFromValue(value) {
  if (value.startsWith('e:')) return { entrant: value.slice(2) };
  if (value.startsWith('p:')) return { preliminary: Number(value.slice(2)) };
  return null;
}

export function withPreliminary(placement, k, side, id) {
  const preliminary = placement.preliminary.map((pair, i) => (i === k ? pair.map((v, s) => (s === side ? id : v)) : pair));
  return { ...placement, preliminary };
}

export function withMainSlot(placement, i, value) {
  return { ...placement, main: placement.main.map((s, j) => (j === i ? slotFromValue(value) : s)) };
}

/** Number of positions not yet filled in. */
export function emptyPlacementPositions(placement) {
  if (!placement) return Infinity;
  const prelim = (placement.preliminary || []).flat().filter((v) => !v).length;
  return prelim + (placement.main || []).filter((s) => !s).length;
}

/** Player ids already used anywhere in the placement. */
export function placedEntrants(placement) {
  const ids = new Set((placement?.preliminary || []).flat().filter(Boolean));
  (placement?.main || []).forEach((s) => { if (s && 'entrant' in s) ids.add(s.entrant); });
  return ids;
}
