import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { breakAndRunListItem, loadHomepageTournamentBanner } from './homepageTournamentBannerData.js';
import { useBreakAndRunLiveCheck } from '@apps/tournament-bracket/frontend/src/components/tournament/break-and-run/useBreakAndRunLiveNow.js';
import HomepageTournamentListModal from './HomepageTournamentListModal.jsx';
import { BREAK_AND_RUN_GUIDE_HASH } from '@apps/tournament-bracket/frontend/src/components/tournament/break-and-run/breakAndRunGuide.js';
import breakAndRunLogo from '@apps/tournament-bracket/frontend/src/components/tournament/break-and-run/brand/break-and-run-logo.jpg';
import './TournamentBannerAll.css';

const POLL_MS = 20000;

/**
 * Landing-page banner: ladder events in registration, plus live Cash Climb / elim.
 * Open Break & Run pots get their own logo button (with a Live pill while a session is playing).
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
      if (document.hidden) return;
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
    document.addEventListener('visibilitychange', fetchBanner);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', fetchBanner);
    };
  }, []);

  const bnrPots = banner?.breakAndRuns || [];
  const isLive = useBreakAndRunLiveCheck(bnrPots.map((item) => item.tournament));

  if (loading || !banner) return null;

  const items = banner.items || [];
  const breakAndRuns = bnrPots
    .map((item) => breakAndRunListItem(item, isLive(item.tournament)))
    .sort((a, b) => Number(b.live) - Number(a.live));
  const bnrLiveCount = breakAndRuns.filter((item) => item.live).length;
  const listItems = banner.hasLive ? items.filter((item) => item.live) : items;
  const pickEvent = (item) => {
    setOpenList(null);
    if (item?.path) navigate(item.path);
  };

  const liveCount = items.filter((item) => item.live).length;
  const badgeLabel = banner.hasLive
    ? (liveCount === 1 ? 'Live Tournament' : `Live Tournaments · ${liveCount}`)
    : (items.length === 1 ? 'Upcoming Tournament' : `Upcoming Tournaments · ${items.length}`);
  const bnrLabel = bnrLiveCount
    ? (bnrLiveCount === 1 ? 'Live Break & Run' : `Live Break & Runs · ${bnrLiveCount}`)
    : 'Break & Run pot';

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
          {bnrLiveCount ? <em className="tba-pill tba-bnr-live">Live</em> : null}
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
          title={bnrLiveCount ? 'Live Break & Run' : 'Break & Run pot'}
          items={breakAndRuns}
          footerLink={{ href: `#${BREAK_AND_RUN_GUIDE_HASH}`, label: 'How the Break & Run works' }}
          onClose={() => setOpenList(null)}
          onPick={pickEvent}
        />
      ) : null}
    </div>
  );
};

export default TournamentBannerAll;
