import React, { useState } from 'react';
import { createCategory } from '../../services/itemsureItemService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

export default function ItemsureCategoryForm({ organizationId, onSaved }) {
  const [name, setName] = useState('');
  const { busy, error, run } = useItemsureAction();

  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => createCategory(organizationId, name))) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Category name">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : 'Add category'}
      </button>
    </form>
  );
}
