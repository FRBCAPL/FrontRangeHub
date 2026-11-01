import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Things added to the shopping list by hand. Shared by everyone in the business;
// they change nothing in stock. Lines are added and removed, never edited.

/** Every hand-added line, oldest first, or null when the database update isn't applied yet. */
export async function listShoppingExtras(organizationId) {
  const { data, error } = await itemsure
    .from('shopping_extras')
    .select('id, item_id, supplier_id, name, amount, created_at')
    .eq('organization_id', organizationId)
    .order('created_at');
  if (error) return null;
  return data || [];
}

/** Adds one line: an item (itemId) or a one-off name. amount is free text, like "2 cases". */
export async function addShoppingExtra(organizationId, { itemId = null, supplierId = null, name, amount = '' }) {
  assertOk(
    await itemsure.from('shopping_extras').insert({
      organization_id: organizationId,
      item_id: itemId || null,
      supplier_id: supplierId || null,
      name: name.trim().slice(0, 120),
      amount: amount.trim().slice(0, 40),
    }),
    'add to the shopping list',
  );
}

/** Removes lines by id. Already-removed lines are fine, so a retry is safe. */
export async function removeShoppingExtras(organizationId, ids) {
  if (!ids.length) return;
  assertOk(
    await itemsure.from('shopping_extras').delete().eq('organization_id', organizationId).in('id', ids),
    'remove from the shopping list',
  );
}
