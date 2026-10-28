import React, { useState } from 'react';
import { createStorageArea } from '../../services/itemsureLocationService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

export default function ItemsureStorageAreaForm({ organizationId, location, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => createStorageArea(organizationId, location.id, form))) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Storage area name" hint="For example a back room, a shelf, a cooler, or a warehouse section.">
        <input value={form.name} onChange={set('name')} maxLength={120} />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={set('description')} rows={3} maxLength={400} />
      </Field>
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : `Add to ${location.name}`}
      </button>
    </form>
  );
}
