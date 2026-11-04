import itemsure from './itemsureClient.js';
import { listItemPieces } from './itemsureItemContentService.js';
import { listCategoryDefaults } from './itemsureCategoryDefaultService.js';
import { categoryPieces } from '../utils/itemsureCategoryDefaults.js';
import { isGroupUnit } from '../utils/itemsureCategoryKind.js';

/**
 * Map of item id -> how many are sold out of one case, for items counted in a case-type unit
 * (the item's own number, else its category's). Empty when nothing is set up or the database
 * updates aren't applied; loose counting then simply doesn't show.
 */
export async function listLoosePieces(organizationId) {
  const [own, defaults, items, categories, units] = await Promise.all([
    listItemPieces(organizationId),
    listCategoryDefaults(organizationId),
    itemsure.from('inventory_items').select('id, category_id, base_unit_id').eq('organization_id', organizationId),
    itemsure.from('inventory_categories').select('id, name, parent_category_id').eq('organization_id', organizationId),
    itemsure.from('units_of_measure').select('id, code, name').or(`organization_id.is.null,organization_id.eq.${organizationId}`),
  ]);
  const out = new Map();
  if (own === null || items.error || units.error) return out;
  const unitsById = new Map((units.data || []).map((u) => [u.id, u]));
  const categoriesById = new Map((categories.data || []).map((c) => [c.id, c]));
  for (const item of items.data || []) {
    if (!isGroupUnit(unitsById.get(item.base_unit_id))) continue;
    const pieces = own.get(item.id) ?? categoryPieces(item, categoriesById, defaults)?.pieces ?? null;
    if (pieces > 0) out.set(item.id, pieces);
  }
  return out;
}
