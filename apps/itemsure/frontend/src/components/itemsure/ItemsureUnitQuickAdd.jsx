import React, { useState } from 'react';
import { createUnit } from '../../services/itemsureItemService.js';
import { findUnit } from '../../utils/itemsureUnits.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

/**
 * "+ Name your own unit" (for example Keg or Tray). Saves it right away; a name that
 * already exists picks that unit instead. `onPicked(row, isNew)` receives the unit.
 */
export default function ItemsureUnitQuickAdd({ organizationId, units, startName = '', onPicked }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    setName(startName.trim());
    setSymbol('');
    setError('');
    setOpen(true);
  };

  const save = async () => {
    const existing = findUnit(units, name);
    if (existing) {
      onPicked(existing, false);
      return;
    }
    setBusy(true);
    setError('');
    try {
      onPicked(await createUnit(organizationId, { name, symbol }), true);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="isu-btn isu-btn--ghost isu-btn--block" onClick={start}>
        + Name your own unit
      </button>
    );
  }
  return (
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
      <div className="isu-quickcount-actions">
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !name.trim()} onClick={save}>
          {busy ? 'Saving…' : 'Add and choose it'}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
