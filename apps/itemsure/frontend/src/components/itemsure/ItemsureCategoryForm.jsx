import React, { useState } from 'react';
import { createCategory } from '../../services/itemsureItemService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { categoryTree } from '../../utils/itemsureCategories.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

/** Adds a main category, or a subcategory inside one (one level only). */
export default function ItemsureCategoryForm({ organizationId, categories = [], parentId = '', onSaved }) {
  const [name, setName] = useState('');
  const [parent, setParent] = useState(parentId);
  const { busy, error, run } = useItemsureAction();
  const mains = categoryTree(categories).roots;

  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => createCategory(organizationId, name, parent || null))) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Category name">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={parent ? 'For example: Rum' : 'For example: Liquor'} />
      </Field>
      {mains.length ? (
        <Field label="Inside (optional)" hint="Pick a main category to make this a subcategory, like Rum inside Liquor.">
          <select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Nothing: it&apos;s a main category</option>
            {mains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      ) : null}
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : parent ? 'Add subcategory' : 'Add category'}
      </button>
    </form>
  );
}
