import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS, targetStatus } from '../../utils/itemsureTargets.js';

/** "Par 6 · warn 2", or what's missing. */
function levelsLine(saved, unit) {
  if (!saved) return 'No levels yet';
  const par = saved.par_text != null ? `Par ${displayQuantity(saved.par_text)}` : 'No par';
  const min = saved.minimum_text != null ? `warn at ${displayQuantity(saved.minimum_text)}` : 'no warning';
  return `${par} \u00b7 ${min} ${unit}`;
}

/** One item on the Warning levels page: each spot it uses with its levels. Tap to edit them. */
export default function ItemsureTargetItemCard({ item, rows, onOpen, canEdit }) {
  const missing = rows.filter((r) => !r.saved).length;
  return (
    <li>
      <button type="button" className="isu-card isu-target-card" onClick={onOpen} aria-label={`${canEdit ? 'Edit' : 'View'} levels for ${item.name}`}>
        <span className="isu-target-card-head">
          <strong>{item.name}</strong>
          {missing ? <span className="isu-badge isu-status--muted">{missing} spot{missing === 1 ? '' : 's'} without levels</span> : null}
          <span className="isu-target-card-edit">{canEdit ? 'Edit' : 'View'}</span>
        </span>
        <span className="isu-target-card-spots">
          {rows.map((row) => {
            const status = TARGET_STATUS[targetStatus(row.saved, row.balance?.quantity_text)];
            return (
              <span key={row.key} className="isu-target-card-spot">
                <span className="isu-target-card-spot-name">{row.areaName}</span>
                <span className="isu-muted">{levelsLine(row.saved, item.unitSymbol)}</span>
                {status ? <span className={`isu-badge isu-status--${status.tone}`}>{status.label}</span> : <span />}
              </span>
            );
          })}
        </span>
      </button>
    </li>
  );
}
