import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { optionalText, requiredText } from '../utils/itemsureText.js';

const COLUMNS = 'id, name, contact_name, phone, email, website, account_number, notes, is_active';

/** True when the suppliers table has not been added to the database yet. */
const tableMissing = (error) => error?.code === '42P01' || error?.code === 'PGRST205' || /suppliers.*(schema cache|does not exist)/i.test(error?.message || '');

/**
 * Each supplier's icon: Map(supplierId -> icon), or null until the supplier icon database
 * update is applied. Kept apart so suppliers still load without it.
 */
async function listSupplierIcons(organizationId) {
  const { data, error } = await itemsure.from('suppliers').select('id, icon').eq('organization_id', organizationId);
  if (error) return null;
  return new Map((data || []).filter((row) => row.icon).map((row) => [row.id, row.icon]));
}

/**
 * { suppliers, missing, iconsAvailable }: missing is true until the suppliers database update
 * is applied; each supplier has `icon` ('' when none or not available yet).
 */
export async function listSuppliers(organizationId) {
  const [result, icons] = await Promise.all([
    itemsure.from('suppliers').select(COLUMNS).eq('organization_id', organizationId).order('name'),
    listSupplierIcons(organizationId),
  ]);
  if (tableMissing(result.error)) return { suppliers: [], missing: true, iconsAvailable: false };
  const suppliers = (assertOk(result, 'suppliers') || []).map((s) => ({ ...s, icon: icons?.get(s.id) || '' }));
  return { suppliers, missing: false, iconsAvailable: icons !== null };
}

/** Sets or clears ('' / null) a supplier's icon. */
export async function saveSupplierIcon(organizationId, supplierId, icon) {
  const data = assertOk(
    await itemsure.from('suppliers').update({ icon: icon || null }).eq('id', supplierId).eq('organization_id', organizationId).select('id'),
    'save supplier icon',
  );
  if (!data?.length) throw new Error('You do not have permission to change this supplier.');
}

/**
 * Each item's main supplier: Map(itemId -> supplierId|null), or null until the
 * item-supplier database update is applied. Kept apart from the item list so the
 * rest of the app works without it.
 */
export async function listItemSuppliers(organizationId) {
  const result = await itemsure.from('inventory_items').select('id, supplier_id').eq('organization_id', organizationId);
  if (result.error) return null;
  return new Map((result.data || []).map((row) => [row.id, row.supplier_id || null]));
}

/**
 * Items whose main supplier is this one, then items it also sells (`also: true`), archived
 * included, each by name. The "also" part is skipped until that database update is applied.
 */
export async function listSupplierItems(organizationId, supplierId) {
  const main = assertOk(
    await itemsure.from('inventory_items').select('id, name, is_active').eq('organization_id', organizationId).eq('supplier_id', supplierId).order('name'),
    'supplier items',
  ) || [];
  const links = await itemsure.from('item_suppliers').select('item_id').eq('organization_id', organizationId).eq('supplier_id', supplierId);
  const mainIds = new Set(main.map((i) => i.id));
  const otherIds = (links.error ? [] : links.data || []).map((r) => r.item_id).filter((id) => !mainIds.has(id));
  if (!otherIds.length) return main;
  const others = assertOk(
    await itemsure.from('inventory_items').select('id, name, is_active').eq('organization_id', organizationId).in('id', otherIds).order('name'),
    'supplier items',
  ) || [];
  return [...main, ...others.map((i) => ({ ...i, also: true }))];
}

function supplierFields(form) {
  const email = optionalText(form.email, 'email', 254) || '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Check the email address.');
  return {
    name: requiredText(form.name, 'supplier name', 120),
    contact_name: optionalText(form.contact_name, 'contact name', 120) || '',
    phone: optionalText(form.phone, 'phone number', 40) || '',
    email,
    website: optionalText(form.website, 'website', 300) || '',
    account_number: optionalText(form.account_number, 'account number', 80) || '',
    notes: optionalText(form.notes, 'notes', 2000) || '',
  };
}

const duplicateName = (result) => {
  if (result?.error?.code === '23505') throw new Error('You already have a supplier with that name. It may be archived; check "Show archived".');
  return result;
};

/** Returns the new supplier's id. */
export async function createSupplier(organizationId, form) {
  const row = { organization_id: organizationId, ...supplierFields(form) };
  return assertOk(duplicateName(await itemsure.from('suppliers').insert(row).select('id').single()), 'create supplier').id;
}

export async function updateSupplier(organizationId, supplierId, form) {
  const data = assertOk(
    duplicateName(await itemsure.from('suppliers').update(supplierFields(form)).eq('id', supplierId).eq('organization_id', organizationId).select('id')),
    'update supplier',
  );
  if (!data?.length) throw new Error('You do not have permission to change this supplier.');
}

export async function setSupplierActive(organizationId, supplierId, isActive) {
  const data = assertOk(
    await itemsure.from('suppliers').update({ is_active: isActive }).eq('id', supplierId).eq('organization_id', organizationId).select('id'),
    'update supplier',
  );
  if (!data?.length) throw new Error('You do not have permission to change this supplier.');
}
