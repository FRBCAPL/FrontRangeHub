import React, { useMemo, useState } from 'react';
import { shortQty } from '../../utils/itemsurePosUsage.js';
import { modifierNotes } from '../../utils/itemsurePosModifiers.js';
import { salesGapLabel } from '../../utils/itemsurePosFixGap.js';
import { CLOVER_SALES_SORT, sortCloverSalesRows, toggleCloverSalesSort } from '../../utils/itemsureCloverSalesSort.js';

const usedText = (row) => {
  if (row.complete) return `About ${shortQty(row.used)} ${row.unit} of stock`;
  if (row.used > 0) return `At least ${shortQty(row.used)} ${row.unit} (some amounts per sale not set)`;
  return salesGapLabel(row) || 'Can’t compare yet';
};

const mark = (dir) => (dir === 'asc' ? ' \u2191' : ' \u2193');

/** One line per item: how many Clover sales used it, how much stock that is, and which Clover buttons. */
export default function ItemsureCloverSalesList({ rows, onFix }) {
  const [sort, setSort] = useState({ key: 'sold', dir: 'desc' });
  const shown = useMemo(() => sortCloverSalesRows(rows, sort), [rows, sort]);

  return (
    <div className="isu-clover-sales-list">
      <div className="isu-pos-report-head isu-clover-sales-sort" role="group" aria-label="Sort the list">
        {CLOVER_SALES_SORT.map((col) => {
          const on = sort.key === col.key;
          const how = col.key === 'name' || col.key === 'category'
            ? (sort.dir === 'asc' ? 'A to Z' : 'Z to A')
            : col.key === 'needsFix'
              ? (sort.dir === 'asc' ? 'needs fix first' : 'complete first')
              : (sort.dir === 'desc' ? 'highest first' : 'lowest first');
          return (
            <button
              key={col.key}
              type="button"
              className={`isu-pos-report-sort${on ? ' is-on' : ''}`}
              aria-pressed={on}
              aria-label={on ? `${col.label}, sorted ${how}. Tap to reverse` : `Sort by ${col.label}`}
              onClick={() => setSort((s) => toggleCloverSalesSort(s, col.key))}
            >
              {col.label}{on ? mark(sort.dir) : ''}
            </button>
          );
        })}
      </div>
      <ul className="isu-sales-list" aria-label="Sales by item">
        {shown.map((row) => (
          <li key={row.itemId} className="isu-sales-row">
            <div className="isu-sales-row-top">
              <strong>{row.name}</strong>
              {row.sold > 0 ? (
                <span className="isu-sales-sold"><strong>{shortQty(row.sold)}</strong> sold</span>
              ) : (
                <span className="isu-sales-sold isu-muted isu-small">Only in modifiers</span>
              )}
            </div>
            {row.categoryLabel ? (
              <span className="isu-muted isu-small">{row.categoryLabel}</span>
            ) : null}
            <span className={row.complete ? 'isu-small' : 'isu-small isu-sales-unset'}>{usedText(row)}</span>
            {row.buttons.length > 1 || (row.buttons[0] && row.buttons[0].name !== row.name) ? (
              <span className="isu-muted isu-small">
                From Clover: {row.buttons.map((b) => `${b.name} (${shortQty(b.sold)})`).join(', ')}
              </span>
            ) : null}
            {row.modifiers?.length ? (
              <span className="isu-muted isu-small">Includes modifiers: {modifierNotes(row.modifiers)}</span>
            ) : null}
            {onFix && !row.complete && (row.buttons.length || row.modifiers?.length) ? (
              <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => onFix(row)}>Fix it</button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
