import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { loadShipOptions, loadShippingHeldIds } from '../../services/consignmentShippingService.js';
import useShippingInfo from '../../hooks/useShippingInfo.js';
import { countNewListings, newListingsLabel } from '../../utils/consignmentNewListings.js';
import { homeRow } from '../../utils/consignmentHomeListings.js';
import ConsignmentItemCard from './ConsignmentItemCard.jsx';
import './consignment-shop.css';

/** Which real listings ship (🚚 chip) and which are being bought for shipping (on hold), while shipping is on. */
function useShipFlags(ids) {
  const shipping = useShippingInfo();
  const [flags, setFlags] = useState({ ships: {}, held: new Set() });
  useEffect(() => {
    let alive = true;
    if (!shipping.enabled || !ids) {
      setFlags({ ships: {}, held: new Set() });
      return undefined;
    }
    Promise.all([loadShipOptions(ids.split(',')), loadShippingHeldIds()]).then(([ships, held]) => {
      if (alive) setFlags({ ships, held });
    });
    return () => { alive = false; };
  }, [shipping.enabled, ids]);
  return flags;
}

/** "Racked up" row: newest real listings, topped up with labeled examples while the shop is small. */
export default function ConsignmentHomeNewItems({ data }) {
  const realIds = (data?.listings || []).map((r) => r.id).join(',');
  const flags = useShipFlags(realIds);
  if (!data) return null;
  const row = homeRow(data.listings, data.examples);
  if (!row.length) return null;
  const realCount = data.listings.length;
  const badge = newListingsLabel(countNewListings({ items: data.listings, auctions: Object.values(data.auctions) }));
  let lede = '';
  if (!realCount) lede = 'The first items are on the way. Here’s what listings look like (examples aren’t for sale).';
  else if (row.length > realCount) lede = 'Just getting started. Cards marked Example show what a listing looks like.';

  return (
    <section className="cs-home-section cs-home-new" aria-labelledby="cs-home-new-title">
      <div className="cs-home-new-head">
        <h2 id="cs-home-new-title">Racked up</h2>
        {badge ? <span className="cs-home-new-badge">{badge}</span> : null}
        {realCount ? <Link className="cs-home-more" to={CONSIGNMENT_PATH}>See all {realCount} →</Link> : null}
      </div>
      {lede ? <p className="cs-hint">{lede}</p> : null}
      <div className="cs-grid">
        {row.map((item) => (
          <ConsignmentItemCard
            key={item.id}
            item={item}
            auction={data.auctions[item.id]}
            ships={Boolean(flags.ships[item.id])}
            shipHold={flags.held.has(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
