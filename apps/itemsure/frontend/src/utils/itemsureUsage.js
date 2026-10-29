// How fast an item gets used, from its history. These are estimates for people
// to read ("about 6 a week"), never stock amounts, so ordinary number math is fine.
import { canonicalQuantity } from './itemsureQuantity.js';

export const USAGE_WINDOW_DAYS = 28;
export const MIN_HISTORY_DAYS = 7;
export const WARN_DAYS = 3;
export const FILL_DAYS = 10;

const DAY_MS = 86400000;
const TRANSFERS = new Set(['transfer_in', 'transfer_out']);
const slotOf = (m) => `${m.location_id}|${m.storage_area_id || ''}`;
const isUndo = (m) => String(m.reason || '').trim().toLowerCase() === 'undo';

/**
 * Usage per day, per place and for the whole item, over the last few weeks.
 * Taking out, moving out, and counts that came up short are use. An Undo cancels
 * the change it reverses. Moves between places are not use for the whole item.
 * `historyStart` is when the item's history began, so a new item isn't judged on a few days.
 */
export function usageRates(movements, { historyStart, now = Date.now() } = {}) {
  const started = historyStart ? new Date(historyStart).getTime() : now;
  const days = Math.min(USAGE_WINDOW_DAYS, (now - started) / DAY_MS);
  const enough = days >= MIN_HISTORY_DAYS;
  const since = now - USAGE_WINDOW_DAYS * DAY_MS;
  const perSlot = new Map();
  let total = 0;

  for (const m of movements) {
    if (m.movement_type === 'opening_balance') continue;
    if (new Date(m.effective_at || m.posted_at).getTime() < since) continue;
    const q = Number(m.quantity_text);
    if (!Number.isFinite(q) || q === 0) continue;
    const undo = isUndo(m);
    let used = 0;
    if (q < 0 && !undo) used = -q;
    else if (q > 0 && undo) used = -q;
    if (!used) continue;
    perSlot.set(slotOf(m), (perSlot.get(slotOf(m)) || 0) + used);
    if (!TRANSFERS.has(m.movement_type)) total += used;
  }

  const rate = (sum) => (enough ? Math.max(0, sum) / days : null);
  return {
    enough,
    days,
    total: rate(total),
    forSlot: (locationId, storageAreaId) => rate(perSlot.get(`${locationId}|${storageAreaId || ''}`) || 0),
  };
}

/** Days until `onHand` runs out at `perDay`, or null when it isn't being used. */
export function daysLeft(onHand, perDay) {
  if (!perDay || perDay <= 0 || onHand === null || onHand === undefined) return null;
  return Number(onHand) / perDay;
}

function roundUp(value, precision) {
  const places = Math.min(Math.max(precision, 0), 2);
  const factor = 10 ** places;
  return { value: Math.ceil(value * factor - 1e-9) / factor, step: 1 / factor, places };
}

/** Suggested "Warn me at" and "Fill up to", as quantity text, or null without steady use. */
export function suggestLevels(perDay, precision = 0) {
  if (!perDay || perDay <= 0) return null;
  const warn = roundUp(perDay * WARN_DAYS, precision);
  const fill = roundUp(perDay * FILL_DAYS, precision);
  const minimum = Math.max(warn.value, warn.step);
  const par = Math.max(fill.value, minimum + warn.step);
  const text = (n) => canonicalQuantity(n.toFixed(warn.places));
  return { minimum: text(minimum), par: text(par) };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "about 6 btl a week" or "about 2 btl a month". */
export function describeRate(perDay, unit) {
  if (!perDay || perDay <= 0) return null;
  const week = perDay * 7;
  if (week >= 1) return `about ${week < 10 ? Math.round(week * 10) / 10 : Math.round(week)} ${unit} a week`;
  return `about ${Math.round(perDay * 30 * 10) / 10} ${unit} a month`;
}

/** "about 4 days", "about 3 weeks", or "more than 2 months". */
export function describeDays(days) {
  if (days === null || days === undefined) return null;
  if (days < 1) return 'less than a day';
  if (days < 14) return `about ${plural(Math.round(days), 'day')}`;
  if (days < 60) return `about ${plural(Math.round(days / 7), 'week')}`;
  return 'more than 2 months';
}
