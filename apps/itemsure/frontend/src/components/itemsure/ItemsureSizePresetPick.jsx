import React from 'react';
import { presetForMl, presetsFor } from '../../utils/itemsureSizePresets.js';

/**
 * Tap a common size ("Half barrel", "750 ml") for an item counted in `unit`. `hint` (item or
 * category names) picks fitting sizes: beer cans for beer, 750 ml for liquor. onPick(preset).
 */
export default function ItemsureSizePresetPick({ unit, hint = '', valueMl, disabled = false, onPick }) {
  const current = presetForMl(valueMl)?.key;
  return (
    <div className="isu-size-presets" role="group" aria-label="Common sizes">
      {presetsFor(unit, hint).map((p) => (
        <button key={p.key} type="button" className={`isu-chip${current === p.key ? ' is-active' : ''}`} aria-pressed={current === p.key} disabled={disabled} onClick={() => onPick(p)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
