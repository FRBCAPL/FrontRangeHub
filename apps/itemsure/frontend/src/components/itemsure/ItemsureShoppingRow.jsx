import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';
import { displayQuantity, wholeToBuy } from '../../utils/itemsureQuantity.js';
import { buyLabel, spotLabel } from '../../utils/itemsureShoppingList.js';
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

/** One item to buy: a tick box, the name, the total to buy, and where it's needed. Tap for the figures. */
export default function ItemsureShoppingRow({ row, ticked, onTick, withLocation }) {
  const [open, setOpen] = useState(false);
  const itemLink = useItemLink();
  const tone = row.status === 'low' ? 'is-low' : 'is-topup';
  const where = row.spots.map(({ rec }) => `${spotLabel(rec, withLocation)} ${q(rec.on_hand)} of ${q(rec.par)}`).join(' \u00b7 ');

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
        </button>
        <span className={`isu-shop-amount${row.total === null ? ' is-unset' : ''}`}>{buyLabel(row)}</span>
      </div>
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
