import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateitCasePath, valueTierLabel } from '@shared/utils/estateInventoryConstants.js';

/**
 * Landing modal — lists lots currently approved for the public auction.
 */
const EstateViewAuctionsModal = ({ open, onClose, caseNumber }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const result = await estateInventoryService.listAuctionItems(caseNumber);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setItems([]);
        setError(result.error || 'Could not load auction lots.');
        return;
      }
      setItems(result.data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, caseNumber]);

  if (!open) return null;

  const auctionPath = estateitCasePath(caseNumber, 'auction');

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-modal-settings-wide ei-view-auctions-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-view-auctions-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-view-auctions-title">Current auction</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <p className="ei-settings-hint">
            Case {caseNumber} — items approved for public sale. Open the auction to browse photos and
            bid.
          </p>
          {loading ? <p className="ei-status">Loading auction lots…</p> : null}
          {error ? <div className="ei-error">{error}</div> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="ei-settings-hint">No items are currently listed for auction.</p>
          ) : null}
          {!loading && items.length > 0 ? (
            <ul className="ei-view-auctions-list" aria-label="Auction lots">
              {items.map((item) => (
                <li key={item.id} className="ei-view-auctions-row">
                  {item.photo_url ? (
                    <img
                      className="ei-view-auctions-thumb"
                      src={item.photo_url}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="ei-view-auctions-thumb ei-view-auctions-thumb--empty" aria-hidden>
                      —
                    </div>
                  )}
                  <div className="ei-view-auctions-meta">
                    <strong className="ei-view-auctions-name">{item.name}</strong>
                    <span className="ei-view-auctions-detail">
                      {item.room || 'Estate'} · {valueTierLabel(item.value_tier)}
                    </span>
                    <span className="ei-view-auctions-bid">
                      {item.highest_bid != null
                        ? `Leading bid: $${Number(item.highest_bid).toFixed(2)}`
                        : 'No bids yet'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
            Close
          </button>
          <Link to={auctionPath} className="ei-btn" onClick={onClose}>
            Open auction
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EstateViewAuctionsModal;
