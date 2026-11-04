import React, { useState } from 'react';
import { needsContent, POUR_UNITS } from '../../utils/itemsurePosUsage.js';
import { checkContent, contentForm, contentLabel, CONTENT_UNITS } from '../../utils/itemsureItemContent.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureSizePresetPick from './ItemsureSizePresetPick.jsx';

const trimNum = (n) => (n == null ? '' : String(Math.round(n * 1000) / 1000));

/**
 * "How much does one sale use?" for one matched item: e.g. 1.5 oz of rum. Pours in oz or ml
 * out of something counted in bottles also ask once how much a bottle holds.
 * onSave(amount|null, unit, contentMl|undefined).
 */
export default function ItemsurePosPourEdit({ item, unitCode, pour, contentMl, canEdit, busy, onSave }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('fl_oz');
  const [size, setSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('ml');
  const unitName = singularUnit(item.unitName || 'unit').toLowerCase();
  const unitObj = { code: unitCode, name: item.unitName };
  const label = (u) => (u === 'base' ? unitName : POUR_UNITS[u]);

  const start = () => {
    setAmount(trimNum(pour?.amount ?? null));
    setUnit(pour?.unit || 'fl_oz');
    const f = contentForm(contentMl);
    setSize(f.content_size);
    setSizeUnit(f.content_unit);
    setOpen(true);
  };
  const draft = { amount: Number(amount), unit };
  const askSize = needsContent(draft, unitCode);
  const sizeMl = checkContent(size, sizeUnit).ml ?? 0;
  const valid = Number(amount) > 0 && Number(amount) <= 100000 && (!askSize || sizeMl > 0);

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const changedSize = askSize && Math.abs(sizeMl - (contentMl || 0)) > 0.01 ? sizeMl : undefined;
    if (await onSave(Number(amount), unit, changedSize)) setOpen(false);
  };

  if (!open) {
    const summary = pour ? `${trimNum(pour.amount)} ${label(pour.unit)} each sale` : 'Amount not set';
    return (
      <div className="isu-pos-pour">
        <span className={pour ? '' : 'isu-muted'}>{item.name}: {summary}</span>
        {pour && needsContent(pour, unitCode) && !contentMl ? <span className="isu-badge">Size needed</span> : null}
        {pour && needsContent(pour, unitCode) && contentMl ? <span className="isu-muted isu-small">({unitName}: {contentLabel(contentMl)})</span> : null}
        {canEdit ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={start}>
            {pour ? 'Change' : 'Set amount'}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form className="isu-pos-pour-form" onSubmit={save} aria-label={`Amount of ${item.name} each sale`}>
      <label className="isu-pos-pour-field">
        <span>{item.name} used each sale</span>
        <span className="isu-pos-pour-inputs">
          <input type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" autoFocus />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
            <option value="fl_oz">oz</option>
            <option value="ml">ml</option>
            <option value="base">{unitName}</option>
          </select>
        </span>
      </label>
      {askSize ? (
        <div className="isu-pos-pour-field">
          <span>One {unitName} holds</span>
          <ItemsureSizePresetPick unit={unitObj} valueMl={sizeMl} disabled={busy} onPick={(p) => { setSize(p.input.content_size); setSizeUnit(p.input.content_unit); }} />
          <span className="isu-pos-pour-inputs">
            <input type="number" inputMode="decimal" min="0" step="any" value={size} onChange={(e) => setSize(e.target.value)} aria-label={`How much one ${unitName} holds`} placeholder="750" />
            <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} aria-label="Size unit">
              {Object.entries(CONTENT_UNITS).map(([key, u]) => <option key={key} value={key}>{u.label}</option>)}
            </select>
          </span>
        </div>
      ) : null}
      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !valid}>Save</button>
        {pour ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={async () => { if (await onSave(null)) setOpen(false); }}>Clear</button>
        ) : null}
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
