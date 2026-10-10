import React, { useState } from 'react';
import { itemLabel, LISTING_FEE_PAY } from '../../data/consignmentConstants.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

/**
 * Cash App / Venmo codes for paying an auction listing fee or relist fee. Not for buying items.
 * kind: 'listing' (new auction) or 'relist' (after an unsold auction).
 */
export default function ConsignmentFeePayCodes({ item, amount = null, defaultOpen = false, kind = 'listing' }) {
  const [open, setOpen] = useState(defaultOpen);
  const relist = kind === 'relist';
  const feeName = relist ? 'relist fee' : 'listing fee';
  if (!open) {
    return (
      <button type="button" className="cs-btn-secondary cs-feepay-toggle" onClick={() => setOpen(true)}>
        Pay {feeName} (Cash App / Venmo)
      </button>
    );
  }
  return (
    <section className="cs-feepay" aria-label={`Pay the auction ${feeName}`}>
      <p className="cs-feepay-lede">
        Pay the {feeName}{amount ? <> of <strong>{formatDollars(amount)}</strong></> : ' FRPL quotes you'}
        {relist ? '.' : ' after FRPL accepts your item.'} Put <strong>{itemLabel(item)}</strong> in the payment note.
        FRPL starts your {relist ? 'new ' : ''}auction once the payment comes through.
      </p>
      <p className="cs-feepay-warn">
        Scan a code or tap a button. Don’t search for the name; lookalike accounts exist.
        This is for seller fees only; buyers always pay at Legends.
      </p>
      <div className="cs-feepay-pair">
        {LISTING_FEE_PAY.map((p) => (
          <div key={p.id} className="cs-feepay-col">
            <strong>{p.name} · {p.handle}</strong>
            <img src={p.qr} alt={`${p.name} QR code for ${p.handle}`} loading="lazy" />
            <a className="cs-btn" href={p.href} target="_blank" rel="noopener noreferrer">Open {p.name}</a>
          </div>
        ))}
      </div>
      <p className="cs-meta">Prefer cash? Pay FRPL in person at Legends.</p>
      <button type="button" className="cs-btn-secondary" onClick={() => setOpen(false)}>Hide</button>
    </section>
  );
}
