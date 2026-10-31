import { useCallback, useEffect, useMemo, useState } from 'react';
import { listLocations } from '../services/itemsureLocationService.js';
import { listPlaces } from '../services/itemsurePlaceService.js';
import { placeLabels } from '../utils/itemsurePlaces.js';

/**
 * Locations and "Kept at" places for the Items page. `places` stays null when they
 * cannot load (for example before the places migration is applied), so the page
 * keeps working without them instead of showing every item as kept nowhere.
 */
export default function useItemPlaces(organizationId) {
  const [locations, setLocations] = useState([]);
  const [places, setPlaces] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [locationRows, placeRows] = await Promise.all([listLocations(organizationId), listPlaces(organizationId)]);
      setLocations(locationRows);
      setPlaces(placeRows);
    } catch (e) {
      console.warn('[itemsure] item places unavailable', e);
      setPlaces(null);
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const byItem = useMemo(() => {
    const map = new Map();
    for (const p of places || []) map.set(p.item_id, [...(map.get(p.item_id) || []), p]);
    return map;
  }, [places]);

  return {
    locations,
    places,
    ready: places !== null,
    placesFor: (itemId) => (places === null ? null : byItem.get(itemId) || []),
    labelsFor: (itemId) => placeLabels(byItem.get(itemId) || [], locations),
    reload,
  };
}
