import itemsure from './itemsureClient.js';

/**
 * Each item's "Top off at" percent: Map(itemId -> percent) for items that set one,
 * or null until that database update is applied (then every item uses the default).
 */
export async function listTopOffPercents(organizationId) {
  const { data, error } = await itemsure
    .from('inventory_items')
    .select('id, topoff_percent')
    .eq('organization_id', organizationId)
    .not('topoff_percent', 'is', null);
  if (error) return null;
  return new Map((data || []).map((row) => [row.id, row.topoff_percent]));
}
