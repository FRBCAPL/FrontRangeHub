// A "slot" is where stock sits: a location plus an optional storage area.

import { SITE } from '../data/itemsureTerms.js';

export const NO_AREA_LABEL = 'Loose (no specific spot)';

export function slotKey(locationId, storageAreaId) {
  return `${locationId}|${storageAreaId || ''}`;
}

export function parseSlotKey(key) {
  const [locationId = '', storageAreaId = ''] = String(key || '').split('|');
  return { locationId, storageAreaId: storageAreaId || null };
}

/** Every place stock can sit in the locations the user can see, for pickers. `spots: false` lists locations only. */
export function slotOptions(locations, { spots = true } = {}) {
  return locations
    .filter((location) => location.is_active)
    .flatMap((location) => {
      const areas = spots ? (location.storageAreas || []).filter((area) => area.is_active) : [];
      // `group` and `short` let pickers show spots under their site without repeating its name.
      return [
        ...areas.map((area) => ({ key: slotKey(location.id, area.id), label: `${location.name} \u00b7 ${area.name}`, group: location.name, short: area.name })),
        areas.length
          ? { key: slotKey(location.id, null), label: `${location.name} \u00b7 ${NO_AREA_LABEL}`, group: location.name, short: NO_AREA_LABEL, loose: true }
          : { key: slotKey(location.id, null), label: location.name },
      ];
    });
}

export function slotLabel(locations, locationId, storageAreaId) {
  const location = locations.find((l) => l.id === locationId);
  const area = storageAreaId ? location?.storageAreas.find((a) => a.id === storageAreaId) : null;
  return [location?.name || SITE, storageAreaId ? area?.name || 'Spot' : NO_AREA_LABEL].join(' \u00b7 ');
}

/**
 * Splits `items` (each with `id`) into those at one slot and the rest, keeping their order.
 * An item is here when it has a balance there (even 0), is ticked "kept at" there, or has levels there.
 * `places` may be null (not loaded); balances and levels still count.
 */
export function itemsAtSlot(items, { balances = [], places = [], targets = [] }, locationId, storageAreaId) {
  const at = (row) => row.location_id === locationId && (row.storage_area_id || null) === (storageAreaId || null);
  const ids = new Set([...balances, ...(places || []), ...targets].filter(at).map((row) => row.item_id));
  return { here: items.filter((i) => ids.has(i.id)), others: items.filter((i) => !ids.has(i.id)) };
}

/** The established balance for one item in one slot, or null when none exists yet. */
export function findBalance(balances, itemId, locationId, storageAreaId) {
  return (
    balances.find(
      (b) => b.item_id === itemId && b.location_id === locationId && (b.storage_area_id || null) === (storageAreaId || null),
    ) || null
  );
}
