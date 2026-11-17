// The Stock page's view of one location: each item's spots there, a summary, and filters.
import { itemSummary, sortByAttention, visibleSlots } from './itemsureItemStock.js';
import { NO_AREA_LABEL } from './itemsureStock.js';
import { settleSlot, topOffCanWait } from './itemsureTopOff.js';

export const STOCK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Running low' },
  { id: 'below_par', label: 'Needs topping up' },
  { id: 'unset', label: 'No amount yet' },
];

/** Spot name for a slot; Loose gets its full label. */
export const spotName = (slot) => slot.areaName || NO_AREA_LABEL;

/** Same Usual / Top off at softening Home and Warning levels use (display only). */
function settleRow(item, slots, summary) {
  const percent = item.topoffPercent ?? null;
  const settledSlots = slots.map((s) => settleSlot(s, percent));
  const waits = topOffCanWait(
    { status: summary.status, onHand: summary.total, minimum: summary.minimum, par: summary.par },
    percent,
  );
  return { item, slots: settledSlots, summary: waits ? { ...summary, status: 'above_minimum' } : summary };
}

/**
 * One row per item at this location: { item, slots, summary }, most urgent first.
 * Items show when they are kept, have levels, or have stock here; a spot that is empty with
 * nothing set (e.g. everything was moved out) is left out, as on the item's page. `showAll` adds every
 * other active item (with no slots); so does a missing places list, so nothing is hidden by mistake.
 * Status labels match Home / Warning levels (Usual top-off), not raw under-fill.
 */
export function locationRows(items, { balances = [], targets = [], places = null }, location, { showAll = false } = {}) {
  const sources = { balances, targets, places: places || [], locations: [location] };
  const rows = items
    .map((item) => {
      const slots = visibleSlots(item.id, sources)[0]?.slots || [];
      return settleRow(item, slots, itemSummary(item.id, sources));
    })
    .filter((row) => row.slots.length || ((showAll || places === null) && row.item.isActive));
  const summaries = new Map(rows.map((r) => [r.item.id, r.summary]));
  const order = sortByAttention(rows.map((r) => r.item), (item) => summaries.get(item.id));
  const byId = new Map(rows.map((r) => [r.item.id, r]));
  return order.map((item) => byId.get(item.id));
}

/** Items here that aren't kept, levelled, or stocked here (only meaningful when places loaded). */
export function otherItemCount(items, rows) {
  const shown = new Set(rows.map((r) => r.item.id));
  return items.filter((i) => i.isActive && !shown.has(i.id)).length;
}

/** Counts for the summary strip. */
export function locationCounts(rows) {
  const counts = { all: rows.length, low: 0, below_par: 0, unset: 0 };
  for (const row of rows) {
    if (row.summary.total === null) counts.unset += 1;
    if (row.summary.status === 'low') counts.low += 1;
    if (row.summary.status === 'below_par') counts.below_par += 1;
  }
  return counts;
}

export function matchesFilter(row, filter) {
  if (filter === 'unset') return row.summary.total === null;
  if (filter === 'low' || filter === 'below_par') return row.summary.status === filter;
  return true;
}

/**
 * The same rows regrouped the way you walk the location: one section per spot, in the
 * location's order with Loose last, each listing [{ item, slot }].
 */
export function spotSections(rows, location) {
  const spots = [...(location.storageAreas || []).map((a) => ({ id: a.id, name: a.name })), { id: null, name: NO_AREA_LABEL }];
  return spots
    .map((spot) => ({
      ...spot,
      entries: rows.flatMap((row) =>
        row.slots.filter((s) => (s.storageAreaId || null) === spot.id).map((slot) => ({ item: row.item, slot })),
      ),
    }))
    .filter((section) => section.entries.length);
}
