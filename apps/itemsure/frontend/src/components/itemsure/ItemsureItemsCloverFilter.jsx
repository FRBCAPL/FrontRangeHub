import React from 'react';
import { ErrorNote } from './ItemsureUi.jsx';

/** Items page banner while showing only items not matched to Clover. Opening an item is where it's fixed. */
export default function ItemsureItemsCloverFilter({ count, ready, error, onClear }) {
  return (
    <div className="isu-notice isu-items-clover-filter" role="status">
      <ErrorNote message={error} />
      <p>
        <strong>Not matched to Clover{ready ? `: ${count}` : ''}</strong>
        <br />
        <span className="isu-small">
          Open an item, then Match to Clover or mark it Not sold in Clover (kitchen and supply items).
        </span>
      </p>
      <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onClear}>Show all items</button>
    </div>
  );
}
