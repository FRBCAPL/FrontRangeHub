import React, { useMemo, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { moveItemsToCategory } from '../../services/itemsureCategoryService.js';
import { categoryOptions, categoryPath } from '../../utils/itemsureCategories.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const NONE = '__none';
const SEARCH_FROM = 10;

/**
 * Tick items in one category and give them all a new main category at once.
 * `onDone({ message, undo })` reports the move; undo puts the same items back.
 */
export default function ItemsureCategoryMoveItems({ organizationId, category, tree, items, onDone }) {
  const inside = useMemo(
    () => items.filter((i) => i.is_active && i.category_id === category.id).sort((a, b) => a.name.localeCompare(b.name)),
    [items, category.id],
  );
  const [picked, setPicked] = useState(() => new Set());
  const [target, setTarget] = useState('');
  const [query, setQuery] = useState('');
  const { busy, error, run } = useItemsureAction();

  const needle = query.trim().toLowerCase();
  const shown = needle ? inside.filter((i) => i.name.toLowerCase().includes(needle)) : inside;
  const allShownPicked = shown.length > 0 && shown.every((i) => picked.has(i.id));
  const targets = categoryOptions(tree).filter((c) => c.id !== category.id);

  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleShown = () => setPicked((prev) => {
    const next = new Set(prev);
    shown.forEach((i) => (allShownPicked ? next.delete(i.id) : next.add(i.id)));
    return next;
  });

  const submit = async (event) => {
    event.preventDefault();
    const ids = [...picked];
    const destination = target === NONE ? null : target;
    const name = destination ? categoryPath(tree, destination) : 'No category';
    const ok = await run(() => moveItemsToCategory(organizationId, ids, destination));
    if (ok) {
      onDone({
        message: `Moved ${ids.length} item${ids.length === 1 ? '' : 's'} to ${name}.`,
        undo: () => moveItemsToCategory(organizationId, ids, category.id),
      });
    }
  };

  return (
    <form className="isu-stack" onSubmit={submit}>
      <p className="isu-muted isu-small">Tick the items to move, then choose where they go. Their stock, levels, and history stay the same.</p>
      {inside.length >= SEARCH_FROM ? (
        <input type="search" className="isu-search" placeholder="Find an item" aria-label="Find an item" value={query} onChange={(e) => setQuery(e.target.value)} />
      ) : null}
      <div className="isu-catmove-head">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={toggleShown} disabled={!shown.length}>
          {allShownPicked ? 'Untick all' : `Tick all (${shown.length})`}
        </button>
        <span className="isu-muted isu-small">{picked.size} ticked</span>
      </div>
      <ul className="isu-catmove-list">
        {shown.map((item) => (
          <li key={item.id}>
            <label className="isu-catmove-item">
              <input type="checkbox" checked={picked.has(item.id)} onChange={() => toggle(item.id)} />
              <span>{item.name}</span>
            </label>
          </li>
        ))}
        {!shown.length ? <li className="isu-muted isu-small">No items match.</li> : null}
      </ul>
      <Field label="Move them to">
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Choose a category…</option>
          {targets.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          <option value={NONE}>No category</option>
        </select>
      </Field>
      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !picked.size || !target}>
        {busy ? 'Moving…' : picked.size ? `Move ${picked.size} item${picked.size === 1 ? '' : 's'}` : 'Move items'}
      </button>
    </form>
  );
}
