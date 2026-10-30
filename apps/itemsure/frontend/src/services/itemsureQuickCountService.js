// Counting one item from outside the counting screen. Uses the same guarded
// writes as the counting screen: one entry per item and spot, never overwriting
// someone else's newer number without asking.
import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { addItemsToSession, persistEntry } from './itemsureCountService.js';

/** Which items and spots have a saved number in this count: { items: Set(itemId), spots: Set('itemId:areaId|') }. */
export async function listCountedSpots(sessionId) {
  const rows =
    assertOk(await itemsure.from('count_entries').select('item_id, storage_area_id').eq('session_id', sessionId), 'count entries') || [];
  return {
    items: new Set(rows.map((r) => r.item_id)),
    spots: new Set(rows.map((r) => `${r.item_id}:${r.storage_area_id || ''}`)),
  };
}

/** Adds the item to the count when it isn't part of it yet. */
export async function ensureItemInSession(sessionId, itemId, inSession) {
  if (!inSession) await addItemsToSession(sessionId, [itemId]);
}

/**
 * Saves `value` (checked quantity text, or '' to clear) for the item in one spot.
 * `entry` is the saved entry the person saw (or null). `anchorAt` is the server time
 * taken when they started typing this spot (null means "any time in this count").
 * Returns persistEntry's result: { kind: 'saved' | 'conflict' | 'offline' | 'error', ... }.
 */
export function saveSpotCount({ sessionId, itemId, unitId, storageAreaId, value, entry, anchorAt = null }) {
  return persistEntry({
    sessionId,
    itemId,
    storageAreaId: storageAreaId || null,
    unitId,
    value,
    anchorAt,
    entryId: entry?.id ?? null,
    baseRevision: entry?.revision ?? null,
  });
}
