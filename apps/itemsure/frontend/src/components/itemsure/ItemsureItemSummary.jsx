import React from 'react';
import { cardTone, categoryHue, itemInitials } from '../../utils/itemsureItemLook.js';
import { StockAmount, StockBar, SupplierLine } from './ItemsureStockBits.jsx';
import ItemsureItemUsage from './ItemsureItemUsage.jsx';

/** Top of the item page: badge, on hand vs par, status bar, usage, where it's kept, and its supplier. `children` are extra buttons. */
export default function ItemsureItemSummary({ item, summary, usage, unitSymbol, placeCount, supplier, children }) {
  const tone = cardTone(summary);
  const hue = categoryHue(item.category_id);
  return (
    <section className={`isu-card isu-stockcard isu-stockcard--${tone} isu-item-summary`} aria-label="Stock summary">
      <span
        className={`isu-stockcard-badge${hue === null ? ' is-plain' : ''}`}
        style={hue === null ? undefined : { '--badge-hue': hue }}
        title={item.categoryName || 'No category'}
        aria-hidden="true"
      >
        {itemInitials(item.name)}
      </span>
      <div className="isu-stockcard-body isu-item-summary-body">
        <div className="isu-item-summary-top">
          <StockAmount summary={summary} unitName={item.unitName} className="isu-item-summary-amount" />
          <span className="isu-muted isu-small">
            {placeCount ? `in ${placeCount} place${placeCount === 1 ? '' : 's'}` : 'Not kept anywhere yet'}
          </span>
        </div>
        {supplier ? <SupplierLine supplier={supplier} /> : null}
        <StockBar summary={summary} />
        <ItemsureItemUsage usage={usage} total={summary.total} unit={unitSymbol} />
        {children ? <div className="isu-item-summary-actions">{children}</div> : null}
      </div>
    </section>
  );
}
