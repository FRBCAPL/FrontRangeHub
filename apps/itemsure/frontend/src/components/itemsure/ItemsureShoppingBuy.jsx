import React, { useState } from 'react';
import { shoppingText } from '../../utils/itemsureShoppingList.js';
import ItemsureShoppingRow from './ItemsureShoppingRow.jsx';
import { Modal } from './ItemsureUi.jsx';

const ticksLast = (rows, ticked) => [...rows.filter((r) => !ticked.has(r.itemId)), ...rows.filter((r) => ticked.has(r.itemId))];

/** "To buy": one block per group, a "Got it" tick per item, and a plain-text copy of what's left. */
export default function ItemsureShoppingBuy({ groups, ticks, withLocation }) {
  const { ticked, toggle, clear } = ticks;
  const [copied, setCopied] = useState('');
  const [copyText, setCopyText] = useState('');
  const tickedHere = groups.some((g) => g.rows.some((r) => ticked.has(r.itemId)));
  if (!groups.length) return null;

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

  return (
    <section className="isu-shop-section">
      <div className="isu-shop-section-head">
        <h2 className="isu-shop-heading">To buy</h2>
        <div className="isu-shop-tools">
          {tickedHere ? <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={clear}>Clear ticks</button> : null}
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={copy}>Copy list</button>
        </div>
      </div>
      <p className="isu-muted isu-small isu-shop-note" role="status">
        {copied || 'Tick items as you get them. Ticks are just for you on this device and don\u2019t change stock.'}
      </p>
      {groups.map((g) => (
        <div key={g.label} className="isu-shop-group">
          <h3 className="isu-shop-group-title">{g.label} <span className="isu-muted isu-small">({g.rows.length})</span></h3>
          <ul className="isu-shop-list">
            {ticksLast(g.rows, ticked).map((row) => (
              <ItemsureShoppingRow key={row.key} row={row} ticked={ticked.has(row.itemId)} onTick={() => toggle(row.itemId)} withLocation={withLocation} />
            ))}
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
