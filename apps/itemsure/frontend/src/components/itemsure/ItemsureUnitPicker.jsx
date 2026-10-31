import React, { useState } from 'react';
import { Field } from './ItemsureUi.jsx';
import ItemsureUnitChooser from './ItemsureUnitChooser.jsx';

/**
 * "Counted in": a button showing the unit ("Bottle (btl)") that opens a window to pick it.
 * Units named there are saved right away; `onAdded(row)` lets the parent remember them.
 */
export default function ItemsureUnitPicker({ organizationId, units, items = [], value, onChange, canManage, onAdded, hint }) {
  const [open, setOpen] = useState(false);
  const unit = units.find((u) => u.id === value);
  const label = unit ? `${unit.name}${unit.symbol && unit.symbol !== unit.name ? ` (${unit.symbol})` : ''}` : '';

  return (
    <>
      <Field label="Counted in" hint={hint}>
        <button type="button" className={`isu-catpick-button${label ? '' : ' is-empty'}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <span>{label || 'Choose a unit'}</span>
          <span className="isu-catpick-change">{label ? 'Change' : 'Choose'} {'\u203A'}</span>
        </button>
      </Field>
      <ItemsureUnitChooser
        open={open}
        organizationId={organizationId}
        units={units}
        items={items}
        value={value}
        canManage={canManage}
        onChoose={onChange}
        onAdded={onAdded}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
