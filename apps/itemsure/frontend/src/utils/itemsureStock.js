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
      return [
        ...areas.map((area) => ({ key: slotKey(location.id, area.id), label: `${location.name} \u00b7 ${area.name}` })),
        { key: slotKey(location.id, null), label: areas.length ? `${location.name} \u00b7 ${NO_AREA_LABEL}` : location.name },
      ];
    });
}

export function slotLabel(locations, locationId, storageAreaId) {
  const location = locations.find((l) => l.id === locationId);
  const area = storageAreaId ? location?.storageAreas.find((a) => a.id === storageAreaId) : null;
  return [location?.name || SITE, storageAreaId ? area?.name || 'Spot' : NO_AREA_LABEL].join(' \u00b7 ');
}

/** The established balance for one item in one slot, or null when none exists yet. */
export function findBalance(balances, itemId, locationId, storageAreaId) {
  return (
    balances.find(
      (b) => b.item_id === itemId && b.location_id === locationId && (b.storage_area_id || null) === (storageAreaId || null),
    ) || null
  );
}
