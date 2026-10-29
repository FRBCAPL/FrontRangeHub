// Minimum and par levels. Quantities stay strings; comparisons are done on the
// decimal text so nothing is rounded through floats.
import { canonicalQuantity, checkQuantity } from './itemsureQuantity.js';

export const TARGET_STATUS = {
  low: { label: 'Running low', tone: 'danger' },
  below_par: { label: 'Needs topping up', tone: 'warn' },
  at_target: { label: 'Full', tone: 'ok' },
  above_target: { label: 'More than full', tone: 'ok' },
  above_minimum: { label: 'OK', tone: 'ok' },
  not_set_up: { label: 'No amount yet', tone: 'muted' },
};

export function targetKey(itemId, locationId, storageAreaId) {
  return `${itemId}|${locationId}|${storageAreaId || ''}`;
}

/** -1, 0, or 1 comparing two non-negative decimal strings. */
export function compareQuantity(a, b) {
  const [aw, af = ''] = canonicalQuantity(a).split('.');
  const [bw, bf = ''] = canonicalQuantity(b).split('.');
  if (aw.length !== bw.length) return aw.length < bw.length ? -1 : 1;
  if (aw !== bw) return aw < bw ? -1 : 1;
  const width = Math.max(af.length, bf.length);
  const ap = af.padEnd(width, '0');
  const bp = bf.padEnd(width, '0');
  if (ap === bp) return 0;
  return ap < bp ? -1 : 1;
}

/**
 * Checks one edited row. Blank means "unset". Returns
 * { minimum, par } (strings or null) or { error }.
 */
export function validateTargetEdit(edit, precision, unitName) {
  const parsed = {};
  for (const [field, label] of [['minimum', 'Warn me at'], ['par', 'Fill up to']]) {
    const result = checkQuantity(edit?.[field], precision, unitName);
    if (result.error) return { error: `${label}: ${result.error}` };
    parsed[field] = result.empty ? null : result.value;
  }
  if (parsed.minimum !== null && parsed.par !== null && compareQuantity(parsed.minimum, parsed.par) > 0) {
    return { error: '"Warn me at" cannot be more than "Fill up to". Warn me at is usually the lower number.' };
  }
  return parsed;
}

function sameValue(text, saved) {
  return canonicalQuantity(text ?? '') === canonicalQuantity(saved ?? '');
}

/** True when the typed values differ from what is saved. */
export function isTargetChanged(edit, saved) {
  return !sameValue(edit.minimum, saved?.minimum_text) || !sameValue(edit.par, saved?.par_text);
}

/**
 * Turns the edits map into rows for save_inventory_targets. Rows that fail
 * validation or did not change are left out; failures are returned by key.
 */
export function buildSaveRows(edits, savedByKey, itemsById) {
  const rows = [];
  const keys = [];
  const errors = {};
  for (const [key, edit] of Object.entries(edits)) {
    const saved = savedByKey[key] || null;
    if (!isTargetChanged(edit, saved)) continue;
    const [itemId, locationId, areaId] = key.split('|');
    const item = itemsById[itemId];
    const checked = validateTargetEdit(edit, item?.precision ?? 0, item?.unitName || 'This unit');
    if (checked.error) {
      errors[key] = checked.error;
      continue;
    }
    rows.push({
      item_id: itemId,
      location_id: locationId,
      storage_area_id: areaId || null,
      minimum: checked.minimum,
      par: checked.par,
      expected_updated_at: saved?.updated_at ?? null,
    });
    keys.push(key);
  }
  return { rows, keys, errors };
}

/** Status for a slot with an optional target and optional balance, matching the database view. */
export function targetStatus(target, balanceText) {
  if (!target) return null;
  if (balanceText === null || balanceText === undefined) return 'not_set_up';
  const min = target.minimum_text ?? null;
  const par = target.par_text ?? null;
  if (min !== null && compareQuantity(balanceText, min) <= 0) return 'low';
  if (par !== null) {
    const c = compareQuantity(balanceText, par);
    if (c < 0) return 'below_par';
    return c === 0 ? 'at_target' : 'above_target';
  }
  return 'above_minimum';
}
