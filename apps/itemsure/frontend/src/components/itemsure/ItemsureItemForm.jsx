import React, { useState } from 'react';
import { createItem } from '../../services/itemsureItemService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

export default function ItemsureItemForm({ organizationId, categories, units, canManageCategories, onSaved }) {
  const eachUnit = units.find((u) => u.code === 'each' && !u.organization_id);
  const [form, setForm] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category_id: '',
    new_category: '',
    base_unit_id: eachUnit?.id || units[0]?.id || '',
  });
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const activeCategories = categories.filter((c) => c.is_active);

  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => createItem(organizationId, form, { canManageCategories }))) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Item name">
        <input value={form.name} onChange={set('name')} maxLength={160} />
      </Field>
      <Field label="Base unit" hint="The smallest unit you track this item in. Packaging sizes come later.">
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
      <Field label="Description">
        <textarea value={form.description} onChange={set('description')} rows={3} maxLength={4000} />
      </Field>
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !units.length}>
        {busy ? 'Saving…' : 'Add item'}
      </button>
    </form>
  );
}
