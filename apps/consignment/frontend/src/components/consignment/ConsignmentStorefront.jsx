import React, { useEffect, useState } from 'react';
import { CATEGORIES } from '../../data/consignmentConstants.js';
import { loadCatalog } from '../../services/consignmentService.js';
import { loadAuctionsForItems } from '../../services/consignmentAuctionService.js';
import ConsignmentItemCard from './ConsignmentItemCard.jsx';

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

  return (
    <div className="cs-page">
      <p className="cs-kicker">Front Range Pool League</p>
      <h1>FRPL Consignment</h1>
      <span className="cs-legends">Available at Legends Brews & Cues</span>
      <p className="cs-lede">
        Scan a tag in the case, or browse here. <br />
        Sales are in person at Legends.<br />
        Prices do not include tax - added at the register.
      </p>
      <div className="cs-filters">
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
      {error ? <p className="cs-error">{error}</p> : null}
      {loading ? <p className="cs-lede">Loading…</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="cs-lede">Nothing in the case yet. <br />
        Check back soon, or submit an item to sell.</p>
      ) : null}
      <div className="cs-grid">
        {items.map((item) => <ConsignmentItemCard key={item.id} item={item} auction={auctions[item.id]} />)}
      </div>
    </div>
  );
}
