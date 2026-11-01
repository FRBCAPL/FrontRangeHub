import React, { useState } from 'react';
import { checkQuantity, sameQuantity, stepQuantity } from '../../utils/itemsureQuantity.js';
import { boughtAmount, boughtDiffers } from '../../utils/itemsureShoppingReceive.js';
import { buyLabel } from '../../utils/itemsureShoppingList.js';

const listedLabel = (row) => (row.extra ? row.amount : buyLabel(row));
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

/** "Bought by Sam · 2:14 PM" for a shared tick, or ''. */
export function boughtBy(tick, names) {
  if (!tick?.by) return '';
  const when = timeOf(tick.at);
  return `Bought by ${names[tick.by] || 'someone'}${when ? ` \u00b7 ${when}` : ''}`;
}

/**
 * The amount on a row. Tap to say how many the shopper is actually getting.
 * When it differs from the list, shows "Got 3 btl" over the list's amount, struck through.
 */
export function GotAmount({ row, tick, onEdit }) {
  const differs = tick && boughtDiffers(row, tick.amount);
  const listed = listedLabel(row);
  return (
    <button
      type="button"
      className={`isu-shop-amount isu-shop-got${differs ? ' is-changed' : ''}${!row.extra && row.total === null ? ' is-unset' : ''}`}
      onClick={onEdit}
      aria-label={`Change how many ${row.name} you are getting`}
    >
      {differs ? (
        <>
          <span className="isu-shop-got-now">Got {tick.amount}{row.extra ? '' : ` ${row.unit}`}</span>
          {listed ? <span className="isu-shop-got-was">{listed}</span> : null}
        </>
      ) : listed || 'Amount'}
      <span className="isu-shop-got-edit" aria-hidden="true">{'\u270e'}</span>
    </button>
  );
}

/**
 * Inline "How many are you getting?" box. Saving also ticks the row. Blank goes back to
 * the list's amount. Item rows are checked against the item's unit; hand-added lines are free text.
 */
export default function ItemsureShoppingGotEditor({ row, tick, item, onSave, onClose }) {
  const [text, setText] = useState(() => (row.extra ? tick?.amount || row.amount || '' : boughtAmount(row, tick?.amount)));
  const [error, setError] = useState('');

  const save = () => {
    const raw = text.trim();
    if (row.extra) {
      onSave(raw === (row.amount || '') ? '' : raw.slice(0, 40));
      onClose();
      return;
    }
    const result = checkQuantity(raw, item?.precision ?? 0, item?.unitName || 'This unit');
    if (result.error) return setError(result.error);
    if (result.value === '0') return setError('Getting none? Untick it instead.');
    onSave(!result.value || (row.total !== null && sameQuantity(result.value, row.total)) ? '' : result.value);
    onClose();
  };

  return (
    <div className="isu-shop-gotedit">
      <label className="isu-small" htmlFor={`got-${row.key}`}>How many are you getting?</label>
      <div className="isu-shop-gotedit-row">
        {row.extra ? null : <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" aria-label="One less" onClick={() => setText((t) => stepQuantity(t, -1))}>{'\u2212'}</button>}
        <input
          id={`got-${row.key}`}
          className="isu-shop-gotedit-input"
          inputMode={row.extra ? 'text' : 'decimal'}
          value={text}
          maxLength={40}
          onChange={(e) => { setText(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
        {row.extra ? null : <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" aria-label="One more" onClick={() => setText((t) => stepQuantity(t, 1))}>+</button>}
        {row.extra ? null : <span className="isu-muted isu-small">{row.unit}</span>}
      </div>
      {listedLabel(row) ? <p className="isu-muted isu-small">The list says {listedLabel(row)}.</p> : null}
      {error ? <p className="isu-shop-gotedit-error isu-small" role="alert">{error}</p> : null}
      <div className="isu-shop-gotedit-actions">
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={save}>Save and tick</button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
