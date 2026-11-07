import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { currentUserId, onAuthChange, openHubLogin } from '../../services/consignmentAuctionService.js';
import { loadMyOffers } from '../../services/consignmentOffersService.js';
import ConsignmentOfferList from './ConsignmentOfferList.jsx';

/** Buyer page: offers I've made, counters waiting on me, accepted holds. */
export default function ConsignmentMyOffers() {
  const [userId, setUserId] = useState(undefined);
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
      <h1>My offers</h1>
      {userId === null ? (
        <div className="cs-mine-empty">
          <p>Log in to see offers you’ve made.</p>
          <button type="button" className="cs-btn" onClick={openHubLogin}>Sign up / Log in</button>
        </div>
      ) : null}
      {userId ? (
        <>
          <p className="cs-lede">
            Sellers have a few days to answer each offer. If they counter, you can accept, decline or counter back here.
          </p>
          {error ? <p className="cs-error" role="alert">{error}</p> : null}
          {loading && !offers.length ? <p className="cs-meta">Loading your offers…</p> : null}
          {!loading && !error && !offers.length ? (
            <div className="cs-mine-empty">
              <p>No offers yet. Open an item in the shop and tap “Make an offer”.</p>
              <Link className="cs-btn" to={CONSIGNMENT_PATH}>Go to the shop</Link>
            </div>
          ) : null}
          {offers.length ? <ConsignmentOfferList offers={offers} view="buyer" onChanged={() => load(userId)} /> : null}
        </>
      ) : null}
    </div>
  );
}
