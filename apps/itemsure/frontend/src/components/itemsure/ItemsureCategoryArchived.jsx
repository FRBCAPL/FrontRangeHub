import React from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { setCategoryActive } from '../../services/itemsureCategoryService.js';
import { labelWithIcon } from '../../utils/itemsureCategories.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Archived categories, each with a Restore button. Restoring brings it back exactly as it was. */
export default function ItemsureCategoryArchived({ organizationId, categories, onChanged }) {
  const { busy, error, run } = useItemsureAction();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const archived = categories.filter((c) => c.is_active === false).sort((a, b) => a.name.localeCompare(b.name));

  const restore = async (category) => {
    if (await run(() => setCategoryActive(organizationId, category.id, true))) onChanged();
  };

  if (!archived.length) return <p className="isu-muted">No archived categories.</p>;

  return (
    <div className="isu-stack">
      <ErrorNote message={error} />
      <ul className="isu-catorder-list">
        {archived.map((c) => {
          const parent = byId.get(c.parent_category_id);
          return (
            <li key={c.id} className="isu-catorder-item is-archived">
              <span className="isu-catorder-name">
                {labelWithIcon(c)}
                {parent ? (
                  <span className="isu-muted isu-small">
                    {' '}in {parent.name}{parent.is_active === false ? ' (also archived, so it comes back as a main category)' : ''}
                  </span>
                ) : null}
              </span>
              <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => restore(c)}>Restore</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
