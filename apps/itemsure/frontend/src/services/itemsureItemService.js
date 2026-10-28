import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { optionalText, requiredText } from '../utils/itemsureText.js';

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

export async function listCatalog(organizationId) {
  const [items, categories, units] = await Promise.all([
    itemsure
      .from('inventory_items')
      .select('id, name, description, sku, barcode, is_active, category_id, base_unit_id, inventory_categories(name), units_of_measure(name, symbol)')
      .eq('organization_id', organizationId)
      .order('name'),
    itemsure
      .from('inventory_categories')
      .select('id, name, is_active')
      .eq('organization_id', organizationId)
      .order('name'),
    itemsure
      .from('units_of_measure')
      .select('id, code, name, symbol, measurement_kind, organization_id')
      .eq('is_active', true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order('name'),
  ]);

  return {
    items: (assertOk(items, 'items') || []).map((item) => ({
      ...item,
      categoryName: one(item.inventory_categories)?.name || '',
      unitName: one(item.units_of_measure)?.name || '',
    })),
    categories: assertOk(categories, 'categories') || [],
    units: assertOk(units, 'units') || [],
  };
}

export async function createCategory(organizationId, name) {
  const clean = requiredText(name, 'category name', 80);
  const data = assertOk(
    await itemsure.from('inventory_categories').insert({ organization_id: organizationId, name: clean }).select('id').single(),
    'create category',
  );
  return data.id;
}

async function itemFields(organizationId, form, canManageCategories) {
  const name = requiredText(form.name, 'item name', 160);
  if (!form.base_unit_id) throw new Error('Choose a unit of measure.');

  let categoryId = form.category_id || null;
  const newCategory = String(form.new_category || '').trim();
  if (newCategory) {
    if (!canManageCategories) throw new Error('You do not have permission to add categories.');
    categoryId = await createCategory(organizationId, newCategory);
  }

  return {
    name,
    description: optionalText(form.description, 'description', 4000) || '',
    sku: optionalText(form.sku, 'SKU', 64),
    barcode: optionalText(form.barcode, 'barcode', 64),
    base_unit_id: form.base_unit_id,
    category_id: categoryId,
  };
}

export async function createItem(organizationId, form, { canManageCategories }) {
  const row = { organization_id: organizationId, ...(await itemFields(organizationId, form, canManageCategories)) };
  return assertOk(await itemsure.from('inventory_items').insert(row).select('id').single(), 'create item').id;
}

/** The unit is only sent when it changed; the database refuses it once the item has stock history or levels. */
export async function updateItem(organizationId, item, form, { canManageCategories }) {
  const fields = await itemFields(organizationId, form, canManageCategories);
  if (fields.base_unit_id === item.base_unit_id) delete fields.base_unit_id;
  const data = assertOk(
    await itemsure.from('inventory_items').update(fields).eq('id', item.id).eq('organization_id', organizationId).select('id'),
    'update item',
  );
  if (!data?.length) throw new Error('You do not have permission to change this item.');
}

export async function setItemActive(organizationId, itemId, isActive) {
  const data = assertOk(
    await itemsure.from('inventory_items').update({ is_active: isActive }).eq('id', itemId).eq('organization_id', organizationId).select('id'),
    'update item',
  );
  if (!data?.length) throw new Error('You do not have permission to change this item.');
}
