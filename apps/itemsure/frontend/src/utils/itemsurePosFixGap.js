// What "Fix it" still needs for one sales row: amounts, size/pieces, unset add-ons.
import { unitAsks } from './itemsureItemContent.js';

/**
 * Size/pieces row for Fix it when the report can't convert this item, even if the setup
 * list didn't flag it (common with Doubles / add-ons).
 * `contents` / `pieces` are the Maps used for sales (own + category fill-ins).
 */
export function forcedSizeRow({ itemId, items, units, contents, pieces }) {
  const item = (items || []).find((i) => i.id === itemId);
  if (!item) return null;
  const unit = (units || []).find((u) => u.id === item.base_unit_id) || null;
  const asks = unitAsks(unit);
  if (asks === 'size' && !(contents?.get(itemId) > 0)) return { item, unit, need: 'size' };
  if (asks === 'pieces' && !(pieces?.get(itemId) > 0)) return { item, unit, need: 'pieces' };
  return null;
}

/** Plain label for why a sales row still can't compare. */
export function salesGapLabel(row) {
  if (!row) return '';
  if (row.missingPour?.length) return 'Amount per sale not set';
  if (row.missingContent && row.modifiers?.length) return 'Needs size (or pack count) for add-ons';
  if (row.missingContent) return 'Size or pack count not set';
  return '';
}
