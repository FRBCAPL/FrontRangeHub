import React from 'react';

export default function Phase2RulesModal({ isOpen, onClose, isMobile }) {
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
      alignItems: 'center',
      zIndex: 1000,
      padding: '10px'
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
           position: 'relative',
           display: 'flex',
           justifyContent: 'center',
           alignItems: 'center',
           padding: '20px',
           borderBottom: '2px solid #ff4444',
           flexShrink: 0
         }}>
           <h2 style={{
             margin: 0,
             fontSize: isMobile ? '1.2rem' : '1.5rem',
             color: '#ffffff',
             fontWeight: 'bold',
             display: 'flex',
             alignItems: 'center',
             gap: '10px',
             textAlign: 'center'
           }}>
             ⚔️ Phase 2 Challenge Rules
           </h2>
           <button
             onClick={onClose}
             style={{
               position: 'absolute',
               right: '20px',
               top: '50%',
               transform: 'translateY(-50%)',
               background: 'none',
               border: 'none',
               color: '#ffffff',
               fontSize: '2rem',
               cursor: 'pointer',
               padding: '5px',
               borderRadius: '50%',
               width: '40px',
               height: '40px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               transition: 'background-color 0.2s ease'
             }}
             onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
             onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
           >
             ×
           </button>
         </div>

                 {/* Scrollable Content */}
         <div style={{
           flex: 1,
           overflowY: 'auto',
           padding: '25px',
                     fontSize: isMobile ? '1rem' : '1.1rem',
           lineHeight: '1.6'
        }}>
          
                     {/* Overview */}
           <div style={{ marginBottom: '30px' }}>
             <h3 style={{
               color: '#ff4444',
               fontSize: isMobile ? '1.2rem' : '1.4rem',
               marginBottom: '12px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px'
             }}>
               🎯 Overview
             </h3>
            <p style={{ margin: '0 0 15px 0', color: '#e0e0e0' }}>
              Phase 2 is the challenge phase where players compete against each other based on standings from Phase 1.</p> 
              <p>You must complete 2-4 total matches during this phase, as either a challenger or defender.
            </p>
          </div>

                     {/* Match Requirements */}
           <div style={{ marginBottom: '30px' }}>
             <h3 style={{
               color: '#ff4444',
               fontSize: isMobile ? '1.2rem' : '1.4rem',
               marginBottom: '12px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px'
             }}>
               📊 Match Requirements
             </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0'
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Total Matches:</strong> 2-4 matches (minimum 2, maximum 4)
              </li>
              <li style={{ marginBottom: '8px' }}>
                <p><strong>Defenses:</strong> If challenged, at least 2 defensive matches are required(you may accept more voluntarily). </p>
                <li><p>If not challenged no defensive matches are required.</p></li>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Weekly Limit:</strong> Only 1 match per week (as challenger or defender)
              </li>
            </ul>
          </div>

                     {/* Challenge Limits */}
           <div style={{ marginBottom: '30px' }}>
             <h3 style={{
               color: '#ff4444',
               fontSize: isMobile ? '1.2rem' : '1.4rem',
               marginBottom: '12px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px'
             }}>
               ⚔️ Dynamic Challenge Limits
             </h3>
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <p style={{ margin: '0 0 10px 0', color: '#ffc107', fontWeight: 'bold' }}>
                Your challenge limit depends on how many times you've been challenged:
              </p>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                color: '#e0e0e0'
              }}>
                <li style={{ marginBottom: '5px' }}>
                  <strong>0 times challenged:</strong> You can issue 4 challenges
                </li>
                <li style={{ marginBottom: '5px' }}>
                  <strong>1 time challenged:</strong> You can issue 3 challenges
                </li>
                <li style={{ marginBottom: '5px' }}>
                  <strong>2 times challenged:</strong> You can issue 2 challenges
                </li>
              </ul>
            </div>
          </div>

                     {/* Challenge Rules */}
           <div style={{ marginBottom: '30px' }}>
             <h3 style={{
               color: '#ff4444',
               fontSize: isMobile ? '1.2rem' : '1.4rem',
               marginBottom: '12px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px'
             }}>
               🎯 Challenge Rules
             </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0'
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Standings Limit:</strong> You can challenge players ranked up to 4 spots higher than you.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>One Challenge:</strong> You may challenge the same opponent only once.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Rematch Rule:</strong> If you lose a challenge as a defender, you may issue a rematch (if both remain eligible). 
                Opponent is not required to accept the rematch if they have played the required 2 defensive matches.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Defense Priority:</strong> If you receive multiple challenges in the same week, the lowest-ranked challenger has priority.
              </li>
            </ul>
          </div>

                     {/* Defense Rules */}
           <div style={{ marginBottom: '30px' }}>
             <h3 style={{
               color: '#ff4444',
               fontSize: isMobile ? '1.2rem' : '1.4rem',
               marginBottom: '12px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px'
             }}>
               🛡️ Defense Rules
             </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0'
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Required Defenses:</strong> You must accept challenges until you've played at least 2 matches as a defender.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Defense Limit:</strong> No player may be required to defend more than 2 times.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Voluntary Defenses:</strong> You may accept additional defenses beyond the required 2.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Declining Challenges:</strong> After 2 defenses, declining further challenges is not a forfeit
              </li>
            </ul>
          </div>

          {/* Important Notes */}
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '20px'
          }}>
            <h4 style={{
              color: '#ff4444',
              fontSize: isMobile ? '1rem' : '1.1rem',
              margin: '0 0 10px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ Important Notes
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0',
              fontSize: isMobile ? '0.85rem' : '0.9rem'
            }}>
              <li style={{ marginBottom: '5px' }}>
                All challenges and responses must be recorded in the League Scheduling Hub
              </li>
              <li style={{ marginBottom: '5px' }}>
                Any attempt to exploit rules or collude will be treated as a sportsmanship violation
              </li>
              <li style={{ marginBottom: '5px' }}>
                Once you complete 4 matches, you may not accept or issue further challenges
              </li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #ff4444, #cc3333)',
              border: 'none',
              color: '#ffffff',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: 'bold',
              padding: isMobile ? '10px 20px' : '12px 25px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            }}
          >
            Got It! ✓
          </button>
        </div>
      </div>
    </div>
  );
}
