// When something below its "Fill up to" number is worth topping up ("Top Offs").
// Each item can set a percent of Fill up to (inventory_items.topoff_percent); without
// one it is halfway between "Warn me at" (0 when unset) and Fill up to.
// Display only: the database still calls anything under Fill up to 'below_par'.

/** Smallest and largest percent people can choose. */
export const TOPOFF_MIN = 1;
export const TOPOFF_MAX = 99;

/**
 * The amount at or below which a spot needs topping up, or null without a Fill up to.
 * Never more than Fill up to minus 1, so at least one whole unit is missing first
 * (fill up to 2: top off at 1 or less, never at 1.5).
 */
export function topOffLine(minimum, par, percent = null) {
  if (par === null || par === undefined || par === '') return null;
  const fill = Number(par);
  const warn = minimum === null || minimum === undefined || minimum === '' ? 0 : Number(minimum);
  const line = percent ? (fill * percent) / 100 : warn + (fill - warn) / 2;
  return Math.min(line, fill - 1);
}

/**
 * True when a spot is under Fill up to but still above its top-off line, so it can wait.
 * slot: { status, onHand, minimum, par } (numbers or decimal strings).
 */
export function topOffCanWait(slot, percent = null) {
  if (slot?.status !== 'below_par' || slot.onHand === null || slot.onHand === undefined) return false;
  const line = topOffLine(slot.minimum, slot.par, percent);
  return line !== null && Number(slot.onHand) > line;
}

/** A place from itemSlots, reading as OK while its top-off can wait. */
export function settleSlot(slot, percent = null) {
  const waits = topOffCanWait(
    { status: slot.status, onHand: slot.quantity, minimum: slot.target?.minimum_text ?? null, par: slot.target?.par_text ?? null },
    percent,
  );
  return waits ? { ...slot, status: 'above_minimum' } : slot;
}

/** Status-view rows (low stock, all needs) without the top-offs that can wait. */
export function dropWaitingRows(rows, percents) {
  return rows.filter((r) => !topOffCanWait(
    { status: r.status, onHand: r.on_hand_text, minimum: r.minimum_text, par: r.par_text },
    percents?.get(r.item_id) ?? null,
  ));
}

/** Restock suggestions (shopping list, Today) without the top-offs that can wait. */
export function dropWaitingRecs(recs, percents) {
  return recs.filter((r) => !topOffCanWait(
    { status: r.status, onHand: r.on_hand, minimum: r.minimum, par: r.par },
    percents?.get(r.item_id) ?? null,
  ));
}

/**
 * Checks a typed percent. Blank means "use the default". Returns { value } (number or null) or { error }.
 */
export function checkTopOffPercent(text) {
  const clean = String(text ?? '').trim().replace(/%$/, '').trim();
  if (!clean) return { value: null };
  if (!/^\d+$/.test(clean)) return { error: 'Top off at: type a whole number, like 75.' };
  const value = Number(clean);
  if (value < TOPOFF_MIN || value > TOPOFF_MAX) return { error: `Top off at: choose between ${TOPOFF_MIN} and ${TOPOFF_MAX}%.` };
  return { value };
}
