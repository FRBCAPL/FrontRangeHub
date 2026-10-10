import React from 'react';
import { Link } from 'react-router-dom';
import { brandModelLabel, categoryLabel, conditionLabel } from '../../data/consignmentConstants.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { formatCountdown } from '../../utils/consignmentAuctionDates.js';

const ENDING_SOON_MS = 60 * 60 * 1000;

function Price({ label, amount }) {
  return (
    <p className="cs-card-price">
      {label ? <span className="cs-card-price-label">{label}</span> : null}
      <strong>{formatDollars(amount)}</strong>
      <small>+ tax</small>
    </p>
  );
}

function AuctionLine({ auction }) {
  if (!auction) return <p className="cs-card-price"><strong>Online auction</strong></p>;
  if (auction.status === 'live') {
    const left = new Date(auction.ends_at).getTime() - Date.now();
    const bids = auction.bid_count;
    return (
      <>
        <Price label={bids ? 'Bid' : 'Opening'} amount={bids ? auction.current_bid : auction.opening_bid} />
        <p className="cs-card-sub">
          <span className={`cs-card-clock${left < ENDING_SOON_MS ? ' soon' : ''}`}>
            {left > 0 ? `⏱ ${formatCountdown(left)}` : 'Closing'}
          </span>
          {bids} bid{bids === 1 ? '' : 's'}
        </p>
      </>
    );
  }
  if (auction.status === 'ended_no_bids') return <p className="cs-card-price"><strong>Auction ended</strong></p>;
  return <Price label="Ended" amount={auction.winning_bid} />;
}

function ExampleAuctionLine({ sample }) {
  if (!sample) return <p className="cs-card-price"><strong>Online auction</strong></p>;
  const bids = Number(sample.bid_count) || 0;
  return (
    <>
      <Price label="Bid" amount={sample.current_bid} />
      <p className="cs-card-sub">Sample · {bids} bid{bids === 1 ? '' : 's'}</p>
    </>
  );
}

export default function ConsignmentItemCard({ item, auction }) {
  const photo = item.photo_urls?.[0];
  const isAuction = item.sale_method === 'auction';
  const isSold = item.status === 'sold';
  const kind = item.is_example ? 'example' : isSold ? 'sold' : isAuction ? 'auction' : 'shelf';
  const ribbon = {
    example: { icon: '👀', label: isAuction ? 'Example auction' : 'Example' },
    sold: { icon: '✔', label: 'Sold' },
    auction: { icon: '🔨', label: 'Online auction' },
    shelf: { icon: '🏪', label: 'In the case' },
  }[kind];
  let priceLine = <Price amount={item.selling_price} />;
  if (isAuction) priceLine = item.is_example ? <ExampleAuctionLine sample={item.example_auction} /> : <AuctionLine auction={auction} />;
  const brand = (item.brand || '').trim();
  const model = (item.model || '').trim();
  let makeLabel = 'Category';
  if (brand && model) makeLabel = 'Brand / Model';
  else if (brand) makeLabel = 'Brand';
  else if (model) makeLabel = 'Model';
  const details = [
    [makeLabel, brandModelLabel(item) || categoryLabel(item.category)],
    ['Condition', item.condition ? conditionLabel(item.condition) : ''],
  ].filter(([, value]) => value);

  return (
    <Link className={`cs-card cs-card-${kind}`} to={consignmentItemPath(item.item_number)}>
      <div className="cs-card-ribbon">
        <span aria-hidden="true">{ribbon.icon}</span> {ribbon.label}
      </div>
      <div className="cs-card-photo" style={photo ? { '--cs-photo': `url("${photo}")` } : undefined}>
        {photo ? <img src={photo} alt="" loading="lazy" /> : <span aria-hidden="true">🎱</span>}
      </div>
      <div className="cs-card-body">
        <h3>{item.name}</h3>
        {details.length ? (
          <p className="cs-card-sub cs-card-details">
            {details.map(([label, value]) => (
              <span key={label}>
                <span className="cs-card-detail-label">{label}:</span> {value}
              </span>
            ))}
          </p>
        ) : null}
        {priceLine}
      </div>
    </Link>
  );
}
