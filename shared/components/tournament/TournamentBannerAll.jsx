import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadHomepageTournamentBanner } from './homepageTournamentBannerData.js';

const POLL_MS = 20000;

/**
 * Landing-page banner: ladder events in registration, plus live Cash Climb / elim events.
 */
const TournamentBannerAll = () => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const hasUrgent = banner.hasUrgent;
  const handleBannerClick = () => {
    navigate(banner.defaultPath);
  };
  const handleChipClick = (e, path) => {
    e.stopPropagation();
    navigate(path);
  };

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4%' }}>
    <div
      className="tournament-banner-all"
      role="button"
      tabIndex={0}
      onClick={handleBannerClick}
      onKeyDown={(e) => e.key === 'Enter' && handleBannerClick()}
      style={{
        background: hasUrgent
          ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
          : 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)',
        borderRadius: '20px',
        padding: '0.5rem 0.55rem',
        margin: '0 auto',
        width: '65%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
        border: hasUrgent ? '2px solid #ff6666' : '2px solid #00ff00',
        boxShadow: hasUrgent
          ? '0 4px 20px rgba(255, 68, 68, 0.3), 0 0 40px rgba(255, 68, 68, 0.25), 0 0 60px rgba(255, 68, 68, 0.15)'
          : '0 4px 20px rgba(0, 255, 0, 0.3), 0 0 40px rgba(0, 255, 0, 0.25), 0 0 60px rgba(0, 255, 0, 0.15)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.01)';
        e.currentTarget.style.boxShadow = hasUrgent
          ? '0 6px 30px rgba(255, 68, 68, 0.4), 0 0 50px rgba(255, 68, 68, 0.35), 0 0 80px rgba(255, 68, 68, 0.2)'
          : '0 6px 30px rgba(0, 255, 0, 0.4), 0 0 50px rgba(0, 255, 0, 0.35), 0 0 80px rgba(0, 255, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = hasUrgent
          ? '0 4px 20px rgba(255, 68, 68, 0.3), 0 0 40px rgba(255, 68, 68, 0.25), 0 0 60px rgba(255, 68, 68, 0.15)'
          : '0 4px 20px rgba(0, 255, 0, 0.3), 0 0 40px rgba(0, 255, 0, 0.25), 0 0 60px rgba(0, 255, 0, 0.15)';
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (max-width: 768px) {
          .tournament-banner-all {
            width: 92% !important;
            max-width: 92% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          animation: 'shimmer 3s infinite',
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            marginBottom: '0.4rem'
          }}
        >
          <h3
            style={{
              color: '#000',
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            🏆 {banner.title} 🏆
          </h3>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {banner.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => handleChipClick(e, item.path)}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.28rem 0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexWrap: 'wrap',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span
                style={{
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
              >
                {item.label}
              </span>
              {item.detail ? (
                <span style={{ color: 'rgba(0,0,0,0.85)', fontSize: '0.78rem' }}>
                  {item.detail}
                </span>
              ) : null}
              {item.live ? (
                <span
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.06rem 0.3rem',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    color: '#fff'
                  }}
                >
                  Live
                </span>
              ) : null}
              {item.urgent && !item.live ? (
                <span
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.06rem 0.3rem',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    color: '#fff'
                  }}
                >
                  Soon
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div
          style={{
            marginTop: '0.35rem',
            textAlign: 'center',
            color: '#000',
            fontSize: '0.8rem',
            fontWeight: 600,
            opacity: 0.9
          }}
        >
          {banner.footer}
        </div>
      </div>
    </div>
    </div>
  );
};

export default TournamentBannerAll;
