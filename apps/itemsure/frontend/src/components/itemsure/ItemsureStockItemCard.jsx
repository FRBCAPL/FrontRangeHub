import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { cardTone } from '../../utils/itemsureItemLook.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { StockAmount, StockBar } from './ItemsureStockBits.jsx';

/** One spot as a tappable chip: "Bar 1 / 6", coloured by its status. */
export function SpotChip({ slot, onClick }) {
  const tone = slot.status ? TARGET_STATUS[slot.status]?.tone : null;
  const par = slot.target?.par_text ?? null;
  return (
    <button type="button" className={`isu-spot-chip${tone ? ` is-${tone}` : ''}`} onClick={onClick}>
      <span>{slot.areaName || 'Loose'}</span>
      <strong>{slot.quantity === null ? '\u2013' : displayQuantity(slot.quantity)}</strong>
      {par !== null ? <span className="isu-spot-chip-par">/ {displayQuantity(par)}</span> : null}
    </button>
  );
}

/** One item at this location: totals vs par, status bar, and its spots. Tap a spot to add, use, or move. */
export default function ItemsureStockItemCard({ row, onSpot }) {
  const { item, slots, summary } = row;
  return (
    <li className={`isu-card isu-stockcard isu-stockcard--${cardTone(summary)} isu-stockloc-card`}>
      <div className="isu-stockcard-body">
        <div className="isu-stockloc-top">
          <Link to={`${ITEMSURE_PATH}/items/${item.id}`} className="isu-stockloc-name">{item.name}</Link>
          <StockAmount summary={summary} unitName={item.unitName} />
        </div>
        <StockBar summary={summary} />
        {slots.length ? (
          <div className="isu-stockloc-spots">
            {slots.map((slot) => <SpotChip key={slot.key} slot={slot} onClick={() => onSpot(item, slot)} />)}
          </div>
        ) : (
          <p className="isu-muted isu-small">Not kept here.</p>
        )}
      </div>
    </li>
  );
}
