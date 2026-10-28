import React, { useState } from 'react';
import { createItem, updateItem } from '../../services/itemsureItemService.js';
import { saveItemPlaces } from '../../services/itemsurePlaceService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { placeKey } from '../../utils/itemsurePlaces.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsurePlacePicker from './ItemsurePlacePicker.jsx';

/**
 * Adds an item, or edits `item` when one is given. `places` are the item's saved
 * places the person can see; null when places are unavailable, which hides the picker.
 */
export default function ItemsureItemForm({
  organizationId, item, categories, units, canManageCategories, locations = [], places = null, onSaved,
}) {
  const eachUnit = units.find((u) => u.code === 'each' && !u.organization_id);
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    sku: item?.sku || '',
    barcode: item?.barcode || '',
    category_id: item?.category_id || '',
    new_category: '',
    base_unit_id: item?.base_unit_id || eachUnit?.id || units[0]?.id || '',
  });
  const [chosen, setChosen] = useState(() => new Set((places || []).map((p) => placeKey(p.location_id, p.storage_area_id))));
  const [createdId, setCreatedId] = useState(null);
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const activeCategories = categories.filter((c) => c.is_active || c.id === item?.category_id);
  const unitHint = item
    ? 'Can only change while the item has no stock history and no minimum or par levels.'
    : 'The smallest unit you track this item in. Packaging sizes come later.';

  const submit = async (event) => {
    event.preventDefault();
    const save = async () => {
      // A retry after the places step failed edits the item already created, never a second copy.
      const existing = item || (createdId && { id: createdId, base_unit_id: form.base_unit_id });
      let itemId = existing?.id;
      if (existing) await updateItem(organizationId, existing, form, { canManageCategories });
      else {
        itemId = await createItem(organizationId, form, { canManageCategories });
        setCreatedId(itemId);
      }
      if (places) {
        try {
          await saveItemPlaces(organizationId, itemId, places, [...chosen]);
        } catch (e) {
          throw new Error(`The item was saved, but where it's kept was not: ${e.message} Save again to retry.`);
        }
      }
    };
    if (await run(save)) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Item name">
        <input value={form.name} onChange={set('name')} maxLength={160} />
      </Field>
      <Field label="Base unit" hint={unitHint}>
        <select value={form.base_unit_id} onChange={set('base_unit_id')}>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}{u.symbol ? ` (${u.symbol})` : ''}
            </option>
          ))}
        </select>
      </Field>
      <div className="isu-grid-2">
        <Field label="SKU">
          <input value={form.sku} onChange={set('sku')} maxLength={64} />
        </Field>
        <Field label="Barcode">
          <input value={form.barcode} onChange={set('barcode')} maxLength={64} inputMode="numeric" />
        </Field>
      </div>
      <Field label="Category">
        <select value={form.category_id} onChange={set('category_id')} disabled={Boolean(form.new_category.trim())}>
          <option value="">No category</option>
          {activeCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      {canManageCategories ? (
        <Field label="Or create a new category">
          <input value={form.new_category} onChange={set('new_category')} maxLength={80} />
        </Field>
      ) : null}
      {places ? (
        <div className="isu-field">
          <span>Kept at</span>
          <ItemsurePlacePicker locations={locations} value={chosen} onChange={setChosen} />
          <p className="isu-hint">Where this item is normally stored. Optional; it doesn&apos;t change stock.</p>
        </div>
      ) : null}
      <Field label="Description">
        <textarea value={form.description} onChange={set('description')} rows={3} maxLength={4000} />
      </Field>
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !units.length}>
        {busy ? 'Saving…' : item ? 'Save changes' : 'Add item'}
      </button>
    </form>
  );
}
