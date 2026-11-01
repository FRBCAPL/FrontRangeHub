import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { dropWaitingRows } from '../utils/itemsureTopOff.js';
import { listTopOffPercents } from './itemsureTopOffService.js';

const TARGET_COLUMNS =
  'id, location_id, storage_area_id, item_id, minimum_text:minimum_quantity::text, par_text:par_quantity::text, updated_at';
const STATUS_COLUMNS =
  'target_id, location_id, storage_area_id, item_id, item_name, sku, category_id, unit_symbol, location_name, area_name, ' +
  'minimum_text:minimum_quantity::text, par_text:par_quantity::text, on_hand_text:on_hand::text, status, shortage_text:shortage::text';

/** Categories plus each item's category, for filters. */
export async function listCategoryRows(organizationId) {
  const [categories, itemCategories] = await Promise.all([
    itemsure.from('inventory_categories').select('id, name, is_active, parent_category_id, sort_order').eq('organization_id', organizationId).order('sort_order').order('name'),
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
    .in('status', Array.isArray(status) ? status : [status]);
  return error ? null : count ?? 0;
}

const STOCKED = ['at_target', 'above_target', 'above_minimum'];

/**
 * Below-par places split by each item's "Top off at" line: { due, waiting }, or null
 * when they couldn't load. Waiting ones are under par but don't need topping up yet.
 */
async function countTopOffs(organizationId) {
  const [result, percents] = await Promise.all([
    itemsure
      .from('inventory_target_status')
      .select('item_id, status, minimum_text:minimum_quantity::text, par_text:par_quantity::text, on_hand_text:on_hand::text')
      .eq('organization_id', organizationId)
      .eq('status', 'below_par'),
    listTopOffPercents(organizationId),
  ]);
  if (result.error) return null;
  const rows = result.data || [];
  const due = dropWaitingRows(rows, percents).length;
  return { due, waiting: rows.length - due };
}

/** Item-and-place counts for the Home "Stock health" tiles; null parts couldn't load. */
export async function loadStockHealth(organizationId) {
  const [low, topOffs, stocked] = await Promise.all([
    countStatus(organizationId, 'low'),
    countTopOffs(organizationId),
    countStatus(organizationId, STOCKED),
  ]);
  return {
    low,
    belowPar: topOffs ? topOffs.due : null,
    stocked: stocked === null || !topOffs ? stocked : stocked + topOffs.waiting,
  };
}

/** Low-stock and needs-topping-up slot counts the caller can see. */
export async function loadStockAlertCounts(organizationId) {
  const [low, topOffs] = await Promise.all([countStatus(organizationId, 'low'), countTopOffs(organizationId)]);
  return { low, belowPar: topOffs ? topOffs.due : null };
}

/** Status-view rows like listTargetStatus, without top-offs that can wait. */
export async function listNeededStatus(organizationId, statuses) {
  const [rows, percents] = await Promise.all([listTargetStatus(organizationId, statuses), listTopOffPercents(organizationId)]);
  return dropWaitingRows(rows, percents);
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
