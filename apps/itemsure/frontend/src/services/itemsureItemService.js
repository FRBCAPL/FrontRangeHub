import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { optionalText, requiredText } from '../utils/itemsureText.js';
import { categoryPath, categoryTree } from '../utils/itemsureCategories.js';

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
      .select('id, name, is_active, parent_category_id')
      .eq('organization_id', organizationId)
      .order('name'),
    itemsure
      .from('units_of_measure')
      .select('id, code, name, symbol, measurement_kind, precision_scale, organization_id')
      .eq('is_active', true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order('name'),
  ]);

  const categoryRows = assertOk(categories, 'categories') || [];
  const tree = categoryTree(categoryRows);
  return {
    items: (assertOk(items, 'items') || []).map((item) => ({
      ...item,
      categoryName: categoryPath(tree, item.category_id) || one(item.inventory_categories)?.name || '',
      unitName: one(item.units_of_measure)?.name || '',
    })),
    categories: categoryRows,
    units: assertOk(units, 'units') || [],
  };
}

/** `parentId` makes it a subcategory ("Rum" inside "Liquor"). */
export async function createCategory(organizationId, name, parentId = null) {
  const clean = requiredText(name, 'category name', 80);
  const row = { organization_id: organizationId, name: clean, parent_category_id: parentId || null };
  const result = await itemsure.from('inventory_categories').insert(row).select('id').single();
  if (result.error?.code === '23505') {
    throw new Error(parentId ? `There is already a "${clean}" in that category.` : `There is already a category called "${clean}".`);
  }
  return assertOk(result, 'create category').id;
}

function itemFields(form) {
  const name = requiredText(form.name, 'item name', 160);
  if (!form.base_unit_id) throw new Error('Choose a unit of measure.');

  const categoryId = form.category_id || null;

  const fields = {
    name,
    description: optionalText(form.description, 'description', 4000) || '',
    sku: optionalText(form.sku, 'SKU', 64),
    barcode: optionalText(form.barcode, 'barcode', 64),
    base_unit_id: form.base_unit_id,
    category_id: categoryId,
  };
  // Only present once the item-supplier database update is applied (see useSuppliers).
  if ('supplier_id' in form) fields.supplier_id = form.supplier_id || null;
  return fields;
}

/** New categories are saved on their own first (see ItemsureCategoryPicker); the item only links one. */
export async function createItem(organizationId, form) {
  const row = { organization_id: organizationId, ...itemFields(form) };
  return assertOk(await itemsure.from('inventory_items').insert(row).select('id').single(), 'create item').id;
}

/** The unit is only sent when it changed; the database refuses it once the item has stock history or levels. */
export async function updateItem(organizationId, item, form) {
  const fields = itemFields(form);
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
