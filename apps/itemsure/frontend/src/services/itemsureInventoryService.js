import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { checkQuantity } from '../utils/itemsureQuantity.js';

// Quantities are read as text so the browser never does float math on stock.
const BALANCE_COLUMNS = 'id, location_id, storage_area_id, item_id, quantity_text:quantity::text, initialized_at, updated_at';
const MOVEMENT_COLUMNS =
  'id, location_id, storage_area_id, item_id, item_name, movement_type, quantity_text:quantity::text, ' +
  'balance_after_text:balance_after::text, unit_symbol, unit_name, source_type, source_id, reason, created_by, posted_at, effective_at';

export const MOVEMENT_LABELS = {
  opening_balance: 'Opening balance',
  manual_addition: 'Added',
  manual_removal: 'Removed',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  count_adjustment: 'Count adjustment',
};

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

/** Active items with the unit details stock forms need. */
export async function listStockItems(organizationId) {
  const rows =
    assertOk(
      await itemsure
        .from('inventory_items')
        .select('id, name, sku, is_active, units_of_measure(name, symbol, precision_scale)')
        .eq('organization_id', organizationId)
        .order('name'),
      'items',
    ) || [];
  return rows.map((row) => {
    const unit = one(row.units_of_measure);
    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      isActive: row.is_active,
      unitName: unit?.name || '',
      unitSymbol: unit?.symbol || unit?.name || '',
      precision: unit?.precision_scale ?? 0,
    };
  });
}

export async function listBalances(organizationId) {
  return assertOk(await itemsure.from('inventory_balances').select(BALANCE_COLUMNS).eq('organization_id', organizationId), 'balances') || [];
}

export async function listMovements(organizationId, { locationId, limit = 100 } = {}) {
  let query = itemsure
    .from('inventory_movements')
    .select(MOVEMENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('id', { ascending: false })
    .limit(limit);
  if (locationId) query = query.eq('location_id', locationId);
  return assertOk(await query, 'inventory activity') || [];
}

/** Validates against the item's unit before the database checks it again. */
export function validStockQuantity(text, item) {
  const result = checkQuantity(text, item?.precision ?? 0, item?.unitName || 'This unit');
  if (result.empty) throw new Error('Enter a quantity.');
  if (result.error) throw new Error(result.error);
  if (result.value === '0') throw new Error('Enter a quantity greater than zero.');
  return result.value;
}

export async function adjustStock({ locationId, storageAreaId, item, direction, quantity, reason }) {
  const value = validStockQuantity(quantity, item);
  const clean = String(reason || '').trim();
  if (!clean) throw new Error('Enter a reason for this adjustment.');
  assertOk(
    await itemsure.rpc('adjust_inventory', {
      p_location_id: locationId,
      p_storage_area_id: storageAreaId || null,
      p_item_id: item.id,
      p_direction: direction,
      p_quantity: value,
      p_reason: clean,
    }),
    'adjust inventory',
  );
}

export async function transferStock({ item, from, to, quantity, note }) {
  const value = validStockQuantity(quantity, item);
  return assertOk(
    await itemsure.rpc('transfer_inventory', {
      p_item_id: item.id,
      p_from_location_id: from.locationId,
      p_from_storage_area_id: from.storageAreaId || null,
      p_to_location_id: to.locationId,
      p_to_storage_area_id: to.storageAreaId || null,
      p_quantity: value,
      p_note: String(note || '').trim(),
    }),
    'transfer inventory',
  );
}
