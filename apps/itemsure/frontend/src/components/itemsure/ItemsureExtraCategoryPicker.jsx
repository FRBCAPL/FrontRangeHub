import React, { useState } from 'react';
import { categoryPath, categoryTree } from '../../utils/itemsureCategories.js';
import ItemsureCategoryChooser from './ItemsureCategoryChooser.jsx';

/**
 * "Also find it under": extra categories the item shows in on the Inventory page.
 * Only for finding it; counts, warning levels, and restock use the main category.
 * "+ Add another category" opens the category window; with `canManage` a new one can be made there.
 */
export default function ItemsureExtraCategoryPicker({ organizationId, categories, mainId, value, suggested = [], onChange, canManage, onAdded }) {
  const [open, setOpen] = useState(false);
  const tree = categoryTree(categories);
  const chosen = value.filter((id) => id !== mainId && tree.byId.has(id));
  // Links to archived categories are kept as they are, just not shown.
  const hidden = value.filter((id) => id !== mainId && !tree.byId.has(id));
  // The main category's parent adds nothing: the item already shows there.
  const parentOfMain = tree.parentOf(mainId);
  const blocked = [mainId, parentOfMain, ...chosen].filter(Boolean);
  const anyLeft = categories.some((c) => tree.byId.has(c.id) && !blocked.includes(c.id));
  const set = (ids) => onChange([...hidden, ...ids]);
  if (!chosen.length && !anyLeft && !canManage) return null;

  return (
    <div className="isu-extra-categories isu-field">
      <span>Also find it under (optional)</span>
      <p className="isu-hint">Extra categories it shows up in when browsing. Counts and warning levels use the main category.</p>
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
      {anyLeft || canManage ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-extra-category-add" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          + Add {chosen.length ? 'another' : 'a'} category
        </button>
      ) : null}
      <ItemsureCategoryChooser
        open={open}
        title="Also find it under"
        organizationId={organizationId}
        categories={categories}
        exclude={blocked}
        excludeNote={(id) => (id === mainId ? 'main category' : id === parentOfMain ? 'already included' : 'added')}
        canManage={canManage}
        onChoose={(id) => id && set([...chosen, id])}
        onAdded={onAdded}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
