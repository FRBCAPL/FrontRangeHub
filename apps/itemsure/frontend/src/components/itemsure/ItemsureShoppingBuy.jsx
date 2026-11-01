import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { shoppingText, tickOf } from '../../utils/itemsureShoppingList.js';
import ItemsureShoppingExtraRow from './ItemsureShoppingExtraRow.jsx';
import ItemsureShoppingRow from './ItemsureShoppingRow.jsx';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

function note({ shared, canReceive, hasExtras }) {
  if (shared) {
    return `Tick items as you get them, and tap an amount if you're getting a different number. Everyone sees the ticks.${canReceive ? ' When the shopping is back, tap Receive bought items to add it to stock.' : ''}`;
  }
  return hasExtras
    ? 'Tick items as you get them. Ticks don\u2019t change stock. Clear ticked takes things you added by hand off the list for everyone.'
    : 'Tick items as you get them. Ticks are just for you on this device and don\u2019t change stock.';
}

/**
 * "To buy": one block per group in A to Z order, a "Got it" tick per item (rows never move when
 * ticked), the amount the shopper is getting, and a plain-text copy of what's left.
 * `ticks` comes from useShoppingTicks. With `onAdd` (hand-added lines are set up), each supplier group
 * gets "+ Add item" (`onAdd(label)`); the heading gets one (`onAdd('')`) only when there are no supplier
 * groups, so it is never mistaken for the first group's. `onRemove(ids)` removes added lines.
 * `onReceive` (shared ticks and permission to add stock) opens the receive window.
 */
export default function ItemsureShoppingBuy({ groups, ticks, itemsById, withLocation, iconFor = null, onAdd = null, onRemove = null, onReceive = null }) {
  const { ticked, names, toggle, setAmount, clear } = ticks;
  const [copied, setCopied] = useState('');
  const [copyText, setCopyText] = useState('');
  const { busy, error, run } = useItemsureAction();
  const rows = groups.flatMap((g) => g.rows);
  const tickedKeys = rows.map(tickOf).filter((k) => ticked.has(k));
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
    clear(tickedKeys);
  };
  const remove = (row) => run(() => onRemove([row.extraId]));

  return (
    <section className="isu-shop-section">
      <div className="isu-shop-section-head">
        <h2 className="isu-shop-heading">To buy</h2>
        <div className="isu-shop-tools">
          {onAdd && !(iconFor && groups.length) ? <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAdd('')}>+ Add item</button> : null}
          {tickedKeys.length ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={clearTicked} disabled={busy}>
              {tickedExtras.length ? 'Clear ticked' : 'Clear ticks'}
            </button>
          ) : null}
          {groups.length ? <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={copy}>Copy list</button> : null}
        </div>
      </div>
      {onReceive && tickedKeys.length ? (
        <button type="button" className="isu-btn isu-btn--primary isu-shop-receive" onClick={onReceive}>
          Receive bought items
        </button>
      ) : null}
      <ErrorNote message={error || ticks.error} />
      <p className="isu-muted isu-small isu-shop-note" role="status">
        {copied || note({ shared: ticks.shared, canReceive: Boolean(onReceive), hasExtras: Boolean(onAdd) })}
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
            {g.rows.map((row) => {
              const key = tickOf(row);
              const shared = { tick: ticked.get(key), names, onTick: () => toggle(key), onSetAmount: (amount) => setAmount(key, amount) };
              return row.extra ? (
                <ItemsureShoppingExtraRow key={row.key} row={row} {...shared} onRemove={() => remove(row)} busy={busy} />
              ) : (
                <ItemsureShoppingRow key={row.key} row={row} {...shared} item={itemsById?.get(row.itemId)} withLocation={withLocation} />
              );
            })}
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
