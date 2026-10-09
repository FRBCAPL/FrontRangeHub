import React, { useState } from 'react';
import { itemLabel, LISTING_FEE_PAY } from '../../data/consignmentConstants.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

/** Cash App / Venmo codes for paying an auction listing fee. Not for buying items. */
export default function ConsignmentFeePayCodes({ item, amount = null, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) {
    return (
      <button type="button" className="cs-btn-secondary cs-feepay-toggle" onClick={() => setOpen(true)}>
        Pay listing fee (Cash App / Venmo)
      </button>
    );
  }
  return (
    <section className="cs-feepay" aria-label="Pay the auction listing fee">
      <p className="cs-feepay-lede">
        Pay the listing fee{amount ? <> of <strong>{formatDollars(amount)}</strong></> : ' FRPL quotes you'}
        {' '}after FRPL accepts your item. Put <strong>{itemLabel(item)}</strong> in the payment note.
        FRPL starts your auction once the payment comes through.
      </p>
      <p className="cs-feepay-warn">
        Scan a code or tap a button. Don’t search for the name; lookalike accounts exist.
        This is for listing fees only; buyers always pay at Legends.
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
