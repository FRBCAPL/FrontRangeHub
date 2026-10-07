import React, { useEffect, useState } from 'react';
import { itemLabel, PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { bidderName, markAuctionPaid } from '../../services/consignmentAuctionAdminService.js';
import { loadFeesForItems } from '../../services/consignmentFeesService.js';
import { originalListingFee, saleSplit } from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

export default function ConsignmentAuctionPaidModal({ auction, onClose }) {
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [txnFee, setTxnFee] = useState('');
  const [credit, setCredit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const split = saleSplit(auction.winning_bid, auction.commission_pct, credit || 0);
  const fee = Number(txnFee) || 0;

  useEffect(() => {
    loadFeesForItems([auction.item_id])
      .then((byItem) => setCredit(originalListingFee(byItem[auction.item_id], 'auction')))
      .catch((err) => { setCredit(0); setError(err.message); });
  }, [auction.item_id]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await markAuctionPaid(auction, { paymentMethod: method, transactionFee: txnFee });
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-apaid-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-apaid-title">Winner paid · {itemLabel(auction.item)}</h2>
        <p className="cs-hint">
          {bidderName(auction.winner) || 'The winner'} paid for {auction.item?.name}. This marks the item sold and records the split.
          Sales tax is handled at the register and is not part of these numbers.
        </p>
        <div className="cs-auction-calc">
          <div>Winning bid <strong>{formatDollars(split.price)}</strong></div>
          {credit == null ? (
            <div className="cs-meta">Checking the listing fee…</div>
          ) : (
            <div className="cs-meta">
              Seller {formatDollars(split.sellerFromSale)} · FRPL keeps {formatDollars(split.frplFromSale)} from the sale
              ({Number(auction.commission_pct)}% = {formatDollars(split.commission)}
              {split.credit ? ` minus the ${formatDollars(split.credit)} listing fee already paid` : ''})
            </div>
          )}
        </div>
        <div className="cs-row">
          <div className="cs-field">
            <label>Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label>Card/transaction fee ($, optional)</label>
            <input type="number" step="0.01" min="0" value={txnFee} onChange={(e) => setTxnFee(e.target.value)} />
          </div>
        </div>
        {fee ? <p className="cs-hint">FRPL net from the sale after fee: {formatDollars(split.frplFromSale - fee)}</p> : null}
        <p className="cs-hint">The seller is then owed {formatDollars(split.sellerFromSale)}. Mark it with “Seller paid” on the Items tab.</p>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy || credit == null}>{busy ? 'Saving…' : 'Mark paid & sold'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
