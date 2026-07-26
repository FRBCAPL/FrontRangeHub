import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { valueTierLabel } from '@shared/utils/estateInventoryConstants.js';
import { PR_AUCTION_BID_BLOCK_MESSAGE } from '@shared/utils/estateLegalOps.js';
import EstateNav from './EstateNav';
import AuctionRegisterModal from './AuctionRegisterModal';
import './EstateInventoryApp.css';

const AuctionPortal = () => {
  const [bidder, setBidder] = useState(() => estateInventoryService.getAuctionBidder());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeItemId, setActiveItemId] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingBidItemId, setPendingBidItemId] = useState(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [prBidBlocked, setPrBidBlocked] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const [catalog, cfg, ownerCheck] = await Promise.all([
      estateInventoryService.listAuctionItems(),
      estateInventoryService.getAuctionPublicConfig(),
      estateInventoryService.isLoggedInEstateOwner()
    ]);
    setLoading(false);
    if (cfg.success) setStripeConfigured(Boolean(cfg.data.stripeConfigured));
    setPrBidBlocked(
      estateInventoryService.isAdminUnlocked() || (ownerCheck.success && ownerCheck.data === true)
    );
    if (!catalog.success) {
      setError(catalog.error || 'Could not load auction items.');
      return;
    }
    setItems(catalog.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const openBid = (item) => {
    setMessage('');
    setError('');
    setBidAmount('');
    if (prBidBlocked) {
      setError(PR_AUCTION_BID_BLOCK_MESSAGE);
      return;
    }
    const active = estateInventoryService.getAuctionBidder();
    if (!active?.sessionToken) {
      setPendingBidItemId(item.id);
      setShowRegister(true);
      return;
    }
    setBidder(active);
    setActiveItemId(item.id);
  };

  const handleRegistered = (session) => {
    setBidder(session);
    setError('');
    setMessage(
      `Registered as ${session.name}. Card ending ${session.cardLast4 || '••••'} verified — you can place bids.`
    );
    if (pendingBidItemId) {
      setActiveItemId(pendingBidItemId);
      setPendingBidItemId(null);
    }
  };

  const handleBid = async (e) => {
    e.preventDefault();
    const activeBidder = estateInventoryService.getAuctionBidder();
    if (!activeItemId || !activeBidder?.sessionToken) return;
    if (prBidBlocked) {
      setError(PR_AUCTION_BID_BLOCK_MESSAGE);
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await estateInventoryService.placeAuctionBid({
      itemId: activeItemId,
      amount: bidAmount,
      sessionToken: activeBidder.sessionToken
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Bid not accepted.');
      return;
    }
    setMessage(`Leading bid is now $${Number(result.data.highest_bid).toFixed(2)}.`);
    setActiveItemId(null);
    setBidAmount('');
    await load();
  };

  const clearBidder = () => {
    estateInventoryService.clearAuctionBidder();
    setBidder(null);
    setActiveItemId(null);
    setMessage('Bidder session cleared. Register again (with card) to place a bid.');
  };

  return (
    <div className="estate-inventory ei-portal ei-auction">
      <EstateNav
        variant="auction"
        title="Public auction"
        crumbs={[
          { label: 'Roles', to: '/estateit' },
          { label: 'Auction' },
          { label: 'Browse & bid' }
        ]}
        extraRight={
          bidder ? (
            <button type="button" className="ei-nav-icon-btn" onClick={clearBidder}>
              Sign out bidder
            </button>
          ) : (
            <button
              type="button"
              className="ei-nav-icon-btn"
              onClick={() => {
                if (prBidBlocked) {
                  setError(PR_AUCTION_BID_BLOCK_MESSAGE);
                  return;
                }
                setPendingBidItemId(null);
                setShowRegister(true);
              }}
              disabled={prBidBlocked}
            >
              Register to bid
            </button>
          )
        }
      />
      <p className="ei-lede" style={{ marginBottom: '0.65rem' }}>
        Browse freely. Bidding requires registration, a verified payment card, and acceptance of the
        Terms of Estate Sale.
      </p>
      {prBidBlocked ? (
        <div className="ei-error" role="status">
          {PR_AUCTION_BID_BLOCK_MESSAGE}
        </div>
      ) : null}
      {!stripeConfigured ? (
        <p className="ei-status">
          Card verification is not online yet — browsing works; bidding opens after Estate Stripe is
          connected.
        </p>
      ) : null}
      {bidder ? (
        <p className="ei-status">
          Bidding as <strong>{bidder.name}</strong> ({bidder.email}
          {bidder.cardLast4 ? ` · ${bidder.cardBrand || 'card'} •••• ${bidder.cardLast4}` : ''})
        </p>
      ) : null}

      {message ? <p className="ei-status">{message}</p> : null}
      {error && !showRegister && !activeItemId ? <div className="ei-error">{error}</div> : null}
      {loading ? <p className="ei-status">Loading auction…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="ei-empty">
          <p>No items are currently approved for public sale.</p>
        </div>
      ) : null}

      <div className="ei-grid">
        {items.map((item) => (
          <article key={item.id} className="ei-card">
            {item.photo_url ? (
              <img className="ei-card-photo" src={item.photo_url} alt={item.name} loading="lazy" />
            ) : (
              <div className="ei-card-photo-placeholder">No photo</div>
            )}
            <div className="ei-card-body">
              <strong>{item.name}</strong>
              <p className="ei-card-meta">
                {item.room} · {valueTierLabel(item.value_tier)}
              </p>
              <p className="ei-card-status-tag">
                {item.highest_bid != null
                  ? `Leading bid: $${Number(item.highest_bid).toFixed(2)}`
                  : 'No bids yet'}
              </p>
              {item.highest_bidder_name ? (
                <p className="ei-card-meta">Leader: {item.highest_bidder_name}</p>
              ) : null}
              <button
                type="button"
                className="ei-btn ei-btn-small"
                style={{ marginTop: '0.55rem', width: '100%' }}
                onClick={() => openBid(item)}
                disabled={prBidBlocked || (!stripeConfigured && !bidder)}
              >
                {prBidBlocked ? 'PR cannot bid' : bidder ? 'Place bid' : 'Register & bid'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <AuctionRegisterModal
        open={showRegister && !prBidBlocked}
        onClose={() => {
          setShowRegister(false);
          setPendingBidItemId(null);
        }}
        onRegistered={handleRegistered}
      />

      {activeItemId && !prBidBlocked ? (
        <div className="ei-modal-backdrop" role="presentation" onClick={() => setActiveItemId(null)}>
          <div
            className="ei-modal"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3>Place a bid</h3>
            <p>
              Bidding as <strong>{bidder?.name}</strong>. Your bid must beat the current leading
              price. Submitting is a binding offer under the Terms of Estate Sale.
            </p>
            <form onSubmit={handleBid}>
              <div className="ei-field">
                <label htmlFor="bid-amount">Bid amount ($)</label>
                <input
                  id="bid-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error ? <div className="ei-error">{error}</div> : null}
              <div className="ei-btn-row">
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary"
                  onClick={() => setActiveItemId(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="ei-btn" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AuctionPortal;
