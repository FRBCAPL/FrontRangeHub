import { contentForm } from './itemsureItemContent.js';

/** ?supplier=<id> (from a supplier card) pre-selects it for a new item, if it is an active supplier. */
export const startingSupplier = (suppliers, wanted) =>
  (wanted && suppliers.suppliers.some((s) => s.id === wanted && s.is_active) ? wanted : '');

/**
 * Starting values for Add / Edit item. Optional columns are only included when that
 * feature exists in the database (and, for brand/style, when the org has it on).
 */
export function emptyForm(item, units, suppliers, extrasAvailable, wantedSupplier, detailsOn, topOffAvailable, contentsAvailable, piecesAvailable) {
  return {
    name: item?.name || '',
    description: item?.description || '',
    sku: item?.sku || '',
    barcode: item?.barcode || '',
    category_id: item?.category_id || '',
    base_unit_id: item?.base_unit_id || units.find((u) => u.code === 'each' && !u.organization_id)?.id || units[0]?.id || '',
    ...(suppliers.available
      ? { supplier_id: item ? suppliers.supplierIdFor(item.id) || '' : startingSupplier(suppliers, wantedSupplier) }
      : {}),
    ...(suppliers.othersAvailable ? { other_supplier_ids: item ? suppliers.otherIdsFor(item.id) : [] } : {}),
    ...(extrasAvailable ? { extra_category_ids: item?.extraCategoryIds || [] } : {}),
    ...(detailsOn ? { brand: item?.brand || '', variant: item?.variant || '' } : {}),
    ...(topOffAvailable ? { topoff_percent: item?.topoffPercent ? String(item.topoffPercent) : '' } : {}),
    ...(contentsAvailable ? contentForm(item?.contentMl) : {}),
    ...(piecesAvailable ? {
      pieces: item?.pieces != null ? String(item.pieces) : '',
      piece_label: item?.pieceLabel || '',
    } : {}),
  };
}
