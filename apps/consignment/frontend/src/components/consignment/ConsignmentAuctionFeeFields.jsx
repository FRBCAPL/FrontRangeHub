import React from 'react';
import { PAYMENT_METHODS } from '../../data/consignmentConstants.js';

/** Listing/relist fee inputs for the auction start modal. The fee must be paid before the auction starts. */
export default function ConsignmentAuctionFeeFields({
  isRelist,
  fee,
  onFeeChange,
  reason,
  feePaid,
  setFeePaid,
  method,
  setMethod,
}) {
  const owed = Number(fee) > 0;
  return (
    <>
      <div className="cs-row">
        <div className="cs-field">
          <label>{isRelist ? 'Relist' : 'Listing'} fee ($)</label>
          <input type="number" step="0.01" min="0" value={fee} onChange={(e) => onFeeChange(e.target.value)} />
          {reason ? <p className="cs-hint">{reason}</p> : null}
        </div>
        {owed ? (
          <div className="cs-field">
            <label>Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={!feePaid}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : null}
      </div>
      {owed ? (
        <label className="cs-check">
          <input type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} />
          Fee paid now (required before the auction starts)
        </label>
      ) : null}
    </>
  );
}
