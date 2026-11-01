import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';
import ItemsureShoppingGotEditor, { boughtBy, GotAmount } from './ItemsureShoppingGot.jsx';

/**
 * A line someone added by hand: a tick box, the name, the amount they typed (tap to say
 * what the shopper got), and a remove button. `tick` ({ amount, by, at }) when ticked.
 */
export default function ItemsureShoppingExtraRow({ row, tick, names, onTick, onSetAmount, onRemove, busy }) {
  const [editing, setEditing] = useState(false);
  const itemLink = useItemLink();
  const ticked = Boolean(tick);
  const by = boughtBy(tick, names);
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
          {by ? <span className="isu-shop-by">{by}</span> : null}
        </div>
        <GotAmount row={row} tick={tick} onEdit={() => setEditing((e) => !e)} />
        <button type="button" className="isu-shop-remove" aria-label={`Remove ${row.name} from the list`} onClick={onRemove} disabled={busy}>
          {'\u2715'}
        </button>
      </div>
      {editing ? <ItemsureShoppingGotEditor row={row} tick={tick} onSave={onSetAmount} onClose={() => setEditing(false)} /> : null}
    </li>
  );
}
