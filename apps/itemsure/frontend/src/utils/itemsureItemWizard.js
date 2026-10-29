// The guided Add / Edit item steps. Pure logic: which steps show, what's valid,
// and what still needs saving. Quantities stay strings throughout.
import { checkQuantity, quantitySign, sameQuantity } from './itemsureQuantity.js';
import { isTargetChanged, validateTargetEdit } from './itemsureTargets.js';
import { slotKey } from './itemsureStock.js';

export const STEPS = {
  basics: 'Item',
  where: 'On hand',
  levels: 'Warn & restock',
  extras: 'Extras',
  review: 'Check & save',
};

/** The steps this person sees, in order. */
export function wizardSteps({ canView, canLevels }) {
  return ['basics', canView && 'where', canView && canLevels && 'levels', 'extras', 'review'].filter(Boolean);
}

/**
 * One place in the wizard: where, what's saved there now, and what's typed.
 * `quantity` and `target` are what the database has; `amount`, `minimum`, `par` are the edits.
 */
export function makeEntry({ locationId, storageAreaId = null, quantity = null, target = null, kept = false, isNew = false }) {
  return {
    key: slotKey(locationId, storageAreaId),
    locationId,
    storageAreaId: storageAreaId || null,
    quantity,
    target,
    kept,
    isNew,
    remove: false,
    amount: quantity ?? '',
    minimum: target?.minimum_text ?? '',
    par: target?.par_text ?? '',
  };
}

/** Entries for an existing item, from its visible slots (see visibleSlots). */
export function entriesFromGroups(groups) {
  return groups.flatMap((g) =>
    g.slots.map((s) => makeEntry({ locationId: s.locationId, storageAreaId: s.storageAreaId, quantity: s.quantity, target: s.target, kept: s.kept })),
  );
}

/** True when a saved place still has stock (not blank, not 0). */
export function hasSavedStock(entry) {
  return entry.quantity !== null && quantitySign(entry.quantity) !== 0;
}

/**
 * Whether an existing place can be taken off the item here. Stock there is set
 * to 0 first, so that needs the amounts permission; saved levels need the levels one.
 */
export function canRemoveEntry(entry, { amounts, levels }) {
  return !entry.isNew && (!hasSavedStock(entry) || amounts) && (!entry.target || levels);
}

/** First problem with the typed amounts, as { key, error }, or null. */
export function checkAmounts(entries, precision, unitName) {
  for (const e of entries) {
    if (e.remove) continue;
    const result = checkQuantity(e.amount, precision, unitName);
    if (result.error) return { key: e.key, error: result.error };
    if (result.empty && e.quantity !== null) {
      return { key: e.key, error: 'Enter how many are there now (0 if none). Use the item page to remove a place.' };
    }
  }
  return null;
}

/** First problem with the typed levels, as { key, error }, or null. */
export function checkLevels(entries, precision, unitName) {
  for (const e of entries) {
    if (e.remove) continue;
    const result = validateTargetEdit({ minimum: e.minimum, par: e.par }, precision, unitName);
    if (result.error) return { key: e.key, error: result.error };
  }
  return null;
}

/**
 * What saving still has to do. Anything already saved (amount equal to what's
 * there, levels equal to what's saved, place remembered) is left out, so
 * "Save again" after a partial failure never repeats work.
 */
export function savePlan(entries, { precision, unitName, canAmounts, canLevels }) {
  const amounts = [];
  const levels = [];
  const places = [];
  const removals = [];
  for (const e of entries) {
    if (e.remove) {
      if (!canRemoveEntry(e, { amounts: canAmounts, levels: canLevels })) continue;
      if (hasSavedStock(e)) amounts.push({ key: e.key, quantity: '0', seen: e.quantity, note: 'Removed this place from the item' });
      removals.push({ key: e.key });
      continue;
    }
    let saving = false;
    const amount = checkQuantity(e.amount, precision, unitName);
    if (canAmounts && amount.value !== undefined && (e.quantity === null || !sameQuantity(amount.value, e.quantity))) {
      amounts.push({ key: e.key, quantity: amount.value, seen: e.quantity });
      saving = true;
    }
    const edit = { minimum: e.minimum, par: e.par };
    if (canLevels && isTargetChanged(edit, e.target)) {
      const checked = validateTargetEdit(edit, precision, unitName);
      if (!checked.error) {
        levels.push({ key: e.key, minimum: checked.minimum, par: checked.par, expectedUpdatedAt: e.target?.updated_at ?? null });
        if (checked.minimum !== null || checked.par !== null) saving = true;
      }
    }
    if (e.isNew && !e.kept && !saving) places.push({ key: e.key });
  }
  return { amounts, levels, places, removals, empty: !amounts.length && !levels.length && !places.length && !removals.length };
}

/** Copies the first place's levels to every place ("Same for every place"). */
export function copyFirstLevels(entries) {
  if (!entries.length) return entries;
  const first = entries.find((e) => !e.remove);
  if (!first) return entries;
  return entries.map((e) => (e.remove ? e : { ...e, minimum: first.minimum, par: first.par }));
}
