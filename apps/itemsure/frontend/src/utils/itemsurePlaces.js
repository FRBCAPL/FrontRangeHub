/** One key per place: location, plus area ('' = the location, no specific area). */
export function placeKey(locationId, storageAreaId) {
  return `${locationId}|${storageAreaId || ''}`;
}

/** Readable "Location · Area" labels for an item's places, sorted like the locations list. */
export function placeLabels(places, locations) {
  const out = [];
  for (const location of locations) {
    const here = places.filter((p) => p.location_id === location.id);
    if (!here.length) continue;
    if (here.some((p) => !p.storage_area_id)) out.push(location.name);
    for (const area of location.storageAreas || []) {
      if (here.some((p) => p.storage_area_id === area.id)) out.push(`${location.name} \u00b7 ${area.name}`);
    }
  }
  return out;
}

/** What to delete and insert so an item's visible places match the chosen keys. */
export function placeChanges(current, chosenKeys) {
  const chosen = new Set(chosenKeys);
  const have = new Set(current.map((p) => placeKey(p.location_id, p.storage_area_id)));
  return {
    removeIds: current.filter((p) => !chosen.has(placeKey(p.location_id, p.storage_area_id))).map((p) => p.id),
    add: [...chosen].filter((k) => !have.has(k)).map((k) => {
      const [locationId, areaId] = k.split('|');
      return { location_id: locationId, storage_area_id: areaId || null };
    }),
  };
}
