import React from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';

/** A line someone added by hand: a tick box, the name, the amount they typed, and a remove button. */
export default function ItemsureShoppingExtraRow({ row, ticked, onTick, onRemove, busy }) {
  const itemLink = useItemLink();
  return (
    <li className={`isu-shop-row is-extra${ticked ? ' is-ticked' : ''}`}>
      <div className="isu-shop-row-main isu-shop-row-main--extra">
        <button
          type="button"
          className="isu-shop-tick"
          aria-pressed={ticked}
          aria-label={ticked ? `Untick ${row.name}` : `Got ${row.name}`}
          onClick={onTick}
        >
          {ticked ? '\u2713' : ''}
        </button>
        <div className="isu-shop-row-body is-static">
          {row.itemId ? <Link className="isu-shop-name isu-shop-name-link" {...itemLink(row.itemId)}>{row.name}</Link> : <span className="isu-shop-name">{row.name}</span>}
          <span className="isu-shop-where">Added by hand</span>
        </div>
        <span className="isu-shop-amount">{row.amount}</span>
        <button type="button" className="isu-shop-remove" aria-label={`Remove ${row.name} from the list`} onClick={onRemove} disabled={busy}>
          {'\u2715'}
        </button>
      </div>
    </li>
  );
}
