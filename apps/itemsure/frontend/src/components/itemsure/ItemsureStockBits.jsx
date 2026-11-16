import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { fillPercent, pluralUnit } from '../../utils/itemsureItemLook.js';
import { fullCases } from '../../utils/itemsureLoose.js';
import Tip from './ItemsureTip.jsx';

/**
 * "6 / 12 Bottles" on one line: on hand, par, unit. `summary` is { total, par }. With `pieces`
 * (counting loose ones too), on hand is full cases only; loose ones show on the item page.
 */
export function StockAmount({ summary, unitName, className = '', pieces = 0 }) {
  if (!summary) return null;
  const total = summary.total === null ? null : (pieces && fullCases(summary.total, pieces)) || displayQuantity(summary.total);
  const label = `${total === null ? 'No amount yet' : `${total} on hand`}${summary.par !== null ? `, par ${displayQuantity(summary.par)}` : ''}`;
  return (
    <Tip label={summary.par !== null ? 'On hand / restock target (par)' : 'On hand'}>
      <div className={`isu-stockcard-amount${className ? ` ${className}` : ''}`} aria-label={label}>
        <strong>{total === null ? '\u2013' : total}</strong>
        {summary.par !== null ? <span className="isu-stockcard-par"> / {displayQuantity(summary.par)}</span> : null}
        <span className="isu-stockcard-unit"> {pluralUnit(unitName)}</span>
      </div>
    </Tip>
  );
}

/**
 * "Buy from Southern Glazer's", on its own line under the item name.
 * `supplier` is { name, is_active, icon? }. Optional `note` (e.g. "from $9.25").
 */
export function SupplierLine({ supplier, note = '' }) {
  return (
    <Tip label="Usual buy-from supplier">
      <span className="isu-supplier-line">
        <span aria-hidden="true">{supplier.icon || '\u26DF'}</span> {supplier.name}{supplier.is_active ? '' : ' (archived)'}
        {note ? <span className="isu-supplier-line-note"> · {note}</span> : null}
      </span>
    </Tip>
  );
}

const STATUS_TIP = {
  low: 'At or under the warn-at level',
  below_par: 'Above warn-at, still under fill-up-to',
  at_target: 'On hand matches fill-up-to',
  above_target: 'More on hand than fill-up-to',
  above_minimum: 'Above warn-at with no fill-up-to set',
  not_set_up: 'No on-hand amount recorded yet',
};

/** The bar comparing on hand with par, coloured by status, plus the status words. `summary` is { total, par, status }. */
export function StockBar({ summary }) {
  if (!summary) return null;
  const status = summary.status ? TARGET_STATUS[summary.status] : null;
  const tone = status?.tone || 'muted';
  const tip = status ? STATUS_TIP[summary.status] : 'Set a fill-up-to level to track restock';
  return (
    <div className="isu-stockcard-status">
      {summary.par !== null ? (
        <Tip label="How full vs fill-up-to (par)">
          <div className="isu-stockbar" aria-hidden="true">
            <div className={`isu-stockbar-fill isu-stockbar--${tone}`} style={{ width: `${fillPercent(summary.total, summary.par)}%` }} />
          </div>
        </Tip>
      ) : null}
      <Tip label={tip}>
        <span className={`isu-stockcard-label isu-stockcard-label--${summary.par !== null || status ? tone : 'muted'}`}>
          {status ? status.label : 'No par set'}
        </span>
      </Tip>
    </div>
  );
}
