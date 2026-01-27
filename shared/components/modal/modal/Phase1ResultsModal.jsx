import React from 'react';

export default function Phase1ResultsModal({ 
  isOpen, 
  onClose, 
  phase1Stats, 
  playerName, 
  playerLastName,
  isMobile 
}) {
  if (!isOpen || !phase1Stats) return null;

  const fullPlayerName = `${playerName} ${playerLastName}`;

  return (
         <div style={{
       position: 'fixed',
       top: 0,
       left: 0,
       right: 0,
       bottom: 0,
       backgroundColor: 'rgba(0, 0, 0, 0.8)',
       display: 'flex',
       alignItems: 'flex-start',
       justifyContent: 'center',
       zIndex: 1000,
       padding: isMobile ? '10px' : '20px',
       overflowY: 'auto'
     }}
    onClick={onClose}
    >
             <div style={{
         background: `linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))`,
         border: '3px solid #ff4444',
         borderRadius: isMobile ? '12px' : '16px',
         padding: isMobile ? '20px' : '30px',
         maxWidth: isMobile ? '90vw' : '500px',
         width: '100%',
         maxHeight: isMobile ? '80vh' : '70vh',
         overflowY: 'auto',
         boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
         backdropFilter: 'blur(5px)',
         position: 'relative',
         marginTop: isMobile ? '20px' : '40px',
         marginBottom: isMobile ? '20px' : '40px'
       }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? '10px' : '15px',
            right: isMobile ? '10px' : '15px',
            background: 'linear-gradient(135deg, #ff4444, #cc3333)',
            border: '3px solid #ffffff',
            color: '#ffffff',
            fontSize: isMobile ? '1.2rem' : '1.5rem',
            fontWeight: 'bold',
            width: isMobile ? '35px' : '40px',
            height: isMobile ? '35px' : '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #ff6666, #dd4444)';
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.7)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #ff4444, #cc3333)';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? '20px' : '25px'
        }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: isMobile ? '1.2rem' : '1.5rem',
            fontWeight: 'bold',
            margin: '0 0 5px 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}>
            📊 Phase 1 Results
          </h2>
          <div style={{
            color: '#e0e0e0',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontStyle: 'italic'
          }}>
            {fullPlayerName}
          </div>
        </div>

        {/* Main Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: isMobile ? '12px' : '16px',
          marginBottom: isMobile ? '20px' : '25px'
        }}>
          {/* Win/Loss Record */}
          <div style={{
            padding: isMobile ? '15px' : '20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isMobile ? '0.8rem' : '1rem',
              color: '#e0e0e0',
              marginBottom: '8px',
              fontWeight: 'bold'
            }}>
              Record
            </div>
            <div style={{
              fontSize: isMobile ? '1.5rem' : '2rem',
              color: '#ffffff',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              marginBottom: '5px'
            }}>
              {phase1Stats.wins}-{phase1Stats.losses}
            </div>
            <div style={{
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              color: '#e0e0e0',
              fontStyle: 'italic'
            }}>
              {phase1Stats.winRate}% Win Rate
            </div>
          </div>

          {/* Final Position */}
          <div style={{
            padding: isMobile ? '15px' : '20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isMobile ? '0.8rem' : '1rem',
              color: '#e0e0e0',
              marginBottom: '8px',
              fontWeight: 'bold'
            }}>
              Final Position
            </div>
            <div style={{
              fontSize: isMobile ? '1.5rem' : '2rem',
              color: '#ffffff',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              marginBottom: '5px'
            }}>
              {phase1Stats.position}
            </div>
            <div style={{
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              color: '#e0e0e0',
              fontStyle: 'italic'
            }}>
              in Division
            </div>
          </div>

          {/* Total Matches */}
          <div style={{
            padding: isMobile ? '15px' : '20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isMobile ? '0.8rem' : '1rem',
              color: '#e0e0e0',
              marginBottom: '8px',
              fontWeight: 'bold'
            }}>
              Matches Played
            </div>
            <div style={{
              fontSize: isMobile ? '1.5rem' : '2rem',
              color: '#ffffff',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              marginBottom: '5px'
            }}>
              {phase1Stats.totalMatches}
            </div>
            <div style={{
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              color: '#e0e0e0',
              fontStyle: 'italic'
            }}>
              Total Games
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          padding: isMobile ? '15px' : '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: isMobile ? '15px' : '20px'
        }}>
          <h3 style={{
            color: '#ffffff',
            fontSize: isMobile ? '1rem' : '1.2rem',
            margin: '0 0 10px 0',
            textAlign: 'center',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}>
            Performance Summary
          </h3>
          <div style={{
            color: '#e0e0e0',
            fontSize: isMobile ? '0.85rem' : '1rem',
            lineHeight: '1.5',
            textAlign: 'center'
          }}>
            {phase1Stats.totalMatches === 0 ? (
              <div>No matches completed in Phase 1</div>
            ) : (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Win Rate:</strong> {phase1Stats.winRate}% ({phase1Stats.wins} wins, {phase1Stats.losses} losses)
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Final Standing:</strong> {phase1Stats.position} place
                </div>
                <div>
                  <strong>Total Matches:</strong> {phase1Stats.totalMatches} games played
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phase 2 Qualification */}
        <div style={{
          background: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '8px',
          padding: isMobile ? '15px' : '20px',
          border: '2px solid rgba(255, 68, 68, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{
            color: '#ff4444',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: 'bold',
            marginBottom: '5px'
          }}>
            🏆 Phase 2 Qualified
          </div>
          <div style={{
            color: '#e0e0e0',
            fontSize: isMobile ? '0.8rem' : '0.9rem'
          }}>
            Ready for challenge matches and defenses
          </div>
        </div>
      </div>
    </div>
  );
}
