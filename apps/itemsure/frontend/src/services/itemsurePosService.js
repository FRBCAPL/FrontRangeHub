import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Point-of-sale (Clover) connection and item matching. The Clover token only ever goes
// to the itemsure-clover Edge Function; nothing here can read it back.

const PROVIDER = 'clover';
const FUNCTION = 'itemsure-clover';

/** The business's Clover connection: { missing } until the database update is applied, else { connection|null }. */
export async function getPosConnection(organizationId) {
  const query = (columns) => itemsure.from('pos_connections').select(columns)
    .eq('organization_id', organizationId).eq('provider', PROVIDER).maybeSingle();
  const base = 'id, environment, merchant_id, merchant_name, status, last_error, items_synced_at, created_at';
  const withSite = await query(`${base}, location_id`);
  if (!withSite.error) return { missing: false, salesReady: true, connection: withSite.data || null };
  const { data, error } = await query(base);
  if (error) return { missing: true, salesReady: false, connection: null };
  return { missing: false, salesReady: false, connection: data || null };
}

/** Calls the Edge Function; throws its plain-language message when it says no. */
async function callClover(organizationId, action, extra = {}) {
  const { data, error } = await itemsure.functions.invoke(FUNCTION, { body: { action, organizationId, ...extra } });
  if (!error) return data;
  let message = '';
  try {
    message = (await error.context?.json())?.error || '';
  } catch {
    message = '';
  }
  if (message === 'Unknown action.') {
    message = 'The Clover connection service needs updating (deploy the itemsure-clover function again).';
  }
  if (!message && /failed to send|not found|404/i.test(error.message || '')) {
    message = 'The Clover connection service is not set up yet (the itemsure-clover function needs deploying).';
  }
  throw new Error(message || 'Could not reach the Clover connection service. Try again.');
}

export const connectClover = (organizationId, { environment, merchantId, token }) =>
  callClover(organizationId, 'connect', { environment, merchantId: merchantId.trim(), token: token.trim() });
export const checkClover = (organizationId) => callClover(organizationId, 'check');
export const disconnectClover = (organizationId) => callClover(organizationId, 'disconnect');
/** Copies Clover's items in again. Returns { count, removed }. */
export const syncCloverItems = (organizationId) => callClover(organizationId, 'sync_items');
/** Brings in Clover sales for whole hours covering from..to (ISO). Returns { from, to, orders, lines }. */
export const syncCloverSales = (organizationId, from, to) => callClover(organizationId, 'sync_sales', { from, to });
/** The site Clover's sales come out of (null clears it). */
export const setCloverLocation = (organizationId, locationId) => callClover(organizationId, 'set_location', { locationId: locationId || null });

/** Clover items, by name, removed ones included (they may still be matched). */
export async function listPosItems(organizationId) {
  return assertOk(
    await itemsure
      .from('pos_items')
      .select('external_id, name, sku, code, price_cents, price_type, category_name, is_hidden, is_deleted')
      .eq('organization_id', organizationId)
      .eq('provider', PROVIDER)
      .order('name'),
    'Clover items',
  ) || [];
}

/** Map of Clover item id -> [ItemSure item id], first matched first (that one is the main match). */
export async function listPosLinks(organizationId) {
  const rows = assertOk(
    await itemsure.from('pos_item_links').select('external_id, item_id')
      .eq('organization_id', organizationId).eq('provider', PROVIDER).order('created_at').order('id'),
    'matches',
  ) || [];
  const byPos = new Map();
  for (const r of rows) byPos.set(r.external_id, [...(byPos.get(r.external_id) || []), r.item_id]);
  return byPos;
}

/** Matches a Clover item to an ItemSure item. Already matched is fine, so a retry is safe. */
export async function addPosLink(organizationId, externalId, itemId) {
  const { error } = await itemsure
    .from('pos_item_links')
    .insert({ organization_id: organizationId, provider: PROVIDER, external_id: externalId, item_id: itemId });
  if (error && error.code !== '23505') assertOk({ error }, 'match the item');
}

/**
 * How much one sale uses, per match: Map of "cloverId|itemId" -> { amount, unit }.
 * null until the database update that adds pour amounts is applied.
 */
export async function listPosPours(organizationId) {
  const { data, error } = await itemsure.from('pos_item_links').select('external_id, item_id, uses_amount, uses_unit')
    .eq('organization_id', organizationId).eq('provider', PROVIDER);
  if (error) return null;
  const map = new Map();
  for (const r of data || []) {
    if (r.uses_amount != null) map.set(`${r.external_id}|${r.item_id}`, { amount: Number(r.uses_amount), unit: r.uses_unit });
  }
  return map;
}

/** Saves (or clears, with a null amount) how much one sale uses. unit: 'fl_oz' | 'ml' | 'base'. */
export async function setPosPour(organizationId, externalId, itemId, amount, unit) {
  const clear = amount == null;
  assertOk(
    await itemsure.from('pos_item_links')
      .update({ uses_amount: clear ? null : amount, uses_unit: clear ? null : unit })
      .eq('organization_id', organizationId).eq('provider', PROVIDER).eq('external_id', externalId).eq('item_id', itemId),
    'save the amount',
  );
}

export { listItemContents, saveItemContent } from './itemsureItemContentService.js';

export async function removePosLink(organizationId, externalId, itemId) {
  assertOk(
    await itemsure.from('pos_item_links').delete()
      .eq('organization_id', organizationId).eq('provider', PROVIDER).eq('external_id', externalId).eq('item_id', itemId),
    'remove the match',
  );
}
