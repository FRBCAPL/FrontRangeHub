import React from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';
import { cardTone } from '../../utils/itemsureItemLook.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { looseText } from '../../utils/itemsureLoose.js';
import { StockAmount, StockBar } from './ItemsureStockBits.jsx';

/** One spot as a tappable chip: "Bar 1 / 6", coloured by its status. */
export function SpotChip({ slot, onClick, pieces = 0, unitName = '' }) {
  const tone = slot.status ? TARGET_STATUS[slot.status]?.tone : null;
  const par = slot.target?.par_text ?? null;
  const qty = slot.quantity === null
    ? null
    : (pieces && looseText(slot.quantity, pieces, unitName)) || displayQuantity(slot.quantity);
  return (
    <button type="button" className={`isu-spot-chip${tone ? ` is-${tone}` : ''}`} onClick={onClick}>
      <span>{slot.areaName || 'Loose'}</span>
      <strong>{qty === null ? '\u2013' : qty}</strong>
      {par !== null ? <span className="isu-spot-chip-par">/ {displayQuantity(par)}</span> : null}
    </button>
  );
}

/** One item at this location: totals vs par, status bar, and its spots. Tap a spot to add, use, or move. */
export default function ItemsureStockItemCard({ row, onSpot, pieces = 0 }) {
  const { item, slots, summary } = row;
  const itemLink = useItemLink();
  return (
    <li className={`isu-card isu-stockcard isu-stockcard--${cardTone(summary)} isu-stockloc-card`}>
      <div className="isu-stockcard-body">
        <div className="isu-stockloc-top">
          <Link {...itemLink(item.id)} className="isu-stockloc-name">{item.name}</Link>
          <StockAmount summary={summary} unitName={item.unitName} pieces={pieces} />
        </div>
        <StockBar summary={summary} />
        {slots.length ? (
          <div className="isu-stockloc-spots">
            {slots.map((slot) => (
              <SpotChip
                key={slot.key}
                slot={slot}
                pieces={pieces}
                unitName={item.unitName}
                onClick={() => onSpot(item, slot)}
              />
            ))}
          </div>
        ) : (
          <p className="isu-muted isu-small">Not kept here.</p>
        )}
      </div>
    </li>
  );
}
