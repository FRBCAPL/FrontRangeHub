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
  const playerStatusForHeader = !isPublicView && getPlayerStatus ? getPlayerStatus(selectedPlayerForStats) : null;
  const getLadderLabel = (name) => {
    if (name === '499-under') return '499 & Under';
    if (name === '500-549') return '500-549';
    if (name === '550-plus') return '550+';
    return name || '';
  };
  
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
        zIndex: 1000000,
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
          maxHeight: 'calc(100vh - 80px)',
          height: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
        <div className="player-stats-header" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '14px 20px 12px' }}>
          <div style={{ flex: 1 }} />
          <h3 style={{ margin: 0, flex: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {isPublicView ? (
              `${selectedPlayerForStats.firstName} ${selectedPlayerForStats.lastName ? selectedPlayerForStats.lastName.charAt(0) + '.' : ''}`
            ) : (
              `${selectedPlayerForStats.firstName} ${selectedPlayerForStats.lastName}`
            )}
          </h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '44px' }}>
            {playerStatusForHeader && (
              <span className="stat-value status" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px' }}>
                <span className={playerStatusForHeader.className}>{playerStatusForHeader.text}</span>
              </span>
            )}
            {!isPublicView && (selectedPlayerForStats?.ladderName || safePlayerData?.ladderName) && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                {getLadderLabel(selectedPlayerForStats?.ladderName || safePlayerData?.ladderName)}
              </span>
            )}
          </div>
          <button 
            className="stats-close-btn"
            onClick={() => setShowMobilePlayerStats(false)}
          >
            ×
          </button>
        </div>

        {/* Claim Button - Show only if position is unclaimed (placeholder email) */}
        {isPublicView && selectedPlayerForStats?.needsClaim && (
          <div style={{ 
            padding: '0 20px 15px 20px',
            textAlign: 'center',
            flexShrink: 0
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
        
        <div className="player-stats-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px', padding: '14px 20px 16px' }}>
          {/* 1. Stats badges - 2 column grid */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
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
            {safePlayerData.immunityUntil && new Date(safePlayerData.immunityUntil) > new Date() && (
              <div className="stat-item" style={{ gridColumn: '1 / -1' }}>
                <div className="stat-label">Immunity Until</div>
                <div className="stat-value">
                  {formatDateForDisplay(safePlayerData.immunityUntil)}
                </div>
              </div>
            )}
          </div>

          {/* 2. Challenge status and Availability - full width */}
          {!isPublicView && userLadderData && getChallengeReason && (
            <div style={{ marginBottom: '10px' }}>
              <div className="player-stats-challenge-section" style={{
                marginBottom: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center'
              }}>
                <div className="stat-label" style={{ marginBottom: '4px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Challenge Status
                </div>
                <div className="stat-value" style={{ fontSize: '0.85rem', color: '#e0e0e0', lineHeight: '1.35' }}>
                  {getChallengeReason(userLadderData, selectedPlayerForStats)}
                </div>
              </div>
              {selectedPlayerForStats?.email && selectedPlayerForStats?.userId && (
                <div className="player-stats-availability-section" style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center'
                }}>
                  <div className="stat-label" style={{ marginBottom: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Availability & locations
                  </div>
                  <OpponentAvailabilityPanel 
                    opponent={selectedPlayerForStats} 
                    opponentLabel={`${selectedPlayerForStats.firstName || ''} ${selectedPlayerForStats.lastName || ''}`.trim()} 
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. Match History - unified layout for all entries */}
          <div style={{ width: '100%' }}>
            <div className="stat-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="stat-label" style={{ marginBottom: '6px', fontSize: '0.85rem' }}>Match History</div>
              <div className="stat-value" style={{ width: '100%', fontSize: '0.9rem' }}>
                {isPublicView ? (
                  <div style={{ textAlign: 'center', padding: '20px 8px', color: '#ffaa00', fontSize: '12px', fontStyle: 'italic' }}>
                    Must be a ladder member to see full match history
                  </div>
                ) : transformedMatchHistory.length > 0 ? (
                  <div className="match-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {transformedMatchHistory.slice(0, 2).map((match, index) => {
                      const opponentDisplay = isPublicView && match.opponentName
                        ? (() => {
                            const parts = match.opponentName.split(' ');
                            return parts.length >= 2 ? parts[0] + ' ' + parts[1].charAt(0) + '.' : match.opponentName;
                          })()
                        : match.opponentName;
                      const matchTypeLabel = match.matchType === 'challenge' ? 'Challenge' :
                        match.matchType === 'ladder-jump' ? 'Ladder Jump' :
                        match.matchType === 'smackdown' ? 'SmackDown' :
                        match.matchType === 'smackback' ? 'SmackBack' :
                        match.matchType === 'fast-track' ? 'Fast Track' : match.matchType;
                      return (
                        <div
                          key={index}
                          className="match-history-item"
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`match-result ${match.result === 'W' ? 'win' : 'loss'}`} style={{
                              minWidth: '20px',
                              height: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}>
                              {match.result === 'W' ? 'W' : 'L'}
                            </span>
                            <span style={{ color: '#e0e0e0', fontWeight: 500 }}>
                              vs {opponentDisplay}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.8rem', marginLeft: 'auto' }}>
                              {formatDateForDisplay(match.matchDate)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#888', paddingLeft: '28px' }}>
                            {match.score} · {matchTypeLabel} · {formatDateTimeForDisplay(match.matchDate)}
                          </div>
                        </div>
                      );
                    })}
                    {transformedMatchHistory.length > 2 && (
                      <div style={{ textAlign: 'center', padding: '2px 0' }}>
                        <button
                          onClick={() => {
                            setShowMobilePlayerStats(false);
                            setTimeout(() => setShowFullMatchHistory(true), 100);
                          }}
                          style={{
                            background: 'rgba(255, 68, 68, 0.2)',
                            border: '1px solid #ff4444',
                            color: '#ff4444',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          Show More ({transformedMatchHistory.length - 2} more)
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="no-match">No recent matches</span>
                )}
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
