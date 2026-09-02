import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadHomepageTournamentBanner } from './homepageTournamentBannerData.js';
import HomepageTournamentListModal from './HomepageTournamentListModal.jsx';
import './TournamentBannerAll.css';

const POLL_MS = 20000;

/**
 * Landing-page banner: ladder events in registration, plus live Cash Climb / elim events.
 * Tapping the banner opens a short list modal instead of leaving the homepage.
 */
const TournamentBannerAll = () => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchBanner = async () => {
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
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (loading || !banner?.items?.length) return null;

  const listItems = banner.hasLive ? banner.items.filter((item) => item.live) : banner.items;
  const openList = () => setListOpen(true);
  const pickEvent = (item) => {
    setListOpen(false);
    if (item?.path) navigate(item.path);
  };

  return (
    <div className="tba-shell">
      <div
        className={`tba-banner${banner.hasLive ? ' is-live' : ' is-upcoming'}`}
        role="button"
        tabIndex={0}
        onClick={openList}
        onKeyDown={(e) => e.key === 'Enter' && openList()}
      >
        <div className="tba-shimmer" aria-hidden="true" />
        <div className="tba-body">
          <h3 className="tba-title">🏆 {banner.title} 🏆</h3>
          <div className="tba-chips">
            {banner.items.map((item) => (
              <span key={item.id} className="tba-chip">
                <strong>{item.label}</strong>
                {item.detail ? <span>{item.detail}</span> : null}
                {item.live ? <em className="tba-pill">Live</em> : null}
                {item.urgent && !item.live ? <em className="tba-pill">Soon</em> : null}
              </span>
            ))}
          </div>
          <div className="tba-footer">{banner.footer}</div>
        </div>
      </div>
      {listOpen ? (
        <HomepageTournamentListModal
          title="Current tournaments"
          items={listItems}
          onClose={() => setListOpen(false)}
          onPick={pickEvent}
        />
      ) : null}
    </div>
  );
};

export default TournamentBannerAll;
