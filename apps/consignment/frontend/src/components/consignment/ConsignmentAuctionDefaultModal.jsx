import React, { useState } from 'react';
import { itemLabel } from '../../data/consignmentConstants.js';
import { bidderName, defaultAuction } from '../../services/consignmentAuctionAdminService.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

export default function ConsignmentAuctionDefaultModal({ auction, onClose }) {
  const overdue = Boolean(auction.payment_due_at) && new Date(auction.payment_due_at).getTime() < Date.now();
  const [suspend, setSuspend] = useState(overdue);
  const [reason, setReason] = useState('Did not pay for a won auction');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (!overdue && !window.confirm(
      `The pay window is still open until ${formatDateTime(auction.payment_due_at)}. Mark this winner unpaid anyway?`,
    )) return;
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
        <h2 id="cs-adefault-title">Winner didn’t pay · {itemLabel(auction.item)}</h2>
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
          Nothing is awarded automatically. Afterward you can offer it to another bidder, or the seller picks
          relist, fixed price or keep it on My items and you confirm it from the Auctions tab.
        </p>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Mark unpaid'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)} disabled={busy}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
