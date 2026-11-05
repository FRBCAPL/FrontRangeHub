import React, { useState } from 'react';
import { ruleLines } from '../../utils/itemsurePosModifiers.js';
import ItemsurePosModifierLines from './ItemsurePosModifierLines.jsx';

/**
 * What one Clover modifier does for stock: nothing, more of the same drink, or some of other
 * items. onSave(rule) returns true when saved. One item saves as 'item', several as 'items'.
 */
export default function ItemsurePosModifierForm({ modifier, items, multiReady = false, onSave, onCancel }) {
  const start = modifier.rule || modifier.guess || { action: 'none' };
  const [action, setAction] = useState(start.action === 'items' ? 'item' : start.action);
  const [pours, setPours] = useState(String(start.extraPours ?? 1));
  const [lines, setLines] = useState(() => ruleLines(start).filter((l) => l.itemId)
    .map((l) => ({ itemId: l.itemId, amount: String(l.amount ?? 1), unit: l.unit || 'fl_oz' })));
  const [busy, setBusy] = useState(false);
  const known = new Set(items.map((i) => i.id));

  const p = Number(pours);
  const linesOk = lines.length > 0 && (multiReady || lines.length === 1) && lines.length <= 20
    && lines.every((l) => known.has(l.itemId) && Number(l.amount) > 0 && Number(l.amount) <= 100000);
  const valid = action === 'none'
    || (action === 'extra' && p > 0 && p <= 100)
    || (action === 'item' && linesOk);

  const toRule = () => {
    if (action === 'extra') return { action, extraPours: p };
    if (action !== 'item') return { action };
    const out = lines.map((l) => ({ itemId: l.itemId, amount: Number(l.amount), unit: l.unit }));
    return out.length === 1 ? { action: 'item', ...out[0] } : { action: 'items', lines: out };
  };

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const ok = await onSave(toRule());
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
      {choice('extra', 'More of the same drink', 'Like Double: one more pour of the liquor, not the mixer.')}
      {action === 'extra' ? (
        <label className="isu-pos-pour-field">
          <span>Extra pours (Double = 1, Triple = 2)</span>
          <input type="number" inputMode="decimal" min="0" step="any" value={pours} onChange={(e) => setPours(e.target.value)} aria-label="Extra pours" />
        </label>
      ) : null}
      {choice('item', 'Uses other items', 'Like Add Red Bull (one can), Margarita (mix + triple sec), or a side of ranch.')}
      {action === 'item' ? (
        <ItemsurePosModifierLines lines={lines} items={items} multiReady={multiReady} busy={busy} onChange={setLines} />
      ) : null}
      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !valid}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
