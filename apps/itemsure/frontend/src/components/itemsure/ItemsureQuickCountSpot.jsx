import React, { useId } from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { looseText } from '../../utils/itemsureLoose.js';
import ItemsureStepper from './ItemsureStepper.jsx';
import ItemsureLooseInput from './ItemsureLooseInput.jsx';

/**
 * One spot in the quick count window: its name, what's already counted there, and a number box
 * (or "cases + loose" boxes when `pieces` is set).
 */
export default function ItemsureQuickCountSpot({ name, entry, value, onChange, onRemove, problem, conflict, precision, autoFocus, pieces = 0, unitName = '' }) {
  const id = useId();
  const shown = (e) => (pieces && looseText(e.quantity_text, pieces, unitName || e.unit_name))
    || `${displayQuantity(e.quantity_text)} ${e.unit_symbol || e.unit_name || ''}`.trim();
  return (
    <li className={`isu-quickcount-spot${problem || conflict ? ' has-problem' : ''}`}>
      <div className="isu-quickcount-spot-head">
        <label htmlFor={id}><strong>{name}</strong></label>
        {onRemove ? (
          <button type="button" className="isu-link" onClick={onRemove} aria-label={`Remove ${name}`}>Remove</button>
        ) : null}
      </div>
      {pieces ? (
        <ItemsureLooseInput id={id} value={value} onChange={onChange} pieces={pieces} precision={precision} unitName={unitName} label={`${name} count`} />
      ) : (
        <ItemsureStepper
          id={id}
          value={value}
          onChange={onChange}
          label={`${name} count`}
          inputMode={precision > 0 ? 'decimal' : 'numeric'}
          placeholder="—"
          autoFocus={autoFocus}
        />
      )}
      <p className="isu-muted isu-small isu-quickcount-hint">
        {entry
          ? `Already counted: ${shown(entry)}. Change it only to fix a mistake; if stock changed here since it was counted, changing it means a recount.`
          : 'Not counted here yet. Leave blank to skip.'}
      </p>
      {conflict ? (
        <p className="isu-quickcount-conflict" role="alert">
          Someone else just counted this spot: <strong>{entry ? shown(entry) : 'cleared'}</strong>. Save again to use your number.
        </p>
      ) : null}
      {problem ? <p className="isu-quickcount-problem" role="alert">{problem}</p> : null}
    </li>
  );
}
