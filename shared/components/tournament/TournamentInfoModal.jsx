import React, { useState, useEffect } from 'react';
import TOURNAMENT_STRUCTURE, { getTournamentStructure, getKOHThreshold } from '@shared/config/tournamentStructure';

const TournamentInfoModal = ({ isOpen, onClose, tournament = null, onRegisterClick }) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)');
    if (!mq) return;
    const handle = () => setIsMobile(mq.matches);
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: isMobile ? '88px 12px 16px' : '88px 20px 20px',
        zIndex: 1000,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          borderRadius: isMobile ? '8px' : '12px',
          padding: isMobile ? '0.75rem 1rem' : '1rem',
          maxWidth: isMobile ? '100%' : '450px',
          width: isMobile ? 'min(100%, calc(100vw - 24px))' : '50%',
          minWidth: isMobile ? 0 : undefined,
          maxHeight: isMobile ? 'calc(100vh - 6rem)' : '80vh',
          height: isMobile ? 'auto' : '80vh',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          border: '2px solid #8b5cf6',
          boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: isMobile ? '0.4rem' : '0.75rem',
          paddingBottom: isMobile ? '0.35rem' : '0.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
          position: 'relative',
          flexShrink: 0
        }}>
          <h2 style={{
            color: '#00aa00',
            margin: 0,
            fontSize: isMobile ? '1.2rem' : '2rem',
            fontWeight: 'bold',
            paddingRight: isMobile ? '44px' : undefined,
            textAlign: 'center'
          }}>
            🏆 {TOURNAMENT_STRUCTURE.name} {tournament ? tournament.title || 'Tournament Info' : 'Tournament Info'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ccc',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              cursor: 'pointer',
              padding: isMobile ? '0.5rem' : '0.5rem',
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: isMobile ? 44 : undefined,
              height: isMobile ? 44 : undefined,
              minWidth: isMobile ? 44 : undefined,
              minHeight: isMobile ? 44 : undefined,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content - scrollable on mobile */}
        <div style={{
          color: '#fff',
          lineHeight: isMobile ? '1.45' : '1.6',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          
          {/* Actual Tournament Details */}
          {tournament && (
            <div style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>
              <h3 style={{ color: '#8b5cf6', marginBottom: isMobile ? '0.35rem' : '0.5rem', fontSize: isMobile ? '0.95rem' : '1rem' }}>
                📅 Tournament Details
              </h3>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: isMobile ? '0.4rem 0.5rem' : '0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                  <strong>Date:</strong> {new Date(tournament.tournament_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
                {tournament.location && (
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Location:</strong> {tournament.location}
                  </p>
                )}
                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                  <strong>Entry Fee:</strong> ${tournament.entry_fee || 20}
                </p>
                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                  <strong>Format:</strong> {tournament.format || 'Round Robin → King of the Hill'}
                </p>
                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                  <strong>Registered Players:</strong> {tournament.registrations?.length || 0}
                </p>
                <p style={{ margin: '0', fontSize: '0.95rem' }}>
                  <strong>Status:</strong> {tournament.status || 'Registration Open'}
                </p>
              </div>
            </div>
          )}
          
          {/* Tournament Format */}
          <div style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: isMobile ? '0.35rem' : '0.5rem', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>
              🎯 Format
            </h3>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: isMobile ? '0.4rem 0.5rem' : '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              {tournament ? (
                <>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Format:</strong> {tournament.format || 'Round Robin → King of the Hill'}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Game:</strong> {tournament.game_type || '8-Ball Pool'}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Race to:</strong> {tournament.race_to ?? getTournamentStructure(tournament).gameRules.raceTo} games per match
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Elimination:</strong> {tournament.elimination_rule || (() => { const s = getTournamentStructure(tournament); const koh = getKOHThreshold(tournament.total_players || tournament.registrations?.length || 8, tournament); return `${s.phase1.eliminationLosses}-Loss Phase 1 until ${koh} players remain (threshold based on entries) • then ${s.phase2.eliminationLosses}-Loss ${TOURNAMENT_STRUCTURE.phase2.name}`; })()}
                  </p>
                  <p style={{ margin: '0', fontSize: '0.95rem' }}>
                    <strong>Call Shots:</strong> {getTournamentStructure(tournament).gameRules.callShots ? 'Yes' : 'No'}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#ffc107' }}>Phase 1: Round Robin (until King of the Hill)</strong><br />
                    Everyone plays everyone (single/double/triple based on field size).{' '}
                    <br />Each match you <span style={{ color: '#00ff00', fontWeight: 'bold' }}>WIN</span> earns a payout = that round's prize share ÷ matches in the round (amount varies by round).{' '}
                    <br /><span style={{ color: '#ff4444', fontWeight: 'bold' }}>Get {TOURNAMENT_STRUCTURE.phase1.eliminationLosses} losses and you're OUT.</span>{' '}
                    <br />When only a certain number remain (3, 4, or 6 depending on total entries), Phase 2 begins.
                  </p>
                  <p style={{ margin: '0', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#ffc107' }}>Phase 2: {TOURNAMENT_STRUCTURE.phase2.name}</strong><br />
                    Surviving players; losses reset to 0. Get {TOURNAMENT_STRUCTURE.phase2.eliminationLosses} losses and you're eliminated.{' '}
                    <br />Escalating payouts per match. Last player standing wins 1st place + remaining prize pool!
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Match Rules */}
          <div style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: isMobile ? '0.35rem' : '0.5rem', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>
              📋 Match Rules
            </h3>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: isMobile ? '0.4rem 0.5rem' : '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              {tournament ? (
                <>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Game:</strong> {tournament.game_type || '8-Ball Pool'}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Call Shots:</strong> {getTournamentStructure(tournament).gameRules.callShots ? 'Yes - players must call their shots' : 'No - call shots not required'}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Sportsmanship:</strong> {tournament.sportsmanship_rule || 'Good sportsmanship required at all times'}
                  </p>
                  <p style={{ margin: '0', fontSize: '0.95rem' }}>
                    <strong>On Time:</strong> {tournament.punctuality_rule || 'Players must be on time for matches'}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Game Type:</strong> 8-Ball Pool
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Race to:</strong> 5 games per match
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Call Shots:</strong> {TOURNAMENT_STRUCTURE.gameRules.callShots ? 'Yes' : 'No'} ({TOURNAMENT_STRUCTURE.gameRules.rulesNote})
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Game Rules:</strong> League, Ladder, and Tournament use CSI game play rules with no modifications
                  </p>
                  <p style={{ margin: '0', fontSize: '0.95rem' }}>
                    <strong>Sportsmanship:</strong> Good sportmanship is expected and required - admin decisions are final
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Prize Structure */}
          <div style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: isMobile ? '0.35rem' : '0.5rem', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>
              💰 Prize Structure
            </h3>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: isMobile ? '0.4rem 0.5rem' : '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              {tournament ? (
                <>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Entry Fee:</strong> ${tournament.entry_fee ?? TOURNAMENT_STRUCTURE.entryFee}
                    {tournament.ladder_seed_amount != null && Number(tournament.ladder_seed_amount) > 0
                      ? ` ($${Math.max(0, Number(tournament.entry_fee || 20) - Number(tournament.ladder_seed_amount))} to tournament, $${Number(tournament.ladder_seed_amount)} to ladder: $${TOURNAMENT_STRUCTURE.entryFeeBreakdown?.toLadderPlacement ?? 9} placement, $${TOURNAMENT_STRUCTURE.entryFeeBreakdown?.toClimberSeed ?? 1} climber)`
                      : ` ($${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toTournament} to tournament, $${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toLadderPlacement ?? 9} placement, $${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toClimberSeed ?? 1} climber)`}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Per-match payout:</strong> Dynamic – each round's share of prize pool ÷ matches in that round (later rounds pay more)
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>1st Place:</strong> {tournament.first_place_rule || 'Remaining prize pool after win payouts'}
                  </p>
                  <p style={{ margin: '0', fontSize: '0.95rem' }}>
                    <strong>Prize Distribution:</strong> {tournament.prize_distribution || 'Distributed at tournament completion'}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#00ff00' }}>How You Win Money:</strong><br />
                    The prize pool is divided across rounds. Per-match payout = round's share ÷ matches in that round (dynamic, not fixed).{' '}
                    <br />When you <span style={{ color: '#00ff00', fontWeight: 'bold' }}>WIN</span> a match, you earn that round's per-match amount. 
                    <br />Later rounds pay more. King of the Hill has escalating payouts – last player standing wins 1st + remainder!
                  </p>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#ffd700' }}>{TOURNAMENT_STRUCTURE.phase2.name} Payouts:</strong><br />
                    In the final round, payouts escalate dramatically with each match. 
                   <br /> With a small field remaining, winner-stays format – the winner faces the next challenger. 
                    <br />The last player standing wins what they won along the way + 1st place reserved amount + whatever is left in the prize pool!
                  </p>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#2196f3' }}>Entry Fee:</strong>
                    <br />${TOURNAMENT_STRUCTURE.entryFee} entry fee
                  </p>
                  <p style={{ margin: '0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#2196f3' }}>Entry Fee Breakdown:</strong>
                    <br />${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toTournament} goes to this tournament's prize pool
                    <br />${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toLadderPlacement ?? 9} to ladder placement pool + ${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toClimberSeed ?? 1} to climber fund (quarterly payout)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Important Notes */}
          <div style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: isMobile ? '0.35rem' : '0.5rem', fontSize: isMobile ? '1rem' : '1.2rem' }}>
              ⚠️ Important Notes
            </h3>
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              padding: isMobile ? '0.4rem 0.5rem' : '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(255, 193, 7, 0.3)'
            }}>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                • Tournament brackets are generated automatically when registration closes
              </p>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                • All matches must be reported through the app
              </p>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                • Prize money is distributed after tournament completion
              </p>
              <p style={{ margin: '0', fontSize: '0.95rem' }}>
                • Contact admin for any questions or disputes
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          marginTop: isMobile ? '0.5rem' : '1rem',
          paddingTop: isMobile ? '0.35rem' : '0.5rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          {onRegisterClick && tournament && tournament.status === 'registration' && (
            <button
              type="button"
              onClick={() => { onClose(); onRegisterClick(tournament); }}
              style={{
                background: 'linear-gradient(135deg, #00aa00, #008800)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: isMobile ? '10px 20px' : '8px 16px',
                fontSize: isMobile ? '0.95rem' : '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 170, 0, 0.3)',
                minHeight: isMobile ? 44 : undefined
              }}
            >
              🎯 Register Now
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: isMobile ? '10px 20px' : '8px 16px',
              fontSize: isMobile ? '0.95rem' : '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              minHeight: isMobile ? 44 : undefined
            }}
          >
            {onRegisterClick && tournament && tournament.status === 'registration' ? 'Close' : 'Got It!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentInfoModal;
