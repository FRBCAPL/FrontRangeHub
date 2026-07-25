import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { valueTierLabel } from '@shared/utils/estateInventoryConstants.js';
import EstateNav from './EstateNav';
import './EstateInventoryApp.css';

const emptyBid = { name: '', email: '', phone: '', amount: '' };

const AuctionPortal = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeItemId, setActiveItemId] = useState(null);
  const [bidForm, setBidForm] = useState(emptyBid);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listAuctionItems();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load auction items.');
      return;
    }
    setItems(result.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const openBid = (item) => {
    setActiveItemId(item.id);
    setBidForm(emptyBid);
    setMessage('');
    setError('');
  };

  const handleBid = async (e) => {
    e.preventDefault();
    if (!activeItemId) return;
    setSubmitting(true);
    setError('');
    const result = await estateInventoryService.placeAuctionBid({
      itemId: activeItemId,
      name: bidForm.name,
      email: bidForm.email,
      phone: bidForm.phone,
      amount: bidForm.amount
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Bid not accepted.');
      return;
    }
    setMessage(`Leading bid is now $${Number(result.data.highest_bid).toFixed(2)}.`);
    setActiveItemId(null);
    setBidForm(emptyBid);
    await load();
  };

  return (
    <div className="estate-inventory ei-portal ei-auction">
      <EstateNav
        variant="auction"
        title="Public auction"
        crumbs={[
          { label: 'Roles', to: '/estate-inventory' },
          { label: 'Auction' },
          { label: 'Browse & bid' }
        ]}
      />
      <p className="ei-lede" style={{ marginBottom: '1rem' }}>
        Only items approved for public sale appear here. Memorandum and disputed items are hidden.
      </p>

      {message ? <p className="ei-status">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
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
              >
                Place bid
              </button>
            </div>
          </article>
        ))}
      </div>

      {activeItemId ? (
        <div className="ei-modal-backdrop" role="presentation" onClick={() => setActiveItemId(null)}>
          <div className="ei-modal" role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
            <h3>Place a bid</h3>
            <p>Your bid must beat the current leading price.</p>
            <form onSubmit={handleBid}>
              <div className="ei-field">
                <label htmlFor="bid-name">Name</label>
                <input
                  id="bid-name"
                  value={bidForm.name}
                  onChange={(e) => setBidForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="ei-field">
                <label htmlFor="bid-email">Email</label>
                <input
                  id="bid-email"
                  type="email"
                  value={bidForm.email}
                  onChange={(e) => setBidForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="ei-field">
                <label htmlFor="bid-phone">Phone</label>
                <input
                  id="bid-phone"
                  type="tel"
                  value={bidForm.phone}
                  onChange={(e) => setBidForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="ei-field">
                <label htmlFor="bid-amount">Bid amount ($)</label>
                <input
                  id="bid-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={bidForm.amount}
                  onChange={(e) => setBidForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
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
