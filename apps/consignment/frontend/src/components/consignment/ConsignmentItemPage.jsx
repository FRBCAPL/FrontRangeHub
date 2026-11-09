import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { itemLabel } from '../../data/consignmentConstants.js';
import { CONSIGNMENT_PATH, LEGENDS, LEGENDS_MAP_URL } from '../../data/consignmentConstants.js';
import { loadPublicItem } from '../../services/consignmentService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { taxPercent, withTax } from '../../utils/consignmentTax.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import ConsignmentTaxTotal from './ConsignmentTaxTotal.jsx';
import ConsignmentAuctionPanel from './ConsignmentAuctionPanel.jsx';
import ConsignmentExampleAuctionPanel from './ConsignmentExampleAuctionPanel.jsx';
import ConsignmentGallery from './ConsignmentGallery.jsx';
import ConsignmentBackLink from './ConsignmentBackLink.jsx';
import ConsignmentBuyBar from './ConsignmentBuyBar.jsx';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';
import ConsignmentItemDetails from './ConsignmentItemDetails.jsx';
import ConsignmentItemWatch from './ConsignmentItemWatch.jsx';
import ConsignmentOfferButton from './ConsignmentOfferButton.jsx';
import './consignment-product.css';

function buyBarProps(item, auction, rate) {
  if (item.is_example || item.status === 'sold') return {};
  if (item.sale_method === 'auction') {
    if (auction?.status !== 'live') return {};
    const bids = Number(auction.bid_count) || 0;
    return {
      price: formatDollars(bids ? auction.current_bid : auction.opening_bid),
      note: bids ? `current bid · ${bids} bid${bids === 1 ? '' : 's'}` : 'opening bid',
      action: 'Bid now',
    };
  }
  if (item.status !== 'available') return {};
  return {
    price: formatDollars(withTax(item.selling_price, rate)),
    note: item.price_tax_included ? 'tax included' : 'total with tax',
    action: 'How to buy',
  };
}

export default function ConsignmentItemPage() {
  const { itemNumber } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [auction, setAuction] = useState(null);
  const buyRef = useRef(null);
  const taxRate = useTaxRate();
  const onAuction = useCallback((a) => setAuction(a || null), []);

  useEffect(() => {
    let alive = true;
    setItem(null);
    setError('');
    setAuction(null);
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

  const isAuction = item.sale_method === 'auction';
  const isExample = Boolean(item.is_example);
  const isSold = item.status === 'sold';
  const auctionAtLegends = Boolean(auction?.delivered_at);
  const auctionKey = auction ? `${auction.status}:${auction.bid_count}` : '';
  let auctionPanel = null;
  if (isAuction) {
    auctionPanel = isExample
      ? <ConsignmentExampleAuctionPanel sample={item.example_auction} />
      : <ConsignmentAuctionPanel itemId={item.id} onAuction={onAuction} />;
  }
  let tag = isAuction ? '' : '🏪 In the case at Legends';
  if (isExample) tag = 'Example · not for sale';
  else if (isSold) tag = 'Sold';
  else if (isAuction && auctionAtLegends) tag = '📍 At Legends now';

  return (
    <div className="cs-page cs-product-page">
      {isExample ? (
        <p className="cs-example-banner">
          <strong>Example listing — not for sale.</strong> This shows what {isAuction ? 'an online auction' : 'an item in the case'} looks
          like. <Link to={CONSIGNMENT_PATH}>See real items in the shop</Link>.
        </p>
      ) : null}
      <ConsignmentBackLink to={CONSIGNMENT_PATH} label="Shop" />

      <div className="cs-product">
        <div className="cs-product-head">
          <p className="cs-kicker">{itemLabel(item)}</p>
          <h1>{item.name}</h1>
          {tag ? <span className={`cs-product-tag${isSold || isExample ? ' sold' : ''}`}>{tag}</span> : null}
        </div>

        <div className="cs-product-media">
          <ConsignmentGallery photos={item.photo_urls || []} alt={item.name} />
        </div>

        <div className="cs-product-buy" ref={buyRef} tabIndex={-1}>
          {isAuction ? auctionPanel : <ConsignmentTaxTotal amount={item.selling_price} included={Boolean(item.price_tax_included)} />}
          {isExample || item.status !== 'available' ? null : (
            <ConsignmentOfferButton itemId={item.id} itemName={item.name} refreshKey={auctionKey} />
          )}
          {isExample || isSold ? null : <ConsignmentItemWatch itemId={item.id} />}
          <p className="cs-meta cs-pickup">
            📍 Pick up and pay in person at{' '}
            <a href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">
              {LEGENDS.name}, {LEGENDS.address ? `${LEGENDS.address}, ` : ''}{LEGENDS.city}, {LEGENDS.state}
            </a>
            . Shipping isn’t available at this time.
          </p>
        </div>
      </div>

      <section className="cs-product-info" aria-labelledby="cs-item-details-title">
        <h2 id="cs-item-details-title">Details</h2>
        <ConsignmentItemDetails item={item} />
        {isAuction || isSold ? null : (
          <p className="cs-inspect">
            {item.allow_inspection
              ? 'You can inspect this item at Legends. Ask at the bar; staff will hold your ID while you look it over.'
              : 'Display only. This item stays in the case until it’s bought.'}
          </p>
        )}
        {isExample ? null : (
          <div className="cs-actions">
            <ConsignmentContactButton itemNumber={itemLabel(item)} topic="buying">Ask about this item</ConsignmentContactButton>
          </div>
        )}
      </section>

      <details className="cs-buying-info">
        <summary>Buying info</summary>
        <ul>
          <li>Sold as-is; all sales final. Look it over at Legends before you pay{isAuction ? '. If it isn’t as described, you can decline it.' : '.'}</li>
          <li>
            {isAuction
              ? `The winner pays at Legends: the winning bid plus ${taxPercent(taxRate)} sales tax.`
              : `The total shown includes ${taxPercent(taxRate)} sales tax. Pay at the register.`}
            {' '}This site does not take payment.
          </li>
          <li>Pickup is in person at {LEGENDS.name}. Shipping isn’t available at this time.</li>
        </ul>
      </details>

      <ConsignmentBuyBar targetRef={buyRef} {...buyBarProps(item, auction, taxRate)} />
    </div>
  );
}
