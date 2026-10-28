import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS, targetStatus } from '../../utils/itemsureTargets.js';

function StatusBadge({ status }) {
  const info = TARGET_STATUS[status];
  if (!info) return null;
  return <span className={`isu-badge isu-status--${info.tone}`}>{info.label}</span>;
}

/** One item in one place: on hand, saved status, and editable minimum and par. */
export default function ItemsureTargetRow({ row, edit, error, dirty, canEdit, onChange }) {
  const { key, item, areaName, saved, balance } = row;
  const value = (field, savedText) => edit?.[field] ?? (savedText ? displayQuantity(savedText) : '');
  const minimum = value('minimum', saved?.minimum_text);
  const par = value('par', saved?.par_text);
  const status = targetStatus(saved, balance?.quantity_text);
  const unit = item.unitSymbol;

  return (
    <li className={`isu-card isu-level-row${dirty ? ' is-dirty' : ''}${error ? ' has-error' : ''}`}>
      <div className="isu-level-name">{item.name}</div>
      <div className="isu-level-meta">
        <span>{areaName}</span>
        <span>{balance ? `On hand ${displayQuantity(balance.quantity_text)} ${unit}` : 'Not set up'}</span>
        {status && !dirty ? <StatusBadge status={status} /> : null}
        {dirty ? <span className="isu-badge isu-status--warn">Unsaved</span> : null}
      </div>
      {canEdit ? (
        <>
          <label className="isu-level-input isu-level-input--min">
            Minimum
            <input inputMode="decimal" autoComplete="off" value={minimum} placeholder="—"
              aria-label={`Minimum for ${item.name}, ${areaName}`} onChange={(e) => onChange(key, 'minimum', e.target.value)} />
          </label>
          <label className="isu-level-input isu-level-input--par">
            Par
            <input inputMode="decimal" autoComplete="off" value={par} placeholder="—"
              aria-label={`Par for ${item.name}, ${areaName}`} onChange={(e) => onChange(key, 'par', e.target.value)} />
          </label>
        </>
      ) : (
        <>
          <div className="isu-level-input isu-level-input--min">Minimum<span className="isu-level-value">{minimum || '—'}</span></div>
          <div className="isu-level-input isu-level-input--par">Par<span className="isu-level-value">{par || '—'}</span></div>
        </>
      )}
      {error ? <p className="isu-error isu-level-error" role="alert">{error}</p> : null}
    </li>
  );
}
