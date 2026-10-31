import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { setCategoryActive } from '../../services/itemsureCategoryService.js';
import { archiveBlockers } from '../../utils/itemsureCategories.js';
import { ErrorNote } from './ItemsureUi.jsx';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Under the edit form: move this category's items somewhere else, and archive it.
 * Archiving only works once it holds no active items or subcategories, so nothing goes missing.
 */
export default function ItemsureCategoryTools({ organizationId, category, tree, items, canMoveItems, onMoveItems, onArchived }) {
  const [confirming, setConfirming] = useState(false);
  const { busy, error, run } = useItemsureAction();
  const { subs, items: inside } = archiveBlockers(tree, items, category.id);
  const blocked = subs.length > 0 || inside.length > 0;
  const alsoHere = items.filter((i) => i.is_active && i.category_id !== category.id && (i.extraCategoryIds || []).includes(category.id)).length;

  const archive = async () => {
    if (await run(() => setCategoryActive(organizationId, category.id, false))) onArchived();
  };

  return (
    <section className="isu-cattools" aria-label="Items and archiving">
      <div className="isu-cattools-row">
        <p>
          <strong>{plural(inside.length, 'item', 'items')}</strong> <span className="isu-muted">{subs.length ? `directly in ${category.name}` : `in ${category.name}`}</span>
          {subs.length ? <span className="isu-muted"> · {plural(subs.length, 'subcategory', 'subcategories')}</span> : null}
          {alsoHere ? <span className="isu-muted"> · {alsoHere} more also listed here from other categories</span> : null}
        </p>
        {canMoveItems && inside.length ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onMoveItems}>Move items…</button>
        ) : null}
      </div>

      <ErrorNote message={error} />
      {blocked ? (
        <p className="isu-hint">
          To archive {category.name}, first move out {[inside.length ? plural(inside.length, 'item', 'items') : '', subs.length ? plural(subs.length, 'subcategory', 'subcategories') : ''].filter(Boolean).join(' and ')}.
        </p>
      ) : confirming ? (
        <div className="isu-cattools-confirm">
          <p>Archive {category.name}? It&apos;s hidden everywhere. You can bring it back from Browse/Edit Categories &rsaquo; Archived.</p>
          <div className="isu-cattools-actions">
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setConfirming(false)}>Keep it</button>
            <button type="button" className="isu-btn isu-btn--danger-solid isu-btn--sm" disabled={busy} onClick={archive}>{busy ? 'Archiving…' : 'Archive'}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-cattools-archive" onClick={() => setConfirming(true)}>Archive category</button>
      )}
    </section>
  );
}
