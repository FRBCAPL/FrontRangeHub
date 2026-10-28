import React, { useEffect, useState } from 'react';
import { addItemsToSession, listItemsMissingFromSession } from '../../services/itemsureCountService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Catalog items created after the count started join only through this explicit step. */
export default function ItemsureCountAddItems({ organizationId, sessionId, onAdded }) {
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const { busy, error, setError, run } = useItemsureAction();

  useEffect(() => {
    listItemsMissingFromSession(organizationId, sessionId)
      .then(setItems)
      .catch((e) => {
        setItems([]);
        setError(e.message);
      });
  }, [organizationId, sessionId, setError]);

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = () =>
    run(async () => {
      await addItemsToSession(sessionId, [...picked]);
      await onAdded();
    });

  if (items === null) return <p className="isu-muted">Loading…</p>;
  return (
    <div className="isu-stack">
      {items.length === 0 ? (
        <p className="isu-muted">Every active catalog item is already in this count.</p>
      ) : (
        <>
          <p className="isu-muted isu-small">These active catalog items are not part of this count yet.</p>
          <div className="isu-checks">
            {items.map((item) => (
              <label key={item.id} className="isu-check">
                <input type="checkbox" checked={picked.has(item.id)} onChange={() => toggle(item.id)} />
                {item.name}{item.sku ? ` (SKU ${item.sku})` : ''}
              </label>
            ))}
          </div>
        </>
      )}
      <ErrorNote message={error} />
      <button type="button" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || picked.size === 0} onClick={add}>
        {busy ? 'Adding…' : picked.size ? `Add ${picked.size} item${picked.size === 1 ? '' : 's'}` : 'Add items'}
      </button>
    </div>
  );
}
