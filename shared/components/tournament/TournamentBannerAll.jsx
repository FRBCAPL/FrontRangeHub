import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tournamentService from '@shared/services/services/tournamentService';

const LADDER_LABELS = {
  '499-under': '499 & Under',
  '500-549': '500-549',
  '550-plus': '550+',
  simulation: 'Simulation'
};

/**
 * Landing-page banner showing all upcoming tournaments across ladders.
 * Click navigates to Hub (sign in to view/register).
 */
const TournamentBannerAll = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const result = await tournamentService.getAllUpcomingTournaments(8);
        if (result.success && result.data?.length) {
          setTournaments(result.data);
        } else {
          setTournaments([]);
        }
      } catch (err) {
        console.error('TournamentBannerAll fetch error:', err);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading || tournaments.length === 0) return null;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const hasUrgent = tournaments.some((t) => {
    const days = Math.ceil((new Date(t.tournament_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 7;
  });

  const handleClick = () => {
    navigate('/hub');
  };

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4%' }}>
    <div
      className="tournament-banner-all"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
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
            🏆 Upcoming Tournaments 🏆
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
          {tournaments.map((t) => {
            const regCount = t.registrations?.length ?? t.total_players ?? 0;
            const ladderLabel = LADDER_LABELS[t.ladder_name] || t.ladder_name;
            const entryFee = Number(t.entry_fee) || 20;
            const daysUntil = Math.ceil(
              (new Date(t.tournament_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            const isUrgent = daysUntil <= 7;
            return (
              <div
                key={t.id}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  padding: '0.28rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  flexWrap: 'wrap'
                }}
              >
                <span
                  style={{
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                  }}
                >
                  {ladderLabel}
                </span>
                <span style={{ color: 'rgba(0,0,0,0.85)', fontSize: '0.78rem' }}>
                  {formatDate(t.tournament_date)}
                </span>
                <span style={{ color: 'rgba(0,0,0,0.75)', fontSize: '0.75rem' }}>
                  ${entryFee}
                </span>
                {regCount > 0 && (
                  <span style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem' }}>
                    {regCount} reg
                  </span>
                )}
                {isUrgent && (
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
                )}
              </div>
            );
          })}
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
          Sign in at The Hub to register →
        </div>
      </div>
    </div>
    </div>
  );
};

export default TournamentBannerAll;
