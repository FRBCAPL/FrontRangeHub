import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

/** Archives (hides) or restores a category. Nothing is deleted; its history stays. */
export async function setCategoryActive(organizationId, categoryId, active) {
  const result = await itemsure
    .from('inventory_categories')
    .update({ is_active: active })
    .eq('id', categoryId)
    .eq('organization_id', organizationId)
    .select('id');
  if (!assertOk(result, active ? 'restore category' : 'archive category')?.length) {
    throw new Error('You do not have permission to change categories.');
  }
}

/** Saves a new order: `changes` is [{ id, sort_order }] from orderChanges(). */
export async function saveCategoryOrder(organizationId, changes) {
  for (const change of changes) {
    const result = await itemsure
      .from('inventory_categories')
      .update({ sort_order: change.sort_order })
      .eq('id', change.id)
      .eq('organization_id', organizationId)
      .select('id');
    if (!assertOk(result, 'save category order')?.length) throw new Error('You do not have permission to change categories.');
  }
}

/** Gives several items a new main category (null = no category). Returns how many moved. */
export async function moveItemsToCategory(organizationId, itemIds, categoryId) {
  if (!itemIds.length) return 0;
  const result = await itemsure
    .from('inventory_items')
    .update({ category_id: categoryId || null })
    .in('id', itemIds)
    .eq('organization_id', organizationId)
    .select('id');
  const moved = assertOk(result, 'move items')?.length || 0;
  if (moved < itemIds.length) throw new Error(moved ? `Only ${moved} of ${itemIds.length} items could be moved.` : 'You do not have permission to change these items.');
  return moved;
}
