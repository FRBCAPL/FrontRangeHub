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
    noShowForfeits: false,
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
              The Ladder of Legends is a uniquely formatted tournament series and a sanctioned BCAPL singles pool league.<br />
              Skill-based brackets and a dynamic ranking system let players climb through challenges and matches. <br />
              ~ With prizes awarded every 3 months ~
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
              <li><strong>Three skill brackets:</strong> (based on FargoRate) 499-under, 500-549, and 550+ </li>
              <li><strong>Challenge system:</strong> Challenge up to 4 spots above you to climb the ladder</li>
              <li><strong>Match types:</strong> Challenge, SmackDown, SmackBack, and Fast Track (when you qualify)</li>
              <li><strong>Match entry fee:</strong> Each ladder match is played for an entry fee, paid by both players— at least your bracket minimum <br />
              <center>Winner of match wins entry fees</center>
              <center>(race and dollar amounts are in <strong>Brackets & Race Requirements</strong>)<br /></center>
              <center>If <strong>both players agree before the match</strong>, you may set a higher entry fee and race than the ladder minimums<br /></center>
              </li>
              <li><strong>After each match:</strong> The winner reports the result in the app and completes the reporting fee when they submit</li>
              <li><strong>Prize pools:</strong> Paid out every 3 months — open <strong>Prize distribution</strong> for schedule, eligibility, and how the pool is split</li>
            </ul>
            </div>

            <div style={{
              background: 'rgba(33, 150, 243, 0.12)',
              border: '1px solid rgba(33, 150, 243, 0.35)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '15px'
            }}>
              <h4 style={{ color: '#90caf9', marginBottom: '8px', fontSize: '1.1rem' }}>🎱 Official Match Rules (Important)</h4>
              <p style={{ color: '#e0e0e0', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
                <strong>Default ruleset:</strong> Official CSI rules apply to all ladder matches.
                <br />
                <strong>Any rule changes:</strong> Must be agreed to by <strong>both players before the match starts</strong>.
              </p>
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
              <li><strong>Report results:</strong> Winner enters the score in the app and pays; reporting fees are the same in every bracket (details in <strong>Fees, payments & reporting</strong>)</li>
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
              <li><strong>Default ruleset:</strong> All ladder matches use official CSI rules by default</li>
              <li><strong>Rule modifications:</strong> Any changes or house-rule adjustments to CSI rules must be agreed to by both players <strong>before</strong> the match starts</li>
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
            <li><strong>Reporting fees:</strong> Same rules in every bracket — see <strong>Fees, payments & reporting</strong> for amounts and timing</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="membership" 
          title="💳 Fees, payments & reporting" 
          isExpanded={expandedSections.membership}
        >
          <p style={{ color: '#bdbdbd', fontSize: '0.92rem', margin: '0 0 12px 0' }}>
            Reporting fees, the 48-hour rule, who pays, and payment options are all explained here.
          </p>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li><strong>Account & ladder access:</strong> Free — no monthly ladder fee</li>
            <li><strong>When you pay:</strong> The <strong>winner</strong> pays when they submit the match result (one payment per match)</li>
            <li><strong>Standard reporting fee — $10:</strong> $5 to your ladder&apos;s prize pool, $5 platform</li>
            <li><strong>48-hour rule:</strong> Counts from the <strong>match date</strong>.<br />
            Report on time for the standard $10. After that, add <strong>$5 late</strong> — the <strong>entire</strong> $5 late fee goes to that ladder&apos;s prize pool</li>
            <li><strong>Admin-confirmed forfeit (fee only):</strong> $5 total ($2.50 prize pool / $2.50 platform) when you use that path in the reporting flow after an admin has confirmed a no-show — see <strong>No-shows and admin-confirmed forfeits</strong> below for the full process</li>
            <li><strong>How to pay:</strong> Account credits, card/Square where enabled, Cashapp, Venmo, cash at Legends (red dropbox)</li>
            <li><strong>Cash & App payments:</strong> Recorded in the app when you choose cashapp, venmo, or cash at Legends (red dropbox) — not fully processed until an admin physically confirms receipt</li>
            <li><strong>Need help with a payment?</strong> Contact an admin — they can walk you through unusual situations</li>
            <li><strong>Payment Dashboard:</strong> If you see extra payment tools in your account, you can ignore them for ladder play; they are optional</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection
          sectionKey="noShowForfeits"
          title="🚫 No-shows and admin-confirmed forfeits"
          isExpanded={expandedSections.noShowForfeits}
        >
          <p style={{ color: '#bdbdbd', fontSize: '0.92rem', margin: '0 0 12px 0' }}>
            This is separate from a normal win/loss: it covers an opponent who does not show, and how the reduced reporting fee applies after staff review.
          </p>
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.05rem' }}>Reporting a no-show</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '14px', fontSize: '0.95rem' }}>
            <li>Use <strong>Report No-Show</strong> in the ladder app when your opponent does not appear for a scheduled match.</li>
            <li>Wait at least <strong>30 minutes</strong> after the scheduled start time before you file.</li>
            <li>Include a <strong>written explanation</strong> of what happened (how long you waited, how you tried to reach them, etc.).</li>
            <li>Upload <strong>photo proof</strong> that you were at the venue — required for the request to be considered.</li>
            <li>An <strong>admin reviews</strong> each request and may <strong>approve</strong> or <strong>deny</strong> it. You may be contacted if more detail is needed.</li>
            <li>When a no-show is approved, ladder handling (positions / penalties) follows the admin decision and league policy — follow any notice you get in the app or from staff.</li>
          </ul>
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.05rem' }}>Paying the reporting fee after a forfeit</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li>After a forfeit is <strong>admin-confirmed</strong>, the player who posts the match result uses the normal reporting flow and selects the <strong>admin-confirmed forfeit</strong> option where the app offers it.</li>
            <li>The fee is <strong>$5 total</strong> ($2.50 prize pool / $2.50 platform) — same numbers as in <strong>Fees, payments and reporting</strong> above.</li>
            <li>Repeat no-shows or abuse of the process may be reviewed by admins under league policy.</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="challengeAcceptance" 
          title="📋 Challenge Acceptance & Decline Policy" 
          isExpanded={expandedSections.challengeAcceptance}
        >
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Challenge Acceptance</h4>
          <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '15px' }}>
            For all match types, players must accept a challenge or use a decline when called out.<br />
            Medical and emergency stipulations apply.
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
              Special matches for players crossing the Ladders Fargo rating boundary, designed to be fair to existing ladder players.
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
              <li>If you choose to move down to the next lower ladder, you enter at the <strong>bottom</strong></li>
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
              <li>The Defender and all other players below the defender move down one spot</li>
              <li><strong>If Fast Track challenger loses:</strong> Ladder positions do not change</li>
            </ul>

            <h6 style={{ color: '#ffc107', marginBottom: '6px', fontSize: '0.9rem' }}>Eligibility:</h6>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', fontSize: '0.9rem' }}>
              <li>Must be on the same ladder for Fast Track challenges</li>
              <li>Range must be within 6 positions above challenger</li>
              <li>Cannot create Fast Track challenges if 2 uses are exhausted or 4-week window expired</li>
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
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>What you need to know</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>Winner reports:</strong> Only the winner needs to submit the result and complete payment in the app</li>
            <li><strong>48-hour timing:</strong> The clock starts from the <strong>match date</strong> — report on time for the standard fee; late reporting costs extra (<strong>Fees, payments & reporting</strong> has the numbers)</li>
            <li><strong>Required info:</strong> Winner, final score, race format, match date, and any notes</li>
            <li><strong>Rules reminder:</strong> CSI rules are default; any modifications/house rules must be agreed by both players before play begins</li>
            <li><strong>How much and where the money goes:</strong> Listed in <strong>Fees, payments & reporting</strong></li>
          </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Steps in the app</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '15px', fontSize: '0.95rem' }}>
            <li><strong>Step 1:</strong> Winner opens <strong>Report Result</strong> in the ladder app</li>
            <li><strong>Step 2:</strong> Select the match from pending matches list</li>
            <li><strong>Step 3:</strong> Enter match details (winner, score, race format)</li>
            <li><strong>Step 4:</strong> Pay the reporting fee using credits, card/Square, or cash/Cashapp/Venmo (options and amounts in <strong>Fees, payments & reporting</strong>)</li>
            <li><strong>Step 5:</strong> Match is processed and ladder positions update</li>
            </ul>

          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1.1rem' }}>Other notes</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
            <li><strong>Trust levels:</strong> New users may need admin verification; trusted users can process faster</li>
            <li><strong>Admin override:</strong> Admins can report matches without payment when appropriate</li>
            <li><strong>Disputes:</strong> Contact ladder administrators for reporting issues</li>
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
            <h5 style={{ color: '#dc2626', marginBottom: '8px', fontSize: '1rem' }}>BCA sanctioning (required)</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Who it applies to:</strong> Everyone on the ladder ~ current-year <strong>BCAPL sanctioning</strong> is required to use the app ~
              <center>You must show as sanctioned before you can <strong>challenge</strong>, <strong>accept</strong> a challenge, or <strong>report</strong> a match</center></li>
              <li><strong>New players:</strong> Get sanctioned (or have admin verify you) before you start playing counted ladder matches</li>
              <li><strong>Already paid elsewhere?</strong> Contact an admin so your status can be checked and updated — do not skip this step</li>
            </ul>
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.2)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              borderRadius: '6px',
              padding: '8px',
              marginTop: '8px'
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
                BCAPL requirement for this league — use <strong>Get Sanctioned</strong> on the ladder so your status stays current
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
              <li><strong>Outside the app:</strong> If you paid for sanctioning elsewhere, contact an admin with proof so they can mark you correctly</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(0, 188, 212, 0.1)',
            border: '1px solid rgba(0, 188, 212, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h5 style={{ color: '#00BCD4', marginBottom: '8px', fontSize: '1rem' }}>FargoRate reporting</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <li><strong>Ladder standings:</strong> Completed matches count on the ladder when reported — that is separate from when data reaches FargoRate</li>
              <li><strong>Official Fargo / BCAPL:</strong> Matches are submitted for Fargo when <strong>both</strong> players are sanctioned; use the status on the ladder (✓ sanctioned · ✗ not yet)</li>
              <li><strong>With sanctioning required from Jan 1, 2026:</strong> Most matches involve two sanctioned players; if something looks wrong, ask an admin</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <p style={{ color: '#10b981', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
              💡 Stay sanctioned for the season so ladder matches can count toward your official FargoRate without delays
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection 
          sectionKey="winnerTakesAll" 
          title="💰 Winner Takes All" 
          isExpanded={expandedSections.winnerTakesAll}
        >
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <center><strong>Winner of the match takes it all:</strong></center><br />

              <li>Match Entry Fees (paid by both players)</li>
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
               Winners receive 7 day immunity from new challenges.<br />
               While immune, players are not required to accept challenges, use declines, or play matches.<br />
               They may accept challenges, at their discretion, but are not required to do so.
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
              <li style={{ marginBottom: '6px' }}><strong>Tournament ($20 entry):</strong> $10 to the tournament prize pool; $5 to this ladder&apos;s quarterly prize pool ($4 placement + $1 climber); $5 platform.</li>
              <li><strong>Match report ($10 standard):</strong> $5 platform; $5 into the prize pool ($4 placement + $1 climber).<br />
               Extra late fees also add to the prize pool.</li>
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
              <strong>Eligibility:</strong> Active ladder players need at least <strong>2 completed matches</strong> in the prize period to qualify for <strong>placement</strong> and the <strong>Climber</strong> award. Ask an admin if unsure.
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
