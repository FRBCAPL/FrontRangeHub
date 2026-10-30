import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';

/** The location walked spot by spot: each spot's items and amounts. Tap one to add, use, or move. */
export default function ItemsureStockSpotView({ sections, onSpot }) {
  return (
    <div className="isu-stack">
      {sections.map((section) => (
        <section key={section.id || 'loose'} className="isu-card isu-stockspot" aria-label={section.name}>
          <h3 className="isu-stockspot-title">
            {section.name} <span className="isu-muted isu-small">{section.entries.length} item{section.entries.length === 1 ? '' : 's'}</span>
          </h3>
          <ul className="isu-stockspot-list">
            {section.entries.map(({ item, slot }) => {
              const status = slot.status ? TARGET_STATUS[slot.status] : null;
              const par = slot.target?.par_text ?? null;
              return (
                <li key={slot.key}>
                  <button type="button" className="isu-stockspot-row" onClick={() => onSpot(item, slot)}>
                    <span className="isu-stockspot-name">{item.name}</span>
                    <span className={`isu-stockspot-amount${status ? ` is-${status.tone}` : ''}`}>
                      <strong>{slot.quantity === null ? '\u2013' : displayQuantity(slot.quantity)}</strong>
                      {par !== null ? <span className="isu-stockcard-par"> / {displayQuantity(par)}</span> : null}
                      <span className="isu-stockcard-unit"> {item.unitSymbol}</span>
                    </span>
                    {status ? <span className={`isu-stockcard-label isu-stockcard-label--${status.tone}`}>{status.label}</span> : <span />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
