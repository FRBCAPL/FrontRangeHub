import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { placeChanges } from '../utils/itemsurePlaces.js';
/** Every place the person can see; places at other locations stay hidden by the database. */
export async function listPlaces(organizationId) {
  return assertOk(
    await itemsure
      .from('item_places')
      .select('id, item_id, location_id, storage_area_id')
      .eq('organization_id', organizationId),
    'item places',
  ) || [];
}

/** Makes the item's visible places match `chosenKeys`. Places the person cannot see are never touched. */
export async function saveItemPlaces(organizationId, itemId, current, chosenKeys) {
  const { removeIds, add } = placeChanges(current, chosenKeys);
  if (removeIds.length) {
    assertOk(await itemsure.from('item_places').delete().in('id', removeIds).eq('organization_id', organizationId), 'remove places');
  }
  if (add.length) {
    const rows = add.map((p) => ({ organization_id: organizationId, item_id: itemId, ...p }));
    assertOk(await itemsure.from('item_places').insert(rows), 'add places');
  }
}
