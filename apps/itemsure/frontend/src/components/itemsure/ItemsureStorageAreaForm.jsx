import React, { useState } from 'react';
import { createStorageArea, updateStorageArea } from '../../services/itemsureLocationService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

/** Adds a storage area to `location`, or edits `area` when one is given. */
export default function ItemsureStorageAreaForm({ organizationId, location, area, onSaved }) {
  const [form, setForm] = useState({ name: area?.name || '', description: area?.description || '' });
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const save = area
      ? () => updateStorageArea(organizationId, area.id, form)
      : () => createStorageArea(organizationId, location.id, form);
    if (await run(save)) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Spot name" hint="For example a back room, a shelf, a cooler, or a warehouse section.">
        <input value={form.name} onChange={set('name')} maxLength={120} />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={set('description')} rows={3} maxLength={400} />
      </Field>
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : area ? 'Save changes' : `Add to ${location.name}`}
      </button>
    </form>
  );
}
