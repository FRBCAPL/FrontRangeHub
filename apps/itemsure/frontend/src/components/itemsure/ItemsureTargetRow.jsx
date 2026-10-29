import React from 'react';
import { displayQuantity, sameQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS, targetStatus } from '../../utils/itemsureTargets.js';
import ItemsureStepper from './ItemsureStepper.jsx';

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
  const sameAsPar = !error && minimum.trim() !== '' && par.trim() !== '' && sameQuantity(minimum, par);

  return (
    <li className={`isu-card isu-level-row${dirty ? ' is-dirty' : ''}${error ? ' has-error' : ''}`}>
      <div className="isu-level-name">{item.name}</div>
      <div className="isu-level-meta">
        <span>{areaName}</span>
        <span>{balance ? `On hand ${displayQuantity(balance.quantity_text)} ${unit}` : 'No amount yet'}</span>
        {status && !dirty ? <StatusBadge status={status} /> : null}
        {dirty ? <span className="isu-badge isu-status--warn">Unsaved</span> : null}
      </div>
      {canEdit ? (
        <>
          <div className="isu-level-input isu-level-input--min">
            <span aria-hidden="true">Warn me at</span>
            <ItemsureStepper value={minimum} placeholder="—" label={`warn me at for ${item.name}`}
              aria-label={`Warn me at for ${item.name}, ${areaName}`} onChange={(text) => onChange(key, 'minimum', text)} />
          </div>
          <div className="isu-level-input isu-level-input--par">
            <span aria-hidden="true">Fill up to</span>
            <ItemsureStepper value={par} placeholder="—" label={`fill up to for ${item.name}`}
              aria-label={`Fill up to for ${item.name}, ${areaName}`} onChange={(text) => onChange(key, 'par', text)} />
          </div>
        </>
      ) : (
        <>
          <div className="isu-level-input isu-level-input--min">Warn me at<span className="isu-level-value">{minimum || '—'}</span></div>
          <div className="isu-level-input isu-level-input--par">Fill up to<span className="isu-level-value">{par || '—'}</span></div>
        </>
      )}
      {error ? <p className="isu-error isu-level-error" role="alert">{error}</p> : null}
      {sameAsPar && canEdit ? (
        <p className="isu-muted isu-small isu-level-error">
          Both numbers are the same, so this will show Running low as soon as any is used. &ldquo;Warn me at&rdquo; is usually the lower number.
        </p>
      ) : null}
    </li>
  );
}
