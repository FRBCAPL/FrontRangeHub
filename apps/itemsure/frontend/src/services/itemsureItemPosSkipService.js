import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

const missingColumn = (error) => error && (error.code === '42703' || error.code === 'PGRST204'
  || /not_sold_in_pos/i.test(error.message || ''));

/**
 * Item ids that are stocked but have no Clover listing (kitchen, supplies).
 * null until that database update is applied.
 */
export async function listNotSoldInPos(organizationId) {
  const { data, error } = await itemsure
    .from('inventory_items')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('not_sold_in_pos', true);
  if (error) return null;
  return new Set((data || []).map((row) => row.id));
}

/** Marks or unmarks an ItemSure item as skipped for sales counting. Does not change Clover or stock. */
export async function setNotSoldInPos(organizationId, itemId, skip) {
  const { data, error } = await itemsure.from('inventory_items')
    .update({ not_sold_in_pos: skip })
    .eq('organization_id', organizationId)
    .eq('id', itemId)
    .select('id');
  if (missingColumn(error)) {
    throw new Error("Don't track in sales needs a database update first. Nothing else is affected.");
  }
  const rows = assertOk({ data, error }, skip ? "mark Don't track in sales" : 'track in sales again');
  if (!rows?.length) throw new Error('You do not have permission to change this item.');
}
