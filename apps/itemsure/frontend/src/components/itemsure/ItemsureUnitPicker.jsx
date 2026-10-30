import React, { useState } from 'react';
import { createUnit } from '../../services/itemsureItemService.js';
import { findUnit } from '../../utils/itemsureUnits.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const OTHER = '__other__';

/**
 * "Counted in" dropdown. "Other…" lets the business name its own unit (for example Keg or Tray),
 * saves it right away, and selects it. `onAdded(row)` lets the parent remember it.
 */
export default function ItemsureUnitPicker({ organizationId, units, value, onChange, canManage, onAdded, hint }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = (id) => {
    if (id !== OTHER) {
      setAdding(false);
      onChange(id);
      return;
    }
    setAdding(true);
    setName('');
    setSymbol('');
    setDecimals(false);
    setError('');
  };

  const save = async () => {
    const existing = findUnit(units, name);
    if (existing) {
      onChange(existing.id);
      setAdding(false);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const row = await createUnit(organizationId, { name, symbol, decimals });
      onAdded?.(row);
      onChange(row.id);
      setAdding(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const own = units.filter((u) => u.organization_id);
  const shared = units.filter((u) => !u.organization_id);
  const option = (u) => <option key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ''}</option>;

  return (
    <>
      <Field label="Counted in" hint={hint}>
        <select value={adding ? OTHER : value} onChange={(e) => pick(e.target.value)}>
          {own.length ? (
            <>
              <optgroup label="Standard">{shared.map(option)}</optgroup>
              <optgroup label="Your units">{own.map(option)}</optgroup>
            </>
          ) : shared.map(option)}
          {canManage ? <option value={OTHER}>Other… (name your own)</option> : null}
        </select>
      </Field>
      {adding ? (
        <div className="isu-unit-add">
          <Field label="Unit name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder="For example: Keg, Tray, Sleeve"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (name.trim()) save();
                }
              }}
            />
          </Field>
          <Field label="Short name (optional)" hint="Shown next to amounts, for example 12 kg.">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} maxLength={16} placeholder="kg" />
          </Field>
          <fieldset className="isu-unit-add-parts">
            <legend>How is it counted?</legend>
            <label><input type="radio" checked={!decimals} onChange={() => setDecimals(false)} /> Whole numbers only (1, 2, 3)</label>
            <label><input type="radio" checked={decimals} onChange={() => setDecimals(true)} /> Allow parts (0.5, 1.25)</label>
          </fieldset>
          <div className="isu-quickcount-actions">
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !name.trim()} onClick={save}>
              {busy ? 'Saving…' : 'Add unit'}
            </button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <ErrorNote message={error} />
        </div>
      ) : null}
    </>
  );
}
