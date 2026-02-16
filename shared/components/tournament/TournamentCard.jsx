import React, { useState, useEffect } from 'react';
import tournamentService from '@shared/services/services/tournamentService';
import supabaseDataService from '@shared/services/services/supabaseDataService';

const TournamentCard = ({ ladderName, currentUser, onRegisterClick }) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [quarterlyPrizePool, setQuarterlyPrizePool] = useState(null);

  useEffect(() => {
    if (ladderName) {
      fetchUpcomingTournament();
    }
  }, [ladderName]);

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
    try {
      setLoading(true);
      const result = await tournamentService.getUpcomingTournament(ladderName);
      
      if (result.success && result.data) {
        setTournament(result.data);
        
        // Check if current user is registered
        if (currentUser && currentUser.email && result.data.registrations) {
          const userReg = result.data.registrations.find(
            r => r.email && r.email.toLowerCase() === currentUser.email.toLowerCase()
          );
          setIsRegistered(!!userReg);
        }
      } else {
        setTournament(null);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      setTournament(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getDaysUntil = (dateString) => {
    const tournamentDate = new Date(dateString);
    const now = new Date();
    const diffTime = tournamentDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(109, 40, 217, 0.1) 100%)',
        border: '2px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ color: '#8b5cf6', fontSize: '1rem' }}>
          Loading tournament...
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null; // No tournament to show
  }

  const daysUntil = getDaysUntil(tournament.tournament_date);
  const totalRegistered = tournament.registrations?.length || 0;
  const tournamentPool = Number(tournament.total_prize_pool) || 0;
  const projectedTournamentPool = totalRegistered * 10; // $10 per paid entry to tournament

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(109, 40, 217, 0.15) 100%)',
      border: '2px solid #8b5cf6',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
      animation: 'pulse 3s ease-in-out infinite'
    }}>
      {/* Decorative corner accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100px',
        height: '100px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, transparent 100%)',
        borderBottomLeftRadius: '100%'
      }}></div>

      {/* Header */}
      <div style={{ marginBottom: '1rem', position: 'relative' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <h3 style={{
            color: '#8b5cf6',
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
          }}>
            🏆 Upcoming Tournament
          </h3>
          {isRegistered && (
            <div style={{
              background: 'rgba(0, 255, 0, 0.2)',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '0.25rem 0.75rem',
              color: '#00ff00',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              ✓ Registered
            </div>
          )}
        </div>
        
        {daysUntil <= 7 && daysUntil > 0 && (
          <div style={{
            display: 'inline-block',
            background: 'rgba(255, 193, 7, 0.2)',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            padding: '0.25rem 0.75rem',
            color: '#ffc107',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
            ⏰ {daysUntil} day{daysUntil !== 1 ? 's' : ''} away!
          </div>
        )}
      </div>

      {/* Tournament Details Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem'
        }}>
          <div style={{ color: '#8b5cf6', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            📅 Date & Time
          </div>
          <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>
            {formatDate(tournament.tournament_date)}
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem'
        }}>
          <div style={{ color: '#8b5cf6', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            🎱 Format
          </div>
          <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>
            {tournament.round_robin_type === 'double' ? 'Double' : 
             tournament.round_robin_type === 'triple' ? 'Triple' : 'Single'} Round Robin
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem'
        }}>
          <div style={{ color: '#8b5cf6', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            💰 Entry Fee
          </div>
          <div style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {formatCurrency(tournament.entry_fee)}
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem'
        }}>
          <div style={{ color: '#8b5cf6', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            👥 Registered
          </div>
          <div style={{ color: '#00ff00', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {totalRegistered} player{totalRegistered !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Prize Pools */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        borderRadius: '8px',
        padding: '0.75rem',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        <div style={{ color: '#ffd700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
          🏆 Prize Pools
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.95rem' }}>
          <div style={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ccc' }}>Tournament (est.):</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
              {tournamentPool > 0 ? formatCurrency(tournamentPool) : formatCurrency(Math.max(projectedTournamentPool, 0))}
            </span>
          </div>
          <div style={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ccc' }}>Quarterly Ladder (est.):</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
              {quarterlyPrizePool != null ? formatCurrency((quarterlyPrizePool || 0) + projectedTournamentPool) : '...'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onRegisterClick && onRegisterClick(tournament)}
        disabled={tournament.status !== 'registration'}
        style={{
          width: '100%',
          background: tournament.status === 'registration' 
            ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
            : 'rgba(100, 100, 100, 0.3)',
          border: 'none',
          borderRadius: '12px',
          padding: '1rem',
          color: tournament.status === 'registration' ? '#fff' : '#666',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: tournament.status === 'registration' ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          boxShadow: tournament.status === 'registration' 
            ? '0 4px 15px rgba(139, 92, 246, 0.4)'
            : 'none'
        }}
        onMouseEnter={(e) => {
          if (tournament.status === 'registration') {
            e.target.style.transform = 'scale(1.02)';
            e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.6)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = tournament.status === 'registration' 
            ? '0 4px 15px rgba(139, 92, 246, 0.4)'
            : 'none';
        }}
      >
        {isRegistered 
          ? '📋 View Tournament Details' 
          : tournament.status === 'registration'
          ? '🎯 Register Now'
          : tournament.status === 'in-progress'
          ? '🔴 Tournament In Progress'
          : '✓ Registration Closed'}
      </button>
    </div>
  );
};

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); }
    50% { box-shadow: 0 4px 25px rgba(139, 92, 246, 0.5); }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}

export default TournamentCard;

