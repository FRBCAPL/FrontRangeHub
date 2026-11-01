import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';
import { displayQuantity, wholeToBuy } from '../../utils/itemsureQuantity.js';
import { spotLabel } from '../../utils/itemsureShoppingList.js';
import ItemsureShoppingGotEditor, { boughtBy, GotAmount } from './ItemsureShoppingGot.jsx';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site } from '../../data/itemsureTerms.js';

const q = (text) => (text === null || text === undefined ? '—' : displayQuantity(text));

function SpotDetail({ spot, unit, withLocation }) {
  const { rec, amount } = spot;
  const levelsLink = `${ITEMSURE_PATH}/levels?location=${rec.location_id}&area=${rec.storage_area_id || ''}&search=${encodeURIComponent(rec.item_name)}`;
  return (
    <li>
      <strong>{spotLabel(rec, withLocation)}</strong>
      <span className="isu-muted"> · has {q(rec.on_hand)} · warn at {q(rec.minimum)} · fill to {q(rec.par)}</span>
      {amount === null ? (
        <span> · No &ldquo;Fill up to&rdquo; number. <Link to={levelsLink}>Set one</Link></span>
      ) : (
        <span> · buy {spot.upTo ? 'up to ' : ''}<strong>{wholeToBuy(amount)} {unit}</strong></span>
      )}
      {rec.has_hidden_sources ? <span className="isu-muted"> · some spare stock may be at a {site} you can&apos;t see</span> : null}
    </li>
  );
}

/**
 * One item to buy: a tick box, the name, the total to buy, and where it's needed. Tap for the
 * figures. `tick` ({ amount, by, at }) when ticked; tapping the amount sets what the shopper got.
 */
export default function ItemsureShoppingRow({ row, tick, names, item, onTick, onSetAmount, withLocation }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const itemLink = useItemLink();
  const ticked = Boolean(tick);
  const tone = row.status === 'low' ? 'is-low' : 'is-topup';
  const where = row.spots.map(({ rec }) => `${spotLabel(rec, withLocation)} ${q(rec.on_hand)} of ${q(rec.par)}`).join(' \u00b7 ');
  const by = boughtBy(tick, names);

  return (
    <li className={`isu-shop-row ${tone}${ticked ? ' is-ticked' : ''}`}>
      <div className="isu-shop-row-main">
        <button
          type="button"
          className="isu-shop-tick"
          aria-pressed={ticked}
          aria-label={ticked ? `Untick ${row.name}` : `Got ${row.name}`}
          onClick={onTick}
        >
          {ticked ? '\u2713' : ''}
        </button>
        <button type="button" className="isu-shop-row-body" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="isu-shop-name">{row.name}</span>
          <span className="isu-shop-where">{TARGET_STATUS[row.status]?.label} · {where}</span>
          {by ? <span className="isu-shop-by">{by}</span> : null}
        </button>
        <GotAmount row={row} tick={tick} onEdit={() => setEditing((e) => !e)} />
      </div>
      {editing ? <ItemsureShoppingGotEditor row={row} tick={tick} item={item} onSave={onSetAmount} onClose={() => setEditing(false)} /> : null}
      {open ? (
        <div className="isu-shop-detail">
          <ul>
            {row.spots.map((spot) => (
              <SpotDetail key={spot.rec.target_id} spot={spot} unit={row.unit} withLocation={withLocation} />
            ))}
          </ul>
          <Link {...itemLink(row.itemId)}>Open {row.name}</Link>
        </div>
      ) : null}
    </li>
  );
}
