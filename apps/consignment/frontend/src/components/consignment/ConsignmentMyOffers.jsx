import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { currentUserId, onAuthChange, openHubLogin } from '../../services/consignmentAuctionService.js';
import { loadMyOffers } from '../../services/consignmentOffersService.js';
import ConsignmentOfferList from './ConsignmentOfferList.jsx';
import ConsignmentMyGearOrders from './ConsignmentMyGearOrders.jsx';
import ConsignmentMyShipments from './ConsignmentMyShipments.jsx';
import ConsignmentMyPurchases from './ConsignmentMyPurchases.jsx';

/** Buyer page: what I bought (pickup and shipped), offers I've made, and reserved new gear. */
export default function ConsignmentMyOffers() {
  const [userId, setUserId] = useState(undefined);
  const [purchasesKey, setPurchasesKey] = useState(0);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (id) => {
    setUserId(id);
    if (!id) { setOffers([]); return; }
    setLoading(true);
    setError('');
    try {
      setOffers(await loadMyOffers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    currentUserId().then((id) => { if (alive) load(id); });
    const off = onAuthChange(load);
    return () => { alive = false; off(); };
  }, [load]);

  return (
    <div className="cs-page cs-mine">
      <p className="cs-kicker">Buyers</p>
      <h1>My offers &amp; orders</h1>
      {userId === null ? (
        <div className="cs-mine-empty">
          <p>Log in to see what you’ve bought, offers you’ve made and new gear you’ve reserved.</p>
          <button type="button" className="cs-btn" onClick={openHubLogin}>Sign up / Log in</button>
        </div>
      ) : null}
      {userId ? (
        <>
          <ConsignmentMyPurchases userId={userId} reloadKey={purchasesKey} />
          <ConsignmentMyShipments userId={userId} onChanged={() => setPurchasesKey((k) => k + 1)} />
          <section className="cs-mine-section" aria-labelledby="cs-my-offers-title">
            <h2 id="cs-my-offers-title">My offers</h2>
            <p className="cs-hint">
              Sellers have a few days to answer each offer. If they counter, you can accept, decline or counter back here.
            </p>
            {error ? <p className="cs-error" role="alert">{error}</p> : null}
            {loading && !offers.length ? <p className="cs-meta">Loading your offers…</p> : null}
            {!loading && !error && !offers.length ? (
              <p className="cs-mine-empty-line">
                No offers yet. Open an item in the <Link to={CONSIGNMENT_PATH}>shop</Link> and tap “Make an offer”.
              </p>
            ) : null}
            {offers.length ? <ConsignmentOfferList offers={offers} view="buyer" onChanged={() => load(userId)} /> : null}
          </section>
          <ConsignmentMyGearOrders userId={userId} />
        </>
      ) : null}
    </div>
  );
}
