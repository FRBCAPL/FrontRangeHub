import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { currentUserId, onAuthChange, openHubLogin } from '../../services/consignmentAuctionService.js';
import { currentUserEmail, loadMyItems } from '../../services/consignmentSellerService.js';
import ConsignmentMyItemCard from './ConsignmentMyItemCard.jsx';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';

export default function ConsignmentMyItems() {
  const [userId, setUserId] = useState(undefined);
  const [email, setEmail] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (id) => {
    setUserId(id);
    if (!id) { setItems([]); return; }
    setLoading(true);
    setError('');
    try {
      const [rows, mail] = await Promise.all([loadMyItems(), currentUserEmail()]);
      setItems(rows);
      setEmail(mail);
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
      <p className="cs-kicker">Sellers</p>
      <h1>My items</h1>

      {userId === null ? (
        <div className="cs-mine-empty">
          <p>Log in to check on items you've consigned with FRPL.</p>
          <button type="button" className="cs-btn" onClick={openHubLogin}>Sign up / Log in</button>
          <p className="cs-meta">Use the same email you put on your consignment form.</p>
        </div>
      ) : null}

      {userId ? (
        <>
          <p className="cs-lede">
            Items submitted while logged in, or with the email <strong>{email || 'on your account'}</strong>.
          </p>
          {error ? <p className="cs-error" role="alert">{error}</p> : null}
          {loading && !items.length ? <p className="cs-meta">Loading your items…</p> : null}
          {!loading && !error && !items.length ? (
            <div className="cs-mine-empty">
              <p>No items found for this account yet.</p>
              <p className="cs-meta">
                If you consigned with a different email, contact FRPL and we'll link it.
              </p>
              <Link className="cs-btn" to={`${CONSIGNMENT_PATH}/sell`}>Sell an item</Link>{' '}
              <ConsignmentContactButton topic="account" />
            </div>
          ) : null}
          {items.length ? (
            <ul className="cs-mine-list">
              {items.map((item) => <ConsignmentMyItemCard key={item.id} item={item} />)}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
