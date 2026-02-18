import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import tournamentService from '@shared/services/services/tournamentService';
import supabaseDataService from '@shared/services/services/supabaseDataService';
import { supabase } from '@shared/config/supabase.js';
import TournamentRulesModal from './TournamentRulesModal';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TournamentRegistrationModal = ({ isOpen, onClose, tournamentId, currentUser, onRegistrationComplete, onOpenPaymentDashboard, isGuest = false }) => {
  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [quarterlyPrizePool, setQuarterlyPrizePool] = useState(null);

  useEffect(() => {
    if (isOpen && tournamentId) {
      fetchTournamentData();
    }
  }, [isOpen, tournamentId]);

  useEffect(() => {
    if (tournament?.ladder_name) {
      supabaseDataService.getPrizePoolData(tournament.ladder_name)
        .then(r => r.success && r.data && setQuarterlyPrizePool(r.data.currentPrizePool || 0))
        .catch(() => setQuarterlyPrizePool(0));
    } else {
      setQuarterlyPrizePool(null);
    }
  }, [tournament?.ladder_name]);

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
    if (isGuest) {
      setError('Join the Ladder to register for tournaments');
      return;
    }
    if (!currentUser) {
      setError('You must be logged in to register');
      return;
    }

    if (!currentUser.email) {
      setError('Your account is missing an email address');
      return;
    }

    // Ladder eligibility: user must be on the same ladder as the tournament
    const normalizeLadder = (s) => ((s || '').toLowerCase().replace(/\s+/g, '').replace('550+', '550-plus') || '');
    const userLadder = normalizeLadder(currentUser.ladder || currentUser.assignedLadder);
    const tournamentLadder = normalizeLadder(tournament?.ladder_name);
    const ladderMatch = !tournamentLadder || !userLadder || userLadder === tournamentLadder;
    if (!ladderMatch) {
      setError(`This tournament is for the ${getLadderDisplayName(tournament.ladder_name)} ladder. You are on the ${getLadderDisplayName(currentUser.ladder || currentUser.assignedLadder)} ladder.`);
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      // player_id must be a valid UUID - schema rejects emails
      let playerId = currentUser.userId || currentUser.id || null;
      if (playerId && !UUID_REGEX.test(String(playerId))) {
        playerId = null;
      }
      if (!playerId) {
        const { data: { user } } = await supabase.auth.getUser();
        playerId = user?.id && UUID_REGEX.test(user.id) ? user.id : null;
      }

      const registrationData = {
        tournament_id: tournamentId,
        ...(playerId && { player_id: playerId }),
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

  const handleUnregister = async () => {
    if (isGuest || !currentUser?.email) {
      setError('Cannot unregister: missing login or email.');
      return;
    }
    const status = (tournament?.status || '').toLowerCase();
    if (status !== 'registration') {
      setError(`Unregister is only available while registration is open (current status: ${tournament?.status || 'unknown'}).`);
      return;
    }
    if (!window.confirm('Are you sure you want to unregister from this tournament?')) return;

    setUnregistering(true);
    setError(null);

    try {
      const email = currentUser.email?.trim?.() || currentUser.email;
      const result = await tournamentService.unregisterPlayer(tournamentId, email);
      if (result.success) {
        setIsRegistered(false);
        if (onRegistrationComplete) onRegistrationComplete(null);
        fetchTournamentData();
      } else {
        setError(result.error || 'Failed to unregister');
      }
    } catch (err) {
      console.error('Unregister error:', err);
      setError(err?.message || 'An error occurred while unregistering');
    } finally {
      setUnregistering(false);
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

  const totalRegistrations = registrations.length;
  const paidRegistrations = registrations.filter(r => r.payment_status === 'paid');
  const daysUntilTournament = tournament ? 
    Math.ceil((new Date(tournament.tournament_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  // Ladder eligibility for UI
  const norm = (s) => ((s || '').toLowerCase().replace(/\s+/g, '').replace('550+', '550-plus') || '');
  const userLadderNorm = norm(currentUser?.ladder || currentUser?.assignedLadder);
  const tournamentLadderNorm = norm(tournament?.ladder_name);
  const isLadderEligible = !tournamentLadderNorm || !userLadderNorm || userLadderNorm === tournamentLadderNorm;

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
          padding: '1.25rem',
          width: '640px',
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '2px solid #00ff00',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
          flexShrink: 0,
          position: 'relative'
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
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <h2 style={{ color: '#00ff00', margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>
                🏆 Tournament Registration
              </h2>
              <h3 style={{ color: '#8b5cf6', margin: 0, fontSize: '1.2rem' }}>
                {getLadderDisplayName(tournament.ladder_name)} Ladder
              </h3>
            </div>

            {/* Tournament Details - compact 2-col grid */}
            <div style={{
              background: 'rgba(0, 255, 0, 0.05)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid rgba(0, 255, 0, 0.2)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1rem' }}>
                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.75rem', marginBottom: '0.15rem' }}>📅 Date & Time</div>
                  <div style={{ color: '#fff', fontSize: '0.95rem' }}>{formatDate(tournament.tournament_date)}</div>
                </div>
                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.75rem', marginBottom: '0.15rem' }}>📍 Location</div>
                  <div style={{ color: '#fff', fontSize: '0.95rem' }}>{tournament.location || 'TBD'}</div>
                </div>
                {tournament.registration_close_date && (
                  <div>
                    <div style={{ color: '#00ff00', fontSize: '0.75rem', marginBottom: '0.15rem' }}>📋 Reg closes</div>
                    <div style={{ color: '#fff', fontSize: '0.95rem' }}>{formatDate(tournament.registration_close_date)}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.75rem', marginBottom: '0.15rem' }}>🎱 Format</div>
                  <div style={{ color: '#fff', fontSize: '0.95rem' }}>Round Robin → King of the Hill • {tournament.game_type}</div>
                </div>
                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.75rem', marginBottom: '0.15rem' }}>💰 Entry Fee</div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>{formatCurrency(tournament.entry_fee)}</div>
                </div>
                <div>
                  <div style={{ color: '#00ff00', fontSize: '0.75rem', marginBottom: '0.15rem' }}>🏆 Prize Pools</div>
                  <div style={{ color: '#ffd700', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Tourn: {(Number(tournament.total_prize_pool) || 0) > 0 ? formatCurrency(tournament.total_prize_pool) : formatCurrency(totalRegistrations * 10)} • Qtr: {quarterlyPrizePool != null ? formatCurrency((quarterlyPrizePool || 0) + totalRegistrations * 10) : '...'}
                  </div>
                </div>
              </div>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                marginTop: '0.6rem',
                fontSize: '0.8rem',
                color: '#ccc'
              }}>
                💡 {tournament.ladder_seed_amount && Number(tournament.ladder_seed_amount) > 0
                  ? `$${Math.max(0, Number(tournament.entry_fee || 20) - Number(tournament.ladder_seed_amount))} to tournament, $9 placement + $1 climber seeds next 3-month ladder`
                  : `$${10} to tournament, $9 placement + $1 climber seeds next 3-month ladder`}
              </div>
              {/* Payment policy notice */}
              <div style={{
                background: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 152, 0, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.6rem',
                fontSize: '0.8rem',
                color: '#ffb74d'
              }}>
                <center>⚠️ Payment is highly recommended, but optional at registration. </center>
                <center><strong>You must pay tournament entry fee before registration closes.</strong></center>
                <center><strong>No late entries or late payments will be allowed.</strong></center> 
              </div>
              <button
                onClick={() => setShowRulesModal(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '0.6rem',
                  transition: 'all 0.2s ease'
                }}
              >
                📋 View Tournament Rules & Format
              </button>
            </div>

            {/* Registration Status - compact */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ color: '#00ff00', fontSize: '0.8rem' }}>Registered: </span>
                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>{totalRegistrations}</span>
              </div>
              <div>
                <span style={{ color: '#00ff00', fontSize: '0.8rem' }}>Days until: </span>
                <span style={{ color: '#ffc107', fontSize: '1.2rem', fontWeight: 'bold' }}>{daysUntilTournament}</span>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem',
                marginBottom: '1rem',
                color: '#ff4444',
                fontSize: '0.9rem',
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
                padding: '1rem',
                textAlign: 'center',
                color: '#00ff00',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}>
                ✅ You're Registered!
                {(() => {
                  const userReg = registrations.find(r => r.email && currentUser?.email && r.email.toLowerCase() === currentUser.email.toLowerCase());
                  const isPaid = userReg?.payment_status === 'paid';
                  const needsPayment = userReg && !isPaid && Number(tournament.entry_fee || 0) > 0;
                  return (
                    <>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {isPaid ? (
                          <span style={{ color: '#4caf50' }}>✓ Entry fee paid</span>
                        ) : (
                          <span style={{ color: '#ff9800' }}>⚠ Entry fee pending</span>
                        )}
                        <span>•</span>
                        <span>See you at the tournament!</span>
                      </div>
                      {needsPayment && onOpenPaymentDashboard && tournament.status === 'registration' ? (
                    <button
                      onClick={() => onOpenPaymentDashboard({
                        type: 'tournament_entry',
                        tournamentId: tournament.id,
                        registrationId: userReg.id,
                        amount: Number(tournament.entry_fee) || 20,
                        tournamentName: tournament.name,
                        ladderName: tournament.ladder_name
                      })}
                      style={{
                        marginTop: '0.6rem',
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #4caf50, #45a049)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                        💳 Pay Entry Fee (${formatCurrency(tournament.entry_fee)})
                      </button>
                    ) : null}
                    </>
                  );
                })()}
                {tournament.status === 'registration' && !isGuest && (
                  <button
                    onClick={handleUnregister}
                    disabled={unregistering}
                    style={{
                      marginTop: '0.6rem',
                      padding: '0.4rem 1rem',
                      background: 'rgba(255, 68, 68, 0.2)',
                      border: '1px solid rgba(255, 68, 68, 0.6)',
                      color: '#ff6b6b',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      cursor: unregistering ? 'not-allowed' : 'pointer',
                      opacity: unregistering ? 0.7 : 1
                    }}
                  >
                    {unregistering ? 'Unregistering...' : 'Unregister'}
                  </button>
                )}
              </div>
            ) : isGuest ? (
              <div style={{
                width: '100%',
                background: 'rgba(255, 152, 0, 0.15)',
                border: '1px solid rgba(255, 152, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                color: '#ffb74d',
                fontSize: '1rem',
                textAlign: 'center',
                fontWeight: 600
              }}>
                🔒 Join the Ladder to register for tournaments
              </div>
            ) : !isLadderEligible ? (
              <div style={{
                width: '100%',
                background: 'rgba(255, 152, 0, 0.15)',
                border: '1px solid rgba(255, 152, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                color: '#ffb74d',
                fontSize: '1rem',
                textAlign: 'center',
                fontWeight: 600
              }}>
                🔒 This tournament is for the {getLadderDisplayName(tournament.ladder_name)} ladder. You are on the {getLadderDisplayName(currentUser?.ladder || currentUser?.assignedLadder)} ladder.
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
                  padding: '1rem',
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
            {totalRegistrations > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: '#00ff00', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  Registered Players ({totalRegistrations})
                </h4>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {registrations.map((reg, index) => (
                    <div
                      key={reg.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        borderBottom: index < registrations.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
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

