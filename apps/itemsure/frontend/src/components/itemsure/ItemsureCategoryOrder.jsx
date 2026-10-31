import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { saveCategoryOrder } from '../../services/itemsureCategoryService.js';
import { labelWithIcon, moveInList, orderChanges } from '../../utils/itemsureCategories.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Put sibling categories in the order you want them shown, with up and down buttons. */
export default function ItemsureCategoryOrder({ organizationId, siblings, onSaved }) {
  const [list, setList] = useState(siblings);
  const { busy, error, run } = useItemsureAction();
  const changed = list.some((c, i) => c.id !== siblings[i].id);

  const move = (index, direction) => setList((prev) => moveInList(prev, index, direction));
  const alphabetical = () => setList((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  const save = async () => {
    if (await run(() => saveCategoryOrder(organizationId, orderChanges(list)))) onSaved();
  };

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">This order is used for the category buttons and lists, for everyone in this business.</p>
      <ol className="isu-catorder-list">
        {list.map((c, index) => (
          <li key={c.id} className="isu-catorder-item">
            <span className="isu-catorder-pos">{index + 1}</span>
            <span className="isu-catorder-name">{labelWithIcon(c)}</span>
            <button type="button" className="isu-catorder-btn" aria-label={`Move ${c.name} up`} disabled={index === 0} onClick={() => move(index, -1)}>{'\u25B2'}</button>
            <button type="button" className="isu-catorder-btn" aria-label={`Move ${c.name} down`} disabled={index === list.length - 1} onClick={() => move(index, 1)}>{'\u25BC'}</button>
          </li>
        ))}
      </ol>
      <ErrorNote message={error} />
      <div className="isu-catorder-actions">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={alphabetical}>Sort A–Z</button>
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy || !changed} onClick={save}>{busy ? 'Saving…' : 'Save order'}</button>
      </div>
    </div>
  );
}
