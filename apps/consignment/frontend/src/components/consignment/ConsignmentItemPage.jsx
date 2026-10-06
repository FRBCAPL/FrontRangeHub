import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { brandModelLabel, categoryLabel, conditionLabel } from '../../data/consignmentConstants.js';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { loadPublicItem } from '../../services/consignmentService.js';
import { itemPriceLabel } from '../../utils/consignmentMoney.js';
import ConsignmentAuctionPanel from './ConsignmentAuctionPanel.jsx';

export default function ConsignmentItemPage() {
  const { itemNumber } = useParams();
  const [item, setItem] = useState(null);
  const [photo, setPhoto] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadPublicItem(itemNumber)
      .then((row) => {
        if (!alive) return;
        if (!row) setError('This item is not listed yet, or the link is outdated.');
        else setItem(row);
      })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [itemNumber]);

  if (error) {
    return (
      <div className="cs-page">
        <p className="cs-error">{error}</p>
        <Link to={CONSIGNMENT_PATH}>Back to shop</Link>
      </div>
    );
  }
  if (!item) return <div className="cs-page"><p className="cs-lede">Loading…</p></div>;

  const photos = item.photo_urls || [];
  const current = photos[photo] || photos[0];
  const isAuction = item.sale_method === 'auction';

  return (
    <div className="cs-page">
      <p className="cs-kicker">{item.item_number}</p>
      <h1>{item.name}</h1>
      <span className={`cs-legends${item.status === 'sold' ? ' sold' : ''}`}>
        {item.status === 'sold' ? 'Sold' : 'Available at Legends Brews & Cues'}
      </span>
      <div className="cs-hero">
        {current ? <img src={current} alt={item.name} /> : <div className="cs-ph">🎱</div>}
        {photos.length > 1 ? (
          <div className="cs-thumbs">
            {photos.map((src, i) => (
              <button key={src} type="button" className={i === photo ? 'active' : ''} onClick={() => setPhoto(i)}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {isAuction ? <ConsignmentAuctionPanel itemId={item.id} /> : <p className="cs-price">{itemPriceLabel(item)}</p>}
      <p className="cs-meta">
        {categoryLabel(item.category)}
        {brandModelLabel(item) ? ` · ${brandModelLabel(item)}` : ''}
        {` · ${conditionLabel(item.condition)}`}
      </p>
      {item.specs ? <p className="cs-lede" style={{ whiteSpace: 'pre-line' }}>{item.specs}</p> : null}
      {item.description ? <p className="cs-lede" style={{ whiteSpace: 'pre-line' }}>{item.description}</p> : null}
      {isAuction ? null : (
        <p className="cs-hint">Ask about this item at Legends. Sales tax is added at checkout — this site does not take payment.</p>
      )}
      <div className="cs-actions">
        <Link className="cs-btn-secondary" to={CONSIGNMENT_PATH}>Back to shop</Link>
      </div>
    </div>
  );
}
