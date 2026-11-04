import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { fillPercent, pluralUnit } from '../../utils/itemsureItemLook.js';
import { fullCases } from '../../utils/itemsureLoose.js';

/**
 * "6 / 12 Bottles" on one line: on hand, par, unit. `summary` is { total, par }. With `pieces`
 * (counting loose ones too), on hand is full cases only; loose ones show on the item page.
 */
export function StockAmount({ summary, unitName, className = '', pieces = 0 }) {
  if (!summary) return null;
  const total = summary.total === null ? null : (pieces && fullCases(summary.total, pieces)) || displayQuantity(summary.total);
  const label = `${total === null ? 'No amount yet' : `${total} on hand`}${summary.par !== null ? `, par ${displayQuantity(summary.par)}` : ''}`;
  return (
    <div className={`isu-stockcard-amount${className ? ` ${className}` : ''}`} aria-label={label} title={summary.par !== null ? 'On hand / par' : 'On hand'}>
      <strong>{total === null ? '\u2013' : total}</strong>
      {summary.par !== null ? <span className="isu-stockcard-par"> / {displayQuantity(summary.par)}</span> : null}
      <span className="isu-stockcard-unit"> {pluralUnit(unitName)}</span>
    </div>
  );
}

/** "Buy from Southern Glazer's", on its own line under the item name. `supplier` is { name, is_active }. */
export function SupplierLine({ supplier }) {
  return (
    <span className="isu-supplier-line" title="Main supplier">
      <span aria-hidden="true">{supplier.icon || '\u26DF'}</span> {supplier.name}{supplier.is_active ? '' : ' (archived)'}
    </span>
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
