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

export async function listRecentActivity(organizationId, limit = 8) {
  const { data, error } = await itemsure
    .from('audit_events')
    .select('id, action, metadata, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map((row) => ({
    id: row.id,
    label: describeAudit(row.action, typeof row.metadata?.name === 'string' ? row.metadata.name : null),
    createdAt: row.created_at,
  }));
}
