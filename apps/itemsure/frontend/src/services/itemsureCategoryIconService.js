import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

/**
 * Each category's icon: Map(categoryId -> icon), or null until that database update
 * is applied. Kept apart so categories still load without it.
 */
export async function listCategoryIcons(organizationId) {
  const { data, error } = await itemsure.from('inventory_categories').select('id, icon').eq('organization_id', organizationId);
  if (error) return null;
  return new Map((data || []).filter((row) => row.icon).map((row) => [row.id, row.icon]));
}

/** Sets or clears ('' / null) a category's icon. */
export async function saveCategoryIcon(organizationId, categoryId, icon) {
  const result = await itemsure
    .from('inventory_categories')
    .update({ icon: icon || null })
    .eq('id', categoryId)
    .eq('organization_id', organizationId)
    .select('id')
    .single();
  assertOk(result, 'save category icon');
}
