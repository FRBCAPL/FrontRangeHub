import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { shoppingText, tickOf } from '../../utils/itemsureShoppingList.js';
import ItemsureShoppingExtraRow from './ItemsureShoppingExtraRow.jsx';
import ItemsureShoppingRow from './ItemsureShoppingRow.jsx';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

const ticksLast = (rows, ticked) => [...rows.filter((r) => !ticked.has(tickOf(r))), ...rows.filter((r) => ticked.has(tickOf(r)))];

/**
 * "To buy": one block per group, a "Got it" tick per item, and a plain-text copy of what's left.
 * With `onAdd` (hand-added lines are set up), each supplier group gets "+ Add item" (`onAdd(label)`)
 * that starts on that supplier. The heading gets one for any supplier (`onAdd('')`) only when there
 * are no supplier groups, so it is never mistaken for the first group's. `onRemove(ids)` removes added lines.
 */
export default function ItemsureShoppingBuy({ groups, ticks, withLocation, iconFor = null, onAdd = null, onRemove = null }) {
  const { ticked, toggle, clear } = ticks;
  const [copied, setCopied] = useState('');
  const [copyText, setCopyText] = useState('');
  const { busy, error, run } = useItemsureAction();
  const rows = groups.flatMap((g) => g.rows);
  const tickedHere = rows.some((r) => ticked.has(tickOf(r)));
  const tickedExtras = rows.filter((r) => r.extra && ticked.has(r.tick)).map((r) => r.extraId);
  if (!groups.length && !onAdd) return null;

  const copy = async () => {
    const text = shoppingText(groups, ticked);
    if (!text) {
      setCopied('Everything is ticked.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied. Paste it into a message or note.');
    } catch {
      setCopyText(text);
    }
  };
  const clearTicked = async () => {
    if (tickedExtras.length && !(await run(() => onRemove(tickedExtras)))) return;
    clear();
  };
  const remove = (row) => run(() => onRemove([row.extraId]));

  return (
    <section className="isu-shop-section">
      <div className="isu-shop-section-head">
        <h2 className="isu-shop-heading">To buy</h2>
        <div className="isu-shop-tools">
          {onAdd && !(iconFor && groups.length) ? <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAdd('')}>+ Add item</button> : null}
          {tickedHere ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={clearTicked} disabled={busy}>
              {tickedExtras.length ? 'Clear ticked' : 'Clear ticks'}
            </button>
          ) : null}
          {groups.length ? <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={copy}>Copy list</button> : null}
        </div>
      </div>
      <ErrorNote message={error} />
      <p className="isu-muted isu-small isu-shop-note" role="status">
        {copied || (onAdd
          ? 'Tick items as you get them. Ticks don\u2019t change stock. Clear ticked takes things you added by hand off the list for everyone.'
          : 'Tick items as you get them. Ticks are just for you on this device and don\u2019t change stock.')}
      </p>
      {groups.map((g) => (
        <div key={g.label} className="isu-shop-group">
          <div className="isu-shop-group-head">
            <h3 className="isu-shop-group-title">
              {iconFor?.(g.label) ? <span className="isu-shop-group-icon" aria-hidden="true">{iconFor(g.label)}</span> : null}
              {g.label} <span className="isu-muted isu-small">({g.rows.length})</span></h3>
            {onAdd && iconFor ? (
              <button type="button" className="isu-shop-group-add" onClick={() => onAdd(g.label)} aria-label={`Add an item to ${g.label}`}>+ Add item</button>
            ) : null}
          </div>
          <ul className="isu-shop-list">
            {ticksLast(g.rows, ticked).map((row) => (row.extra ? (
              <ItemsureShoppingExtraRow key={row.key} row={row} ticked={ticked.has(row.tick)} onTick={() => toggle(row.tick)} onRemove={() => remove(row)} busy={busy} />
            ) : (
              <ItemsureShoppingRow key={row.key} row={row} ticked={ticked.has(row.itemId)} onTick={() => toggle(row.itemId)} withLocation={withLocation} />
            )))}
          </ul>
        </div>
      ))}

      <Modal open={Boolean(copyText)} title="Copy your list" onClose={() => setCopyText('')}>
        <p className="isu-muted isu-small">Copying didn&apos;t work here. Select the text below and copy it.</p>
        <textarea className="isu-shop-copy" readOnly rows={12} value={copyText} onFocus={(e) => e.target.select()} />
      </Modal>
    </section>
  );
}
