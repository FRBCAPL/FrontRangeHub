import React, { useState } from 'react';
import { POUR_UNITS } from '../../utils/itemsurePosUsage.js';
import { asksContent, checkContent, contentForm, CONTENT_UNITS } from '../../utils/itemsureItemContent.js';
import { isGroupUnit, starterFor } from '../../utils/itemsureCategoryKind.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureSizePresetPick from './ItemsureSizePresetPick.jsx';
import ItemsurePiecesField from './ItemsurePiecesField.jsx';

const trimNum = (n) => (n == null ? '' : String(Math.round(n * 1000) / 1000));

/**
 * One category's amount per sale, plus what that needs: a size for oz/ml pours, or "how many
 * in one" for singles out of a case. A new one starts with ItemSure's guess from the names.
 * Blank amount: a subcategory uses its main category's. onSave(value) returns true when saved.
 */
export default function ItemsureCategoryAmountForm({ row, parentName, piecesReady, busy, onSave, onCancel }) {
  const hint = `${row.category.name} ${parentName}`;
  const starter = row.value ? null : starterFor(hint, row.unit);
  const waitingForSingles = starter?.unit === 'piece' && !piecesReady;
  const guess = waitingForSingles ? null : starter;
  const start = row.value || guess || {};
  const first = contentForm(start.contentMl);
  const [amount, setAmount] = useState(trimNum(start.amount));
  const group = isGroupUnit(row.unit);
  const [unit, setUnit] = useState(start.unit || (group ? (piecesReady ? 'piece' : 'base') : 'fl_oz'));
  const [size, setSize] = useState(first.content_size);
  const [sizeUnit, setSizeUnit] = useState(first.content_unit);
  const [pieces, setPieces] = useState(trimNum(start.pieces));  const unitName = singularUnit(row.unit?.name || 'unit').toLowerCase();
  const offerSingles = piecesReady && (group || unit === 'piece');
  const showSize = (!row.unit || asksContent(row.unit.code)) && (unit === 'fl_oz' || unit === 'ml');
  const showPieces = unit === 'piece' && piecesReady;
  const sized = checkContent(showSize ? size : '', sizeUnit);
  const count = Number(pieces);
  const hasAmount = amount.trim() !== '';
  const amountOk = !hasAmount || (Number(amount) > 0 && Number(amount) <= 100000);
  const piecesOk = !showPieces || (count > 0 && count <= 100000) || (!hasAmount && pieces.trim() === '');
  const valid = amountOk && piecesOk && !sized.error;
  const fallback = parentName ? ` Leave the amount blank to use ${parentName}'s.` : '';

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    await onSave({
      contentMl: showSize ? sized.ml : null,
      amount: hasAmount ? Number(amount) : null,
      unit: hasAmount ? unit : null,
      ...(piecesReady ? { pieces: showPieces && pieces.trim() ? count : null } : {}),    });
  };

  return (
    <form className="isu-pos-pour-form" onSubmit={save} aria-label={`Amounts for ${row.category.name}`}>
      {guess ? <p className="isu-notice isu-small">ItemSure&apos;s guess: {guess.reason}. Check it, then save.</p> : null}
      {waitingForSingles ? (
        <p className="isu-notice isu-small">These look like they&apos;re counted by the {unitName} but sold one at a time. Selling singles from a {unitName} needs a database update first. Ask whoever manages ItemSure to apply it.</p>
      ) : null}
      <label className="isu-pos-pour-field">
        <span>Each one sold uses</span>
        <span className="isu-pos-pour-inputs">
          <input type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount for each one sold" placeholder="1.5" autoFocus />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
            <option value="fl_oz">{POUR_UNITS.fl_oz}</option>
            <option value="ml">{POUR_UNITS.ml}</option>
            <option value="base">whole {unitName}</option>
            {offerSingles ? <option value="piece">single from the {unitName}</option> : null}
          </select>
        </span>
      </label>
      {showSize ? (
        <div className="isu-pos-pour-field">
          <span>One {unitName} holds{group ? ' (everything in it, added up)' : ''}</span>
          <ItemsureSizePresetPick unit={row.unit} hint={hint} valueMl={sized.ml} disabled={busy} onPick={(p) => { setSize(p.input.content_size); setSizeUnit(p.input.content_unit); }} />
          <span className="isu-pos-pour-inputs">
            <input type="number" inputMode="decimal" min="0" step="any" value={size} onChange={(e) => setSize(e.target.value)} aria-label={`How much one ${unitName} holds`} placeholder="750" />
            <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} aria-label="Size unit">
              {Object.entries(CONTENT_UNITS).map(([key, u]) => <option key={key} value={key}>{u.label}</option>)}
            </select>
          </span>
        </div>
      ) : null}
      {showPieces ? <ItemsurePiecesField unitName={unitName} value={pieces} onChange={setPieces} disabled={busy} about={hint} /> : null}      <p className="isu-hint">
        This is for each one Clover sells, so two of the same drink counts twice. Items in {row.category.name} use these unless they have their own.{fallback}
      </p>
      {sized.error ? <p className="isu-error isu-small">{sized.error}</p> : null}
      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !valid}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
