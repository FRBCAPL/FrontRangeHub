import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Extra categories ("Also find it under"). Only for finding items: counts, warning
// levels, and restock use the main category alone.

/** Map of item id -> [category id], or null when the database update isn't applied yet. */
export async function listExtraCategories(organizationId) {
  const { data, error } = await itemsure
    .from('item_extra_categories')
    .select('item_id, category_id')
    .eq('organization_id', organizationId);
  if (error) return null;
  const byItem = new Map();
  for (const row of data || []) byItem.set(row.item_id, [...(byItem.get(row.item_id) || []), row.category_id]);
  return byItem;
}

/** Makes the item's extra categories exactly `wanted`, reading what is saved now so a retry is safe. */
export async function saveExtraCategories(organizationId, itemId, wanted) {
  const saved = assertOk(
    await itemsure.from('item_extra_categories').select('category_id').eq('item_id', itemId),
    'extra categories',
  ) || [];
  const have = new Set(saved.map((r) => r.category_id));
  const want = new Set(wanted);
  const add = [...want].filter((id) => !have.has(id));
  const drop = [...have].filter((id) => !want.has(id));
  if (add.length) {
    assertOk(
      await itemsure.from('item_extra_categories').insert(add.map((categoryId) => ({ organization_id: organizationId, item_id: itemId, category_id: categoryId }))),
      'add extra categories',
    );
  }
  if (drop.length) {
    assertOk(
      await itemsure.from('item_extra_categories').delete().eq('item_id', itemId).in('category_id', drop),
      'remove extra categories',
    );
  }
}
