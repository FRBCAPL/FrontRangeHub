import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

const TARGET_COLUMNS =
  'id, location_id, storage_area_id, item_id, minimum_text:minimum_quantity::text, par_text:par_quantity::text, updated_at';
const STATUS_COLUMNS =
  'target_id, location_id, storage_area_id, item_id, item_name, sku, category_id, unit_symbol, location_name, area_name, ' +
  'minimum_text:minimum_quantity::text, par_text:par_quantity::text, on_hand_text:on_hand::text, status, shortage_text:shortage::text';

/** Categories plus each item's category, for filters. */
export async function listCategoryRows(organizationId) {
  const [categories, itemCategories] = await Promise.all([
    itemsure.from('inventory_categories').select('id, name, is_active, parent_category_id').eq('organization_id', organizationId).order('name'),
    itemsure.from('inventory_items').select('id, category_id').eq('organization_id', organizationId),
  ]);
  return { categories: assertOk(categories, 'categories') || [], itemCategories: assertOk(itemCategories, 'items') || [] };
}

export async function listTargets(organizationId) {
  return assertOk(await itemsure.from('inventory_targets').select(TARGET_COLUMNS).eq('organization_id', organizationId), 'levels') || [];
}

/** Rows from the status view in the given statuses (all when omitted). */
export async function listTargetStatus(organizationId, statuses) {
  let query = itemsure.from('inventory_target_status').select(STATUS_COLUMNS).eq('organization_id', organizationId);
  if (statuses?.length) query = query.in('status', statuses);
  return assertOk(await query.order('location_name').order('item_name'), 'low stock') || [];
}

async function countStatus(organizationId, status) {
  const { count, error } = await itemsure
    .from('inventory_target_status')
    .select('target_id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', status);
  return error ? null : count ?? 0;
}

/** Low-stock and below-par slot counts the caller can see. */
export async function loadStockAlertCounts(organizationId) {
  const [low, belowPar] = await Promise.all([countStatus(organizationId, 'low'), countStatus(organizationId, 'below_par')]);
  return { low, belowPar };
}

/** Saves edited rows; returns one result per row ({ ok, outcome, updated_at } or { ok: false, error }). */
export async function saveTargets(organizationId, rows) {
  return assertOk(await itemsure.rpc('save_inventory_targets', { p_organization_id: organizationId, p_rows: rows }), 'save levels') || [];
}

/** Preview (apply false) or apply a copy of levels between locations. */
/** Returns { version, lines }. Applying needs the version from the preview the person saw. */
export async function copyTargets({ fromLocationId, toLocationId, areaMap, mode, apply, expectedVersion = null }) {
  const result = assertOk(
    await itemsure.rpc('copy_inventory_targets', {
      p_from_location_id: fromLocationId,
      p_to_location_id: toLocationId,
      p_area_map: areaMap,
      p_mode: mode,
      p_apply: apply,
      p_expected_version: expectedVersion,
    }),
    'copy levels',
  );
  return { version: result?.version || null, lines: result?.lines || [] };
}
