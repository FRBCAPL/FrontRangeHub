import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { canonicalQuantity } from '../utils/itemsureQuantity.js';
import { checkPackageSize } from '../utils/itemsurePackages.js';
import { optionalText, requiredText } from '../utils/itemsureText.js';

const COLUMNS = 'id, item_id, name, size_text:contains_base_quantity::text, sku, barcode, is_active, is_purchase_unit, updated_at';

/** Every packaging size in the organization, archived ones included. */
export async function listPackages(organizationId) {
  const rows =
    assertOk(await itemsure.from('item_unit_relationships').select(COLUMNS).eq('organization_id', organizationId).order('name'), 'packaging') || [];
  return rows.map(({ size_text: sizeText, ...row }) => ({ ...row, size: canonicalQuantity(sizeText) }));
}

/** Adds (pkg null) or edits a package. The database checks everything again. */
export async function savePackage(item, pkg, form) {
  const size = checkPackageSize(form.size, item.unitName, item.precision);
  if (size.error) throw new Error(size.error);
  return assertOk(
    await itemsure.rpc('save_item_package', {
      p_item_id: item.id,
      p_package_id: pkg?.id || null,
      p_name: requiredText(form.name, 'package name', 80),
      p_base_quantity: size.value,
      p_sku: optionalText(form.sku, 'SKU', 64),
      p_barcode: optionalText(form.barcode, 'barcode', 64),
      p_is_default: Boolean(form.isDefault),
      p_expected_updated_at: pkg?.updated_at || null,
    }),
    'save package',
  );
}

export async function setPackageActive(packageId, active) {
  assertOk(await itemsure.rpc('set_item_package_active', { p_package_id: packageId, p_active: active }), 'update package');
}

/** Package details recorded with stock movements, keyed by movement id. */
export async function listMovementPackages(movementIds) {
  if (!movementIds.length) return {};
  const rows =
    assertOk(
      await itemsure
        .from('inventory_movement_packages')
        .select('movement_id, package_name, package_quantity_text:package_quantity::text, base_per_package_text:base_per_package::text')
        .in('movement_id', movementIds),
      'movement packages',
    ) || [];
  return Object.fromEntries(rows.map((r) => [r.movement_id, r]));
}
