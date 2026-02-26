import React, { useState, useEffect } from 'react';
import tournamentService from '@shared/services/services/tournamentService';
import supabaseDataService from '@shared/services/services/supabaseDataService';
import TournamentRegistrationModal from './TournamentRegistrationModal';

const TournamentBanner = ({ ladderName, currentUser, refreshTrigger, onOpenPaymentDashboard, isGuest = false }) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [quarterlyPrizePool, setQuarterlyPrizePool] = useState(null);

  useEffect(() => {
    fetchUpcomingTournament();
  }, [ladderName, refreshTrigger]);

  useEffect(() => {
    if (tournament?.ladder_name) {
      supabaseDataService.getPrizePoolData(tournament.ladder_name)
        .then(r => r.success && r.data && setQuarterlyPrizePool(r.data.currentPrizePool || 0))
        .catch(() => setQuarterlyPrizePool(0));
    } else {
      setQuarterlyPrizePool(null);
    }
  }, [tournament?.ladder_name]);

  const fetchUpcomingTournament = async () => {
    setLoading(true);
    try {
      const result = await tournamentService.getUpcomingTournament(ladderName);
      if (result.success && result.data) {
        setTournament(result.data);
        
        // Check if user is registered (check by email)
        if (currentUser && currentUser.email) {
          const registrationsResult = await tournamentService.getTournamentRegistrations(result.data.id);
          if (registrationsResult.success) {
            const userReg = registrationsResult.data.find(
              r => r.email && r.email.toLowerCase() === currentUser.email.toLowerCase()
            );
            setIsRegistered(!!userReg);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDaysUntil = (dateString) => {
    const days = Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return null; // Or a loading skeleton
  }

  if (!tournament) {
    return null; // No upcoming tournament
  }

  const daysUntil = getDaysUntil(tournament.tournament_date);
  const isUrgent = daysUntil <= 7;

  return (
    <>
      <div
        className="tournament-banner"
        onClick={() => setShowModal(true)}
        style={{
          background: isUrgent 
            ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
            : 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)',
          borderRadius: '12px',
          padding: '1.15rem',
          marginBottom: '1.5rem',
          cursor: 'pointer',
          border: isUrgent ? '2px solid #ff6666' : '2px solid #00ff00',
          boxShadow: isUrgent 
            ? '0 4px 20px rgba(255, 68, 68, 0.3)'
            : '0 4px 20px rgba(0, 255, 0, 0.3)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = isUrgent
            ? '0 6px 30px rgba(255, 68, 68, 0.5)'
            : '0 6px 30px rgba(0, 255, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = isUrgent
            ? '0 4px 20px rgba(255, 68, 68, 0.3)'
            : '0 4px 20px rgba(0, 255, 0, 0.3)';
        }}
      >
        {/* Animated background effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          animation: 'shimmer 3s infinite'
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Row 1: Header */}
          <div className="tournament-banner-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
            <h3 style={{ 
              color: '#000', 
              margin: 0, 
              fontSize: '1.3rem', 
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              🏆 Upcoming Tournament 🏆
            </h3>
            {isRegistered && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '0.3rem 0.6rem',
                borderRadius: '12px',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '0.8rem'
              }}>
                ✅ Registered
              </div>
            )}
          </div>

          {/* Row 2: Tournament Info Cards - wrap on mobile */}
          <div className="tournament-banner-cards" style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            width: '100%',
            gap: '0.6rem',
            minWidth: 0
          }}>
            <div className="tournament-banner-card" style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.7rem',
              textAlign: 'center',
              flex: '1 1 0',
              minWidth: 0
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem', marginBottom: '0.15rem' }}>📅 Date</div>
              <div style={{ color: '#000', fontSize: '0.95rem', fontWeight: 'bold' }}>{formatDate(tournament.tournament_date)}</div>
            </div>

            <div className="tournament-banner-card" style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.7rem',
              textAlign: 'center',
              flex: '1 1 0',
              minWidth: 0
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem', marginBottom: '0.15rem' }}>📍 Location</div>
              <div style={{ color: '#000', fontSize: '0.9rem', fontWeight: 'bold' }}>{tournament.location || 'TBD'}</div>
            </div>

            {tournament.registration_close_date && (
              <div className="tournament-banner-card" style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                padding: '0.5rem 0.7rem',
                textAlign: 'center',
                flex: '1 1 0',
                minWidth: 0
              }}>
                <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem', marginBottom: '0.15rem' }}>📋 Reg closes</div>
                <div style={{ color: '#000', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {new Date(tournament.registration_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            )}

            <div className="tournament-banner-card" style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.7rem',
              textAlign: 'center',
              flex: '1 1 0',
              minWidth: 0
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem', marginBottom: '0.15rem' }}>⏰ Days</div>
              <div style={{ color: '#000', fontSize: '1.2rem', fontWeight: 'bold', animation: isUrgent ? 'pulse 2s infinite' : 'none' }}>{daysUntil}</div>
            </div>

            <div className="tournament-banner-card" style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.7rem',
              textAlign: 'center',
              flex: '1 1 0',
              minWidth: 0
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem', marginBottom: '0.15rem' }}>💰 Entry</div>
              <div style={{ color: '#000', fontSize: '0.95rem', fontWeight: 'bold' }}>{formatCurrency(tournament.entry_fee)}</div>
            </div>

            <div className="tournament-banner-card" style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.7rem',
              textAlign: 'center',
              flex: '1 1 0',
              minWidth: 0
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem', marginBottom: '0.15rem' }}>🏆 Prizes</div>
              <div style={{ color: '#000', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {(Number(tournament.total_prize_pool) || 0) > 0 ? formatCurrency(tournament.total_prize_pool) : formatCurrency((tournament.registrations?.length || 0) * 10)}
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.7rem',
              textAlign: 'center',
              flex: '1 1 0',
              minWidth: 0
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.72rem', marginBottom: '0.15rem' }}>👥 Reg</div>
              <div style={{ color: '#000', fontSize: '0.95rem', fontWeight: 'bold' }}>{tournament.registrations?.length ?? tournament.total_players ?? 0}</div>
            </div>
          </div>

          {/* Row 3: Register CTA */}
          {!isRegistered && (
            <div style={{
              padding: '0.6rem 1rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              👆 Click here to register now
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      <TournamentRegistrationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        tournamentId={tournament?.id}
        currentUser={currentUser}
        onRegistrationComplete={() => {
          setIsRegistered(true);
          fetchUpcomingTournament();
        }}
        onOpenPaymentDashboard={onOpenPaymentDashboard}
        isGuest={isGuest}
      />

      {/* CSS for animations + mobile-responsive banner */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @media (max-width: 600px) {
          .tournament-banner {
            padding: 0.85rem !important;
            margin-bottom: 1rem !important;
          }
          .tournament-banner-header h3 {
            font-size: 1.05rem !important;
            text-align: center;
          }
          .tournament-banner-cards {
            justify-content: center;
          }
          .tournament-banner-card {
            flex: 1 1 calc(50% - 0.5rem) !important;
            min-width: calc(50% - 0.5rem) !important;
            max-width: calc(50% - 0.5rem) !important;
            padding: 0.4rem 0.5rem !important;
          }
          .tournament-banner-card > div:first-child {
            font-size: 0.65rem !important;
          }
          .tournament-banner-card > div:last-child {
            font-size: 0.8rem !important;
          }
        }
        @media (max-width: 380px) {
          .tournament-banner-card {
            flex: 1 1 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  );
};

export default TournamentBanner;

