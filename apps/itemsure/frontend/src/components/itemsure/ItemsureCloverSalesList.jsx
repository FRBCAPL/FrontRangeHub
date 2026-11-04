import React from 'react';
import { shortQty } from '../../utils/itemsurePosUsage.js';
import { modifierNotes } from '../../utils/itemsurePosModifiers.js';

const usedText = (row) => {
  if (row.complete) return `About ${shortQty(row.used)} ${row.unit} of stock`;
  if (row.used > 0) return `At least ${shortQty(row.used)} ${row.unit} (some amounts per sale not set)`;
  return row.missingPour.length ? 'Amount per sale not set' : 'Size not set';
};

/** One line per item: how many Clover sales used it, how much stock that is, and which Clover buttons. */
export default function ItemsureCloverSalesList({ rows, onFix }) {
  return (
    <ul className="isu-sales-list" aria-label="Sales by item">
      {rows.map((row) => (
        <li key={row.itemId} className="isu-sales-row">
          <div className="isu-sales-row-top">
            <strong>{row.name}</strong>
            {row.sold > 0 ? (
              <span className="isu-sales-sold"><strong>{shortQty(row.sold)}</strong> sold</span>
            ) : (
              <span className="isu-sales-sold isu-muted isu-small">Only in modifiers</span>
            )}
          </div>
          <span className={row.complete ? 'isu-small' : 'isu-small isu-sales-unset'}>{usedText(row)}</span>
          {row.buttons.length > 1 || (row.buttons[0] && row.buttons[0].name !== row.name) ? (
            <span className="isu-muted isu-small">
              From Clover: {row.buttons.map((b) => `${b.name} (${shortQty(b.sold)})`).join(', ')}
            </span>
          ) : null}
          {row.modifiers?.length ? (
            <span className="isu-muted isu-small">Includes modifiers: {modifierNotes(row.modifiers)}</span>
          ) : null}
          {onFix && !row.complete && row.buttons.length ? (
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => onFix(row)}>Fix it</button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
