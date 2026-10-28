// A "slot" is where stock sits: a location plus an optional storage area.

export const NO_AREA_LABEL = 'No specific area';

export function slotKey(locationId, storageAreaId) {
  return `${locationId}|${storageAreaId || ''}`;
}

export function parseSlotKey(key) {
  const [locationId = '', storageAreaId = ''] = String(key || '').split('|');
  return { locationId, storageAreaId: storageAreaId || null };
}

/** Every place stock can sit in the locations the user can see, for pickers. */
export function slotOptions(locations) {
  return locations
    .filter((location) => location.is_active)
    .flatMap((location) => [
      { key: slotKey(location.id, null), label: `${location.name} \u00b7 ${NO_AREA_LABEL}` },
      ...location.storageAreas
        .filter((area) => area.is_active)
        .map((area) => ({ key: slotKey(location.id, area.id), label: `${location.name} \u00b7 ${area.name}` })),
    ]);
}

export function slotLabel(locations, locationId, storageAreaId) {
  const location = locations.find((l) => l.id === locationId);
  const area = storageAreaId ? location?.storageAreas.find((a) => a.id === storageAreaId) : null;
  return [location?.name || 'Location', storageAreaId ? area?.name || 'Storage area' : NO_AREA_LABEL].join(' \u00b7 ');
}

/** The established balance for one item in one slot, or null when none exists yet. */
export function findBalance(balances, itemId, locationId, storageAreaId) {
  return (
    balances.find(
      (b) => b.item_id === itemId && b.location_id === locationId && (b.storage_area_id || null) === (storageAreaId || null),
    ) || null
  );
}
