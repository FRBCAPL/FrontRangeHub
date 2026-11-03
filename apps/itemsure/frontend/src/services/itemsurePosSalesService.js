import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Sales vs counts report: approved counts to compare, what counts say was used, and Clover
// sales between them. Read only; nothing here changes stock.

const PROVIDER = 'clover';
const PAGE = 1000;

/** Approved counts, newest first: [{ id, name, locationId, at }]. */
export async function listApprovedCounts(organizationId) {
  const rows = assertOk(
    await itemsure.from('count_reviews')
      .select('session_id, decided_at, count_sessions(name, location_id, submitted_at)')
      .eq('organization_id', organizationId).eq('decision', 'approved')
      .order('decided_at', { ascending: false }).limit(200),
    'approved counts',
  ) || [];
  return rows.map((r) => {
    const s = Array.isArray(r.count_sessions) ? r.count_sessions[0] : r.count_sessions;
    return { id: r.session_id, name: s?.name || 'Count', locationId: s?.location_id, at: s?.submitted_at || r.decided_at, decidedAt: r.decided_at };
  }).filter((c) => c.locationId);
}

/**
 * What counts say was used at a site, spot by spot, between the counts up to `fromAt` and the
 * later counts up to `toAt` (see itemsure.pos_site_usage). { missing } until that update is applied.
 */
export async function siteUsage(locationId, fromAt, toAt) {
  const { data, error } = await itemsure.rpc('pos_site_usage', { p_location: locationId, p_from: fromAt, p_to: toAt });
  if (error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''))) return { missing: true, rows: [] };
  return { missing: false, rows: assertOk({ data, error }, 'compare the counts') || [] };
}

/** Hourly Clover sales rows [{ external_id, hour_start, quantity }] for hours starting after `after` and up to `upTo`. */
export async function salesHours(organizationId, after, upTo) {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const rows = assertOk(
      await itemsure.from('pos_sales_hourly').select('external_id, hour_start, quantity')
        .eq('organization_id', organizationId).eq('provider', PROVIDER)
        .gt('hour_start', after).lte('hour_start', upTo)
        .order('hour_start').order('external_id').range(from, from + PAGE - 1),
      'Clover sales',
    ) || [];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

/** Recent "bring in sales" runs, newest first. */
export async function listSalesSyncs(organizationId) {
  return assertOk(
    await itemsure.from('pos_sales_syncs').select('from_at, to_at, synced_at')
      .eq('organization_id', organizationId).eq('provider', PROVIDER)
      .order('synced_at', { ascending: false }).limit(50),
    'sales updates',
  ) || [];
}
