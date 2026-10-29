import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { notifyInventoryChanged } from '../utils/itemsureChanges.js';
import { saveTargets } from './itemsureTargetService.js';

function placeQuery(query, organizationId, itemId, slot) {
  const q = query.eq('organization_id', organizationId).eq('item_id', itemId).eq('location_id', slot.locationId);
  return slot.storageAreaId ? q.eq('storage_area_id', slot.storageAreaId) : q.is('storage_area_id', null);
}

async function saveLevels(organizationId, itemId, slot, minimum, par, expectedUpdatedAt) {
  const [result] = await saveTargets(organizationId, [{
    item_id: itemId,
    location_id: slot.locationId,
    storage_area_id: slot.storageAreaId || null,
    minimum,
    par,
    expected_updated_at: expectedUpdatedAt,
  }]);
  if (!result?.ok) throw new Error(result?.error || 'Could not change the levels here.');
}

/**
 * Takes an empty place off an item: its old "Kept at" choice and its levels.
 * Stock is never touched. Returns what `restorePlace` needs to put it back.
 */
export async function removeEmptyPlace(organizationId, itemId, slot) {
  if (slot.target) await saveLevels(organizationId, itemId, slot, null, null, slot.target.updated_at ?? null);
  if (slot.kept) assertOk(await placeQuery(itemsure.from('item_places').delete(), organizationId, itemId, slot), 'remove place');
  notifyInventoryChanged();
  return { kept: slot.kept, minimum: slot.target?.minimum_text ?? null, par: slot.target?.par_text ?? null, hadLevels: Boolean(slot.target) };
}

/** Undo for `removeEmptyPlace`. */
export async function restorePlace(organizationId, itemId, slot, saved) {
  if (saved.hadLevels) await saveLevels(organizationId, itemId, slot, saved.minimum, saved.par, null);
  if (saved.kept) {
    assertOk(await itemsure.from('item_places').insert({
      organization_id: organizationId,
      item_id: itemId,
      location_id: slot.locationId,
      storage_area_id: slot.storageAreaId || null,
    }), 'restore place');
  }
  notifyInventoryChanged();
}
