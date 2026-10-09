import React, { useEffect, useState } from 'react';
import { CATEGORIES, LEGENDS, LEGENDS_MAP_URL } from '../../data/consignmentConstants.js';
import { loadCatalog } from '../../services/consignmentService.js';
import { loadAuctionsForItems } from '../../services/consignmentAuctionService.js';
import ConsignmentItemCard from './ConsignmentItemCard.jsx';
import './consignment-shop.css';

export default function ConsignmentStorefront() {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('available');
  const [items, setItems] = useState([]);
  const [auctions, setAuctions] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const catalogStatus = status === 'auctions' ? 'available' : status;
    loadCatalog({ category, status: catalogStatus })
      .then(async (rows) => {
        const list = status === 'auctions' ? rows.filter((r) => r.sale_method === 'auction') : rows;
        const auctionIds = list.filter((r) => r.sale_method === 'auction').map((r) => r.id);
        const byItem = await loadAuctionsForItems(auctionIds);
        if (!alive) return;
        setItems(list);
        setAuctions(byItem);
      })
      .catch((err) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, status]);

  const auctionCount = items.filter((i) => i.sale_method === 'auction' && i.status !== 'sold').length;
  const shelfCount = items.filter((i) => i.sale_method !== 'auction' && i.status !== 'sold').length;
  const counts = [
    shelfCount ? `${shelfCount} in the case` : '',
    auctionCount ? `${auctionCount} online auction${auctionCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="cs-page cs-shop">
      <header className="cs-shop-head">
        <div className="cs-shop-title">
          <h1>FRPL Consignment</h1>
          <p>
            Buy in person from the case at <strong>Legends Brews &amp; Cues</strong> in{' '}
            <a href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">{LEGENDS.city}, {LEGENDS.state}</a>, or bid
            online. Auction items are delivered to Legends when they sell. All pickups are in person; nothing ships.
            Prices + tax, paid at the register.
          </p>
        </div>
        <div className="cs-shop-filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="available">Available</option>
            <option value="auctions">Online auctions</option>
            <option value="sold">Sold</option>
            <option value="all">Available & sold</option>
          </select>
        </div>
      </header>
      {!loading && counts ? <p className="cs-shop-count">{counts}</p> : null}
      {error ? <p className="cs-error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="cs-shop-empty">Nothing here yet. Check back soon, or sell an item through FRPL.</p>
      ) : null}
      <div className="cs-grid">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="cs-card cs-card-skeleton" aria-hidden="true" />)
          : items.map((item) => <ConsignmentItemCard key={item.id} item={item} auction={auctions[item.id]} />)}
      </div>
    </div>
  );
}
