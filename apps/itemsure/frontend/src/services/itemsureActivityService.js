import itemsure from './itemsureClient.js';
import { describeAudit } from '../utils/itemsureText.js';

async function countActive(table, organizationId) {
  const { count, error } = await itemsure
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  return error ? null : count ?? 0;
}

export async function loadDashboardCounts(organizationId) {
  const [locations, items, storageAreas] = await Promise.all([
    countActive('locations', organizationId),
    countActive('inventory_items', organizationId),
    countActive('inventory_storage_areas', organizationId),
  ]);
  return { locations, items, storageAreas };
}

async function hasAny(table, organizationId) {
  const { count, error } = await itemsure
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .limit(1);
  return error ? null : (count ?? 0) > 0;
}

/** For the getting-started checklist: has any amount, and any warning level, been set yet. */
export async function loadSetupProgress(organizationId) {
  const [amounts, levels] = await Promise.all([
    hasAny('inventory_balances', organizationId),
    hasAny('inventory_targets', organizationId),
  ]);
  return { amounts, levels };
}

/** Newest audit events first; `entities` (audit table names) limits it to one kind of history. */
export async function listRecentActivity(organizationId, limit = 8, offset = 0, entities = null) {
  let query = itemsure
    .from('audit_events')
    .select('id, action, metadata, created_at')
    .eq('organization_id', organizationId);
  if (entities?.length) query = query.or(entities.map((e) => `action.like.${e}.*`).join(','));
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return [];
  return (data || []).map((row) => ({
    id: row.id,
    label: describeAudit(row.action, typeof row.metadata?.name === 'string' ? row.metadata.name : null),
    createdAt: row.created_at,
  }));
}
