import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateitCasePath, isOpenEstateCase } from '@shared/utils/estateInventoryConstants.js';
import saleAuctionCopy from '@shared/utils/estateSaleAuctionCopy.js';

/**
 * Landing modal — public estate sale catalogs. Click one to open that estate’s sale inventory.
 */
const EstateViewAuctionsModal = ({ open, onClose }) => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const result = await estateInventoryService.listPublicAuctionSummaries();
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setAuctions([]);
        setError(result.error || 'Could not load sale inventory.');
        return;
      }
      setAuctions(
        (result.data || []).filter((row) => isOpenEstateCase(row.caseNumber))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

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
          <h3 id="ei-view-auctions-title">{saleAuctionCopy.publicList}</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <p className="ei-settings-hint">
            Public estate sale catalogs that have reached their listing start date. Click one to browse
            sale inventory. Optional bidding tools may appear when a listing window is open.
          </p>
          {loading ? <p className="ei-status">Loading {saleAuctionCopy.short}…</p> : null}
          {error ? <div className="ei-error">{error}</div> : null}
          {!loading && !error && auctions.length === 0 ? (
            <p className="ei-settings-hint">
              No estate sale catalogs are open to the public yet. Upcoming ones appear here on their
              listing start date.
            </p>
          ) : null}
          {!loading && auctions.length > 0 ? (
            <ul className="ei-view-auctions-list" aria-label={saleAuctionCopy.publicList}>
              {auctions.map((auction) => {
                const path = estateitCasePath(auction.caseNumber, 'auction');
                const lotLabel =
                  auction.lotCount === 1 ? '1 item for sale' : `${auction.lotCount} items for sale`;
                return (
                  <li key={auction.caseNumber} className="ei-view-auctions-row ei-view-auctions-row--link">
                    <Link to={path} className="ei-view-auctions-open" onClick={onClose}>
                      <div className="ei-view-auctions-meta">
                        <strong className="ei-view-auctions-name">{auction.estateName}</strong>
                        <span className="ei-view-auctions-detail">
                          {auction.courtCaseNumber
                            ? `Case ${auction.courtCaseNumber} · ${lotLabel}`
                            : lotLabel}
                        </span>
                        {auction.sampleItems?.length ? (
                          <span className="ei-view-auctions-bid">
                            Includes:{' '}
                            {auction.sampleItems
                              .map((item) => item.name)
                              .filter(Boolean)
                              .join(', ')}
                            {auction.lotCount > auction.sampleItems.length ? '…' : ''}
                          </span>
                        ) : (
                          <span className="ei-view-auctions-bid">No items listed yet</span>
                        )}
                      </div>
                      <span className="ei-view-auctions-go" aria-hidden="true">
                        View →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstateViewAuctionsModal;
