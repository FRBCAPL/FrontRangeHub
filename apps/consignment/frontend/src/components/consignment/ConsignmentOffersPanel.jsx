import React, { useCallback, useEffect, useRef, useState } from 'react';
import { loadAdminOffers } from '../../services/consignmentOffersService.js';
import ConsignmentOfferList from './ConsignmentOfferList.jsx';

/** Admin Offers tab: answer for sellers, see holds, end a hold when a buyer backs out. */
export default function ConsignmentOffersPanel() {
  const [scope, setScope] = useState('active');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const rows = await loadAdminOffers(scope);
      if (request === requestRef.current) setOffers(rows);
    } catch (err) {
      if (request === requestRef.current) setError(err.message);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  const waiting = offers.filter((o) => o.status === 'open' && o.turn === 'seller').length;
  const holds = offers.filter((o) => o.status === 'accepted').length;
  return (
    <section className="cs-offer-section" aria-labelledby="cs-admin-offers-title">
      <h2 id="cs-admin-offers-title">Offers</h2>
      <p className="cs-hint">
        Sellers answer offers on My items. You can answer for any seller (useful when they have no account).
        Accepting lowers the payout to match the offer and records it as the seller’s agreement.
        Accepted shelf items are held for the buyer; mark them sold at the offer price when they pay.
      </p>
      <div className="cs-offer-scope" role="group" aria-label="Which offers">
        <button type="button" className={scope === 'active' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setScope('active')}>
          Active
        </button>
        <button type="button" className={scope === 'all' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setScope('all')}>
          Last 90 days
        </button>
      </div>
      {!loading && offers.length ? (
        <p className="cs-meta">{waiting} waiting on a seller · {holds} accepted</p>
      ) : null}
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
      {loading && !offers.length ? <p className="cs-meta">Loading offers…</p> : null}
      {!loading && !error && !offers.length ? <p className="cs-meta">No {scope === 'active' ? 'active ' : ''}offers.</p> : null}
      {offers.length ? <ConsignmentOfferList offers={offers} view="admin" onChanged={load} /> : null}
    </section>
  );
}
