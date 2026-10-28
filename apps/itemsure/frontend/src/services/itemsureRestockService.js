import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { validStockQuantity } from './itemsureInventoryService.js';

const PLAN_COLUMNS =
  'id, item_id, from_location_id, from_storage_area_id, to_location_id, to_storage_area_id, ' +
  'quantity_text:quantity::text, note, status, created_by, created_at';

/** Shortages for the caller's locations with transfer suggestions. Read-only; reserves nothing. */
export async function loadRecommendations(organizationId) {
  return assertOk(await itemsure.rpc('restock_recommendations', { p_organization_id: organizationId }), 'restock recommendations') || [];
}

export async function listOpenPlans(organizationId) {
  return (
    assertOk(
      await itemsure
        .from('planned_transfers')
        .select(PLAN_COLUMNS)
        .eq('organization_id', organizationId)
        .eq('status', 'planned')
        .order('created_at', { ascending: false }),
      'planned transfers',
    ) || []
  );
}

export async function planTransfer({ item, from, to, quantity, note }) {
  const value = validStockQuantity(quantity, item);
  return assertOk(
    await itemsure.rpc('plan_inventory_transfer', {
      p_item_id: item.id,
      p_from_location_id: from.locationId,
      p_from_storage_area_id: from.storageAreaId || null,
      p_to_location_id: to.locationId,
      p_to_storage_area_id: to.storageAreaId || null,
      p_quantity: value,
      p_note: String(note || '').trim(),
    }),
    'plan transfer',
  );
}

/** What a transfer would leave at its source, from current figures. Read-only. */
export async function checkTransferSource({ item, from, quantity }) {
  const value = validStockQuantity(quantity, item);
  return assertOk(
    await itemsure.rpc('check_transfer_source', {
      p_item_id: item.id,
      p_from_location_id: from.locationId,
      p_from_storage_area_id: from.storageAreaId || null,
      p_quantity: value,
    }),
    'check transfer source',
  );
}

export async function cancelPlan(planId) {
  assertOk(await itemsure.rpc('cancel_planned_transfer', { p_plan_id: planId }), 'cancel planned transfer');
}

/** Runs the real transfer. quantity null moves the planned amount. */
export async function completePlan(planId, quantity, item) {
  const value = quantity ? validStockQuantity(quantity, item) : null;
  return assertOk(await itemsure.rpc('complete_planned_transfer', { p_plan_id: planId, p_quantity: value }), 'complete transfer');
}
