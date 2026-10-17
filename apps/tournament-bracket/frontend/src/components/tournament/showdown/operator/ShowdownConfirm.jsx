import React, { useState } from 'react';
import { RESET_CONFIRM_WORD } from '../showdownRules.js';

/**
 * Confirmation for operator actions. `typed` requires the operator to type RESET first
 * (used for anything that wipes later results).
 */
export default function ShowdownConfirm({ title, message, details = [], typed = false, confirmLabel = 'Confirm', danger = false, error = '', onConfirm, onCancel }) {
  const [text, setText] = useState('');
  const ready = !typed || text.trim().toUpperCase() === RESET_CONFIRM_WORD;
  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-confirm" role="dialog" aria-modal="true" aria-labelledby="sd-confirm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-confirm-title">{title}</h2>
        {message ? <p>{message}</p> : null}
        {details.length ? (
          <ul className="sd-confirm-list">
            {details.map((d) => <li key={d}>{d}</li>)}
          </ul>
        ) : null}
        {typed ? (
          <label className="sd-field">
            Type {RESET_CONFIRM_WORD} to confirm
            <input value={text} onChange={(e) => setText(e.target.value)} autoFocus autoComplete="off" aria-label={`Type ${RESET_CONFIRM_WORD} to confirm`} />
          </label>
        ) : null}
        {error ? <p className="sd-error" role="alert">{error}</p> : null}
        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
          <button type="button" className={danger ? 'sd-btn sd-btn-danger' : 'sd-btn sd-btn-primary'} disabled={!ready} onClick={() => onConfirm(text)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
