import React, { useState } from 'react';
import { categoryPath, categoryTree } from '../../utils/itemsureCategories.js';
import { Field } from './ItemsureUi.jsx';
import ItemsureCategoryChooser from './ItemsureCategoryChooser.jsx';

/**
 * The item's main category: a button showing the choice ("Liquor › Rum") that opens
 * a window to pick it. New categories made there are saved right away.
 * `onAdded(row)` lets the parent remember the new category.
 */
export default function ItemsureCategoryPicker({ organizationId, categories, value, onChange, canManage, onAdded }) {
  const [open, setOpen] = useState(false);
  const tree = categoryTree(categories);
  const archived = value && !tree.byId.has(value) ? categories.find((c) => c.id === value) : null;
  const label = archived ? `${archived.name} (archived)` : categoryPath(tree, value);

  return (
    <>
      <Field label="Category">
        <button type="button" className={`isu-catpick-button${label ? '' : ' is-empty'}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <span>{label || 'No category'}</span>
          <span className="isu-catpick-change">{label ? 'Change' : 'Choose'} {'\u203A'}</span>
        </button>
      </Field>
      <ItemsureCategoryChooser
        open={open}
        organizationId={organizationId}
        categories={categories}
        value={archived ? '' : value || ''}
        allowNone
        canManage={canManage}
        onChoose={onChange}
        onAdded={onAdded}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
