// Pure helpers for counting one item across several spots from the Inventory page.
import { canonicalQuantity, checkQuantity, displayQuantity } from './itemsureQuantity.js';

const areaOf = (entry) => entry.storage_area_id || '';

/**
 * Open counts that cover one spot, and whether that spot already has a number in each.
 * `counted` is { sessionId: { spots: Set('itemId:areaId|') } }. A one-spot count only covers its spot.
 */
export function countsCoveringSpot(sessions, counted, itemId, locationId, storageAreaId) {
  const area = storageAreaId || '';
  return sessions
    .filter((s) => s.location_id === locationId && (s.scope !== 'storage_area' || (s.storage_area_id || '') === area))
    .map((session) => ({ session, counted: Boolean(counted[session.id]?.spots.has(`${itemId}:${area}`)) }));
}

/** Saved entry per spot id ('' for Loose). */
export function entriesBySpot(entries, itemId) {
  const map = {};
  for (const e of entries || []) if (e.item_id === itemId) map[areaOf(e)] = e;
  return map;
}

/** Spots the window opens with: ones already counted, then ones the item is kept in, else the first spot. */
export function startingSpots(areas, countedIds = [], keptIds = []) {
  const ids = areas.map((a) => a.id);
  const picked = [...new Set([...countedIds, ...keptIds])].filter((id) => ids.includes(id));
  return picked.length ? picked : ids.slice(0, 1);
}

/** What the box shows for a saved entry: its number when it is in the item's unit, else blank. */
export function savedValue(entry, unitId) {
  return entry && entry.unit_id === unitId ? displayQuantity(entry.quantity_text) : '';
}

/**
 * Checks every spot's typed number. Blank means "leave this spot alone".
 * Returns { errors: { spotId: message }, changes: [{ areaId, value, entry }] } where
 * changes skips numbers that match what's already saved.
 */
export function planSpotCounts(values, saved, { unitId, precision, unitName }) {
  const errors = {};
  const changes = [];
  for (const [areaId, raw] of Object.entries(values)) {
    const check = checkQuantity(raw, precision, unitName);
    if (check.empty) continue;
    if (check.error) {
      errors[areaId] = check.error;
      continue;
    }
    const entry = saved[areaId] || null;
    const same = entry && entry.unit_id === unitId && canonicalQuantity(entry.quantity_text) === check.value;
    if (!same) changes.push({ areaId, value: check.value, entry });
  }
  return { errors, changes };
}
