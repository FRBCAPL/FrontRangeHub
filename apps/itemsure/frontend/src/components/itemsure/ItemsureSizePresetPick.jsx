import React from 'react';
import { presetForMl, presetsFor } from '../../utils/itemsureSizePresets.js';

/** Tap a common size ("Half barrel", "750 ml") for an item counted in `unit`. onPick(preset). */
export default function ItemsureSizePresetPick({ unit, valueMl, disabled = false, onPick }) {
  const current = presetForMl(valueMl)?.key;
  return (
    <div className="isu-size-presets" role="group" aria-label="Common sizes">
      {presetsFor(unit).map((p) => (
        <button key={p.key} type="button" className={`isu-chip${current === p.key ? ' is-active' : ''}`} aria-pressed={current === p.key} disabled={disabled} onClick={() => onPick(p)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
