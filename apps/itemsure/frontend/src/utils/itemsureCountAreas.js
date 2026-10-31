// Which spots a count can record into. Shared by the counting screen and quick count.
import { NO_AREA_LABEL } from './itemsureStock.js';

export const NO_AREA = '';

/**
 * The session's own spot, or the location's active spots plus "Loose".
 * `entries` is any list/object of saved entries; spots already used stay listed even if archived since.
 */
/**
 * Splits a count's items into those that belong in this spot and the rest. An item belongs
 * when it is kept, has levels, or has stock there (`inUse` from slotsInUse), or was already
 * counted there (`countedHere`, a Set of item ids). With nothing known to belong anywhere
 * here (or `inUse` not loaded), every item belongs, so nothing is hidden by mistake.
 */
export function splitForSpot(items, inUse, locationId, areaId, countedHere = new Set()) {
  if (!inUse) return { here: items, others: [] };
  const key = (itemId) => `${itemId}|${locationId}|${areaId || ''}`;
  const here = items.filter((i) => inUse.has(key(i.item_id)) || countedHere.has(i.item_id));
  if (!here.length) return { here: items, others: [] };
  const ids = new Set(here.map((i) => i.item_id));
  return { here, others: items.filter((i) => !ids.has(i.item_id)) };
}

export function countingAreas(session, storageAreas, entries) {
  if (session.scope === 'storage_area') {
    const area = storageAreas.find((a) => a.id === session.storage_area_id);
    return [{ id: session.storage_area_id, name: area?.name || 'Spot' }];
  }
  const used = new Set(Object.values(entries || {}).map((e) => e.storage_area_id).filter(Boolean));
  const list = storageAreas.filter((a) => a.is_active || used.has(a.id)).map((a) => ({ id: a.id, name: a.name }));
  return [...list, { id: NO_AREA, name: NO_AREA_LABEL }];
}