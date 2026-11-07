import React, { useCallback, useEffect, useState } from 'react';
import { loadSellerOffers } from '../../services/consignmentOffersService.js';
import ConsignmentOfferList from './ConsignmentOfferList.jsx';

/** My items: offers on the signed-in seller's items. Renders nothing when there are none. */
export default function ConsignmentSellerOffers({ userId, onChanged }) {
  const [offers, setOffers] = useState([]);

  const load = useCallback(() => {
    if (!userId) { setOffers([]); return; }
    loadSellerOffers().then(setOffers).catch(() => setOffers([]));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (!offers.length) return null;
  const waiting = offers.filter((o) => o.status === 'open' && o.turn === 'seller').length;
  return (
    <section className="cs-offer-section" aria-labelledby="cs-seller-offers-title">
      <h2 id="cs-seller-offers-title">Offers{waiting ? ` · ${waiting} waiting on you` : ''}</h2>
      <p className="cs-hint">
        Accept, decline or counter. Accepting lowers your price to the offer (it shows what you’d receive); the buyer then
        has a few days to pay at Legends, or the price goes back.
      </p>
      <ConsignmentOfferList
        offers={offers}
        view="seller"
        onChanged={() => { load(); onChanged?.(); }}
      />
    </section>
  );
}
