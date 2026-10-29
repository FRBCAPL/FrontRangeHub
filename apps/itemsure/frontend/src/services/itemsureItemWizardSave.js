import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { notifyInventoryChanged } from '../utils/itemsureChanges.js';
import { hasSavedStock, savePlan } from '../utils/itemsureItemWizard.js';
import { removeEmptyPlace } from './itemsurePlaceCleanup.js';
import { createItem, updateItem } from './itemsureItemService.js';
import { setStockAmount } from './itemsureInventoryService.js';
import { saveTargets } from './itemsureTargetService.js';

const needsAmountUpdate = (message) => /set_inventory_quantity|could not find the function|schema cache/i.test(message || '');

/**
 * Saves everything from the guided Add / Edit item, in order: the item, then
 * amounts, then levels, then places with nothing else saved. Each part that
 * works is reflected in the returned entries, so a retry only redoes what failed.
 * Returns { itemId, entries, problems: [{ key|null, message }] }.
 */
export async function saveItemWizard({ organizationId, item, itemId, form, entries, unit, labelFor, canAmounts, canLevels }) {
  const problems = [];
  let id = itemId;
  try {
    if (id) await updateItem(organizationId, item || { id, base_unit_id: form.base_unit_id }, form);
    else id = await createItem(organizationId, form);
  } catch (e) {
    return { itemId: id, entries, problems: [{ key: null, message: `The item wasn't saved: ${e.message}` }] };
  }

  const stockItem = { id, precision: unit?.precision_scale ?? 0, unitName: unit?.name || 'This unit' };
  const plan = savePlan(entries, { precision: stockItem.precision, unitName: stockItem.unitName, canAmounts, canLevels });
  const next = new Map(entries.map((e) => [e.key, { ...e }]));
  const place = (key) => next.get(key);

  for (const a of plan.amounts) {
    const e = place(a.key);
    try {
      const result = await setStockAmount({ locationId: e.locationId, storageAreaId: e.storageAreaId, item: stockItem, quantity: a.quantity, seen: a.seen, note: a.note || '' });
      e.quantity = result?.quantity ?? a.quantity;
      if (!e.remove) {
        e.amount = e.quantity;
        e.isNew = false;
      }
    } catch (err) {
      problems.push({
        key: a.key,
        message: needsAmountUpdate(err.message)
          ? `${labelFor(e)}: amounts can't be saved until the "set amount" database update is applied.`
          : `${labelFor(e)}: amount not saved. ${err.message}`,
      });
    }
  }

  if (plan.levels.length) {
    const rows = plan.levels.map((l) => {
      const e = place(l.key);
      return { item_id: id, location_id: e.locationId, storage_area_id: e.storageAreaId, minimum: l.minimum, par: l.par, expected_updated_at: l.expectedUpdatedAt };
    });
    try {
      const results = await saveTargets(organizationId, rows);
      plan.levels.forEach((l, i) => {
        const e = place(l.key);
        const r = results.find((x) => x.index === i);
        if (r?.ok) {
          const cleared = l.minimum === null && l.par === null;
          e.target = cleared ? null : { minimum_text: l.minimum, par_text: l.par, updated_at: r.updated_at };
          if (!cleared) e.isNew = false;
        } else {
          problems.push({ key: l.key, message: `${labelFor(e)}: levels not saved. ${r?.error || ''}`.trim() });
        }
      });
    } catch (err) {
      problems.push({ key: null, message: `Levels not saved. ${err.message}` });
    }
  }

  for (const p of plan.places) {
    const e = place(p.key);
    try {
      assertOk(
        await itemsure.from('item_places').insert({ organization_id: organizationId, item_id: id, location_id: e.locationId, storage_area_id: e.storageAreaId }),
        'add place',
      );
      e.kept = true;
    } catch (err) {
      problems.push({ key: p.key, message: `${labelFor(e)}: place not saved. ${err.message}` });
    }
  }

  const removed = new Set();
  for (const r of plan.removals) {
    const e = place(r.key);
    if (hasSavedStock(e)) continue;
    try {
      await removeEmptyPlace(organizationId, id, e);
      removed.add(r.key);
    } catch (err) {
      problems.push({ key: r.key, message: `${labelFor(e)}: not removed. ${err.message}` });
    }
  }

  notifyInventoryChanged();
  return { itemId: id, entries: entries.filter((e) => !removed.has(e.key)).map((e) => next.get(e.key)), problems };
}
