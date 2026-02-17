import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import TOURNAMENT_STRUCTURE, { getTournamentStructure } from '@shared/config/tournamentStructure';

const SECTION_KEYS = ['how', 'prize', 'entry', 'match', 'ladder', 'notes'];

const TournamentRulesModal = ({ isOpen, onClose, tournament }) => {
  const [expanded, setExpanded] = useState(() => Object.fromEntries(SECTION_KEYS.map(k => [k, false])));

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  if (!isOpen) return null;

  const struct = tournament ? getTournamentStructure(tournament) : null;

  const ExpandableSection = ({ sectionKey, title, children }) => (
    <section style={{ marginBottom: '1rem' }}>
      <button
        type="button"
        onClick={() => toggle(sectionKey)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '12px',
          color: '#ffc107',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        {title}
        <span style={{ fontSize: '1.2rem', transition: 'transform 0.2s', transform: expanded[sectionKey] ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </button>
      {expanded[sectionKey] && (
        <div style={{ marginTop: '0.5rem' }}>
          {children}
        </div>
      )}
    </section>
  );

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
            Round Robin → King of the Hill (Cash Climb)
          </div>
        </div>

        {/* Tournament Format */}
        <ExpandableSection sectionKey="how" title="🎯 How It Works">
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}>
            <h4 style={{ color: '#8b5cf6', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              Phase 1: Round Robin (until King of the Hill)
            </h4>
            <ul style={{ color: '#e0e0e0', marginLeft: '1.5rem', lineHeight: '1.8' }}>
              <li><strong>Rounds continue</strong> – everyone plays scheduled matches until enough players are eliminated</li>
              <li><strong>Win = payout from that round's prize share</strong> (amount varies by round; later rounds pay more)</li>
              <li><strong>Get {struct?.phase1.eliminationLosses ?? TOURNAMENT_STRUCTURE.phase1.eliminationLosses} losses</strong> = you're eliminated</li>
              <li><strong>When only a certain number of players remain</strong> (3, 4, or 6 depending on total entries), Phase 2 ({struct?.phase2?.name ?? TOURNAMENT_STRUCTURE.phase2.name}) begins</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h4 style={{ color: '#ffc107', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              👑 Phase 2: {struct?.phase2?.name ?? TOURNAMENT_STRUCTURE.phase2.name} (Final Round)
            </h4>
            <ul style={{ color: '#e0e0e0', marginLeft: '1.5rem', lineHeight: '1.8' }}>
              <li><strong>Surviving players</strong> compete for 1st place prize; losses reset to 0</li>
              <li><strong>Get {struct?.phase2?.eliminationLosses ?? TOURNAMENT_STRUCTURE.phase2.eliminationLosses} losses</strong> and you're eliminated from the final round</li>
              <li><strong>Escalating payouts</strong> – each match pays more than the last</li>
              <li><strong>Winner takes 1st place prize + remaining pool!</strong></li>
            </ul>
          </div>
        </ExpandableSection>

        {/* Prize Structure */}
        <ExpandableSection sectionKey="prize" title="💰 Prize Structure">
          <div style={{
            background: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid rgba(0, 255, 0, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#00ff00' }}>💵 Per-match payouts (dynamic)</strong> – Each round gets a share of the prize pool. Your payout per win = round's share ÷ matches in that round. Earlier rounds pay less; later rounds pay more.
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#ffd700' }}>🥇 1st Place</strong> – Reserved from the prize pool; goes to {struct?.phase2?.name ?? TOURNAMENT_STRUCTURE.phase2.name} champion
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#c0c0c0' }}>👑 {struct?.phase2?.name ?? TOURNAMENT_STRUCTURE.phase2.name} pool</strong> – Remainder after 1st place; distributed as escalating per-match payouts. Winner takes any leftover.
              </div>
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.95rem',
                color: '#ccc'
              }}>
                <strong>How it works:</strong> Prize pool is divided across rounds. You earn the per-match amount each time you win. Survive to {struct?.phase2?.name ?? TOURNAMENT_STRUCTURE.phase2.name} and the payouts escalate – last player standing wins 1st place + remaining pool!
              </div>
            </div>
          </div>
        </ExpandableSection>

        {/* Entry Fee Breakdown */}
        <ExpandableSection sectionKey="entry" title="🎫 Entry Fee Breakdown">
          <div style={{
            background: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span><strong>💰 Entry Fee:</strong></span>
                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  ${tournament?.entry_fee ?? TOURNAMENT_STRUCTURE.entryFee}
                </span>
              </div>
              {(tournament?.ladder_seed_amount != null && Number(tournament.ladder_seed_amount) > 0) ? (
                <div style={{ marginLeft: '1.5rem', fontSize: '0.95rem', color: '#ccc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>→ Tournament Prize Pool:</span>
                    <span>${Math.max(0, Number(tournament.entry_fee ?? 20) - Number(tournament.ladder_seed_amount))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>→ Ladder Seed (quarterly):</span>
                    <span>${Number(tournament.ladder_seed_amount)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ marginLeft: '1.5rem', fontSize: '0.95rem', color: '#ccc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>→ Tournament Prize Pool:</span>
                    <span>${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toTournament}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>→ Ladder placement (quarterly):</span>
                    <span>${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toLadderPlacement ?? 9}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>→ Climber fund (quarterly):</span>
                    <span>${TOURNAMENT_STRUCTURE.entryFeeBreakdown.toClimberSeed ?? 1}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ExpandableSection>

        {/* Match Format */}
        <ExpandableSection sectionKey="match" title="🎱 Match Format">
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
                <strong style={{ color: '#00ff00' }}>Race To:</strong> {struct?.gameRules?.raceTo ?? TOURNAMENT_STRUCTURE.gameRules.raceTo} games (first to win {struct?.gameRules?.raceTo ?? TOURNAMENT_STRUCTURE.gameRules.raceTo} games wins the match)
              </div>
              <div>
                <strong style={{ color: '#00ff00' }}>Call Your Shots:</strong> {struct?.gameRules?.callShots ?? TOURNAMENT_STRUCTURE.gameRules.callShots ? 'Yes' : 'No'} (standard tournament rules)
              </div>
            </div>
          </div>
        </ExpandableSection>

        {/* Ladder Seeding */}
        <ExpandableSection sectionKey="ladder" title="📊 Ladder Seeding After Tournament">
          <div style={{
            background: 'rgba(0, 255, 255, 0.08)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#00ffff' }}>Tournament results seed the new ladder.</strong> After the tournament finishes, the new ladder rankings will be set based on how players placed. Players are ordered by <strong>elimination order</strong> – the last player eliminated gets the highest position (right below the winner), and the first player eliminated gets the lowest position. The tournament winner earns the #1 spot.
              </p>
              <p style={{ margin: 0, color: '#ccc', fontSize: '0.95rem' }}>
                Example: If 16 players compete, 1st place = #1 on the new ladder, 2nd place (last eliminated) = #2, 3rd = #3, and so on down to 16th (first eliminated) = #16.
              </p>
            </div>
          </div>
        </ExpandableSection>

        {/* Important Notes */}
        <ExpandableSection sectionKey="notes" title="⚠️ Important Notes">
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <ul style={{ color: '#e0e0e0', marginLeft: '1.5rem', lineHeight: '1.8', fontSize: '0.95rem' }}>
              <li><strong>Be on time!</strong> Late arrivals may result in forfeits</li>
              <li><strong>{struct?.phase1?.eliminationLosses ?? TOURNAMENT_STRUCTURE.phase1.eliminationLosses} losses = elimination</strong> from {struct?.phase2?.name ?? TOURNAMENT_STRUCTURE.phase2.name} contention</li>
              <li><strong>Sportsmanship matters</strong> - Respect your opponents</li>
              <li><strong>Admin decisions are final</strong> on disputed calls</li>
              <li><strong>All prize money paid within 7 days</strong> after tournament completion</li>
            </ul>
          </div>
        </ExpandableSection>

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

