import React, { useState } from 'react';
import { bidderName, defaultAuction } from '../../services/consignmentAuctionAdminService.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

export default function ConsignmentAuctionDefaultModal({ auction, onClose }) {
  const [suspend, setSuspend] = useState(true);
  const [reason, setReason] = useState('Did not pay for a won auction');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const overdue = new Date(auction.payment_due_at).getTime() < Date.now();

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await defaultAuction(auction, { suspend, reason });
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-adefault-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-adefault-title">Winner didn’t pay · {auction.item?.item_number}</h2>
        <p className="cs-hint">
          {bidderName(auction.winner) || 'The winner'} won at {formatDollars(auction.winning_bid)}.
          Payment {overdue ? 'was due' : 'is due'} {formatDateTime(auction.payment_due_at)}.
        </p>
        {!overdue ? <p className="cs-due">The payment window hasn’t closed yet.</p> : null}
        <label className="cs-check">
          <input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} />
          Suspend this bidder from future auctions
        </label>
        <div className="cs-field">
          <label>Note (admin only)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <p className="cs-hint">
          Nothing is awarded automatically. Afterward you can offer it to another bidder, relist it, switch it to
          fixed price, or return it to the seller.
        </p>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Mark unpaid'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
