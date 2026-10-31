import itemsure from './itemsureClient.js';
import { assertOk, readableDatabaseError } from '../utils/itemsureErrors.js';
import { requiredText } from '../utils/itemsureText.js';

const SESSION_COLUMNS =
  'id, organization_id, location_id, storage_area_id, scope, name, status, created_by, created_at, started_at, ' +
  'submitted_at, submitted_by, cancelled_at, cancelled_by, omissions_confirmed, counted_item_count, omitted_item_count, updated_at';

const ITEM_COLUMNS =
  'item_id, item_name, sku, barcode, category_name, base_unit_id, base_unit_name, base_unit_symbol, base_precision_scale, added_after_start, added_at';

// quantity is read as text so the browser never turns it into a float.
const ENTRY_COLUMNS =
  'id, item_id, storage_area_id, quantity_text:quantity::text, unit_id, unit_name, unit_symbol, revision, counted_by, updated_by, updated_at';

export const OPEN_STATUSES = ['draft', 'in_progress'];

export function entryKey(itemId, storageAreaId) {
  return `${itemId}:${storageAreaId || 'none'}`;
}

export function isNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return !error?.code && /fetch|network|load failed|timed? ?out/i.test(error?.message || '');
}

export async function listSessions(organizationId) {
  return (
    assertOk(
      await itemsure
        .from('count_sessions')
        .select(SESSION_COLUMNS)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200),
      'count sessions',
    ) || []
  );
}

export async function startSession({ locationId, storageAreaId, name }) {
  const clean = requiredText(name, 'count name', 120);
  return assertOk(
    await itemsure.rpc('start_count_session', {
      p_location_id: locationId,
      p_storage_area_id: storageAreaId || null,
      p_name: clean,
    }),
    'start count',
  );
}

export async function loadSession(sessionId) {
  const session = assertOk(
    await itemsure.from('count_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle(),
    'count session',
  );
  if (!session) return null;

  const [items, entries] = await Promise.all([
    itemsure.from('count_session_items').select(`${ITEM_COLUMNS}, units_of_measure(precision_scale)`).eq('session_id', sessionId).order('item_name'),
    listEntries(sessionId),
  ]);
  return { session, items: (assertOk(items, 'count items') || []).map(withLivePrecision), entries };
}

/**
 * The saved copy keeps the unit's decimals from when the item joined the count, but the
 * database checks entries against the unit as it is now. Use whichever allows more, so a
 * unit that started allowing parts works in counts already open.
 */
function withLivePrecision({ units_of_measure: unit, ...item }) {
  const live = (Array.isArray(unit) ? unit[0] : unit)?.precision_scale;
  return live > item.base_precision_scale ? { ...item, base_precision_scale: live } : item;
}

export async function listEntries(sessionId) {
  return (
    assertOk(await itemsure.from('count_entries').select(ENTRY_COLUMNS).eq('session_id', sessionId), 'count entries') || []
  );
}

/** Per-item totals in each item's base unit, as exact strings. */
export async function listTotals(sessionId) {
  const rows =
    assertOk(
      await itemsure.from('count_item_totals').select('item_id, total_base_quantity, entry_count').eq('session_id', sessionId),
      'count totals',
    ) || [];
  return Object.fromEntries(rows.map((row) => [row.item_id, row]));
}

export async function loadPeopleNames(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await itemsure.from('profiles').select('id, full_name, email').in('id', ids);
  if (error) return {};
  return Object.fromEntries((data || []).map((p) => [p.id, p.full_name || p.email || 'Member']));
}

async function readServerEntry(sessionId, itemId, storageAreaId) {
  let query = itemsure.from('count_entries').select(ENTRY_COLUMNS).eq('session_id', sessionId).eq('item_id', itemId);
  query = storageAreaId ? query.eq('storage_area_id', storageAreaId) : query.is('storage_area_id', null);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

function failure(error) {
  if (isNetworkError(error)) return { kind: 'offline' };
  return { kind: 'error', message: readableDatabaseError(error) };
}

async function conflictWith(sessionId, itemId, storageAreaId) {
  try {
    return { kind: 'conflict', server: await readServerEntry(sessionId, itemId, storageAreaId) };
  } catch (error) {
    return failure(error);
  }
}

// Databases without the Phase 2B timing column reject it as unknown (PGRST204).
async function withTimingFallback(timing, write) {
  const result = await write(timing);
  if (result.error?.code === 'PGRST204' && /client_anchor_at/.test(result.error.message || '')) {
    return write({});
  }
  return result;
}

/**
 * Writes one entry with optimistic concurrency. baseRevision is the revision the
 * counter started from (null when there was no entry). Never overwrites a newer
 * value: a mismatch comes back as { kind: 'conflict', server }.
 * value '' clears the entry, which marks the item not counted in that area.
 */
export async function persistEntry({ sessionId, itemId, storageAreaId, unitId, value, anchorAt, entryId, baseRevision }) {
  // anchorAt is a server timestamp received before the value was typed. Without
  // one the server assumes the value could date from the start of the count.
  const timing = { client_anchor_at: anchorAt || null };
  try {
    if (value === '') {
      if (baseRevision === null || baseRevision === undefined) return { kind: 'saved', entry: null };
      const { data, error } = await itemsure
        .from('count_entries')
        .delete()
        .eq('id', entryId)
        .eq('revision', baseRevision)
        .select('id');
      if (error) return failure(error);
      if (data?.length) return { kind: 'saved', entry: null };
      const result = await conflictWith(sessionId, itemId, storageAreaId);
      return result.kind === 'conflict' && !result.server ? { kind: 'saved', entry: null } : result;
    }

    if (baseRevision === null || baseRevision === undefined) {
      const { data, error } = await withTimingFallback(timing, (extra) =>
        itemsure
          .from('count_entries')
          .insert({ session_id: sessionId, item_id: itemId, storage_area_id: storageAreaId || null, quantity: value, unit_id: unitId, ...extra })
          .select(ENTRY_COLUMNS)
          .single(),
      );
      if (error?.code === '23505') return conflictWith(sessionId, itemId, storageAreaId);
      if (error) return failure(error);
      return { kind: 'saved', entry: data };
    }

    const { data, error } = await withTimingFallback(timing, (extra) =>
      itemsure
        .from('count_entries')
        .update({ quantity: value, ...extra })
        .eq('id', entryId)
        .eq('revision', baseRevision)
        .select(ENTRY_COLUMNS),
    );
    if (error) return failure(error);
    if (data?.length) return { kind: 'saved', entry: data[0] };
    return conflictWith(sessionId, itemId, storageAreaId);
  } catch (error) {
    return failure(error);
  }
}

export async function listItemsMissingFromSession(organizationId, sessionId) {
  const [catalog, inSession] = await Promise.all([
    itemsure.from('inventory_items').select('id, name, sku').eq('organization_id', organizationId).eq('is_active', true).order('name'),
    itemsure.from('count_session_items').select('item_id').eq('session_id', sessionId),
  ]);
  const taken = new Set((assertOk(inSession, 'count items') || []).map((row) => row.item_id));
  return (assertOk(catalog, 'items') || []).filter((item) => !taken.has(item.id));
}

export async function addItemsToSession(sessionId, itemIds) {
  return assertOk(
    await itemsure.rpc('add_items_to_count_session', { p_session_id: sessionId, p_item_ids: itemIds }),
    'add items to count',
  );
}

export async function submitSession(sessionId, confirmOmissions) {
  assertOk(
    await itemsure.rpc('submit_count_session', { p_session_id: sessionId, p_confirm_omissions: Boolean(confirmOmissions) }),
    'submit count',
  );
}

export async function cancelSession(sessionId) {
  assertOk(await itemsure.rpc('cancel_count_session', { p_session_id: sessionId }), 'cancel count');
}