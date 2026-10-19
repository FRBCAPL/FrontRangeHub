import React, { useState } from 'react';
import { SHOWDOWN_FORMATS, isRecommendedFormat } from '../showdownFormats.js';
import { initialPick, selectFormat, confirmPick, pickProblem } from './showdownFormatPick.js';

function ResetList({ resets }) {
  if (!resets.length) return <p className="sd-note">Nothing else changes. Entrants, entry fee and tables are kept.</p>;
  return (
    <>
      <p className="sd-note">This change resets settings the new format handles differently. Entrants, entry fee and tables are kept.</p>
      <ul className="sd-confirm-list">
        {resets.map((r) => <li key={r.key}>{r.label}: {r.from} {'\u2192'} {r.to}</li>)}
      </ul>
    </>
  );
}

/**
 * Format choice for a new event (`current` null) or a change during setup. The recommended format
 * is preselected, but the action stays disabled until the operator ticks the confirmation.
 */
export default function ShowdownFormatPicker({ current = null, resetsFor = () => [], error = '', onConfirm, onCancel }) {
  const [pick, setPick] = useState(() => initialPick(current));
  const changing = current !== null;
  const problem = pickProblem(pick, current);
  const chosen = SHOWDOWN_FORMATS.find((f) => f.version === pick.selected);
  const showResets = changing && chosen && chosen.version !== current;

  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-confirm sd-format-picker" role="dialog" aria-modal="true" aria-labelledby="sd-format-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-format-title">{changing ? 'Change tournament format' : 'Choose a tournament format'}</h2>
        <fieldset className="sd-format-options">
          <legend className="sd-note">{changing ? 'The format can change until qualifying starts.' : 'The format is locked once qualifying starts.'}</legend>
          {SHOWDOWN_FORMATS.map((f) => (
            <label key={f.version} className={`sd-format-option${pick.selected === f.version ? ' is-selected' : ''}`}>
              <input type="radio" name="sd-format" value={f.version} checked={pick.selected === f.version} onChange={() => setPick((p) => selectFormat(p, f.version))} />
              <span>
                <strong>{`${f.code} \u00b7 ${f.name}`}</strong>
                {isRecommendedFormat(f.version) ? <small className="sd-tag sd-tag-recommended">Recommended</small> : null}
                {changing && f.version === current ? <small className="sd-tag">Current format</small> : null}
                <small className="sd-format-summary">{f.summary}</small>
                {f.startable ? null : <small className="sd-warn">Can be set up now, but cannot be started yet.</small>}
              </span>
            </label>
          ))}
        </fieldset>
        {showResets ? <ResetList resets={resetsFor(chosen.version)} /> : null}
        {chosen && !(changing && chosen.version === current) ? (
          <label className="sd-format-confirm">
            <input type="checkbox" checked={pick.confirmed} onChange={(e) => setPick((p) => confirmPick(p, e.target.checked))} />
            {changing ? `I confirm the change to ${chosen.code}.` : `I confirm this tournament will use ${chosen.code}.`}
          </label>
        ) : null}
        {problem ? <p className="sd-note" aria-live="polite">{problem}</p> : null}
        {error ? <p className="sd-error" role="alert">{error}</p> : null}
        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
          <button type="button" className="sd-btn sd-btn-primary" disabled={Boolean(problem)} onClick={() => onConfirm(pick.selected)}>
            {changing ? `Change to ${chosen?.code || ''}` : 'Create tournament'}
          </button>
        </div>
      </div>
    </div>
  );
}
