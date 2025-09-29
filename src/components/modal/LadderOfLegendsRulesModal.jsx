import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from './DraggableModal';

export default function LadderOfLegendsRulesModal({ isOpen, onClose, isMobile }) {
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
          title="🎯 Ladder of Legends Introduction" 
          isExpanded={expandedSections.introduction}
        >
          <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '10px' }}>
            Please review these rules for full details. <br></br>Join the Facebook group: "Ladder of Legends"
          </p>
         
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Player Responsibility</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li>Players are responsible for knowing the rules</li>
            <li>Players under 18 require parental approval</li>
            <li>Participation implies agreement to the rules listed here</li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Match Scheduling</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li>Matches can be played anyday, any time, at any safe mutually agreed upon location</li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>TOP 5 EXCEPTION</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li>Matches involving top 5 players will be played on SATURDAYS OR SUNDAYS<br></br> At Legends Brews & Cues (2790 Hancock Expwy, Colorado Springs)</li>
            <li>Match start times: Between 2pm-8pm, by mutual agreement</li>
            <li>Top 5 matches will be live-streamed on the Legends Facebook page</li>
            <li>Tables for top 5 matches are open - No Greens Fees</li>
            <li>An admin/TD will be present at top 5 matches to referee and make final decisions on disputes</li>
          </ul>
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

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Additional Information</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li>Brackets are determined using FargoRate</li>
            <li>If no FargoRate, known skill level equivalent applies</li>
            <li>Higher races are allowed by mutual agreement</li>
            <li><strong>Note:</strong> All matches have a flat $5 reporting fee regardless of bracket</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="challengeAcceptance" 
          title="📋 Challenge Acceptance & Decline Policy" 
          isExpanded={expandedSections.challengeAcceptance}
        >
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Challenge Acceptance</h4>
          <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '15px' }}>
            For all match types, players must accept a challenge when called out.
          </p>

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
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li>If the SmackDown defender wins, they can challenge for 1st place in their next match with a SmackBack</li>
            <li>The Challenger <em>(Person calling out the SmackBack)</em> pays the full entry fee; the Defender pays 50% of the entry fee</li>
            <li><strong>If Challenger Wins:</strong> Moves into 1st place, all other positions move down one spot</li>
            <li><strong>If Defender Wins:</strong> Ladder positions remain unchanged</li>
          </ul>
        </CollapsibleSection>



        <CollapsibleSection 
          sectionKey="matchReporting" 
          title="📊 Match Reporting Process" 
          isExpanded={expandedSections.matchReporting}
        >
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Reporting Requirements</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>Active membership required:</strong> You must have an active $5/month membership to report matches</li>
            <li><strong>Winner reports:</strong> The winner of each match is responsible for reporting the match result</li>
            <li><strong>Required information:</strong> Winner selection, final score, race format, and any notes</li>
            <li><strong>Payment required:</strong> $5 match fee must be paid when reporting (winner pays the fee)</li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Reporting Process</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>Step 1:</strong> Winner goes to "Report Match" in the ladder app</li>
            <li><strong>Step 2:</strong> Select the match from pending matches list</li>
            <li><strong>Step 3:</strong> Enter match details (winner, score, race format)</li>
            <li><strong>Step 4:</strong> Pay the $5 match fee (via cash, Stripe, or credits)</li>
            <li><strong>Step 5:</strong> Match is automatically processed and ladder positions updated</li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Payment Options</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>Credits:</strong> Use account credits if you have $5+ available</li>
            <li><strong>Cash:</strong> Pay in person at Legends - drop payment in the red dropbox (NOT processed until admin receives and approves payment)</li>
            <li><strong>Stripe:</strong> Pay directly with credit card through Stripe</li>
            <li><strong>Manual payment:</strong> Contact admin for manual payment processing</li>
            <li><strong>Trust levels:</strong> New users require admin verification, trusted users get instant processing</li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Important Notes</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li><strong>Membership check:</strong> System automatically checks if your membership is active before allowing reporting</li>
            <li><strong>Fee distribution:</strong> $3 goes to prize pool, $2 goes to platform maintenance</li>
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
          title="💳 Membership & Payment Structure" 
          isExpanded={expandedSections.membership}
        >
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li><strong>Account Creation:</strong> Free - no cost to claim a ladder position</li>
            <li><strong>Ladder Membership:</strong> $5/month (required for challenges and match reporting)</li>
            <li><strong>Match Fees:</strong> $5 per match (total, not per player)</li>
            <li><strong>Who Pays:</strong> The WINNER reports the match and pays the $5 fee</li>
            <li><strong>Important:</strong> Only ONE $5 fee per match - not per player!</li>
            <li><strong>Fee Distribution:</strong> $3 to prize pool, $2 to platform</li>
            <li><strong>Payment Methods:</strong> Credit card (Stripe) or manual payment</li>
            <li><strong>Billing:</strong> Monthly automatic renewal for membership</li>
            <li><strong>Match Reporting:</strong> Requires active membership and match fee payment</li>
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
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li><strong>Prize Period:</strong> Every 2 months (6 times per year)</li>
            <li><strong>Separate Prize Pools:</strong> Each ladder (499-under, 500-549, 550+) has its own prize pool</li>
            <li><strong>Prize Split:</strong> 50% to 1st place, 50% to most improved player</li>
            <li><strong>Most Improved:</strong> Player who climbed the most ladder positions during the 2-month period</li>
            <li><strong>Eligibility:</strong> Must have active membership and played at least 2 matches during the period</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="contact" 
          title="📞 Questions?" 
          isExpanded={expandedSections.contact}
        >
          <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1rem' }}>
            Join the Facebook group: "Top Colorado Springs Pool Players - The Ladder of Legends" for more information and to participate.
          </p>
        </CollapsibleSection>
      </div>
    </DraggableModal>,
    document.body
  );
}
