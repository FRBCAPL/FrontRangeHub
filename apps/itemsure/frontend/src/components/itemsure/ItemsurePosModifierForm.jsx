import React, { useState } from 'react';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';

/**
 * What one Clover modifier does for stock: nothing, more of the same drink, or some of another
 * item. onSave(rule) returns true when saved. Reports only; stock isn't changed.
 */
export default function ItemsurePosModifierForm({ modifier, items, onSave, onCancel }) {
  const start = modifier.rule || modifier.guess || { action: 'none' };
  const [action, setAction] = useState(start.action);
  const [pours, setPours] = useState(String(start.extraPours ?? 1));
  const [itemId, setItemId] = useState(start.itemId || '');
  const [amount, setAmount] = useState(String(start.amount ?? 1));
  const [unit, setUnit] = useState(start.unit || 'fl_oz');
  const [busy, setBusy] = useState(false);
  const item = items.find((i) => i.id === itemId);
  const unitName = singularUnit(item?.unitName || 'unit').toLowerCase();

  const p = Number(pours);
  const a = Number(amount);
  const valid = action === 'none'
    || (action === 'extra' && p > 0 && p <= 100)
    || (action === 'item' && item && a > 0 && a <= 100000);

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const rule = action === 'extra' ? { action, extraPours: p } : action === 'item' ? { action, itemId, amount: a, unit } : { action };
    const ok = await onSave(rule);
    setBusy(false);
    if (ok) onCancel();
  };

  const choice = (value, label, hint) => (
    <label className="isu-pos-mod-choice">
      <input type="radio" name="isu-mod-action" value={value} checked={action === value} onChange={() => setAction(value)} />
      <span><strong>{label}</strong><span className="isu-muted isu-small"> {hint}</span></span>
    </label>
  );

  return (
    <form className="isu-pos-mod-form" onSubmit={save} aria-label={`What ${modifier.name} uses`}>
      <p className="isu-muted isu-small">When staff add &ldquo;{modifier.name}&rdquo; to a drink in Clover, what does it use?</p>
      {choice('none', 'Nothing extra', 'Like Rocks, Neat, or a lime.')}
      {choice('extra', 'More of the same drink', 'Like Double: one more pour of the drink’s main item.')}
      {action === 'extra' ? (
        <label className="isu-pos-pour-field">
          <span>Extra pours (Double = 1, Triple = 2)</span>
          <input type="number" inputMode="decimal" min="0" step="any" value={pours} onChange={(e) => setPours(e.target.value)} aria-label="Extra pours" />
        </label>
      ) : null}
      {choice('item', 'Uses another item', 'Like Add Red Bull: one can of Red Bull.')}
      {action === 'item' ? (
        <div className="isu-pos-pour-field">
          <span>Item: <strong>{item ? item.name : 'not picked yet'}</strong></span>
          <ItemsureItemSearchPick items={items} label={item ? 'Pick a different item' : 'Pick the item'} onPick={setItemId} disabled={busy} />
          {item ? (
            <span className="isu-pos-pour-inputs">
              <input type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount each time" />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
                <option value="fl_oz">oz</option>
                <option value="ml">ml</option>
                <option value="base">{unitName}</option>
                <option value="piece">single from the {unitName}</option>
              </select>
            </span>
          ) : null}
          {item ? <span className="isu-muted isu-small">Oz or ml need the {unitName} size, and singles need how many come in one. Set those on the item or its category.</span> : null}
        </div>
      ) : null}
      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !valid}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
