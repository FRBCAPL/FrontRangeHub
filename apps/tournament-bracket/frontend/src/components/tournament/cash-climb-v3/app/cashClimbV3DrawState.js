/**
 * The setup screen's draw: { placement, adjusted, notice }. A draw changes only when the operator changes
 * the players, swaps two players or asks for a redraw; nothing here runs on render.
 *
 * Player changes: an untouched random draw is simply redrawn. A hand-adjusted draw keeps everyone it can
 * (see placementWith / placementWithout); when the bracket size changes it is redrawn and the notice says
 * the adjustments were lost. `manual` marks a placement made entirely by hand (records saved before the
 * random draw existed); it stays manual until the operator redraws.
 */
import { cryptoRandomInt, placementWith, placementWithout, randomPlacement, swapEntrants } from './cashClimbV3Draw.js';

export const MIN_DRAW_PLAYERS = 2;
const RESIZED = 'The bracket size changed, so a new random draw was made. Your earlier adjustments could not be kept; review the draw.';

const ids = (players) => players.map((p) => p.id);

export function freshDraw(players, randomInt = cryptoRandomInt) {
  if (players.length < MIN_DRAW_PLAYERS) return null;
  return { placement: randomPlacement(ids(players), randomInt), adjusted: false, notice: '' };
}

function afterChange(draw, players, tryKeep, randomInt) {
  if (players.length < MIN_DRAW_PLAYERS) return null;
  if (!draw || !draw.adjusted) return freshDraw(players, randomInt);
  const kept = tryKeep();
  if (kept) return { ...draw, placement: kept, adjusted: true, notice: 'The draw was updated for the player change. Your adjustments were kept; review the draw.' };
  return { ...freshDraw(players, randomInt), notice: RESIZED };
}

/** `players` is the new list, already including `added`. */
export function drawAfterAdd(draw, players, added, randomInt = cryptoRandomInt) {
  return afterChange(draw, players, () => draw && placementWith(draw.placement, added, ids(players), randomInt), randomInt);
}

/** `players` is the new list, already without `removed`. */
export function drawAfterRemove(draw, players, removed, randomInt = cryptoRandomInt) {
  return afterChange(draw, players, () => draw && placementWithout(draw.placement, removed, ids(players), randomInt), randomInt);
}

export function drawAfterSwap(draw, a, b) {
  const placement = swapEntrants(draw.placement, a, b);
  return placement === draw.placement ? draw : { ...draw, placement, adjusted: true, notice: '' };
}

/** The draw of a saved, unstarted record. Records without draw details were placed entirely by hand. */
export function drawFromRecord(record) {
  return { placement: structuredClone(record.placement), adjusted: record.draw ? record.draw.adjusted : true, manual: !record.draw, notice: '' };
}

/** The record's draw details for a draw state; none for a placement made by hand. */
export const drawDetails = (draw) => (draw && !draw.manual ? { adjusted: draw.adjusted } : undefined);
