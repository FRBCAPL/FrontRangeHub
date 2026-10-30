import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { fillPercent, pluralUnit } from '../../utils/itemsureItemLook.js';

/** "6 / 12 Bottles" on one line: on hand, par, unit. `summary` is { total, par }. */
export function StockAmount({ summary, unitName, className = '' }) {
  if (!summary) return null;
  const label = `${summary.total === null ? 'No amount yet' : `${displayQuantity(summary.total)} on hand`}${summary.par !== null ? `, par ${displayQuantity(summary.par)}` : ''}`;
  return (
    <div className={`isu-stockcard-amount${className ? ` ${className}` : ''}`} aria-label={label} title={summary.par !== null ? 'On hand / par' : 'On hand'}>
      <strong>{summary.total === null ? '\u2013' : displayQuantity(summary.total)}</strong>
      {summary.par !== null ? <span className="isu-stockcard-par"> / {displayQuantity(summary.par)}</span> : null}
      <span className="isu-stockcard-unit"> {pluralUnit(unitName)}</span>
    </div>
  );
}

/** The bar comparing on hand with par, coloured by status, plus the status words. `summary` is { total, par, status }. */
export function StockBar({ summary }) {
  if (!summary) return null;
  const status = summary.status ? TARGET_STATUS[summary.status] : null;
  const tone = status?.tone || 'muted';
  return (
    <div className="isu-stockcard-status">
      {summary.par !== null ? (
        <div className="isu-stockbar" aria-hidden="true">
          <div className={`isu-stockbar-fill isu-stockbar--${tone}`} style={{ width: `${fillPercent(summary.total, summary.par)}%` }} />
        </div>
      ) : null}
      <span className={`isu-stockcard-label isu-stockcard-label--${summary.par !== null || status ? tone : 'muted'}`}>
        {status ? status.label : 'No par set'}
      </span>
    </div>
  );
}
