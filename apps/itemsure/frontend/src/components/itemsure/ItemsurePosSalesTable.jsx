import React from 'react';
import { shortQty } from '../../utils/itemsurePosUsage.js';
import { modifierNotes } from '../../utils/itemsurePosModifiers.js';

const CLOSE = 0.05;

function DifferenceCell({ row }) {
  if (row.notCounted) return <span className="isu-muted isu-small">Not counted both times</span>;
  if (row.sold === 0 && !row.modifiers?.length) return <span className="isu-muted isu-small">No Clover sales</span>;
  if (row.missingPour.length || row.missingContent) return <span className="isu-muted isu-small">Can&apos;t compare yet</span>;
  const d = row.difference;
  const near = Math.abs(d) <= Math.max(CLOSE, Math.abs(row.expected) * 0.05);
  if (near) return <span className="isu-pos-diff is-ok">About right</span>;
  return d > 0
    ? <span className="isu-pos-diff is-more">{shortQty(d)} {row.unit} more used than sold</span>
    : <span className="isu-pos-diff is-less">{shortQty(-d)} {row.unit} less used than sold</span>;
}

function SalesUsed({ row }) {
  if (!row.sold && !row.modifiers?.length) return '—';
  const unset = row.missingPour.length || row.missingContent;
  if (!unset) return `${shortQty(row.expected)} ${row.unit}`;
  if (row.expected > 0) return `${shortQty(row.expected)}+ ${row.unit}`;
  return <span className="isu-sales-unset">{row.missingPour.length ? 'amount per sale not set' : 'size not set'}</span>;
}

/** One line per item: how many Clover sales, how much stock they should have used, what counts say, and the gap. */
export default function ItemsurePosSalesTable({ rows, posNames, onFix }) {
  if (!rows.length) return <p className="isu-muted">Nothing to compare: no spot was counted in both, and nothing matched to Clover sold.</p>;
  return (
    <ul className="isu-pos-report" aria-label="Sales compared with counts">
      {rows.map((row) => (
        <li key={row.itemId} className="isu-pos-report-row">
          <strong className="isu-pos-report-name">{row.name}</strong>
          <span><span className="isu-muted isu-small">Sold </span>{row.sold ? shortQty(row.sold) : '—'}</span>
          <span><span className="isu-muted isu-small">Sales used </span><SalesUsed row={row} /></span>
          <span><span className="isu-muted isu-small">Counts used </span>{row.counted == null ? '—' : `${shortQty(row.counted)} ${row.unit}`}</span>
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
  );
}
