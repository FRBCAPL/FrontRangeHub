import React, { useState } from 'react';
import { createCategory } from '../../services/itemsureItemService.js';
import { categoryOptions, categoryPath, categoryTree } from '../../utils/itemsureCategories.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const CREATE = '__create__';

/**
 * "Also find it under": extra categories the item shows in on the Inventory page.
 * Only for finding it; counts, warning levels, and restock use the main category.
 * With `canManage`, "Create a new category…" saves one right away and adds it here.
 */
export default function ItemsureExtraCategoryPicker({ organizationId, categories, mainId, value, suggested = [], onChange, canManage, onAdded }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tree = categoryTree(categories);
  const chosen = value.filter((id) => id !== mainId && tree.byId.has(id));
  // Links to archived categories are kept as they are, just not shown.
  const hidden = value.filter((id) => id !== mainId && !tree.byId.has(id));
  // The main category's parent adds nothing: the item already shows there.
  const parentOfMain = tree.parentOf(mainId);
  const options = categoryOptions(tree).filter((o) => o.id !== mainId && o.id !== parentOfMain && !chosen.includes(o.id));
  const set = (ids) => onChange([...hidden, ...ids]);
  if (!chosen.length && !options.length && !canManage) return null;

  const pick = (id) => {
    if (!id) return;
    if (id !== CREATE) {
      set([...chosen, id]);
      return;
    }
    setAdding(true);
    setName('');
    setParentId('');
    setError('');
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const id = await createCategory(organizationId, name, parentId || null);
      onAdded?.({ id, name: name.trim(), is_active: true, parent_category_id: parentId || null });
      set([...chosen, id]);
      setAdding(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="isu-extra-categories">
      <Field label="Also find it under (optional)" hint="Extra categories it shows up in when browsing. Counts and warning levels use the main category.">
        <select value={adding ? CREATE : ''} onChange={(e) => pick(e.target.value)}>
          <option value="">{options.length ? 'Choose a category to add…' : 'No other categories yet'}</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          {canManage ? <option value={CREATE}>+ Create a new category…</option> : null}
        </select>
      </Field>
      {adding ? (
        <div className="isu-category-add">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
            aria-label="New category name"
            placeholder="New category, e.g. Bar garnish"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (name.trim()) save();
              }
            }}
          />
          {tree.roots.length ? (
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} aria-label="Put it inside">
              <option value="">As a main category</option>
              {tree.roots.map((c) => <option key={c.id} value={c.id}>Inside {c.name}</option>)}
            </select>
          ) : null}
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !name.trim()} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setAdding(false)}>Cancel</button>
          <ErrorNote message={error} />
        </div>
      ) : null}
      {chosen.some((id) => suggested.includes(id)) ? (
        <p className="isu-hint isu-extra-category-note">Suggested from the category name and your other items. Tap {'\u00d7'} to remove any you don&apos;t want.</p>
      ) : null}
      {chosen.length ? (
        <ul className="isu-extra-category-list" aria-label="Also found under">
          {chosen.map((id) => (
            <li key={id} className={`isu-chip${suggested.includes(id) ? ' is-suggested' : ''}`}>
              {categoryPath(tree, id)}
              {suggested.includes(id) ? <span className="isu-extra-category-tag">suggested</span> : null}
              <button type="button" className="isu-extra-category-remove" onClick={() => set(chosen.filter((x) => x !== id))} aria-label={`Remove ${categoryPath(tree, id)}`}>
                {'\u00d7'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
