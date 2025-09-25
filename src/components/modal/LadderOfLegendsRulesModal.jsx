import React from 'react';

export default function LadderOfLegendsRulesModal({ isOpen, onClose, isMobile }) {
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
      justifyContent: 'center',
      alignItems: 'flex-start',
      zIndex: 1000,
      padding: '120px 10px 10px 10px'
    }}>
             <div style={{
         background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
         border: '2px solid #ff4444',
         borderRadius: '12px',
         width: isMobile ? '98%' : '50%',
         maxWidth: '500px',
         height: isMobile ? '98%' : '90vh',
         maxHeight: '800px',
         display: 'flex',
         flexDirection: 'column',
         boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
         color: '#ffffff'
       }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #ff4444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ color: '#ff4444', margin: 0 }}>🏆 Ladder of Legends Rules</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff4444',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '5px'
            }}
          >
            ×
          </button>
        </div>

                 {/* Content */}
         <div style={{
           flex: 1,
           overflowY: 'auto',
           padding: '15px',
           lineHeight: '1.6',
           fontSize: '1.3rem'
         }}>
                     {/* Introduction */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>🎯 Ladder of Legends Introduction</h3>
             <p style={{ color: '#e0e0e0', fontSize: '1.3rem' }}>
               Please see official rules for full details. <br></br>Join the Facebook group: "Top Colorado Springs Pool Players - The Ladder of Legends."
             </p>
             <p style={{ color: '#e0e0e0', fontSize: '1.3rem' }}>
               <strong>Player Responsibility:</strong> Players must know the rules before participating.
             </p>
           </div>

                     {/* Brackets */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>🏆 Three Brackets/Ladders</h3>
             <p style={{ color: '#e0e0e0', marginBottom: '10px', fontSize: '1.3rem' }}>
               Players are placed in brackets based on skill levels:
             </p>
            
            <div style={{ 
              background: 'rgba(255, 68, 68, 0.1)', 
              border: '1px solid rgba(255, 68, 68, 0.3)', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '10px' 
            }}>
                             <h4 style={{ color: '#ffc107', margin: '0 0 8px 0', fontSize: '1.6rem' }}>499 and under</h4>
            </div>

            <div style={{ 
              background: 'rgba(255, 193, 7, 0.1)', 
              border: '1px solid rgba(255, 193, 7, 0.3)', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '10px' 
            }}>
                             <h4 style={{ color: '#ffc107', margin: '0 0 8px 0', fontSize: '1.6rem' }}>500-549</h4>
            </div>

            <div style={{ 
              background: 'rgba(0, 255, 0, 0.1)', 
              border: '1px solid rgba(0, 255, 0, 0.3)', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '10px' 
            }}>
                             <h4 style={{ color: '#ffc107', margin: '0 0 8px 0', fontSize: '1.6rem' }}>550+</h4>
            </div>
          </div>

                     {/* Challenge Acceptance */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>📋 Challenge Acceptance</h3>
             <p style={{ color: '#e0e0e0', fontSize: '1.3rem' }}>
               For all match types, players must accept a challenge when called out.
             </p>
           </div>

                     {/* Types of Matches */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>⚔️ Types of Matches</h3>
            
                                      <h4 style={{ color: '#ffc107', marginBottom: '3px', fontSize: '1.6rem' }}>CHALLENGE MATCH:</h4>
             <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
              <li>Players can challenge opponents up to 4 spots above them</li>
              <li>Challenger wins: Players switch positions</li>
              <li>Defender wins: Ladder positions remain unchanged</li>
            </ul>

                                                                <h4 style={{ color: '#ffc107', marginBottom: '3px', fontSize: '1.6rem' }}>SMACKDOWN MATCH:</h4>
              <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
               <li>Any player can call out a "SmackDown"</li>
               <li>Player calls out an opponent no more than 5 spots below them</li>
                               <li>The Challenger <em>(Person calling out the SmackDown)</em> pays the full entry fee; the Defender pays 50% of the entry fee</li>
                               <li><strong>If Challenger Wins:</strong> Opponent moves THREE spots down, challenger moves TWO spots up (but not into first place)</li>
                <li><strong>If Challenger Loses:</strong> Players switch positions</li>
                <li>First place must be earned via a Challenge Match or SmackBack match</li>
             </ul>

                                                                <h4 style={{ color: '#ffc107', marginBottom: '3px', fontSize: '1.6rem' }}>SMACKBACK MATCH:</h4>
              <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
               <li>If the SmackDown defender wins, they can challenge for 1st place in their next match with a SmackBack</li>
                               <li>The Challenger <em>(Person calling out the SmackBack)</em> pays the full entry fee; the Defender pays 50% of the entry fee</li>
                <li><strong>If Challenger Wins:</strong> Moves into 1st place, all other positions move down one spot</li>
                <li><strong>If Defender Wins:</strong> Ladder positions remain unchanged</li>
             </ul>
          </div>

                     {/* Official Rules */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>📜 OFFICIAL RULES</h3>
            
                                      <h4 style={{ color: '#ffc107', marginBottom: '3px', fontSize: '1.6rem' }}>Player Responsibility</h4>
             <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
              <li>Players are responsible for knowing the rules</li>
              <li>Players under 18 require parental approval</li>
              <li>Participation implies agreement to the following rules</li>
            </ul>

                                      <h4 style={{ color: '#ffc107', marginBottom: '3px', fontSize: '1.6rem' }}>Match Scheduling</h4>
             <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
              <li>Matches can be played anyday, any time, at any safe mutually agreed upon location</li>
            </ul>

                                      <h4 style={{ color: '#ffc107', marginBottom: '3px', fontSize: '1.6rem' }}>TOP 5 EXCEPTION</h4>
             <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
              <li>Matches involving top 5 players will be played on SATURDAYS OR SUNDAYS<br></br> At Legends Brews & Cues (2790 Hancock Expwy, Colorado Springs)</li>
              <li>Match start times: Between 2pm-8pm, by mutual agreement</li>
              <li>Top 5 matches will be live-streamed on the Legends Facebook page</li>
              <li>Tables for top 5 matches are open - No Greens Fees</li>
              <li>An admin/TD will be present at top 5 matches to referee and make final decisions on disputes</li>
            </ul>
          </div>

                     {/* Brackets/Minimum Races */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>🏆 Brackets/Minimum Races</h3>
             <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
              <li>Brackets are determined using FargoRate</li>
              <li>If no FargoRate, known skill level equivalent applies</li>
              <li>499 and under = $20 entry fee per match. Race to 5</li>
              <li>500-549 = $25 entry fee per match. Race to 7</li>
              <li>550+ = $50 entry fee per match. Race to 7</li>
              <li>Higher fees/races are allowed by mutual agreement, with exceptions for SmackDown & SmackBack Matches</li>
            </ul>
          </div>

                                {/* Membership & Payment Structure */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>💳 Membership & Payment Structure</h3>
              <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
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
           </div>

                     {/* Winner Takes All */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>💰 Winner Takes All</h3>
             <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
              <li>Entry fees</li>
              <li>Any added sponsor prizes/money (TBD)</li>
              <li>Ladder position</li>
              <li>Bragging rights</li>
            </ul>
          </div>

                     {/* Immunity */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>🛡️ Immunity</h3>
             <p style={{ color: '#e0e0e0', fontSize: '1.3rem' }}>
               Winners receive 7 day immunity from new challenges.
             </p>
           </div>

                     {/* Prize Distribution */}
           <div style={{ marginBottom: '20px' }}>
             <h3 style={{ color: '#ff4444', marginBottom: '5px', fontSize: '1.8rem' }}>🏆 Prize Distribution</h3>
             <ul style={{ color: '#e0e0e0', paddingLeft: '15px', marginBottom: '12px', fontSize: '1.25rem' }}>
               <li><strong>Prize Period:</strong> Every 2 months (6 times per year)</li>
               <li><strong>Separate Prize Pools:</strong> Each ladder (499-under, 500-549, 550+) has its own prize pool</li>
               <li><strong>Prize Split:</strong> 50% to 1st place, 50% to most improved player</li>
               <li><strong>Most Improved:</strong> Player who climbed the most ladder positions during the 2-month period</li>
               <li><strong>Eligibility:</strong> Must have active membership and played at least 1 match during the period</li>
             </ul>
           </div>

                     {/* Contact Information */}
           <div style={{ 
             background: 'rgba(255, 68, 68, 0.1)', 
             border: '1px solid rgba(255, 68, 68, 0.3)', 
             borderRadius: '8px', 
             padding: '12px' 
           }}>
                          <h4 style={{ color: '#ffc107', margin: '0 0 3px 0', fontSize: '1.6rem' }}>📞 Questions?</h4>
             <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1.25rem' }}>
               Join the Facebook group: "Top Colorado Springs Pool Players - The Ladder of Legends" for more information and to participate.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
