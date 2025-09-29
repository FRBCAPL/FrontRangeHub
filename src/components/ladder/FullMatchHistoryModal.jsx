import React, { createPortal, memo } from 'react';

const FullMatchHistoryModal = memo(({
  showFullMatchHistory,
  selectedPlayerForStats,
  setShowFullMatchHistory,
  setShowMobilePlayerStats,
  playerMatchHistory,
  isPublicView
}) => {
  if (!showFullMatchHistory || !selectedPlayerForStats) return null;

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
      padding: '20px',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        border: '2px solid #8B5CF6',
        borderRadius: '12px',
        width: 'auto',
        maxWidth: '500px',
        minWidth: '400px',
        maxHeight: '80vh',
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
          <h2 style={{ color: '#ff4444', margin: 0 }}>
            🏆 {selectedPlayerForStats.firstName} {selectedPlayerForStats.lastName} - Full Match History
          </h2>
          <button
            onClick={() => {
              setShowFullMatchHistory(false);
              setShowMobilePlayerStats(true); // Reopen the player stats modal
            }}
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
          padding: '20px'
        }}>
          {playerMatchHistory.length > 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {playerMatchHistory.map((match, index) => {
                console.log('🔍 Match data:', match);
                console.log('🔍 Match location:', match.location);
                console.log('🔍 Match positionBefore:', match.positionBefore);
                console.log('🔍 Match positionAfter:', match.positionAfter);
                console.log('🔍 All match keys:', Object.keys(match));
                console.log('🔍 Match venue (raw):', match.venue);
                console.log('🔍 Match player1OldPosition (raw):', match.player1OldPosition);
                console.log('🔍 Match player1NewPosition (raw):', match.player1NewPosition);
                return (
                <div key={index} style={{
                  padding: '15px',
                  borderBottom: index < playerMatchHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  {/* Left Column - WIN/LOSS Result */}
                  <div style={{ minWidth: '60px' }}>
                    <span style={{
                      background: match.result === 'W' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: match.result === 'W' ? '#22c55e' : '#ef4444',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'block',
                      textAlign: 'center'
                    }}>
                      {match.result === 'W' ? 'WIN' : 'LOSS'}
                    </span>
                  </div>
                  
                  {/* Second Column - Opponent Name */}
                  <div style={{ minWidth: '120px' }}>
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>
                      vs {match.opponentName}
                    </div>
                  </div>
                  
                  {/* Third Column - Match Details */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ color: '#ccc', fontSize: '15px', marginBottom: '3px' }}>
                      {match.score} • {match.matchType} • {match.playerRole}
                    </div>
                    <div style={{ color: '#999', fontSize: '13px' }}>
                      {match.location || 'Location TBD'} • Pos {match.positionBefore || '?'} → {match.positionAfter || '?'}
                    </div>
                  </div>
                  
                  {/* Right Column - Date */}
                  <div style={{ minWidth: '80px', textAlign: 'right' }}>
                    <div style={{ color: '#888', fontSize: '12px' }}>
                      {new Date(match.matchDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#ccc',
              padding: '40px',
              fontSize: '16px'
            }}>
              No completed matches found
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // For public view (embedded), render inline; for regular view, use portal
  if (isPublicView) {
    return modalContent;
  } else {
    return createPortal(modalContent, document.body);
  }
});

FullMatchHistoryModal.displayName = 'FullMatchHistoryModal';

export default FullMatchHistoryModal;
