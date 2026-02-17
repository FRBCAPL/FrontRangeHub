import React, { useState, useEffect } from 'react';
import tournamentService from '@shared/services/services/tournamentService';
import supabaseDataService from '@shared/services/services/supabaseDataService';
import TournamentRegistrationModal from './TournamentRegistrationModal';

const TournamentBanner = ({ ladderName, currentUser, refreshTrigger }) => {
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
        onClick={() => setShowModal(true)}
        style={{
          background: isUrgent 
            ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
            : 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)',
          borderRadius: '12px',
          padding: '1.5rem',
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

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ 
                color: '#000', 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                🏆 Upcoming Tournament
              </h3>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Click to view details and register
              </div>
            </div>
            {isRegistered && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}>
                ✅ Registered
              </div>
            )}
          </div>

          {/* Tournament Info Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                📅 Date
              </div>
              <div style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {formatDate(tournament.tournament_date)}
              </div>
            </div>

            {tournament.location && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  📍 Location
                </div>
                <div style={{ color: '#000', fontSize: '1rem', fontWeight: 'bold' }}>
                  {tournament.location}
                </div>
              </div>
            )}

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                ⏰ Days Until
              </div>
              <div style={{ 
                color: '#000', 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                animation: isUrgent ? 'pulse 2s infinite' : 'none'
              }}>
                {daysUntil}
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                💰 Entry
              </div>
              <div style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {formatCurrency(tournament.entry_fee)}
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                🏆 Prize Pools
              </div>
              <div style={{ color: '#000', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span>Tournament (est.): {(Number(tournament.total_prize_pool) || 0) > 0 ? formatCurrency(tournament.total_prize_pool) : formatCurrency((tournament.registrations?.length || 0) * 10)}</span>
                <span>Quarterly (est.): {quarterlyPrizePool != null ? formatCurrency((quarterlyPrizePool || 0) + (tournament.registrations?.length || 0) * 10) : '...'}</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                👥 Registered
              </div>
              <div style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {tournament.registrations?.length ?? tournament.total_players ?? 0}
              </div>
            </div>
          </div>

          {/* Call to Action */}
          {!isRegistered && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}>
              👆 Click to Register Now!
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
      />

      {/* CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </>
  );
};

export default TournamentBanner;

