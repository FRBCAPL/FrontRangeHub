import React, { useState } from 'react';
import { createCategory } from '../../services/itemsureItemService.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * "+ New category" that opens into a name box and saves right away.
 * `parent` makes it a subcategory; `onCreated(row)` gets the saved category.
 */
export default function ItemsureCategoryQuickAdd({ organizationId, parent = null, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const what = parent ? `subcategory in ${parent.name}` : 'category';

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const id = await createCategory(organizationId, name, parent?.id || null);
      onCreated({ id, name: name.trim(), is_active: true, parent_category_id: parent?.id || null });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="isu-btn isu-btn--ghost isu-btn--block" onClick={() => setOpen(true)}>
        + New {what}
      </button>
    );
  }
  return (
    <div className="isu-catpick-add">
      <ErrorNote message={error} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        autoFocus
        aria-label={`New ${what} name`}
        placeholder={parent ? 'For example: Rum' : 'For example: Liquor'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (name.trim()) save();
          }
        }}
      />
      <div className="isu-catpick-add-actions">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !name.trim()} onClick={save}>
          {busy ? 'Saving…' : `Add and choose it`}
        </button>
      </div>
    </div>
  );
}
