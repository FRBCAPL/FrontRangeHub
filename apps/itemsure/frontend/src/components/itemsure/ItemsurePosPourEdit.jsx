import React, { useState } from 'react';
import { needsContent, needsPieces, POUR_UNITS } from '../../utils/itemsurePosUsage.js';
import { checkContent, contentForm, contentLabel, CONTENT_UNITS } from '../../utils/itemsureItemContent.js';
import { DEFAULT_PIECES, isGroupUnit } from '../../utils/itemsureCategoryKind.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureSizePresetPick from './ItemsureSizePresetPick.jsx';
import ItemsurePiecesField from './ItemsurePiecesField.jsx';

const trimNum = (n) => (n == null ? '' : String(Math.round(n * 1000) / 1000));

/**
 * "How much does one sale use?" for one matched item: e.g. 1.5 oz of rum, or 1 single from a
 * case. Pours in oz or ml out of something counted in bottles also ask once how much a bottle
 * holds; singles ask once how many come in the case. A `pour` with fromCategory (or a
 * `sizeFrom` / `piecesFrom`) comes from the item's category; saving here gives it its own.
 * onSave(amount|null, unit, contentMl|undefined, pieces|undefined).
 */
export default function ItemsurePosPourEdit({
  item, unitCode, unit: countedUnit = null, pour, contentMl, sizeFrom = '', pieces, piecesFrom = '', piecesReady = false, canEdit, busy, onSave,
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('fl_oz');
  const [size, setSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('ml');
  const [count, setCount] = useState('');
  const unitName = singularUnit(item.unitName || 'unit').toLowerCase();
  const unitObj = countedUnit || { code: unitCode, name: item.unitName };
  const offerSingles = piecesReady && (isGroupUnit(unitObj) || pour?.unit === 'piece');
  const label = (u, n) => ({ base: unitName, piece: n === 1 ? `single from the ${unitName}` : `singles from the ${unitName}` }[u] || POUR_UNITS[u]);

  const start = () => {
    setAmount(trimNum(pour?.amount ?? null));
    setUnit(pour?.unit || (isGroupUnit(unitObj) ? (piecesReady ? 'piece' : 'base') : 'fl_oz'));
    const f = contentForm(contentMl);
    setSize(f.content_size);
    setSizeUnit(f.content_unit);
    setCount(trimNum(pieces ?? DEFAULT_PIECES));
    setOpen(true);
  };
  const draft = { amount: Number(amount), unit };
  const askSize = needsContent(draft, unitCode);
  const askCount = needsPieces(draft);
  const sizeMl = checkContent(size, sizeUnit).ml ?? 0;
  const n = Number(count);
  const valid = Number(amount) > 0 && Number(amount) <= 100000 && (!askSize || sizeMl > 0) && (!askCount || (n > 0 && n <= 100000));

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const changedSize = askSize && Math.abs(sizeMl - (contentMl || 0)) > 0.01 ? sizeMl : undefined;
    const changedCount = askCount && n !== pieces ? n : undefined;
    if (await onSave(Number(amount), unit, changedSize, changedCount)) setOpen(false);
  };

  const fromCategory = pour?.fromCategory || '';
  if (!open) {
    const summary = pour ? `${trimNum(pour.amount)} ${label(pour.unit, pour.amount)} each sale` : 'Amount not set';
    return (
      <div className="isu-pos-pour">
        <span className={pour ? '' : 'isu-muted'}>{item.name}: {summary}</span>
        {fromCategory ? <span className="isu-muted isu-small">(uses {fromCategory})</span> : null}
        {pour && needsContent(pour, unitCode) && !contentMl ? <span className="isu-badge">Size needed</span> : null}
        {pour && needsContent(pour, unitCode) && contentMl ? (
          <span className="isu-muted isu-small">({unitName}: {contentLabel(contentMl)}{sizeFrom ? `, uses ${sizeFrom}` : ''})</span>
        ) : null}
        {needsPieces(pour) && !pieces ? <span className="isu-badge">Count needed</span> : null}
        {needsPieces(pour) && pieces ? (
          <span className="isu-muted isu-small">({trimNum(pieces)} in a {unitName}{piecesFrom ? `, uses ${piecesFrom}` : ''})</span>
        ) : null}
        {canEdit ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={start}>
            {!pour ? 'Set amount' : fromCategory ? 'Set its own' : 'Change'}
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
            {offerSingles ? <option value="piece">single from the {unitName}</option> : null}
          </select>
        </span>
      </label>
      {askSize ? (
        <div className="isu-pos-pour-field">
          <span>One {unitName} holds{isGroupUnit(unitObj) ? ' (everything in it, added up)' : ''}</span>
          <ItemsureSizePresetPick unit={unitObj} hint={`${item.name} ${item.categoryName || ''}`} valueMl={sizeMl} disabled={busy} onPick={(p) => { setSize(p.input.content_size); setSizeUnit(p.input.content_unit); }} />
          <span className="isu-pos-pour-inputs">
            <input type="number" inputMode="decimal" min="0" step="any" value={size} onChange={(e) => setSize(e.target.value)} aria-label={`How much one ${unitName} holds`} placeholder="750" />
            <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} aria-label="Size unit">
              {Object.entries(CONTENT_UNITS).map(([key, u]) => <option key={key} value={key}>{u.label}</option>)}
            </select>
          </span>
        </div>
      ) : null}
      {askCount ? <ItemsurePiecesField unitName={unitName} value={count} onChange={setCount} disabled={busy} about={`${item.name} ${item.categoryName || ''}`} /> : null}
      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !valid}>Save</button>
        {pour && !fromCategory ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={async () => { if (await onSave(null)) setOpen(false); }}>Clear</button>
        ) : null}
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
