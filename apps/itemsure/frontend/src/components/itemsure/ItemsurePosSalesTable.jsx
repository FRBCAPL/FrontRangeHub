import React, { useMemo, useState } from 'react';
import { shortQty } from '../../utils/itemsurePosUsage.js';
import { modifierNotes } from '../../utils/itemsurePosModifiers.js';
import { SALES_SORT_COLUMNS, sortSalesRows, toggleSalesSort } from '../../utils/itemsurePosSalesSort.js';

const CLOSE = 0.05;

function DifferenceCell({ row }) {
  if (row.notCounted) return <span className="isu-muted isu-small">No start-and-end count</span>;
  if (row.sold === 0 && !row.modifiers?.length) return <span className="isu-muted isu-small">No Clover sales</span>;
  if (row.missingPour.length || row.missingContent) return <span className="isu-muted isu-small">Can&apos;t compare yet</span>;
  const d = row.difference;
  const near = Math.abs(d) <= Math.max(CLOSE, Math.abs(row.expected) * 0.05);
  if (near) return <span className="isu-pos-diff is-ok">About right</span>;
  return d > 0
    ? <span className="isu-pos-diff is-more">{shortQty(d)} {row.unit} more between counts than Clover</span>
    : <span className="isu-pos-diff is-less">{shortQty(-d)} {row.unit} more from Clover than the counts</span>;
}

function SalesUsed({ row }) {
  if (!row.sold && !row.modifiers?.length) return '—';
  const unset = row.missingPour.length || row.missingContent;
  if (!unset) return `${shortQty(row.expected)} ${row.unit}`;
  if (row.expected > 0) return `${shortQty(row.expected)}+ ${row.unit}`;
  return <span className="isu-sales-unset">{row.missingPour.length ? 'amount per sale not set' : 'size not set'}</span>;
}

const mark = (dir) => (dir === 'asc' ? ' \u2191' : ' \u2193');

/** One line per item: how many Clover sales, how much stock they should have used, what counts say, and the gap. */
export default function ItemsurePosSalesTable({ rows, posNames, onFix }) {
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const shown = useMemo(() => sortSalesRows(rows, sort), [rows, sort]);
  if (!rows.length) return <p className="isu-muted">Need items on both the starting count and the ending count to see the difference between them. Nothing matched to Clover sold in this stretch either.</p>;
  return (
    <div className="isu-pos-report-wrap">
      <div className="isu-pos-report-head" role="group" aria-label="Sort the list">
        {SALES_SORT_COLUMNS.map((col) => {
          const on = sort.key === col.key;
          const how = col.key === 'name'
            ? (sort.dir === 'asc' ? 'A to Z' : 'Z to A')
            : (sort.dir === 'desc' ? 'highest first' : 'lowest first');
          return (
            <button
              key={col.key}
              type="button"
              className={`isu-pos-report-sort${on ? ' is-on' : ''}`}
              aria-pressed={on}
              aria-label={on ? `${col.label}, sorted ${how}. Tap to reverse` : `Sort by ${col.label}`}
              onClick={() => setSort((s) => toggleSalesSort(s, col.key))}
            >
              {col.label}{on ? mark(sort.dir) : ''}
            </button>
          );
        })}
      </div>
      <ul className="isu-pos-report" aria-label="Sales compared with counts">
        {shown.map((row) => (
          <li key={row.itemId} className="isu-pos-report-row">
            <strong className="isu-pos-report-name">{row.name}</strong>
            <span><span className="isu-muted isu-small">Clover sold </span>{row.sold ? shortQty(row.sold) : '—'}</span>
            <span><span className="isu-muted isu-small">Clover used </span><SalesUsed row={row} /></span>
            <span><span className="isu-muted isu-small">Between counts </span>{row.counted == null ? '—' : `${shortQty(row.counted)} ${row.unit}`}</span>
            <DifferenceCell row={row} />
            {row.modifiers?.length ? (
              <span className="isu-muted isu-small isu-pos-report-note">Includes modifiers: {modifierNotes(row.modifiers)}</span>
            ) : null}
            {row.missingPour.length ? (
              <span className="isu-badge">Set the amount for {row.missingPour.map((id) => posNames.get(id) || 'a Clover item').join(', ')}</span>
            ) : null}
            {row.missingContent ? <span className="isu-badge">Size needed</span> : null}
            {onFix && (row.missingPour.length || row.missingContent) ? (
              <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => onFix(row)}>Fix it</button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
