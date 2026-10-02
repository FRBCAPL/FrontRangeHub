import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadHomepageTournamentBanner } from './homepageTournamentBannerData.js';
import HomepageTournamentListModal from './HomepageTournamentListModal.jsx';
import breakAndRunLogo from '@apps/tournament-bracket/frontend/src/components/tournament/break-and-run/brand/break-and-run-logo.jpg';
import './TournamentBannerAll.css';

const POLL_MS = 20000;

/**
 * Landing-page banner: ladder events in registration, plus live Cash Climb / elim.
 * Live Break & Runs get their own logo button with a separate list.
 * Tapping either opens a short list modal instead of leaving the homepage.
 */
const TournamentBannerAll = () => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openList, setOpenList] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchBanner = async () => {
      try {
        const next = await loadHomepageTournamentBanner();
        if (!cancelled) setBanner(next.items.length || next.breakAndRuns.length ? next : null);
      } catch (err) {
        console.error('TournamentBannerAll fetch error:', err);
        if (!cancelled) setBanner(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBanner();
    const timer = setInterval(fetchBanner, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (loading || !banner) return null;

  const items = banner.items || [];
  const breakAndRuns = banner.breakAndRuns || [];
  const listItems = banner.hasLive ? items.filter((item) => item.live) : items;
  const pickEvent = (item) => {
    setOpenList(null);
    if (item?.path) navigate(item.path);
  };

  const liveCount = items.filter((item) => item.live).length;
  const badgeLabel = banner.hasLive
    ? (liveCount === 1 ? 'Live Tournament' : `Live Tournaments · ${liveCount}`)
    : (items.length === 1 ? 'Upcoming Tournament' : `Upcoming Tournaments · ${items.length}`);
  const bnrLabel = breakAndRuns.length === 1 ? 'Live Break & Run' : `Live Break & Runs · ${breakAndRuns.length}`;

  return (
    <div className="tba-shell">
      {breakAndRuns.length ? (
        <button
          type="button"
          className="tba-bnr-logo"
          onClick={() => setOpenList('bnr')}
          aria-label={`${bnrLabel}. Open the list.`}
          title={bnrLabel}
        >
          <img src={breakAndRunLogo} alt="" decoding="async" />
        </button>
      ) : null}
      {items.length ? (
        <div
          className={`tba-banner tba-banner--compact${banner.hasLive ? ' is-live' : ' is-upcoming'}`}
          role="button"
          tabIndex={0}
          onClick={() => setOpenList('tournaments')}
          onKeyDown={(e) => e.key === 'Enter' && setOpenList('tournaments')}
          aria-label={`${badgeLabel}. Open current tournaments.`}
        >
          <div className="tba-shimmer" aria-hidden="true" />
          <span className="tba-badge-icon" aria-hidden="true">🏆</span>
          <span className="tba-title">{badgeLabel}</span>
          {banner.hasLive ? <em className="tba-pill">Live</em> : null}
          <span className="tba-badge-cta">Tap for list</span>
        </div>
      ) : null}
      {openList === 'tournaments' ? (
        <HomepageTournamentListModal
          title="Current tournaments"
          items={listItems}
          onClose={() => setOpenList(null)}
          onPick={pickEvent}
        />
      ) : null}
      {openList === 'bnr' ? (
        <HomepageTournamentListModal
          title="Live Break & Runs"
          items={breakAndRuns}
          onClose={() => setOpenList(null)}
          onPick={pickEvent}
        />
      ) : null}
    </div>
  );
};

export default TournamentBannerAll;
