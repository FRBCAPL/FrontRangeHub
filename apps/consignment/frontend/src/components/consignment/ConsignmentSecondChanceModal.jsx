import React, { useEffect, useState } from 'react';
import { itemLabel } from '../../data/consignmentConstants.js';
import {
  bidderName,
  loadSecondChanceCandidates,
  secondChanceAuction,
} from '../../services/consignmentAuctionAdminService.js';
import { auctionSplit } from '../../utils/consignmentAuctionMath.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

export default function ConsignmentSecondChanceModal({ auction, onClose }) {
  const [candidates, setCandidates] = useState(null);
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSecondChanceCandidates(auction)
      .then((rows) => {
        setCandidates(rows);
        const first = rows.find((r) => !r.suspended);
        if (first) setPicked(first.bidderId);
      })
      .catch((err) => setError(err.message));
  }, [auction]);

  const choice = candidates?.find((c) => c.bidderId === picked);
  const split = choice ? auctionSplit(choice.amount, auction.commission_pct) : null;

  const save = async (e) => {
    e.preventDefault();
    if (!choice) return;
    setBusy(true);
    setError('');
    try {
      await secondChanceAuction(auction, choice.bidderId);
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-second-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-second-title">Offer to another bidder · {itemLabel(auction.item)}</h2>
        <p className="cs-hint">
          Contact the bidder first. Each bidder is offered the item at their own highest bid. Save only after they accept;
          they then have the normal payment window.
        </p>
        {!candidates && !error ? <p className="cs-hint">Loading bidders…</p> : null}
        {candidates && !candidates.length ? <p className="cs-hint">No other bidders on this auction.</p> : null}
        {candidates?.length ? (
          <div className="cs-candidates" role="radiogroup">
            {candidates.map((c) => (
              <label key={c.bidderId} className={`cs-candidate${c.suspended ? ' disabled' : ''}`}>
                <input
                  type="radio"
                  name="cs-candidate"
                  value={c.bidderId}
                  checked={picked === c.bidderId}
                  disabled={c.suspended}
                  onChange={() => setPicked(c.bidderId)}
                />
                <span>
                  <strong>{bidderName(c.user) || 'Unknown bidder'}</strong> · {formatDollars(c.amount)}
                  <span className="cs-meta"> {c.user?.phone || c.user?.email || ''}{c.suspended ? ' · suspended' : ''}</span>
                </span>
              </label>
            ))}
          </div>
        ) : null}
        {split ? (
          <p className="cs-hint">
            At {formatDollars(split.price)}: seller {formatDollars(split.seller)} · FRPL {formatDollars(split.commission)}
          </p>
        ) : null}
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy || !choice}>{busy ? 'Saving…' : 'They accepted'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
