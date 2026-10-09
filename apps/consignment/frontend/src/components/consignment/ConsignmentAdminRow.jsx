import React from 'react';
import { auctionStatusLabel, brandModelLabel, EXPIRING_SOON_DAYS, itemLabel, statusLabel } from '../../data/consignmentConstants.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars, revenueSummary } from '../../utils/consignmentMoney.js';
import { usesShelfCommission } from '../../utils/consignmentFeePolicy.js';
import { daysUntil, formatShortDate, pickupDeadline } from '../../utils/consignmentDates.js';

function WindowInfo({ item, graceDays }) {
  if (item.status === 'available' && item.expires_at) {
    const left = daysUntil(item.expires_at);
    return (
      <div className={`cs-meta${left <= EXPIRING_SOON_DAYS ? ' cs-due' : ''}`}>
        Ends {formatShortDate(item.expires_at)} ({left <= 0 ? 'today' : `${left}d left`})
      </div>
    );
  }
  if (item.status === 'expired') {
    const deadline = pickupDeadline(item.expires_at, graceDays);
    const overdue = deadline && daysUntil(deadline) < 0;
    return (
      <>
        <div className="cs-meta">Ended {formatShortDate(item.expires_at)}</div>
        <div className={`cs-meta ${overdue ? 'cs-overdue' : 'cs-due'}`}>
          {overdue ? 'Pickup overdue since ' : 'Pickup by '}{formatShortDate(deadline)}
        </div>
      </>
    );
  }
  return null;
}

function AuctionInfo({ auction }) {
  if (!auction) return null;
  const bids = auction.bid_count ? `${formatDollars(auction.current_bid)} · ${auction.bid_count} bid(s)` : 'no bids';
  return (
    <div className="cs-meta cs-auction-tag">
      Auction: {auctionStatusLabel(auction.status)}
      {auction.status === 'live' ? ` · ${bids} · ends ${formatDateTime(auction.ends_at)}` : ''}
    </div>
  );
}

function MoneyInfo({ item }) {
  const r = revenueSummary(item, item.fees);
  const isAuction = item.sale_method === 'auction';
  const commission = usesShelfCommission(item);
  const shop = item.selling_price != null ? formatDollars(item.selling_price) : 'not set';
  let firstLabel = 'Payout';
  if (isAuction) firstLabel = 'Reserve';
  else if (commission) firstLabel = 'Agreed';
  return (
    <>
      {firstLabel} {formatDollars(item.seller_payout)}
      <div className="cs-meta">
        {isAuction
          ? `Online auction${item.requested_buy_now != null ? ` · Buy It Now ${formatDollars(item.requested_buy_now)}` : ''}`
          : `${commission ? 'Shop' : 'Retail'} ${shop}${commission ? ` · ${Number(item.commission_pct)}% commission` : ''}`}
      </div>
      <div className="cs-meta">Fees paid {formatDollars(r.fees)}</div>
      {item.status === 'sold' ? (
        <>
          <div className="cs-meta">
            Sold {formatDollars(item.actual_selling_price)} · Margin {formatDollars(r.margin)} · {item.payment_method}
          </div>
          {r.transactionFee ? <div className="cs-meta">Card/transaction fee −{formatDollars(r.transactionFee)}</div> : null}
          <div className="cs-meta"><strong>Gross {formatDollars(r.gross)} · Net {formatDollars(r.net)}</strong></div>
          {item.seller_paid_at ? (
            <div className="cs-meta">
              Seller paid {formatDollars(item.seller_payout_paid ?? item.seller_payout)} · {formatShortDate(item.seller_paid_at)}
              {item.seller_paid_method ? ` · ${item.seller_paid_method}` : ''}
            </div>
          ) : (
            <div className="cs-meta cs-overdue">Owed to seller {formatDollars(item.seller_payout_paid ?? item.seller_payout)}</div>
          )}
        </>
      ) : null}
    </>
  );
}

export default function ConsignmentAdminRow({ item, graceDays, actions }) {
  const { edit, approve, sold, renew, setStatus, deletePhotos, printTag, sellerPaid, undoSellerPaid, auction } = actions;
  const isAuction = item.sale_method === 'auction';
  return (
    <tr>
      <td className="cs-cell-id">{itemLabel(item)}</td>
      <td className="cs-cell-item">
        <div className="cs-admin-item">
          <button type="button" className="cs-admin-thumb" onClick={() => edit(item)} aria-label={`Photos for ${itemLabel(item)}`}>
            {item.photo_urls?.[0] ? <img src={item.photo_urls[0]} alt="" /> : <span>🎱</span>}
          </button>
          <div>
            <strong>{item.name}</strong>
            <div className="cs-meta">{brandModelLabel(item) || '—'}</div>
            <div className="cs-meta">{item.photo_urls?.length || 0} photo(s)</div>
          </div>
        </div>
      </td>
      <td data-label="Seller">
        {item.seller?.full_name}
        <div className="cs-meta">{item.seller?.phone || item.seller?.email}</div>
      </td>
      <td data-label="Money"><MoneyInfo item={item} /></td>
      <td data-label="Status">
        {statusLabel(item.status)}
        {item.status === 'pending' && isAuction ? <div className="cs-meta cs-auction-tag">Auction requested</div> : null}
        {isAuction ? <AuctionInfo auction={item.auction} /> : <WindowInfo item={item} graceDays={graceDays} />}
      </td>
      <td className="cs-cell-actions">
        {item.status === 'pending' && isAuction ? (
          <>
            <button type="button" className="cs-btn" onClick={() => auction(item)}>Start auction</button>
            <button type="button" className="cs-btn-secondary" onClick={() => approve(item)}>Approve as consignment</button>
            <button type="button" className="cs-btn-secondary" onClick={() => setStatus(item, 'withdrawn')}>Reject</button>
          </>
        ) : null}
        {item.status === 'pending' && !isAuction ? (
          <>
            <button type="button" className="cs-btn" onClick={() => approve(item)}>Approve</button>
            <button type="button" className="cs-btn-secondary" onClick={() => auction(item)}>Auction</button>
            <button type="button" className="cs-btn-secondary" onClick={() => setStatus(item, 'withdrawn')}>Reject</button>
          </>
        ) : null}
        {item.status === 'available' && isAuction ? (
          <button type="button" className="cs-btn-secondary" onClick={() => printTag(item)}>Print tag</button>
        ) : null}
        {item.status === 'available' && !isAuction ? (
          <>
            <button type="button" className="cs-btn" onClick={() => sold(item)}>Sold</button>
            <button type="button" className="cs-btn-secondary" onClick={() => printTag(item)}>Print tag</button>
            <button type="button" className="cs-btn-secondary" onClick={() => renew(item)}>Renew</button>
            <button type="button" className="cs-btn-secondary" onClick={() => auction(item)}>Move to auction</button>
            <button type="button" className="cs-btn-secondary" onClick={() => setStatus(item, 'returned')}>Returned</button>
            <button type="button" className="cs-btn-secondary" onClick={() => setStatus(item, 'withdrawn')}>Withdraw</button>
          </>
        ) : null}
        {item.status === 'expired' ? (
          <>
            <button type="button" className="cs-btn" onClick={() => renew(item)}>Renew</button>
            <button type="button" className="cs-btn-secondary" onClick={() => auction(item)}>Auction</button>
            <button type="button" className="cs-btn-secondary" onClick={() => setStatus(item, 'returned')}>Picked up</button>
          </>
        ) : null}
        {item.status === 'sold' && !item.seller_paid_at ? (
          <button type="button" className="cs-btn" onClick={() => sellerPaid(item)}>Seller paid</button>
        ) : null}
        {item.status === 'sold' && item.seller_paid_at ? (
          <button type="button" className="cs-btn-secondary" onClick={() => undoSellerPaid(item)}>Undo paid</button>
        ) : null}
        {['withdrawn', 'returned'].includes(item.status) && item.photo_urls?.length ? (
          <button type="button" className="cs-btn-secondary" onClick={() => deletePhotos(item)}>Delete photos</button>
        ) : null}
        <button type="button" className="cs-btn-secondary" onClick={() => edit(item)}>Edit</button>
      </td>
    </tr>
  );
}
