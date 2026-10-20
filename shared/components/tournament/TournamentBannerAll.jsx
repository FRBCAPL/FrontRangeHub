import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadHomepageTournamentBanner } from './homepageTournamentBannerData.js';
import HomepageTournamentListModal from './HomepageTournamentListModal.jsx';
import './TournamentBannerAll.css';

const POLL_MS = 20000;

/**
 * Landing-page banner: ladder events in registration, plus live Cash Climb / elim.
 * Break & Run pots have their own homepage tile (useBreakAndRunTile).
 * Tapping opens a short list modal instead of leaving the homepage.
 */
const TournamentBannerAll = () => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openList, setOpenList] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchBanner = async () => {
      if (document.hidden) return;
      try {
        const next = await loadHomepageTournamentBanner();
        if (!cancelled) setBanner(next.items.length ? next : null);
      } catch (err) {
        console.error('TournamentBannerAll fetch error:', err);
        if (!cancelled) setBanner(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBanner();
    const timer = setInterval(fetchBanner, POLL_MS);
    document.addEventListener('visibilitychange', fetchBanner);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', fetchBanner);
    };
  }, []);

  if (loading || !banner) return null;

  const items = banner.items || [];
  const listItems = banner.hasLive ? items.filter((item) => item.live) : items;
  const pickEvent = (item) => {
    setOpenList(false);
    if (item?.path) navigate(item.path);
  };

  const liveCount = items.filter((item) => item.live).length;
  const badgeLabel = banner.hasLive
    ? (liveCount === 1 ? 'Live Tournament' : `Live Tournaments · ${liveCount}`)
    : (items.length === 1 ? 'Upcoming Tournament' : `Upcoming Tournaments · ${items.length}`);

  return (
    <div className="tba-shell">
      <div
        className={`tba-banner tba-banner--compact${banner.hasLive ? ' is-live' : ' is-upcoming'}`}
        role="button"
        tabIndex={0}
        onClick={() => setOpenList(true)}
        onKeyDown={(e) => e.key === 'Enter' && setOpenList(true)}
        aria-label={`${badgeLabel}. Open current tournaments.`}
      >
        <div className="tba-shimmer" aria-hidden="true" />
        <span className="tba-badge-icon" aria-hidden="true">🏆</span>
        <span className="tba-title">{badgeLabel}</span>
        {banner.hasLive ? <em className="tba-pill">Live</em> : null}
        <span className="tba-badge-cta">Tap for list</span>
      </div>
      {openList ? (
        <HomepageTournamentListModal
          title="Current tournaments"
          items={listItems}
          onClose={() => setOpenList(false)}
          onPick={pickEvent}
        />
      ) : null}
    </div>
  );
};

export default TournamentBannerAll;
