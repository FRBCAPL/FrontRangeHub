import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// "Got it" ticks on the shopping list, shared by everyone in the business, and the
// receive step that turns them into stock. Ticks alone change nothing in stock.

/** Every tick: [{ key, amount, by, at }], or null when the database update isn't applied yet. */
export async function listShoppingTicks(organizationId) {
  const { data, error } = await itemsure
    .from('shopping_ticks')
    .select('tick_key, amount, ticked_by, ticked_at')
    .eq('organization_id', organizationId);
  if (error) return null;
  return (data || []).map((r) => ({ key: r.tick_key, amount: r.amount || '', by: r.ticked_by, at: r.ticked_at }));
}

/** Ticks a line. Ticking something already ticked keeps the first tick. */
export async function addShoppingTick(organizationId, key, amount = '') {
  const { error } = await itemsure
    .from('shopping_ticks')
    .insert({ organization_id: organizationId, tick_key: key, amount: amount.trim().slice(0, 40) });
  if (error && error.code !== '23505') assertOk({ error }, 'tick the item');
}

/** Changes what the shopper got. Ticks the line first when nobody has. */
export async function setShoppingTickAmount(organizationId, key, amount) {
  const clean = amount.trim().slice(0, 40);
  const rows = assertOk(
    await itemsure.from('shopping_ticks').update({ amount: clean }).eq('organization_id', organizationId).eq('tick_key', key).select('tick_key'),
    'save the amount',
  );
  if (!rows?.length) await addShoppingTick(organizationId, key, clean);
}

/** Unticks lines. Already-unticked lines are fine, so a retry is safe. */
export async function removeShoppingTicks(organizationId, keys) {
  if (!keys.length) return;
  assertOk(
    await itemsure.from('shopping_ticks').delete().eq('organization_id', organizationId).in('tick_key', keys),
    'untick',
  );
}

/**
 * Adds received stock in one step, then clears those ticks and hand-added lines.
 * lines: [{ locationId, storageAreaId, itemId, quantity, reason }]. receiptId is made once
 * per receive screen, so pressing again after a dropped connection posts nothing twice.
 * Returns the number of stock lines added, or null when this receipt was already done.
 */
export async function receiveShopping(organizationId, { receiptId, lines, tickKeys, extraIds }) {
  return assertOk(
    await itemsure.rpc('receive_shopping', {
      p_organization_id: organizationId,
      p_receipt_id: receiptId,
      p_lines: lines.map((l) => ({
        location_id: l.locationId,
        storage_area_id: l.storageAreaId || null,
        item_id: l.itemId,
        quantity: l.quantity,
        reason: l.reason,
      })),
      p_tick_keys: tickKeys,
      p_extra_ids: extraIds,
    }),
    'receive the shopping',
  );
}
