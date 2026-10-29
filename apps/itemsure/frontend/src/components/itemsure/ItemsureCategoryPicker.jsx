import React, { useState } from 'react';
import { createCategory } from '../../services/itemsureItemService.js';
import { categoryTree, rootOf } from '../../utils/itemsureCategories.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const ADD = '__add__';

/**
 * Two dropdowns: main category, then that category's subcategories. "+ Add new…"
 * saves the new name right away, so it is in the list from then on.
 * `onAdded(row)` lets the parent remember the new category.
 */
export default function ItemsureCategoryPicker({ organizationId, categories, value, onChange, canManage, onAdded }) {
  const [adding, setAdding] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tree = categoryTree(categories);
  const main = rootOf(tree, value) || '';
  const sub = main && value !== main ? value : '';
  const subs = main ? tree.childrenOf(main) : [];
  const archived = value && !tree.byId.has(value) ? categories.find((c) => c.id === value) : null;

  const startAdding = (kind) => {
    setAdding(kind);
    setName('');
    setError('');
  };
  const pickMain = (id) => (id === ADD ? startAdding('main') : (setAdding(null), onChange(id)));
  const pickSub = (id) => (id === ADD ? startAdding('sub') : (setAdding(null), onChange(id || main)));

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const parentId = adding === 'sub' ? main : null;
      const id = await createCategory(organizationId, name, parentId);
      const row = { id, name: name.trim(), is_active: true, parent_category_id: parentId };
      onAdded?.(row);
      onChange(id);
      setAdding(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addBox = adding ? (
    <div className="isu-category-add">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        autoFocus
        placeholder={adding === 'sub' ? `New in ${tree.byId.get(main)?.name}, e.g. Rum` : 'New category, e.g. Liquor'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (name.trim()) save();
          }
        }}
      />
      <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !name.trim()} onClick={save}>
        {busy ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setAdding(null)}>Cancel</button>
      <ErrorNote message={error} />
    </div>
  ) : null;

  return (
    <>
      <Field label="Category">
        <select value={adding === 'main' ? ADD : archived ? value : main} onChange={(e) => pickMain(e.target.value)}>
          <option value="">No category</option>
          {tree.roots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {archived ? <option value={archived.id}>{archived.name} (archived)</option> : null}
          {canManage ? <option value={ADD}>+ Add new category…</option> : null}
        </select>
      </Field>
      {adding === 'main' ? addBox : null}
      {main ? (
        <Field label={`Subcategory in ${tree.byId.get(main).name} (optional)`}>
          <select value={adding === 'sub' ? ADD : sub} onChange={(e) => pickSub(e.target.value)}>
            <option value="">None: just {tree.byId.get(main).name}</option>
            {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            {canManage ? <option value={ADD}>+ Add new subcategory…</option> : null}
          </select>
        </Field>
      ) : null}
      {adding === 'sub' ? addBox : null}
    </>
  );
}
