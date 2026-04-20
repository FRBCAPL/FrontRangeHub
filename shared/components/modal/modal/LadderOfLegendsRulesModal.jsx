import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from './DraggableModal';

export default function LadderOfLegendsRulesModal({ isOpen, onClose, isMobile, onContactAdmin }) {
  const [expandedSections, setExpandedSections] = useState({
    introduction: false,
    brackets: false,
    challengeAcceptance: false,
    matchTypes: false,
    matchReporting: false,
    fargoReporting: false,
    membership: false,
    winnerTakesAll: false,
    immunity: false,
    prizeDistribution: false,
    contact: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const CollapsibleSection = ({ sectionKey, title, children, isExpanded }) => (
    <div style={{ marginBottom: '15px' }}>
      <div
        onClick={() => toggleSection(sectionKey)}
        style={{
          background: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid rgba(255, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 68, 68, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 68, 68, 0.1)';
        }}
      >
        <h3 style={{ 
          color: '#ff4444', 
          margin: 0, 
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}>
          {title}
        </h3>
        <span style={{
          color: '#ff4444',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>
          ▼
        </span>
        </div>
      {isExpanded && (
         <div style={{
           padding: '15px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '0 0 8px 8px',
          border: '1px solid rgba(255, 68, 68, 0.2)',
          borderTop: 'none'
        }}>
          {children}
        </div>
      )}
           </div>
  );
  return createPortal(
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title="🏆 Ladder of Legends Rules"
      maxWidth="600px"
      maxHeight="90vh"
      borderColor="#ff4444"
      textColor="#ffffff"
      glowColor="#ff4444"
      zIndex={100000}
      style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        color: '#ffffff'
      }}
    >
      <div style={{
        lineHeight: '1.5',
        fontSize: '1rem'
      }}>
        <CollapsibleSection 
          sectionKey="introduction" 
          title="🎯 Welcome to the Ladder of Legends" 
          isExpanded={expandedSections.introduction}
        >
            <div style={{ 
              background: 'rgba(255, 68, 68, 0.1)', 
              border: '1px solid rgba(255, 68, 68, 0.3)', 
              borderRadius: '8px', 
              padding: '12px', 
            marginBottom: '15px'
          }}>
            <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>What is the Ladder of Legends?</h4>
            <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '10px' }}>
              The Ladder of Legends is a unquiely formatted tournament series that is a sanctioned BCAPL singles pool league. 
              With skill-based brackets, and a dynamic ranking system. Players compete to climb the ladder through 
              strategic challenges and matches, with prizes awarded every 3 months.
            </p>
          </div>

          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h4 style={{ color: '#4CAF50', marginBottom: '8px', fontSize: '1.1rem' }}>How It Works</h4>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Three Skill Brackets:</strong> 499-under, 500-549, and 550+ (based on FargoRate)</li>
              <li><strong>Challenge System:</strong> Challenge players up to 4 spots above you to climb the ladder</li>
              <li><strong>Match Types:</strong> Challenge matches, SmackDown matches, and SmackBack matches</li>
              <li><strong>Match reporting:</strong> Free ladder access; winner pays when results are entered — $10 standard ($5 prize pools, $5 platform); +$5 late after 48h (full late to pool); $5 admin-confirmed forfeit per rules</li>
              <li><strong>Prize Pools:</strong> Awards every 3 months with scaled payouts based on ladder size</li>
            </ul>
            </div>

            <div style={{ 
              background: 'rgba(255, 193, 7, 0.1)', 
              border: '1px solid rgba(255, 193, 7, 0.3)', 
              borderRadius: '8px', 
              padding: '12px', 
            marginBottom: '15px'
          }}>
            <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Getting Started</h4>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Join the Community:</strong> Facebook group "Ladder of Legends" for updates and match coordination</li>
              <li><strong>Claim Your Position:</strong> Sign up with Google or email to claim a ladder position (free account creation)</li>
              <li><strong>Get Active:</strong> Complete your profile and start challenging other players</li>
              <li><strong>Play Matches:</strong> Schedule matches anywhere, anytime (except top 5 players - see special rules)</li>
              <li><strong>Report Results:</strong> Winner posts scores and pays the reporting fee ($10 standard unless late/forfeit path applies)</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(156, 39, 176, 0.1)',
            border: '1px solid rgba(156, 39, 176, 0.3)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <h4 style={{ color: '#9c27b0', marginBottom: '8px', fontSize: '1.1rem' }}>Important Notes</h4>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Player Responsibility:</strong> You are responsible for knowing and following all rules</li>
              <li><strong>Age Requirement:</strong> Players under 18 require parental approval</li>
              <li><strong>Participation Agreement:</strong> Joining implies agreement to all rules listed here</li>
            </ul>
          </div>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="brackets" 
          title="🏆 Brackets & Race Requirements" 
          isExpanded={expandedSections.brackets}
        >
          <p style={{ color: '#e0e0e0', marginBottom: '15px', fontSize: '1rem' }}>
            Players are placed in brackets based on skill levels:
          </p>
          
          <div style={{ 
            background: 'rgba(255, 68, 68, 0.1)', 
            border: '1px solid rgba(255, 68, 68, 0.3)', 
            borderRadius: '6px', 
            padding: '8px 12px', 
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ color: '#ffc107', margin: 0, fontSize: '1.1rem' }}>499 and under</h4>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#e0e0e0', margin: '0 0 2px 0', fontSize: '0.9rem' }}>Race to 5 (minimum)</p>
              <p style={{ color: '#e0e0e0', margin: 0, fontSize: '0.9rem' }}>Entry Fee: $20</p>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '6px', 
            padding: '8px 12px', 
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ color: '#ffc107', margin: 0, fontSize: '1.1rem' }}>500-549</h4>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#e0e0e0', margin: '0 0 2px 0', fontSize: '0.9rem' }}>Race to 7 (minimum)</p>
              <p style={{ color: '#e0e0e0', margin: 0, fontSize: '0.9rem' }}>Entry Fee: $25</p>
            </div>
            </div>

            <div style={{ 
              background: 'rgba(0, 255, 0, 0.1)', 
              border: '1px solid rgba(0, 255, 0, 0.3)', 
            borderRadius: '6px', 
            padding: '8px 12px', 
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ color: '#ffc107', margin: 0, fontSize: '1.1rem' }}>550+</h4>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#e0e0e0', margin: '0 0 2px 0', fontSize: '0.9rem' }}>Race to 7 (minimum)</p>
              <p style={{ color: '#e0e0e0', margin: 0, fontSize: '0.9rem' }}>Entry Fee: $25</p>
            </div>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h4 style={{ color: '#8b5cf6', marginBottom: '8px', fontSize: '1.1rem' }}>📈 Bracket Transition Rules</h4>
            <p style={{ color: '#e0e0e0', fontSize: '0.95rem', marginBottom: '10px' }}>
              When your FargoRate exceeds ladder limits, you receive a <strong>14-day grace period</strong>:
            </p>
            
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.9rem' }}>
              <li><strong>Rating Goes Over Bracket Max:</strong> Automatically move up after 14 days if rating stays over (enter at bottom of new bracket)</li>
              <li><strong>Rating Drops Below Bracket Min:</strong> Choose to stay or move down after 14 days</li>
              <li><strong>During Grace Period:</strong> Can continue playing normally while you decide or recover your rating</li>
              <li><strong>Grace Status:</strong> Shown in your User Status panel with countdown timer</li>
            </ul>

            <div style={{ 
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '6px',
              padding: '8px'
            }}>
              <p style={{ color: '#10b981', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
                💡 Players moving to lower brackets receive Fast Track privileges - see "Types of Matches" for details
              </p>
            </div>
          </div>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Additional Information</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li>Brackets are determined using FargoRate</li>
            <li>If no FargoRate, known skill level equivalent applies</li>
            <li>Higher races are allowed by mutual agreement</li>
            <li><strong>Note:</strong> Match reporting fees are the same across brackets ($10 standard when the winner reports; see fees section for late and admin-confirmed forfeit)</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="challengeAcceptance" 
          title="📋 Challenge Acceptance & Decline Policy" 
          isExpanded={expandedSections.challengeAcceptance}
        >
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Challenge Acceptance</h4>
          <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '15px' }}>
            For all match types, players must accept a challenge or use a decline when called out.
          </p><p>Medical and emergenccy stipulations apply.</p> 

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Decline Challenge Policy</h4>
          <div style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px', 
            padding: '12px',
            marginBottom: '15px'
          }}>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Decline Allowance:</strong> Each player gets 2 declines total</li>
              <li><strong>Decline Effect:</strong> When a challenge is declined, the challenger moves up one position and the defender moves down one position</li>
              <li><strong>Reset System:</strong> Each decline resets 30 days after it was used (not all at once)</li>
              <li><strong>Strategic Use:</strong> Use your declines wisely - they have immediate position consequences</li>
            </ul>
            
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '6px',
              padding: '8px',
              marginTop: '8px'
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: 0, fontWeight: 'bold' }}>
                ⚠️ Important: Declining a challenge results in immediate position changes regardless of match outcome.
             </p>
           </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="matchTypes" 
          title="⚔️ Types of Matches" 
          isExpanded={expandedSections.matchTypes}
        >
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>CHALLENGE MATCH:</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
              <li>Players can challenge opponents up to 4 spots above them</li>
              <li>Challenger wins: Players switch positions</li>
              <li>Defender wins: Ladder positions remain unchanged</li>
            </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>SMACKDOWN MATCH:</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
               <li>Any player can call out a "SmackDown"</li>
               <li>Player calls out an opponent no more than 5 spots below them</li>
                               <li>The Challenger <em>(Person calling out the SmackDown)</em> pays the full entry fee; the Defender pays 50% of the entry fee</li>
                               <li><strong>If Challenger Wins:</strong> Opponent moves THREE spots down, challenger moves TWO spots up (but not into first place)</li>
                <li><strong>If Challenger Loses:</strong> Players switch positions</li>
                <li>First place must be earned via a Challenge Match or SmackBack match</li>
             </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>SMACKBACK MATCH:</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
               <li>If the SmackDown defender wins, they can challenge for 1st place in their next match with a SmackBack</li>
                               <li>The Challenger <em>(Person calling out the SmackBack)</em> pays the full entry fee; the Defender pays 50% of the entry fee</li>
                <li><strong>If Challenger Wins:</strong> Moves into 1st place, all other positions move down one spot</li>
                <li><strong>If Defender Wins:</strong> Ladder positions remain unchanged</li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>FAST TRACK MATCHES:</h4>
          <div style={{
            background: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h5 style={{ color: '#2196F3', marginBottom: '8px', fontSize: '1rem' }}>🚀 Fast Track Re-entry System</h5>
            <p style={{ color: '#e0e0e0', fontSize: '0.95rem', marginBottom: '10px' }}>
              Special matches for players crossing the 500 Fargo rating boundary, designed to be fair to existing ladder players.
            </p>
            
            <h6 style={{ color: '#ffc107', marginBottom: '6px', fontSize: '0.9rem' }}>Grace Periods (14 days):</h6>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '10px', fontSize: '0.9rem' }}>
              <li><strong>Over Ladder Max:</strong> When your Fargo goes over your ladder's maximum, a 14-day grace period starts</li>
              <li><strong>Under Ladder Min:</strong> When your Fargo drops below your ladder's minimum, a 14-day grace period starts</li>
              <li>Grace status appears in your User Status panel with countdown</li>
            </ul>

            <h6 style={{ color: '#ffc107', marginBottom: '6px', fontSize: '0.9rem' }}>What Happens After Grace Period:</h6>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '10px', fontSize: '0.9rem' }}>
              <li><strong>Over Max:</strong> If still over max after 14 days → <strong>Automatically move UP</strong> to next ladder</li>
              <li><strong>Back Under Max:</strong> If you recover → Stay on current ladder, nothing happens</li>
              <li><strong>Under Min:</strong> If still under min after 14 days → Choose to stay or move down with Fast Track</li>
              <li><strong>Back Above Min:</strong> If you recover → Stay on current ladder, nothing happens</li>
            </ul>

            <h6 style={{ color: '#ffc107', marginBottom: '6px', fontSize: '0.9rem' }}>Bottom Entry Rule:</h6>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '10px', fontSize: '0.9rem' }}>
              <li>If you choose to move down to 499-under ladder, you enter at the <strong>bottom</strong></li>
              <li><strong>No existing players are bumped</strong> - this protects current ladder positions</li>
            </ul>

            <h6 style={{ color: '#ffc107', marginBottom: '6px', fontSize: '0.9rem' }}>Fast Track Privileges:</h6>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '10px', fontSize: '0.9rem' }}>
              <li><strong>2 special challenges</strong> (must be used within 4 weeks)</li>
              <li><strong>Extended range:</strong> Can challenge up to <strong>6 spots above</strong> (normal limit is 4)</li>
              <li>Shown as green tile in User Status panel (e.g., "2 challenges left")</li>
            </ul>

            <h6 style={{ color: '#ffc107', marginBottom: '6px', fontSize: '0.9rem' }}>Match Mechanics:</h6>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '10px', fontSize: '0.9rem' }}>
              <li><strong>If Fast Track challenger wins:</strong> They <strong>insert</strong> into defender's exact position</li>
              <li>The Defender and all other players below the move down one spot</li>
              <li><strong>If Fast Track challenger loses:</strong> Ladder positions do not change</li>
            </ul>

            <h6 style={{ color: '#ffc107', marginBottom: '6px', fontSize: '0.9rem' }}>Eligibility:</h6>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', fontSize: '0.9rem' }}>
              <li>Must be on the same ladder for Fast Track challenges</li>
              <li>Range must be within 6 positions above challenger</li>
              <li>Cannot create challenges if 2 uses are exhausted or 4-week window expired</li>
             </ul>
          </div>

          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>TOP 5 PLAYER SPECIAL RULES</h4>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Location Requirement:</strong> Matches involving top 5 players must be played at Legends Brews & Cues (2790 Hancock Expwy, Colorado Springs)</li>
              <li><strong>Schedule:</strong> Top 5 matches are played on SATURDAYS OR SUNDAYS only</li>
              <li><strong>Time Window:</strong> Match start times between 2pm-8pm, by mutual agreement</li>
              <li><strong>Live Streaming:</strong> Top 5 matches will be live-streamed on the Legends Facebook page</li>
              <li><strong>No Greens Fees:</strong> Tables for top 5 matches are open - no table fees</li>
              <li><strong>Admin Presence:</strong> An admin/TD will be present to referee and make final decisions on disputes</li>
             </ul>
          </div>
        </CollapsibleSection>



        <CollapsibleSection 
          sectionKey="matchReporting" 
          title="📊 Match Reporting Process" 
          isExpanded={expandedSections.matchReporting}
        >
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Reporting Requirements</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>No monthly ladder fee:</strong> Ladder access is free; fees apply when you report a completed match</li>
            <li><strong>Winner reports:</strong> The winner reports the result and pays the reporting fee when scores are entered</li>
            <li><strong>48-hour window:</strong> Report within 48 hours of the match date for the standard fee; after that a <strong>$5 late fee</strong> is added — the entire late fee goes to the prize pool for that ladder (you can still report in the app)</li>
            <li><strong>Required information:</strong> Winner selection, final score, race format, match date, and any notes</li>
            <li><strong>Standard fee:</strong> $10 per match ($5 to ladder prize pool, $5 to platform). Admin-confirmed forfeits: $5 total ($2.50 / $2.50)</li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Reporting Process</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>Step 1:</strong> Winner goes to "Report Match" in the ladder app</li>
            <li><strong>Step 2:</strong> Select the match from pending matches list</li>
            <li><strong>Step 3:</strong> Enter match details (winner, score, race format)</li>
            <li><strong>Step 4:</strong> Pay the match reporting fee (via cash, Square, or credits)</li>
            <li><strong>Step 5:</strong> Match is automatically processed and ladder positions updated</li>
            </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Payment Options</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>Credits:</strong> Use account credits if you have enough balance for the reporting fee</li>
            <li><strong>Cash:</strong> Pay in person at Legends - drop payment in the red dropbox (NOT processed until admin receives and approves payment)</li>
            <li><strong>Square:</strong> Pay directly with credit card through Square</li>
            <li><strong>Manual payment:</strong> Contact admin for manual payment processing</li>
            <li><strong>Trust levels:</strong> New users require admin verification, trusted users get instant processing</li>
            </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Important Notes</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li><strong>Winner only:</strong> Only the winning player may submit the result and pay the reporting fee</li>
            <li><strong>Fee distribution (standard $10):</strong> $5 to ladder prize pool, $5 to platform</li>
            <li><strong>Cash payments:</strong> Cash payments are recorded but NOT processed until admin physically receives and approves the payment</li>
            <li><strong>Admin override:</strong> Admins can report matches without payment requirements</li>
            <li><strong>Disputes:</strong> Contact ladder administrators for any match reporting issues</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="fargoReporting" 
          title="📊 BCA Sanctioning & FargoRate Reporting" 
          isExpanded={expandedSections.fargoReporting}
        >
          <div style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h5 style={{ color: '#dc2626', marginBottom: '8px', fontSize: '1rem' }}>🚨 MANDATORY BCA SANCTIONING REQUIREMENT</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Effective Date:</strong> January 1, 2026 - ALL players must be BCA-sanctioned to participate</li>
              <li><strong>Enforcement:</strong> Players without sanctioning cannot challenge, accept challenges, or report matches</li>
              <li><strong>Grace Period:</strong> Current players have until January 1, 2026 to get sanctioned</li>
              <li><strong>New Players:</strong> Must be sanctioned before joining the ladder</li>
            </ul>
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.2)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              borderRadius: '6px',
              padding: '8px',
              marginTop: '8px'
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
                ⚠️ League-wide requirement - no exceptions after January 1, 2026
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(107, 70, 193, 0.1)',
            border: '1px solid rgba(107, 70, 193, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h5 style={{ color: '#8b5cf6', marginBottom: '8px', fontSize: '1rem' }}>How to Get BCA-Sanctioned</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Cost:</strong> $25.00 for the current calendar year</li>
              <li><strong>Payment:</strong> Credit card (instant) or cash (dropbox at Legends)</li>
              <li><strong>Where:</strong> Click "🏆 Get Sanctioned" in your player status on the ladder page</li>
              <li><strong>Already Sanctioned?</strong> Contact admin if you've paid elsewhere - they can verify and update your status</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(0, 188, 212, 0.1)',
            border: '1px solid rgba(0, 188, 212, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h5 style={{ color: '#00BCD4', marginBottom: '8px', fontSize: '1rem' }}>FargoRate Reporting (Until Jan 1, 2026)</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Current Policy:</strong> Matches are sent to FargoRate when BOTH players are sanctioned</li>
              <li><strong>Status Indicators:</strong> ✓ Green = sanctioned, ✗ Red = not sanctioned (check player status in ladder)</li>
              <li><strong>Important:</strong> All matches count for ladder standings regardless of sanctioning status</li>
              <li><strong>After Jan 1, 2026:</strong> ALL matches will be automatically reported to FargoRate since all players must be sanctioned</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <p style={{ color: '#10b981', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
              💡 Get BCA-sanctioned to have your ladder matches count toward your official FargoRate!
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="membership" 
          title="💳 Ladder fees & payments" 
          isExpanded={expandedSections.membership}
        >
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
               <li><strong>Account creation:</strong> Free — no cost to claim a ladder position</li>
               <li><strong>Ladder access:</strong> No monthly fee</li>
               <li><strong>Match reporting fee:</strong> $10 per match when the winner enters scores (one payment per match)</li>
               <li><strong>Who pays:</strong> The winner reports and pays within 48 hours of the match date</li>
               <li><strong>Standard split:</strong> $5 to ladder prize pool, $5 to platform</li>
               <li><strong>Late reporting (48+ hours after match date):</strong> +$5 — the full $5 goes to the prize pool for that ladder</li>
               <li><strong>Admin-confirmed forfeit:</strong> $5 total ($2.50 prize pool, $2.50 platform); loser must be on 0 games</li>
               <li><strong>Payment methods:</strong> Credits, cash (red dropbox), Square / card where enabled</li>
               <li><strong>Optional legacy payments:</strong> Payment Dashboard may still show legacy ladder-account tools; they are not required for ladder access</li>
             </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="winnerTakesAll" 
          title="💰 Winner Takes All" 
          isExpanded={expandedSections.winnerTakesAll}
        >
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li>Entry fees</li>
              <li>Any added sponsor prizes/money (TBD)</li>
              <li>Ladder position</li>
              <li>Bragging rights</li>
            </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="immunity" 
          title="🛡️ Immunity" 
          isExpanded={expandedSections.immunity}
        >
          <p style={{ color: '#e0e0e0', fontSize: '1rem' }}>
               Winners receive 7 day immunity from new challenges.
             </p>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="prizeDistribution" 
          title="🏆 Prize Distribution" 
          isExpanded={expandedSections.prizeDistribution}
        >
          <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: 1.55 }}>
            <p style={{ margin: '0 0 10px 0' }}>
              <strong style={{ color: '#ffc107' }}>Schedule</strong> — Payouts every <strong>3 months</strong>. Each skill ladder (499-under, 500-549, 550+) has its <strong>own</strong> pool.
            </p>
            <p style={{ margin: '0 0 6px 0' }}>
              <strong style={{ color: '#ffc107' }}>What feeds the pool</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
              <li style={{ marginBottom: '6px' }}><strong>Tournament ($20 entry):</strong> $15 into this ladder&apos;s quarterly prize pool ($10 placement side + $5 climber side); $5 platform.</li>
              <li><strong>Match report ($10 standard):</strong> $5 platform; $5 into the prize pool (about $4 placement + $1 climber). Extra late fees also add to the prize pool.</li>
            </ul>
            <p style={{ margin: '0 0 6px 0' }}>
              <strong style={{ color: '#ffc107' }}>Who gets paid</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
              <li style={{ marginBottom: '6px' }}><strong>Climber award</strong> — Most positions climbed in the period (details and estimates in the Prize Pool modal).</li>
              <li style={{ marginBottom: '6px' }}><strong>Placement prizes</strong> — Top <strong>~15%</strong> of the field (min. 1 player). Share of the placement fund depends how many places pay:</li>
            </ul>
            <div style={{
              fontSize: '0.88rem',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '12px'
            }}>
              <div style={{ marginBottom: '4px' }}>1 place → <strong>100%</strong> to 1st</div>
              <div style={{ marginBottom: '4px' }}>2 places → 1st <strong>60%</strong> · 2nd <strong>40%</strong></div>
              <div style={{ marginBottom: '4px' }}>3 places → 1st <strong>50%</strong> · 2nd <strong>30%</strong> · 3rd <strong>20%</strong></div>
              <div style={{ marginBottom: '4px' }}>4 places → 1st <strong>50%</strong> · 2nd <strong>30%</strong> · 3rd <strong>15%</strong> · 4th <strong>5%</strong></div>
              <div>5+ places → 1st <strong>40%</strong> · 2nd <strong>25%</strong> · 3rd <strong>15%</strong> · 4th <strong>10%</strong> · 5th <strong>5%</strong> · rest split</div>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#b0b0b0' }}>
              <strong>Eligibility:</strong> To qualify for <strong>placement prizes</strong> and the <strong>Climber award</strong>, you must be an active ladder player and have completed at least <strong>2 matches</strong> in that prize pool period (the current quarter). Ask an admin if unsure.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="contact" 
          title="📞 Questions?" 
          isExpanded={expandedSections.contact}
        >
          <p style={{ color: '#e0e0e0', marginBottom: '15px', fontSize: '1rem' }}>
            Join the Facebook group: "Top Colorado Springs Pool Players - The Ladder of Legends" for more information and to participate.
          </p>
          
           <div style={{ 
             background: 'rgba(255, 68, 68, 0.1)', 
             border: '1px solid rgba(255, 68, 68, 0.3)', 
             borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#e0e0e0', marginBottom: '12px', fontSize: '1rem' }}>
              Need help or have questions about the rules?
            </p>
            <button
              onClick={() => {
                // Close the rules modal first
                onClose();
                // Then open contact admin modal with a small delay to ensure modal closes first
                if (onContactAdmin) {
                  setTimeout(() => {
                    onContactAdmin();
                  }, 100);
                } else {
                  // Fallback: show alert if contact admin function is not available
                  alert('Contact Admin feature is not available in this context. Please use the Contact Admin card on the main ladder page.');
                }
              }}
              style={{
                background: 'linear-gradient(45deg, #ff4444, #ff6b35)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255, 68, 68, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(45deg, #ff5722, #ff9800)';
                e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.4)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(45deg, #ff4444, #ff6b35)';
                e.target.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.3)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              📞 Contact Admin
            </button>
           </div>
        </CollapsibleSection>
        </div>
    </DraggableModal>,
    document.body
  );
}
