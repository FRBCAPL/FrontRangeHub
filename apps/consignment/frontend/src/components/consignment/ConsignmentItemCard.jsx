import React from 'react';
import { Link } from 'react-router-dom';
import { brandModelLabel, categoryLabel, conditionLabel } from '../../data/consignmentConstants.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';
import { formatDollars, itemPriceLabel } from '../../utils/consignmentMoney.js';
import { formatCountdown } from '../../utils/consignmentAuctionDates.js';

function AuctionLine({ auction }) {
  if (!auction) return <p className="cs-price">Online auction</p>;
  if (auction.status === 'live') {
    const left = new Date(auction.ends_at).getTime() - Date.now();
    return (
      <>
        <p className="cs-price">
          {auction.bid_count ? 'Bid ' : 'Opening '}
          {formatDollars(auction.bid_count ? auction.current_bid : auction.opening_bid)} + tax
        </p>
        <p className="cs-meta">
          {auction.bid_count} bid{auction.bid_count === 1 ? '' : 's'} · {left > 0 ? `ends in ${formatCountdown(left)}` : 'closing'}
        </p>
      </>
    );
  }
  if (auction.status === 'ended_no_bids') return <p className="cs-price">Auction ended</p>;
  return <p className="cs-price">Auction ended · {formatDollars(auction.winning_bid)} + tax</p>;
}

export default function ConsignmentItemCard({ item, auction }) {
  const photo = item.photo_urls?.[0];
  const isAuction = item.sale_method === 'auction';
  const isSold = item.status === 'sold';
  const kind = isSold ? 'sold' : isAuction ? 'auction' : 'shelf';
  const ribbon = {
    sold: { icon: '✔', label: 'Sold' },
    auction: { icon: '🔨', label: 'Online auction' },
    shelf: { icon: '🏪', label: 'In store at Legends' },
  }[kind];
  return (
    <Link className={`cs-card cs-card-${kind}`} to={consignmentItemPath(item.item_number)}>
      <div className="cs-card-ribbon">
        <span aria-hidden="true">{ribbon.icon}</span> {ribbon.label}
      </div>
      {photo ? <img src={photo} alt="" /> : <div className="cs-ph" aria-hidden="true">🎱</div>}
      <div className="cs-card-body">
        <h3>{item.name}</h3>
        <p className="cs-meta">
          {categoryLabel(item.category)}
          {brandModelLabel(item) ? ` · ${brandModelLabel(item)}` : ''}
          {item.condition ? ` · ${conditionLabel(item.condition)}` : ''}
        </p>
        {isAuction && !isSold ? <AuctionLine auction={auction} /> : <p className="cs-price">{itemPriceLabel(item)}</p>}
      </div>
    </Link>
  );
}
