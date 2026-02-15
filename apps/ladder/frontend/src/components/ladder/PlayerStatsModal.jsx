import React, { memo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatDateForDisplay, formatDateTimeForDisplay } from '@shared/utils/utils/dateUtils';
import OpponentAvailabilityPanel from './OpponentAvailabilityPanel.jsx';

const PlayerStatsModal = memo(({
  showMobilePlayerStats,
  selectedPlayerForStats,
  setShowMobilePlayerStats,
  updatedPlayerData,
  lastMatchData,
  playerMatchHistory,
  showFullMatchHistory,
  setShowFullMatchHistory,
  getPlayerStatus,
  fetchUpdatedPlayerData,
  setShowUnifiedSignup,
  isPublicView,
  getChallengeReason,
  userLadderData
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);


  // Move useEffect before the early return to fix hooks order
  useEffect(() => {
    if (showMobilePlayerStats && modalRef.current) {
      const modalWidth = modalRef.current.offsetWidth || 600;
      const modalHeight = modalRef.current.offsetHeight || 400;
      
      setPosition({
        x: (window.innerWidth - modalWidth) / 2,
        y: (window.innerHeight - modalHeight) / 2
      });
    }
  }, [showMobilePlayerStats]);

  // Move drag useEffect before the early return to fix hooks order
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!showMobilePlayerStats || !selectedPlayerForStats) {
    return null;
  }

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.stats-close-btn') || e.target.closest('button')) {
      return; // Don't drag if clicking on buttons
    }
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep modal within viewport bounds
    const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 600);
    const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 400);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  
  // Defensive programming - ensure we have safe data to work with
  const safePlayerData = updatedPlayerData || selectedPlayerForStats;
  
  // Debug logging for immunity date
  console.log('🔍 PlayerStatsModal - safePlayerData.immunityUntil:', safePlayerData?.immunityUntil);
  console.log('🔍 PlayerStatsModal - updatedPlayerData.immunityUntil:', updatedPlayerData?.immunityUntil);
  console.log('🔍 PlayerStatsModal - selectedPlayerForStats.immunityUntil:', selectedPlayerForStats?.immunityUntil);
  const safeLastMatchData = lastMatchData || null;
  const safeMatchHistory = playerMatchHistory || [];
  
  // Transform lastMatch data to match expected format
  const transformedLastMatch = safeLastMatchData ? {
    result: safeLastMatchData.result,
    opponentName: safeLastMatchData.opponent,
    matchDate: safeLastMatchData.date,
    venue: safeLastMatchData.venue,
    matchType: safeLastMatchData.matchType || 'challenge',
    playerRole: safeLastMatchData.playerRole || 'player',
    score: safeLastMatchData.score || 'N/A'
  } : null;
  
  // Transform match history data to match expected format
  // Don't filter out the last match - just show all matches in chronological order
  const transformedMatchHistory = safeMatchHistory.map(match => ({
    result: match.result,
    opponentName: match.opponent,
    matchDate: match.date,
    venue: match.venue,
    matchType: match.matchType || 'challenge',
    playerRole: match.playerRole || 'player',
    score: match.score || 'N/A'
  }));
  
  console.log('🔍 PlayerStatsModal - safeMatchHistory:', safeMatchHistory);
  console.log('🔍 PlayerStatsModal - safeMatchHistory length:', safeMatchHistory.length);
  console.log('🔍 PlayerStatsModal - transformedMatchHistory:', transformedMatchHistory);
  console.log('🔍 PlayerStatsModal - transformedMatchHistory.length:', transformedMatchHistory.length);

  const modalContent = (
    <div 
      className="player-stats-modal"
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(5px)',
        padding: '56px 10px 10px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transform: 'none',
        margin: '0',
        inset: '0',
        willChange: 'auto'
      }}
    >
      <div 
        ref={modalRef}
        className="player-stats-content"
        style={{
          background: 'rgba(35, 35, 42, 0.16)',
          borderRadius: '18px',
          maxWidth: '95vw',
          width: window.innerWidth <= 768 ? '320px' : '600px',
          maxHeight: '85vh',
          overflowY: 'auto',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 32px #e53e3e22, 0 0 16px #e53e3e11',
          boxSizing: 'border-box',
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="player-stats-header">
          <h3>
            {isPublicView ? (
              `${selectedPlayerForStats.firstName} ${selectedPlayerForStats.lastName ? selectedPlayerForStats.lastName.charAt(0) + '.' : ''}`
            ) : (
              `${selectedPlayerForStats.firstName} ${selectedPlayerForStats.lastName}`
            )}
          </h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="stats-close-btn"
              onClick={() => setShowMobilePlayerStats(false)}
            >
              ×
            </button>
          </div>
        </div>

        {/* Claim Button - Show only if position is unclaimed (placeholder email) */}
        {isPublicView && selectedPlayerForStats?.needsClaim && (
          <div style={{ 
            padding: '0 20px 15px 20px',
            textAlign: 'center'
          }}>
            <button
              onClick={() => {
                console.log('🔍 PlayerStatsModal: Green button clicked!');
                console.log('🔍 PlayerStatsModal: setShowUnifiedSignup function:', setShowUnifiedSignup);
                setShowMobilePlayerStats(false); // Close the player stats modal first
                setShowUnifiedSignup(true); // Then open the signup modal
                console.log('🔍 PlayerStatsModal: Called setShowUnifiedSignup(true)');
              }}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: window.innerWidth <= 768 ? '10px 16px' : '12px 24px',
                fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                transition: 'all 0.3s ease',
                width: window.innerWidth <= 768 ? '100%' : 'auto',
                boxSizing: 'border-box'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#45a049';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#4CAF50';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ✅ Claim My Ladder Position
            </button>
            <p style={{ 
              fontSize: window.innerWidth <= 768 ? '10px' : '12px', 
              color: '#888', 
              margin: window.innerWidth <= 768 ? '6px 0 0 0' : '8px 0 0 0',
              fontStyle: 'italic',
              lineHeight: window.innerWidth <= 768 ? '1.3' : 'normal'
            }}>
              Verify your profile details and subscribe for full ladder access
            </p>
          </div>
        )}
        
        <div className="player-stats-body">
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* Left Column - Basic Stats */}
            <div style={{ flex: '1', minWidth: '200px' }}>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Rank</div>
                  <div className="stat-value">#{safePlayerData.position || 'N/A'}</div>
                </div>
                
                {!isPublicView && (
                  <div className="stat-item">
                    <div className="stat-label">FargoRate</div>
                    <div className="stat-value">
                      {safePlayerData.fargoRate === 0 ? "No FargoRate" : (safePlayerData.fargoRate || 'N/A')}
                    </div>
                  </div>
                )}
                
                <div className="stat-item">
                  <div className="stat-label">Wins</div>
                  <div className="stat-value wins">
                    {safePlayerData.wins || 0}
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">Losses</div>
                  <div className="stat-value losses">
                    {safePlayerData.losses || 0}
                  </div>
                </div>
                
                {!isPublicView && (
                  <div className="stat-item">
                    <div className="stat-label">Status</div>
                    <div className="stat-value status">
                      {(() => {
                        const playerStatus = getPlayerStatus(selectedPlayerForStats);
                        return <span className={playerStatus.className}>{playerStatus.text}</span>;
                      })()}
                    </div>
                  </div>
                )}
                
                {safePlayerData.immunityUntil && new Date(safePlayerData.immunityUntil) > new Date() && (
                  <div className="stat-item">
                    <div className="stat-label">Immunity Until</div>
                    <div className="stat-value">
                      {formatDateForDisplay(safePlayerData.immunityUntil)}
                    </div>
                  </div>
                )}
                
                {/* Challenge Explanation - Only show in logged-in view when user can challenge */}
                {!isPublicView && userLadderData && getChallengeReason && (
                  <div className="stat-item">
                    <div className="stat-label">Challenge Status</div>
                    <div className="stat-value" style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: '1.3' }}>
                      {getChallengeReason(userLadderData, selectedPlayerForStats)}
                    </div>
                    {selectedPlayerForStats?.email && selectedPlayerForStats?.userId && (
                      <OpponentAvailabilityPanel 
                        opponent={selectedPlayerForStats} 
                        opponentLabel={`${selectedPlayerForStats.firstName || ''} ${selectedPlayerForStats.lastName || ''}`.trim()} 
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column - Match History */}
            <div style={{ flex: '1', minWidth: '200px' }}>
              <div className="stat-item">
                <div className="stat-value">
                  <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>Last Match</div>
                  {transformedLastMatch ? (
                    <div className="last-match-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', marginBottom: '8px' }}>
                        <div className="match-opponent" style={{ margin: 0, marginRight: 'auto' }}>
                          vs {isPublicView ? 
                            (() => {
                              const parts = transformedLastMatch.opponentName.split(' ');
                              if (parts.length >= 2) {
                                return parts[0] + ' ' + parts[1].charAt(0) + '.';
                              }
                              return transformedLastMatch.opponentName;
                            })() :
                            transformedLastMatch.opponentName
                          }
                        </div>
                        <div className={`match-result ${transformedLastMatch.result === 'W' ? 'win' : 'loss'}`} style={{ 
                          margin: 0, 
                          padding: '4px 8px', 
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '20px',
                          height: '20px',
                          marginLeft: '70px'
                        }}>
                          {transformedLastMatch.result === 'W' ? 'W' : 'L'}
                        </div>
                      </div>
                      {!isPublicView && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div className="match-result">
                            {transformedLastMatch.result === 'W' ? 'Won' : 'Lost'} {transformedLastMatch.score}
                          </div>
                          <div className="match-type">
                            {transformedLastMatch.matchType === 'challenge' ? 'Challenge Match' :
                             transformedLastMatch.matchType === 'ladder-jump' ? 'Ladder Jump' :
                             transformedLastMatch.matchType === 'smackdown' ? 'SmackDown' :
                             transformedLastMatch.matchType === 'smackback' ? 'SmackBack' :
                             transformedLastMatch.matchType === 'fast-track' ? 'Fast Track Challenge' :
                             transformedLastMatch.matchType}
                          </div>
                          <div className="player-role">
                            {transformedLastMatch.playerRole === 'challenger' ? 'Challenger' :
                             transformedLastMatch.playerRole === 'defender' ? 'Defender' :
                             'Player'}
                          </div>
                          <div className="match-date">
                            {formatDateForDisplay(transformedLastMatch.matchDate)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="no-match">No recent matches</span>
                  )}
                </div>
              </div>
              
              {/* Match History Section */}
              <div className="stat-item">
                <div className="stat-label">Match History</div>
                <div className="stat-value">
                  {isPublicView ? (
                    // Public view: Show membership message only
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 8px',
                      color: '#ffaa00',
                      fontSize: '12px',
                      fontStyle: 'italic'
                    }}>
                      Must be a ladder member to see full match history
                    </div>
                  ) : transformedMatchHistory.length > 1 ? (
                    <div className="match-history-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {/* Skip the first match (already shown as Last Match) and show next 2 */}
                      {console.log('🔍 Rendering match history (skipping first):', transformedMatchHistory.slice(1, 3))}
                      {transformedMatchHistory.slice(1, 3).map((match, index) => (
                        <div key={index} className="match-history-item" style={{ 
                          padding: '6px', 
                          borderBottom: '1px solid rgba(255,255,255,0.1)', 
                          fontSize: '11px',
                          marginBottom: '2px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className={`match-result ${match.result === 'W' ? 'win' : 'loss'}`}>
                              {match.result === 'W' ? 'W' : 'L'}
                            </span>
                            <span style={{ color: '#ccc' }}>
                              vs {isPublicView ? 
                                (() => {
                                  const parts = match.opponentName.split(' ');
                                  if (parts.length >= 2) {
                                    return parts[0] + ' ' + parts[1].charAt(0) + '.';
                                  }
                                  return match.opponentName;
                                })() :
                                match.opponentName
                              }
                            </span>
                            <span style={{ color: '#888', fontSize: '10px' }}>
                              {formatDateForDisplay(match.matchDate)}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                            {match.score} • {match.matchType} • {formatDateTimeForDisplay(match.matchDate)}
                          </div>
                        </div>
                      ))}
                      
                      {/* Show More button if there are more than 3 matches (first is last match, showing 2 more) */}
                      {transformedMatchHistory.length > 3 && (
                        <div style={{ textAlign: 'center', padding: '8px' }}>
                          <button 
                            onClick={() => {
                              console.log('🔍 Show More button clicked! Setting showFullMatchHistory to true');
                              console.log('🔍 Current showFullMatchHistory state:', showFullMatchHistory);
                              setShowMobilePlayerStats(false); // Close the player stats modal
                              // Use setTimeout to ensure state updates properly
                              setTimeout(() => {
                                setShowFullMatchHistory(true);
                                console.log('🔍 After setting showFullMatchHistory to true');
                              }, 100);
                            }}
                            style={{
                              background: 'rgba(255, 68, 68, 0.2)',
                              border: '1px solid #ff4444',
                              color: '#ff4444',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            Show More ({transformedMatchHistory.length - 3} more)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="no-match">No previous matches</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Always render directly to document.body to avoid positioning issues
  const portalTarget = document.body;
  
  if (!portalTarget) {
    console.error('🔍 No portal target found, rendering inline');
    return modalContent;
  }
  
  return createPortal(modalContent, portalTarget);
});

PlayerStatsModal.displayName = 'PlayerStatsModal';

export default PlayerStatsModal;
