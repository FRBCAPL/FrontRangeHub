import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { itemLabel } from '../../data/consignmentConstants.js';
import { CONSIGNMENT_PATH, LEGENDS, LEGENDS_MAP_URL } from '../../data/consignmentConstants.js';
import { loadPublicItem } from '../../services/consignmentService.js';
import { itemPriceLabel } from '../../utils/consignmentMoney.js';
import ConsignmentAuctionPanel from './ConsignmentAuctionPanel.jsx';
import ConsignmentExampleAuctionPanel from './ConsignmentExampleAuctionPanel.jsx';
import ConsignmentPhotoZoom from './ConsignmentPhotoZoom.jsx';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';
import ConsignmentItemDetails from './ConsignmentItemDetails.jsx';

export default function ConsignmentItemPage() {
  const { itemNumber } = useParams();
  const [item, setItem] = useState(null);
  const [photo, setPhoto] = useState(0);
  const [zooming, setZooming] = useState(false);
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
  const isExample = Boolean(item.is_example);
  let auctionPanel = null;
  if (isAuction) {
    auctionPanel = isExample
      ? <ConsignmentExampleAuctionPanel sample={item.example_auction} />
      : <ConsignmentAuctionPanel itemId={item.id} />;
  }

  return (
    <div className="cs-page">
      {isExample ? (
        <p className="cs-example-banner">
          <strong>Example listing — not for sale.</strong> This shows what {isAuction ? 'an online auction' : 'an item in the case'} looks
          like. <Link to={CONSIGNMENT_PATH}>See real items in the shop</Link>.
        </p>
      ) : null}
      <p className="cs-kicker">{itemLabel(item)}</p>
      <h1>{item.name}</h1>
      <span className={`cs-legends${item.status === 'sold' || isExample ? ' sold' : ''}`}>
        {isExample ? 'Example — not for sale' : item.status === 'sold' ? 'Sold' : 'Available at Legends Brews & Cues'}
      </span>
      <div className="cs-hero">
        {current ? (
          <button type="button" className="cs-hero-zoom" onClick={() => setZooming(true)} aria-label="Open photo to zoom">
            <img src={current} alt={item.name} />
            <span className="cs-hero-zoom-hint" aria-hidden="true">Tap to zoom</span>
          </button>
        ) : <div className="cs-ph">🎱</div>}
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
      {zooming && photos.length ? (
        <ConsignmentPhotoZoom
          photos={photos}
          start={Math.min(photo, photos.length - 1)}
          alt={item.name}
          onClose={() => setZooming(false)}
        />
      ) : null}
      {isAuction ? auctionPanel : <p className="cs-price">{itemPriceLabel(item)}</p>}
      <ConsignmentItemDetails item={item} />
      {isAuction || item.status === 'sold' ? null : (
        <p className="cs-inspect">
          {item.allow_inspection
            ? 'You can inspect this item at Legends. Ask at the bar; staff will hold your ID while you look it over.'
            : 'Display only. This item stays in the case until it’s bought.'}
        </p>
      )}
      <p className="cs-meta cs-pickup">
        📍 Pickup in person at{' '}
        <a href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">
          {LEGENDS.name}, {LEGENDS.address ? `${LEGENDS.address}, ` : ''}{LEGENDS.city}, {LEGENDS.state}
        </a>
        . Nothing ships.
      </p>
      <p className="cs-hint">
        {isAuction
          ? 'The seller holds this item until the auction ends, then brings it to Legends. Sold as-is; all sales final. Look it over at Legends before you pay. If it isn’t as described, you can decline it.'
          : 'Sold as-is; all sales final. Look it over before you pay at Legends. Sales tax is added at checkout; this site does not take payment.'}
      </p>
      <div className="cs-actions">
        <Link className="cs-btn-secondary" to={CONSIGNMENT_PATH}>Back to shop</Link>
        {isExample ? null : (
          <ConsignmentContactButton itemNumber={itemLabel(item)} topic="buying">Ask about this item</ConsignmentContactButton>
        )}
      </div>
    </div>
  );
}
