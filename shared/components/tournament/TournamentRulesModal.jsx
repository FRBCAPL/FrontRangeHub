import React from 'react';
import { createPortal } from 'react-dom';

const TournamentRulesModal = ({ isOpen, onClose, tournament }) => {
  if (!isOpen) return null;

  const formatType = tournament?.round_robin_type === 'double' ? 'Double' : 
                     tournament?.round_robin_type === 'triple' ? 'Triple' : 'Single';

  return createPortal(
    <div
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
        zIndex: 10001,
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: '16px',
          padding: '2rem',
          width: '720px',
          maxWidth: 'calc(100vw - 2rem)',
          height: '90vh',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '2px solid #8b5cf6',
          boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
          position: 'relative',
          flexShrink: 0
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 68, 68, 0.2)',
            border: '1px solid #ff4444',
            color: '#ff4444',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          ✕ Close
        </button>

        {/* Header */}
        <div style={{ marginBottom: '2rem', paddingRight: '80px' }}>
          <h2 style={{ color: '#8b5cf6', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
            📋 Tournament Rules & Format
          </h2>
          <div style={{ color: '#00ff00', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {formatType} Round Robin with Cash Climb
          </div>
        </div>

        {/* Tournament Format */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffc107', marginBottom: '1rem', fontSize: '1.4rem' }}>
            🎯 How It Works
          </h3>
          
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}>
            <h4 style={{ color: '#8b5cf6', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              Phase 1: {formatType} Round Robin
            </h4>
            <ul style={{ color: '#e0e0e0', marginLeft: '1.5rem', lineHeight: '1.8' }}>
              <li><strong>Everyone plays everyone</strong> {formatType === 'Double' ? 'twice' : formatType === 'Triple' ? 'three times' : 'once'}</li>
              <li><strong>Win = +$1 to your prize money</strong></li>
              <li><strong>Lose = Elimination point</strong></li>
              <li><strong>Get 2 losses? You're eliminated</strong> (can't advance to Cash Climb)</li>
              <li>Players with 0 or 1 losses advance to the final round</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h4 style={{ color: '#ffc107', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              👑 Phase 2: Cash Climb (Final Round)
            </h4>
            <ul style={{ color: '#e0e0e0', marginLeft: '1.5rem', lineHeight: '1.8' }}>
              <li><strong>Players with 0 or 1 losses</strong> compete for 1st place prize</li>
              <li><strong>Single-elimination bracket</strong> - lose once and you're out</li>
              <li><strong>Winner takes the 1st place prize!</strong></li>
              <li>If only ONE player has 0-1 losses, they automatically win 1st place</li>
            </ul>
          </div>
        </section>

        {/* Prize Structure */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffc107', marginBottom: '1rem', fontSize: '1.4rem' }}>
            💰 Prize Structure
          </h3>
          
          <div style={{
            background: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid rgba(0, 255, 0, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#00ff00' }}>💵 $1 per win</strong> - Everyone earns $1 for every match they win
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#ffd700' }}>🥇 1st Place</strong> - Cash Climb champion receives the biggest prize
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#c0c0c0' }}>🥈 Remaining Prize Pool</strong> - Split among all players based on their wins
              </div>
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.95rem',
                color: '#ccc'
              }}>
                <strong>Example:</strong> Win 5 matches = $5 guaranteed + your share of remaining pool + 1st place prize if you win Cash Climb!
              </div>
            </div>
          </div>
        </section>

        {/* Entry Fee Breakdown */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffc107', marginBottom: '1rem', fontSize: '1.4rem' }}>
            🎫 Entry Fee Breakdown
          </h3>
          
          <div style={{
            background: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span><strong>💰 Entry Fee:</strong></span>
                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>$20</span>
              </div>
              <div style={{ marginLeft: '1.5rem', fontSize: '0.95rem', color: '#ccc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>→ Tournament Prize Pool:</span>
                  <span>$10</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>→ Ladder Prize Pool (quarterly):</span>
                  <span>$10</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Match Format */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffc107', marginBottom: '1rem', fontSize: '1.4rem' }}>
            🎱 Match Format
          </h3>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#00ff00' }}>Game Type:</strong> {tournament?.game_type || '8-Ball'}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#00ff00' }}>Race To:</strong> 5 games (first to win 5 games wins the match)
              </div>
              <div>
                <strong style={{ color: '#00ff00' }}>Call Your Shots:</strong> Yes (standard tournament rules)
              </div>
            </div>
          </div>
        </section>

        {/* Important Notes */}
        <section>
          <h3 style={{ color: '#ffc107', marginBottom: '1rem', fontSize: '1.4rem' }}>
            ⚠️ Important Notes
          </h3>
          
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <ul style={{ color: '#e0e0e0', marginLeft: '1.5rem', lineHeight: '1.8', fontSize: '0.95rem' }}>
              <li><strong>Be on time!</strong> Late arrivals may result in forfeits</li>
              <li><strong>2 losses = elimination</strong> from Cash Climb contention</li>
              <li><strong>Sportsmanship matters</strong> - Respect your opponents</li>
              <li><strong>Admin decisions are final</strong> on disputed calls</li>
              <li><strong>All prize money paid within 7 days</strong> after tournament completion</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '2px solid rgba(139, 92, 246, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ color: '#8b5cf6', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Questions? Contact the tournament director!
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            Good luck and have fun! 🎱
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TournamentRulesModal;

