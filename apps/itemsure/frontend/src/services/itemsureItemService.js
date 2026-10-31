import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { optionalText, requiredText } from '../utils/itemsureText.js';
import { categoryPath, categoryTree } from '../utils/itemsureCategories.js';
import { unitCode } from '../utils/itemsureUnits.js';
import { listExtraCategories } from './itemsureExtraCategoryService.js';
import { listItemDetails } from './itemsureItemDetailsService.js';
import { listCategoryIcons } from './itemsureCategoryIconService.js';

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

export async function listCatalog(organizationId) {
  const [items, categories, units, extras, details, icons] = await Promise.all([
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
    listExtraCategories(organizationId),
    listItemDetails(organizationId),
    listCategoryIcons(organizationId),
  ]);

  const categoryRows = (assertOk(categories, 'categories') || []).map((c) => ({ ...c, icon: icons?.get(c.id) || '' }));
  const tree = categoryTree(categoryRows);
  return {
    items: (assertOk(items, 'items') || []).map((item) => ({
      ...item,
      categoryName: categoryPath(tree, item.category_id) || one(item.inventory_categories)?.name || '',
      unitName: one(item.units_of_measure)?.name || '',
      extraCategoryIds: extras?.get(item.id) || [],
      brand: details?.get(item.id)?.brand || '',
      variant: details?.get(item.id)?.variant || '',
    })),
    categories: categoryRows,
    units: assertOk(units, 'units') || [],
    extrasAvailable: extras !== null,
    detailsAvailable: details !== null,
    iconsAvailable: icons !== null,
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

/** Rename a category, or move it: into a main category (`parentId`) or out to be a main one (null). */
export async function updateCategory(organizationId, categoryId, name, parentId = null) {
  const clean = requiredText(name, 'category name', 80);
  const result = await itemsure
    .from('inventory_categories')
    .update({ name: clean, parent_category_id: parentId || null })
    .eq('id', categoryId)
    .eq('organization_id', organizationId)
    .select('id')
    .single();
  if (result.error?.code === '23505') {
    throw new Error(parentId ? `There is already a "${clean}" in that category.` : `There is already a category called "${clean}".`);
  }
  assertOk(result, 'update category');
}

/** A unit only this business uses, e.g. "Keg". Allows parts (2 decimals) unless `decimals` is false. */
export async function createUnit(organizationId, { name, symbol, decimals = true }) {
  const clean = requiredText(name, 'unit name', 80);
  const code = unitCode(clean);
  if (!code) throw new Error('Use at least one letter or number in the unit name.');
  const row = {
    organization_id: organizationId,
    code,
    name: clean,
    symbol: optionalText(symbol, 'short name', 16),
    measurement_kind: 'custom',
    precision_scale: decimals ? 2 : 0,
  };
  const result = await itemsure.from('units_of_measure').insert(row)
    .select('id, code, name, symbol, measurement_kind, precision_scale, organization_id').single();
  if (result.error?.code === '23505') throw new Error(`You already have a unit called "${clean}".`);
  return assertOk(result, 'create unit');
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
  // Only present once brand and details are set up and switched on.
  if ('brand' in form) fields.brand = optionalText(form.brand, 'brand', 80);
  if ('variant' in form) fields.variant = optionalText(form.variant, 'detail', 80);
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

/** Renames an archived item to "<name> (archived N)" so a new item can use its name. Returns the new name. */
export async function renameArchivedItem(itemId) {
  return assertOk(await itemsure.rpc('rename_archived_item', { p_item_id: itemId }), 'rename archived item');
}

export async function setItemActive(organizationId, itemId, isActive) {
  const data = assertOk(
    await itemsure.from('inventory_items').update({ is_active: isActive }).eq('id', itemId).eq('organization_id', organizationId).select('id'),
    'update item',
  );
  if (!data?.length) throw new Error('You do not have permission to change this item.');
}
