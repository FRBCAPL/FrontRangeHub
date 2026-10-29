import React from 'react';
import { quantitySign, stepQuantity } from '../../utils/itemsureQuantity.js';

/**
 * Quantity input with − and + buttons (one whole unit per tap). Typing still
 * works. Extra props (id, aria-*, placeholder, onBlur) go to the input, so it
 * can sit inside <Field> like a plain input.
 */
export default function ItemsureStepper({ value, onChange, label = 'quantity', className = '', disabled = false, ...inputProps }) {
  const text = String(value ?? '');
  const cannotGoDown = disabled || text.trim() === '' || quantitySign(text) === 0;

  return (
    <div className={`isu-stepper${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="isu-stepper-btn"
        aria-label={`Decrease ${label}`}
        disabled={cannotGoDown}
        onClick={() => onChange(stepQuantity(text, -1))}
      >
        {'\u2212'}
      </button>
      <input
        inputMode="decimal"
        autoComplete="off"
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        {...inputProps}
      />
      <button
        type="button"
        className="isu-stepper-btn"
        aria-label={`Increase ${label}`}
        disabled={disabled}
        onClick={() => onChange(stepQuantity(text, 1))}
      >
        +
      </button>
    </div>
  );
}
