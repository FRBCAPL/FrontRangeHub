import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import tournamentService from '../../services/tournamentService';
import TournamentRulesModal from './TournamentRulesModal';

const TournamentRegistrationModal = ({ isOpen, onClose, tournamentId, currentUser, onRegistrationComplete }) => {
  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    if (isOpen && tournamentId) {
      fetchTournamentData();
    }
  }, [isOpen, tournamentId]);

  const fetchTournamentData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch tournament details
      const tournamentResult = await tournamentService.getTournamentById(tournamentId);
      if (tournamentResult.success) {
        setTournament(tournamentResult.data);
      }

      // Fetch registrations
      const registrationsResult = await tournamentService.getTournamentRegistrations(tournamentId);
      if (registrationsResult.success) {
        setRegistrations(registrationsResult.data);
        
        // Check if current user is registered (check by email)
        if (currentUser && currentUser.email) {
          const userRegistration = registrationsResult.data.find(
            r => r.email && r.email.toLowerCase() === currentUser.email.toLowerCase()
          );
          setIsRegistered(!!userRegistration);
        }
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err);
      setError('Failed to load tournament information');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!currentUser) {
      setError('You must be logged in to register');
      return;
    }

    if (!currentUser.email) {
      setError('Your account is missing an email address');
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      // Generate a stable player_id from email if not available
      // Use email as unique identifier for now
      const playerId = currentUser.id || currentUser.email;

      const registrationData = {
        tournament_id: tournamentId,
        player_id: playerId,
        player_name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        email: currentUser.email,
        fargo_rate: currentUser.fargoRate || 500,
        payment_status: 'pending',
        payment_amount: tournament.entry_fee
      };

      console.log('🎯 Registering player:', registrationData);

      const result = await tournamentService.registerPlayer(registrationData);
      
      if (result.success) {
        setIsRegistered(true);
        if (onRegistrationComplete) {
          onRegistrationComplete(result.data);
        }
        // Refresh registrations list
        fetchTournamentData();
      } else {
        setError(result.error || 'Failed to register for tournament');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  const getLadderDisplayName = (ladderName) => {
    switch (ladderName) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return ladderName;
    }
  };

  const paidRegistrations = registrations.filter(r => r.payment_status === 'paid');
  const daysUntilTournament = tournament ? 
    Math.ceil((new Date(tournament.tournament_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  if (!isOpen) return null;

  return createPortal(
    <div
      className="tournament-registration-modal"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '2px solid #00ff00',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 0, 0, 0.2)',
            border: '1px solid rgba(255, 0, 0, 0.5)',
            color: '#ff4444',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ color: '#00ff00', fontSize: '1.2rem' }}>Loading tournament...</div>
          </div>
        ) : tournament ? (
          <>
            {/* Header */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ color: '#00ff00', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
                🏆 Tournament Registration
              </h2>
              <h3 style={{ color: '#8b5cf6', margin: 0, fontSize: '1.4rem' }}>
                {getLadderDisplayName(tournament.ladder_name)} Ladder
              </h3>
            </div>

            {/* Tournament Details */}
            <div style={{
              background: 'rgba(0, 255, 0, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(0, 255, 0, 0.2)'
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    📅 Date & Time
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.1rem' }}>
                    {formatDate(tournament.tournament_date)}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    🎱 Format
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.1rem' }}>
                    {tournament.round_robin_type === 'double' ? 'Double' : 
                     tournament.round_robin_type === 'triple' ? 'Triple' : 'Single'} Round Robin
                    {' • '}{tournament.game_type}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ color: '#00ff00', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      💰 Entry Fee
                    </div>
                    <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 'bold' }}>
                      {formatCurrency(tournament.entry_fee)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#00ff00', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      🏆 Prize Pool
                    </div>
                    <div style={{ color: '#ffd700', fontSize: '1.3rem', fontWeight: 'bold' }}>
                      {formatCurrency(tournament.total_prize_pool)}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  color: '#ccc'
                }}>
                  💡 Entry fee split: ${tournament.entry_fee / 2} to tournament prizes, 
                  ${tournament.entry_fee / 2} seeds the next 3-month ladder prize pool
                </div>

                {/* Rules Button */}
                <button
                  onClick={() => setShowRulesModal(true)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1rem',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  📋 View Tournament Rules & Format
                </button>
              </div>
            </div>

            {/* Registration Status */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.9rem' }}>Registered Players</div>
                  <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {paidRegistrations.length}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#00ff00', fontSize: '0.9rem' }}>Days Until Tournament</div>
                  <div style={{ color: '#ffc107', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {daysUntilTournament}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#ff4444',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Registration Button or Status */}
            {isRegistered ? (
              <div style={{
                background: 'rgba(0, 255, 0, 0.1)',
                border: '2px solid rgba(0, 255, 0, 0.5)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                color: '#00ff00',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                ✅ You're Registered!
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
                  See you at the tournament!
                </div>
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering || tournament.status !== 'registration'}
                style={{
                  width: '100%',
                  background: tournament.status === 'registration' 
                    ? 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)'
                    : 'rgba(100, 100, 100, 0.3)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  color: tournament.status === 'registration' ? '#000' : '#666',
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  cursor: tournament.status === 'registration' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (tournament.status === 'registration' && !registering) {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                {registering ? 'Registering...' : 
                 tournament.status !== 'registration' ? 'Registration Closed' :
                 'Register Now'}
              </button>
            )}

            {/* Registered Players List */}
            {paidRegistrations.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ color: '#00ff00', marginBottom: '1rem' }}>
                  Registered Players ({paidRegistrations.length})
                </h4>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {paidRegistrations.map((reg, index) => (
                    <div
                      key={reg.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        borderBottom: index < paidRegistrations.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                      }}
                    >
                      <span style={{ color: '#fff' }}>{reg.player_name}</span>
                      {reg.fargo_rate && (
                        <span style={{ color: '#00ff00', fontSize: '0.9rem' }}>
                          {reg.fargo_rate} Fargo
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#ff4444', padding: '2rem' }}>
            Tournament not found
          </div>
        )}

        {/* Rules Modal */}
        <TournamentRulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          tournament={tournament}
        />
      </div>
    </div>,
    document.body
  );
};

export default TournamentRegistrationModal;

