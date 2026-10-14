import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, LEGENDS, LEGENDS_MAP_URL } from '../../data/consignmentConstants.js';
import { loadCatalog } from '../../services/consignmentService.js';
import { loadAuctionsForItems } from '../../services/consignmentAuctionService.js';
import { syncServerClock } from '../../services/consignmentServerClock.js';
import ConsignmentItemCard from './ConsignmentItemCard.jsx';
import ConsignmentShopBadges from './ConsignmentShopBadges.jsx';
import ConsignmentBuyersGuideModal from './ConsignmentBuyersGuideModal.jsx';
import ConsignmentExampleListings from './ConsignmentExampleListings.jsx';
import ConsignmentBidAlertsToggle from './ConsignmentBidAlertsToggle.jsx';
import useWatchList from '../../hooks/useWatchList.js';
import './consignment-shop.css';
import './consignment-watch.css';

const AUCTION_REFRESH_MS = 60 * 1000;

export default function ConsignmentStorefront() {
  const [category, setCategory] = useState('all');
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(() => {
    const show = searchParams.get('show');
    return show === 'case' || show === 'auctions' ? show : 'available';
  });
  const [rows, setRows] = useState([]);
  const [auctions, setAuctions] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasRealAuctions, setHasRealAuctions] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const watch = useWatchList();
  let catalogStatus = status;
  if (status === 'auctions' || status === 'case') catalogStatus = 'available';
  else if (status === 'watching') catalogStatus = 'all';

  useEffect(() => {
    if (status === 'watching' && !watch.userId) setStatus('available');
  }, [status, watch.userId]);

  useEffect(() => {
    syncServerClock();
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    loadCatalog({ category, status: catalogStatus })
      .then(async (all) => {
        const list = all.filter((r) => !r.is_example);
        const auctionIds = list.filter((r) => r.sale_method === 'auction').map((r) => r.id);
        const byItem = await loadAuctionsForItems(auctionIds);
        if (!alive) return;
        if (category === 'all' && catalogStatus === 'available') {
          setHasRealAuctions(list.some((r) => r.sale_method === 'auction'
            && (!byItem[r.id] || byItem[r.id].status === 'live')));
        }
        setRows(list);
        setAuctions(byItem);
      })
      .catch((err) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, catalogStatus]);

  const liveIds = Object.values(auctions).filter((a) => a.status === 'live').map((a) => a.item_id).join(',');
  useEffect(() => {
    if (!liveIds) return undefined;
    const ids = liveIds.split(',');
    const id = setInterval(() => {
      loadAuctionsForItems(ids).then((fresh) => setAuctions((prev) => ({ ...prev, ...fresh })));
    }, AUCTION_REFRESH_MS);
    return () => clearInterval(id);
  }, [liveIds]);

  const isAuction = (i) => i.sale_method === 'auction';
  // An auction item is still for sale until its auction closes (no auction row yet counts as open).
  const forSale = (i) => i.status !== 'sold' && (!isAuction(i) || !auctions[i.id] || auctions[i.id].status === 'live');
  const visible = catalogStatus === 'available' ? rows.filter(forSale) : rows;
  const items = visible.filter((i) => {
    if (status === 'auctions') return isAuction(i);
    if (status === 'case') return !isAuction(i);
    if (status === 'watching') return watch.watched.has(i.id);
    return true;
  });
  const auctionCount = items.filter((i) => isAuction(i) && forSale(i)).length;
  const shelfCount = items.filter((i) => !isAuction(i) && forSale(i)).length;
  const badgeCounts = loading || catalogStatus === 'sold' ? {} : {
    case: rows.filter((i) => !isAuction(i) && forSale(i)).length,
    auctions: rows.filter((i) => isAuction(i) && forSale(i)).length,
  };
  const counts = [
    shelfCount ? `${shelfCount} in the case` : '',
    auctionCount ? `${auctionCount} online auction${auctionCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="cs-page cs-shop">
      <header className="cs-shop-head">
        <div className="cs-shop-title">
          <h1><center>FRPL Consignment</center></h1>
          <p>
            <center>Buy in person from the case at <strong>Legends Brews &amp; Cues</strong> in{' '}
            <a href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">{LEGENDS.city}, {LEGENDS.state}</a>, or bid
            online. <br />
            Auction items are delivered to Legends when they sell. <br />
            All pickups are in person; nothing ships. <br />
            Prices + tax, paid at the register.
            </center>
          </p>
        </div>
        <div className="cs-shop-filters">
          <div className="cs-shop-guide-row">
            <button type="button" className="cs-shop-badge cs-shop-badge-guide" onClick={() => setGuideOpen(true)}>
              <span aria-hidden="true">📖</span> Buyer’s guide
            </button>
          </div>
          <ConsignmentShopBadges status={status} counts={badgeCounts} onPick={setStatus} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="available">Available</option>
            <option value="case">In the case</option>
            <option value="auctions">Online auctions</option>
            <option value="sold">Sold</option>
            <option value="all">Available & sold</option>
            {watch.userId ? <option value="watching">Watching ({watch.watched.size})</option> : null}
          </select>
        </div>
      </header>
      {status === 'watching' && watch.userId ? (
        <div className="cs-watching-bar">
          <p className="cs-hint">Tap ♥ on any item to watch it. Watched auctions email you an hour before they end.</p>
          <ConsignmentBidAlertsToggle userId={watch.userId} />
        </div>
      ) : null}
      {!loading && counts ? <p className="cs-shop-count">{counts}</p> : null}
      {error ? <p className="cs-error">{error}</p> : null}
      {watch.error ? <p className="cs-error">{watch.error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="cs-shop-empty">
          {status === 'watching'
            ? 'You’re not watching anything yet. Tap ♥ on an item to add it here.'
            : 'Nothing here yet. Check back soon, or sell an item through FRPL.'}
        </p>
      ) : null}
      <div className="cs-grid">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="cs-card cs-card-skeleton" aria-hidden="true" />)
          : items.map((item) => (
            <ConsignmentItemCard
              key={item.id}
              item={item}
              auction={auctions[item.id]}
              watching={watch.watched.has(item.id)}
              onWatch={watch.toggle}
              signedIn={Boolean(watch.userId)}
            />
          ))}
      </div>
      <ConsignmentExampleListings hideAuctions={hasRealAuctions} />
      {guideOpen ? <ConsignmentBuyersGuideModal onClose={closeGuide} /> : null}
    </div>
  );
}
