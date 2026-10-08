import React, { useEffect, useState } from 'react';
import { buyNow, openHubLogin, placeBid } from '../../services/consignmentAuctionService.js';
import { bidError, bidIncrement } from '../../utils/consignmentAuctionMath.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

export default function ConsignmentBidForm({ auction, userId, isHighBidder, payDays, onBid }) {
  const minNext = Number(auction.min_next_bid);
  const [amount, setAmount] = useState(minNext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setAmount((prev) => (Number(prev) < minNext ? minNext : prev));
  }, [minNext]);

  if (!userId) {
    return (
      <div className="cs-bid-form">
        <button type="button" className="cs-btn" onClick={openHubLogin}>Log in to bid</button>
        <p className="cs-hint">
          Use your FRPL account. New? Choose Sign Up in the sign-in window; FRPL approves new accounts before
          they can bid. Bidding is free; you only pay if you win.
        </p>
      </div>
    );
  }

  const run = async (fn, okText) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await fn();
      if (result && result.ok === false) setError(result.message || 'This auction has ended.');
      else setNotice(typeof okText === 'function' ? okText(result) : okText);
      onBid();
    } catch (err) {
      setError(err.message);
      onBid();
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const problem = bidError(amount, {
      openingBid: auction.opening_bid,
      currentBid: auction.current_bid,
      bidCount: auction.bid_count,
    });
    if (problem) { setError(problem); return; }
    if (!window.confirm(`Place a bid of ${formatDollars(amount)} + tax? Bids are binding.`)) return;
    run(() => placeBid(auction.id, amount), (r) => (r?.extended
      ? 'Bid placed. The clock was extended because it was close to the end.'
      : 'Bid placed. You’re the high bidder.'));
  };

  const doBuyNow = () => {
    const price = formatDollars(auction.buy_now_price);
    if (!window.confirm(`Buy it now for ${price} + tax? This ends the auction and you agree to pay at Legends within ${payDays} days.`)) return;
    run(() => buyNow(auction.id), 'You bought it! Pay and pick up at Legends.');
  };

  return (
    <form className="cs-bid-form" onSubmit={submit}>
      {isHighBidder ? <p className="cs-bid-leading">You’re the high bidder.</p> : null}
      <div className="cs-bid-row">
        <span className="cs-bid-dollar">$</span>
        <input
          type="number"
          inputMode="decimal"
          step={bidIncrement(minNext)}
          min={minNext}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Your bid"
          disabled={busy || isHighBidder}
        />
        <button className="cs-btn" type="submit" disabled={busy || isHighBidder}>
          {busy ? 'Bidding…' : 'Place bid'}
        </button>
      </div>
      <p className="cs-hint">Minimum bid {formatDollars(minNext)}.</p>
      {auction.buy_now_price != null ? (
        <button type="button" className="cs-btn-secondary cs-buy-now" onClick={doBuyNow} disabled={busy}>
          Buy It Now · {formatDollars(auction.buy_now_price)} + tax
        </button>
      ) : null}
      {error ? <p className="cs-error">{error}</p> : null}
      {notice ? <p className="cs-bid-notice">{notice}</p> : null}
    </form>
  );
}
