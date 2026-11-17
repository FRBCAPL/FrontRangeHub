// What "Fix it" still needs for one sales row: amounts, size/pieces, unset add-ons.
import { asksContent, unitAsks } from './itemsureItemContent.js';
import { isGroupUnit } from './itemsureCategoryKind.js';

/**
 * Size/pieces row for Fix it when the report can't convert this item, even if the setup
 * list didn't flag it (common with Doubles / add-ons).
 * `contents` / `pieces` are the Maps used for sales (own + category fill-ins).
 * `needContent`: sales/add-ons still need oz→stock conversion (e.g. counted in "each").
 * `needPieces`: a piece/pack pour still needs "how many in one".
 * Case/pack items never ask for ounces — only pack count, and only when missing.
 */
export function forcedSizeRow({
  itemId, items, units, contents, pieces, needContent = false, needPieces = false,
}) {
  const item = (items || []).find((i) => i.id === itemId);
  if (!item) return null;
  const unit = (units || []).find((u) => u.id === item.base_unit_id) || null;
  const asks = unitAsks(unit);
  const group = isGroupUnit(unit);

  // Cases/packs: how many singles in one — never "ounces in a case".
  if (group || asks === 'pieces' || needPieces) {
    if (!(pieces?.get(itemId) > 0)) return { item, unit, need: 'pieces' };
    return null;
  }

  // unitAsks only covers bottle-like units; sales also need size for "each"/etc. when pours are oz/ml.
  const wantsSize = asks === 'size' || (needContent && asksContent(unit?.code));
  if (wantsSize && !(contents?.get(itemId) > 0)) {
    return { item, unit, need: 'size' };
  }
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

/**
 * Honest finish: only claim "all set" when setup has no leftover amounts/sizes for this
 * item and the sales row (if provided) looks complete. Stale "Finished" is worse than
 * "close and check".
 */
export function fixItCanClaimDone({ amountsLeft = 0, sizesLeft = 0, gapLeft = null, sizeSkipped = false, issue = null }) {
  if (amountsLeft > 0 || sizesLeft > 0 || gapLeft || sizeSkipped) return false;
  if (issue && !issue.complete) return false;
  return true;
}
