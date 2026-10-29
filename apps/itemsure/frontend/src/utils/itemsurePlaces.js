/** One key per place: location, plus area ('' = the location, no specific area). */
export function placeKey(locationId, storageAreaId) {
  return `${locationId}|${storageAreaId || ''}`;
}

/** One label per location, naming its areas once: "Location (Area, Area)". Sorted like the locations list. */
export function placeLabels(places, locations) {
  const out = [];
  for (const location of locations) {
    const here = places.filter((p) => p.location_id === location.id);
    if (!here.length) continue;
    const areas = (location.storageAreas || []).filter((area) => here.some((p) => p.storage_area_id === area.id)).map((area) => area.name);
    out.push(areas.length ? `${location.name} (${areas.join(', ')})` : location.name);
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
