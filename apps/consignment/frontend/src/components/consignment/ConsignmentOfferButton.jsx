import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { onAuthChange, openHubLogin } from '../../services/consignmentAuctionService.js';
import { loadOfferTerms } from '../../services/consignmentOffersService.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import ConsignmentMakeOfferModal from './ConsignmentMakeOfferModal.jsx';

/** Item page: "Make an offer", or the state of the viewer's offer, or "On hold". `refreshKey` reloads the terms. */
export default function ConsignmentOfferButton({ itemId, itemName, refreshKey = '' }) {
  const [terms, setTerms] = useState(null);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    loadOfferTerms(itemId).then(setTerms).catch(() => setTerms(null));
  }, [itemId]);

  useEffect(() => { setSent(false); load(); }, [load, refreshKey]);
  useEffect(() => onAuthChange(() => load()), [load]);

  if (!terms) return null;
  const mine = terms.my_offer;
  const myOffersLink = <Link to={`${CONSIGNMENT_PATH}/my-offers`}>My offers</Link>;

  if (mine?.status === 'accepted') {
    return (
      <p className="cs-offer-note cs-offer-good">
        Your {formatDollars(mine.amount)} offer was accepted.{' '}
        {mine.hold_until ? `It’s held for you until ${formatDateTime(mine.hold_until)}; pay at Legends.` : 'See your win for next steps.'}
      </p>
    );
  }
  if (mine?.status === 'open') {
    return (
      <p className="cs-offer-note">
        {sent ? 'Offer sent! ' : ''}
        {mine.turn === 'buyer'
          ? <>The seller countered at <strong>{formatDollars(mine.amount)}</strong>. Answer by {formatDateTime(mine.expires_at)} on {myOffersLink}.</>
          : <>Your offer of <strong>{formatDollars(mine.amount)}</strong> is waiting on the seller (until {formatDateTime(mine.expires_at)}). See {myOffersLink}.</>}
      </p>
    );
  }
  if (terms.reason === 'on_hold') {
    return (
      <p className="cs-offer-note">
        On hold: the seller accepted an offer{terms.hold_until ? ` (held until ${formatDateTime(terms.hold_until)})` : ''}.
      </p>
    );
  }
  if (terms.reason) return null;
  if (terms.is_seller) {
    return (
      <p className="cs-offer-note">
        Your item: buyers can make offers from {formatDollars(terms.minimum)}. You’ll answer them on{' '}
        <Link to={`${CONSIGNMENT_PATH}/my-items`}>My items</Link>.
      </p>
    );
  }

  const start = () => (terms.signed_in ? setOpen(true) : openHubLogin());
  return (
    <div className="cs-offer-cta">
      <button type="button" className="cs-btn-secondary" onClick={start}>Make an offer</button>
      <span className="cs-hint">From {formatDollars(terms.minimum)}{terms.signed_in ? '' : ' · log in first'}</span>
      {open ? (
        <ConsignmentMakeOfferModal
          itemId={itemId}
          itemName={itemName}
          terms={terms}
          onClose={() => setOpen(false)}
          onSent={() => { setOpen(false); setSent(true); load(); }}
        />
      ) : null}
    </div>
  );
}
