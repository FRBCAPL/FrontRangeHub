import React from 'react';

const TournamentInfoModal = ({ isOpen, onClose, tournament = null, onRegisterClick }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
        padding: '20px 20px',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        borderRadius: '12px',
        padding: '1rem',
        maxWidth: '450px',
        width: '50%',
        height: '80vh',
        overflowY: 'auto',
        border: '2px solid #8b5cf6',
        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)',
        WebkitOverflowScrolling: 'touch',
        margin: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
          position: 'relative'
        }}>
          <h2 style={{
            color: '#00aa00',
            margin: 0,
            fontSize: '2rem',
            fontWeight: 'bold'
          }}>
            🏆 Cash Climb {tournament ? tournament.title || 'Tournament Info' : 'Tournament Info'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ccc',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              position: 'absolute',
              right: '0',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ color: '#fff', lineHeight: '1.6' }}>
          
          {/* Actual Tournament Details */}
          {tournament && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontSize: '1rem' }}>
                📅 Tournament Details
              </h3>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '0.5rem',
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
                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                  <strong>Entry Fee:</strong> ${tournament.entry_fee || 20}
                </p>
                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                  <strong>Format:</strong> {tournament.format || 'Double Round Robin'}
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
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              🎯 Format
            </h3>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              {tournament ? (
                <>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Format:</strong> {tournament.format || 'Double Round Robin'}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Game:</strong> {tournament.game_type || '8-Ball Pool'}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Race to:</strong> {tournament.race_to || '5'} games per match
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Elimination:</strong> {tournament.elimination_rule || '3-Loss Elimination'}
                  </p>
                  <p style={{ margin: '0', fontSize: '0.95rem' }}>
                    <strong>Call Shots:</strong> {tournament.call_shots ? 'Yes' : 'No'}
                  </p>
                </>
              ) : (
                <>
                  <br /><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#ffc107' }}>Phase 1: Round Robin</strong><br />
                    Matches are scheduled as if everyone would play everyone else (single, double, or triple times depending on player count). 
                    <br></br>Each match you <span style={{ color: '#00ff00', fontWeight: 'bold' }}>WIN</span> earns you a payout from that round's prize pool. 
                    <br></br>BUT - <span style={{ color: '#ff4444', fontWeight: 'bold' }}>get 3 losses and you're OUT!</span> 
                    <br></br>Keep what you win, but you won't be playing your remaining scheduled matches.
                  </p><br />
                  <p style={{ margin: '0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#ffc107' }}>Phase 2: Cash Climb</strong><br />
                    When only a few players remain (3-6 players depending on tournament size), Cash Climb begins! 
                    <br></br>All surviving players advance to the final round. Your losses reset to 0. 
                    <br></br>Now you get only 2 losses before elimination. 
                    <br></br>Mixed round robin/winner-stays format with escalating payouts per match. 
                    <br></br>
                    Last player standing wins the remaining prize pool as 1st place!
                  </p><br />
                </>
              )}
            </div>
          </div>

          {/* Match Rules */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              📋 Match Rules
            </h3>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              {tournament ? (
                <>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Game:</strong> {tournament.game_type || '8-Ball Pool'}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Call Shots:</strong> {tournament.call_shots ? 'Players must call their shots' : 'Call shots not required'}
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
                    <strong>Match Format:</strong> May be a single game or a maximum race to 5 (Dependent on the size of the tournament field)
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
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              💰 Prize Structure
            </h3>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              {tournament ? (
                <>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Entry Fee:</strong> ${tournament.entry_fee || 20} (${Math.floor((tournament.entry_fee || 20) / 2)} to tournament payout, ${Math.floor((tournament.entry_fee || 20) / 2)} to ladder prize pool)
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>
                    <strong>Win Payout:</strong> ${tournament.win_payout || 1} per match win from prize pool
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
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#00ff00' }}>How You Win Money:</strong><br />
                    The prize pool is divided across all rounds.
                    <br></br> Each round has a different payout amount that increases as the tournament progresses. 
                    <br></br>When you <span style={{ color: '#00ff00', fontWeight: 'bold' }}>WIN</span> a match, you earn that round's payout immediately.
                    <br></br> The more rounds you survive, the bigger the payouts become!
                  </p><br />
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#ffd700' }}>Cash Climb Payouts:</strong><br />
                    In the final round, payouts escalate dramatically with each match. 
                    <br></br>With 3 players remaining, the winner stays at the table to face the next challenger. 
                    <br></br>The last player standing wins what they won along the way + 1st place reserved amount + whatever is left in the prize pool!
                  </p>
                  <p style={{ margin: '0', fontSize: '1rem', lineHeight: '1.4' }}>
                    <p></p><br /><strong style={{ color: '#2196f3' }}>Entry Fee:</strong>
                    <br></br>$20 entry fee</p>
                    <p><strong style={{ color: '#2196f3' }}>Entry FeeBreakdown:</strong>
                    <br></br>$10 goes to this tournament's prize pool
                    <br></br>$10 goes to the quarterly ladder prize pool (separate payout every 3 months).
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Important Notes */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
              ⚠️ Important Notes
            </h3>
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              padding: '0.5rem',
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
          marginTop: '1rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
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
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 170, 0, 0.3)'
              }}
            >
              🎯 Register Now
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
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
