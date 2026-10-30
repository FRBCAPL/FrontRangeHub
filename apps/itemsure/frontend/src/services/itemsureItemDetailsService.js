import itemsure from './itemsureClient.js';

/**
 * Each item's brand and second detail: Map(itemId -> { brand, variant }), or null
 * until that database update is applied. Kept apart so the item list still loads without it.
 */
export async function listItemDetails(organizationId) {
  const { data, error } = await itemsure.from('inventory_items').select('id, brand, variant').eq('organization_id', organizationId);
  if (error) return null;
  return new Map((data || []).map((row) => [row.id, { brand: row.brand || '', variant: row.variant || '' }]));
}
