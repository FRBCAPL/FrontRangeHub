import React from 'react';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';

/**
 * The items a modifier uses, each with its own amount (Margarita: 3 oz mix + 0.5 oz triple sec).
 * lines: [{ itemId, amount (text), unit }]. Without `multiReady` only one item can be picked.
 */
export default function ItemsurePosModifierLines({ lines, items, multiReady, busy, onChange }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const left = items.filter((i) => !lines.some((l) => l.itemId === i.id));
  const canAdd = multiReady || lines.length === 0;
  const set = (index, patch) => onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const add = (itemId) => onChange([...lines, { itemId, amount: '1', unit: 'fl_oz' }]);

  return (
    <div className="isu-pos-pour-field">
      {lines.map((line, index) => {
        const item = byId.get(line.itemId);
        const unitName = singularUnit(item?.unitName || 'unit').toLowerCase();
        return (
          <div key={line.itemId} className="isu-pos-mod-line">
            <strong>{item ? item.name : 'Item not found'}</strong>
            <span className="isu-pos-pour-inputs">
              <input type="number" inputMode="decimal" min="0" step="any" value={line.amount} disabled={busy}
                onChange={(e) => set(index, { amount: e.target.value })} aria-label={`Amount of ${item?.name || 'item'} each time`} />
              <select value={line.unit} disabled={busy} onChange={(e) => set(index, { unit: e.target.value })} aria-label={`Unit for ${item?.name || 'item'}`}>
                <option value="fl_oz">oz</option>
                <option value="ml">ml</option>
                <option value="base">{unitName}</option>
                <option value="piece">single from the {unitName}</option>
              </select>
              <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy}
                onClick={() => onChange(lines.filter((_, i) => i !== index))} aria-label={`Remove ${item?.name || 'item'}`}>
                {'\u00d7'}
              </button>
            </span>
          </div>
        );
      })}
      {canAdd && left.length ? (
        <ItemsureItemSearchPick items={left} label={lines.length ? '+ Also uses…' : 'Pick the item'} onPick={add} disabled={busy} />
      ) : null}
      {!multiReady && lines.length ? (
        <span className="isu-muted isu-small">Using more than one item needs a database update first.</span>
      ) : null}
      {lines.length ? (
        <span className="isu-muted isu-small">Oz or ml need the item&apos;s size, and singles need how many come in one. Set those on the item or its category.</span>
      ) : null}
    </div>
  );
}
