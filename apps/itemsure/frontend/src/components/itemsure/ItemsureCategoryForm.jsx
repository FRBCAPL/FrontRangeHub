import React, { useState } from 'react';
import { createCategory, updateCategory } from '../../services/itemsureItemService.js';
import { saveCategoryIcon } from '../../services/itemsureCategoryIconService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { categoryTree } from '../../utils/itemsureCategories.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureIconPicker from './ItemsureIconPicker.jsx';

/**
 * Adds a main category, or a subcategory inside one (one level only).
 * With `category` it edits that one instead: rename it, move it, or change its icon.
 * The icon choice only shows once that database update is applied (`iconsAvailable`).
 */
export default function ItemsureCategoryForm({ organizationId, categories = [], parentId = '', category = null, iconsAvailable = false, onSaved }) {
  const tree = categoryTree(categories);
  const [name, setName] = useState(category?.name || '');
  const [parent, setParent] = useState(category ? tree.parentOf(category.id) || '' : parentId);
  const [icon, setIcon] = useState(category?.icon || '');
  const { busy, error, run } = useItemsureAction();
  const mains = tree.roots.filter((c) => c.id !== category?.id);
  const subCount = category ? tree.childrenOf(category.id).length : 0;

  const submit = async (event) => {
    event.preventDefault();
    const save = async () => {
      let id = category?.id;
      if (category) await updateCategory(organizationId, id, name, parent || null);
      else id = await createCategory(organizationId, name, parent || null);
      if (iconsAvailable && icon !== (category?.icon || '')) await saveCategoryIcon(organizationId, id, icon);
    };
    if (await run(save)) onSaved();
  };

  const label = category ? 'Save changes' : parent ? 'Add subcategory' : 'Add category';

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Category name">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={parent ? 'For example: Rum' : 'For example: Liquor'} />
      </Field>
      {subCount ? (
        <p className="isu-hint">
          {`It has ${subCount} subcategor${subCount === 1 ? 'y' : 'ies'}, so it stays a main category.`}
        </p>
      ) : mains.length ? (
        <Field label="Inside (optional)" hint="Pick a main category to make this a subcategory, like Rum inside Liquor.">
          <select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Nothing: it&apos;s a main category</option>
            {mains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      ) : null}
      {iconsAvailable ? (
        <>
          <ItemsureIconPicker value={icon} onChange={setIcon} />
          <p className="isu-hint">
            {parent ? 'Shown on its items. With no icon, it uses its main category\u2019s.' : 'Shown on the category and its items.'}
          </p>
        </>
      ) : null}
      {category ? <p className="isu-hint">Items in this category stay in it.</p> : null}
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !name.trim()}>
        {busy ? 'Saving…' : label}
      </button>
    </form>
  );
}
