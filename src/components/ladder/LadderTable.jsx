import React, { memo, useState, useEffect } from 'react';
import { formatDateForDisplay } from '../../utils/dateUtils';
import MobileLadderModal from './MobileLadderModal';

const LadderTable = memo(({
  ladderData,
  isPublicView,
  userLadderData,
  canChallengePlayer,
  getChallengeType,
  getChallengeReason,
  handleChallengePlayer,
  handlePlayerClick,
  getPlayerStatus,
  isPositionClaimed,
  selectedLadder
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show mobile modal on mobile devices
  if (isMobile) {
    return (
      <MobileLadderModal
        isOpen={true}
        onClose={() => {}} // No close functionality needed since it's not a modal in this context
        players={ladderData}
        selectedLadder={selectedLadder}
        isPublicView={isPublicView}
        userLadderData={userLadderData}
        getChallengeReason={getChallengeReason}
        onPlayerClick={handlePlayerClick}
        handleChallengePlayer={handleChallengePlayer}
        getChallengeType={getChallengeType}
      />
    );
  }

  return (
    <div className="ladder-table-modal" style={isPublicView ? { width: '100%', maxWidth: 'none', minWidth: '100%', padding: '0', margin: '0', boxSizing: 'border-box', border: '0' } : {}}>
      <div className={`ladder-table ${!isPublicView ? 'logged-in-view' : ''}`} style={isPublicView ? { position: 'relative', width: '100%', maxWidth: 'none', minWidth: '100%', overflowX: 'hidden', overflowY: 'visible', boxSizing: 'border-box', border: '0' } : { position: 'relative' }}>
        <div className="table-header" style={isPublicView ? { width: '100%', maxWidth: 'none', minWidth: '100%', border: '0' } : {}}>
          <div className="header-cell">Rank</div>
          <div className="header-cell">Player</div>
          <div className="header-cell">Fargo</div>
          {isPublicView ? (
            window.innerWidth <= 768 ? (
              <div className="header-cell">W/L</div>
            ) : (
              <>
                <div className="header-cell">W</div>
                <div className="header-cell">L</div>
              </>
            )
          ) : (
            window.innerWidth <= 768 ? (
              <div className="header-cell">W/L</div>
            ) : (
              <>
                <div className="header-cell">W</div>
                <div className="header-cell">L</div>
              </>
            )
          )}
          {isPublicView && window.innerWidth > 768 ? (
            <div className="header-cell">Last Match</div>
          ) : isPublicView && window.innerWidth <= 768 ? (
             <div className="header-cell">Last Match</div>
          ) : (
            <div className="header-cell">Status</div>
          )}
          {!isPublicView && <div className="header-cell">Fargo Reported</div>}
          {!isPublicView && <div className="header-cell last-match-header" style={{ whiteSpace: window.innerWidth <= 768 ? 'normal' : 'nowrap', wordBreak: 'keep-all', justifyContent: 'flex-start', textAlign: 'left', paddingLeft: '30px' }}>Last Match</div>}
        </div>
        
        
        {ladderData.map((player, index) => (
          <div key={player._id || index} className={`table-row ${player.lastMatch && player.lastMatch.opponent ? 'has-last-match' : ''}`} style={isPublicView ? { width: '100%', maxWidth: 'none', minWidth: '100%' } : {}}>
            <div className="table-cell rank">#{player.position}</div>
            <div className="table-cell name">
              <div 
                className="player-name-clickable"
                onClick={() => handlePlayerClick(player)}
              >
                {(() => {
                  const firstName = player.firstName || '';
                  const lastName = player.lastName || '';
                  
                  if (isPublicView) {
                    // Public view: show only last initial, but keep full first name
                    const lastNameInitial = lastName ? lastName.charAt(0) + '.' : '';
                    return firstName + ' ' + lastNameInitial;
                  } else {
                    // Logged-in view: show full last name on PC, last initial on mobile
                    if (window.innerWidth > 768) {
                      // PC version: show full last name
                      return firstName + ' ' + lastName;
                    } else {
                      // Mobile version: show last initial
                      const lastNameInitial = lastName ? lastName.charAt(0) + '.' : '';
                      return firstName + ' ' + lastNameInitial;
                    }
                  }
                })()}
                {!isPublicView && !player.unifiedAccount?.hasUnifiedAccount && <span className="no-account">*</span>}
              </div>
              
              {/* Show claimed status for positions that have been claimed (only when not in public view) */}
              {!isPublicView && isPositionClaimed({
                ladder: selectedLadder,
                position: player.position
              }) && (
                <div style={{
                  display: 'inline-block',
                  width: 'fit-content',
                  flexShrink: '0'
                }}>
                  <div style={{
                    background: '#4CAF50',
                    color: 'white',
                    borderRadius: '1px',
                    padding: '0px',
                    fontSize: '0.6rem',
                    marginTop: '0px',
                    fontWeight: '400',
                    textAlign: 'center',
                    height: '12px',
                    lineHeight: '12px',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    width: '45px',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}>
                    ✅ Claimed
                  </div>
                </div>
              )}
              
              {(() => {
                console.log('🔍 LadderTable: userLadderData?.canChallenge check:', userLadderData?.canChallenge, 'for player:', player.firstName);
                console.log('🔍 LadderTable: selectedLadder:', selectedLadder, 'userLadderData.ladder:', userLadderData?.ladder);
                
                // Only show challenge buttons if user is on the same ladder they're viewing
                const isOnCorrectLadder = userLadderData?.ladder === selectedLadder;
                const canShowChallenges = userLadderData?.canChallenge && isOnCorrectLadder;
                
                console.log('🔍 LadderTable: isOnCorrectLadder:', isOnCorrectLadder, 'canShowChallenges:', canShowChallenges);
                
                return canShowChallenges;
              })() && (
                <div style={{ marginTop: '4px' }}>
                  {(() => {
                    console.log('🔍 LadderTable: Checking challenge for', userLadderData.firstName, 'vs', player.firstName, 'canChallenge:', userLadderData.canChallenge);
                    const challengeType = getChallengeType(userLadderData, player);
                    console.log('🔍 LadderTable: Challenge type result:', challengeType);
                    if (challengeType) {
                      return (
                        <button
                          className="challenge-btn-small"
                          onClick={() => handleChallengePlayer(player, challengeType)}
                          style={{
                            background: challengeType === 'challenge' ? '#ff4444' : 
                                       challengeType === 'smackdown' ? '#f59e0b' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            padding: '0px !important',
                            fontSize: '1rem !important',
                            cursor: 'pointer',
                            minWidth: 'auto !important',
                            width: 'auto !important',
                            height: '20px !important',
                            lineHeight: '20px !important',
                            maxHeight: '20px !important',
                            minHeight: '20px !important',
                            margin: '0 !important'
                          }}
                        >
                          {challengeType === 'challenge' ? 'Challenge' : 
                           challengeType === 'smackdown' ? 'SmackDown' : 'SmackBack'}
                        </button>
                      );
                     } else {
                       return (
                        <div 
                          className="challenge-reason-hover" 
                          style={{
                            fontSize: '1.2rem',
                            color: '#888',
                            marginTop: '2px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            padding: '4px 8px',
                            borderRadius: '50%',
                            border: '1px solid #888',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          title={getChallengeReason(userLadderData, player)}
                          onClick={(e) => {
                            // Create and show custom popup
                            const popup = document.createElement('div');
                            popup.style.cssText = `
                              position: fixed;
                              top: 50%;
                              left: 50%;
                              transform: translate(-50%, -50%);
                              background: rgba(10, 10, 20, 0.95);
                              color: white;
                              padding: 40px 50px 40px 40px;
                              border-radius: 8px;
                              border: 2px solid #6B46C1;
                              box-shadow: 0 8px 32px rgba(107, 70, 193, 0.4);
                              z-index: 10000;
                              max-width: 500px;
                              min-width: 400px;
                              font-size: 14px;
                              line-height: 1.4;
                              text-align: center;
                            `;
                            popup.innerHTML = `<div style="margin-top: 15px;">${getChallengeReason(userLadderData, player)}</div>`;
                            
                            // Add backdrop
                            const backdrop = document.createElement('div');
                            backdrop.style.cssText = `
                              position: fixed;
                              top: 0;
                              left: 0;
                              width: 100%;
                              height: 100%;
                              background: rgba(0, 0, 0, 0.5);
                              z-index: 9999;
                              cursor: pointer;
                            `;
                            
                            // Close function
                            const closePopup = () => {
                              document.body.removeChild(backdrop);
                              document.body.removeChild(popup);
                            };
                            
                            // Add event listeners
                            backdrop.addEventListener('click', closePopup);
                            popup.addEventListener('click', (e) => e.stopPropagation());
                            
                            // Add close button
                            const closeBtn = document.createElement('button');
                            closeBtn.textContent = '×';
                            closeBtn.style.cssText = `
                              position: absolute;
                              top: 8px;
                              right: 12px;
                              background: rgba(255, 255, 255, 0.1);
                              border: 1px solid rgba(255, 255, 255, 0.3);
                              color: white;
                              font-size: 18px;
                              font-weight: bold;
                              cursor: pointer;
                              padding: 4px 8px;
                              width: 30px;
                              height: 30px;
                              border-radius: 50%;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              transition: all 0.2s ease;
                              z-index: 10001;
                            `;
                            
                            // Add hover effect for close button
                            closeBtn.addEventListener('mouseenter', () => {
                              closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                              closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                            });
                            
                            closeBtn.addEventListener('mouseleave', () => {
                              closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                              closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            });
                            closeBtn.addEventListener('click', closePopup);
                            popup.appendChild(closeBtn);
                            
                            // Add to DOM
                            document.body.appendChild(backdrop);
                            document.body.appendChild(popup);
                            
                            // Auto close after 5 seconds
                            setTimeout(closePopup, 5000);
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#333';
                            e.target.style.color = '#fff';
                            e.target.style.borderColor = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#888';
                            e.target.style.borderColor = '#888';
                          }}
                        >
                          ?
                        </div>
                       );
                     }
                  })()}
                </div>
              )}
            </div>
            <div className="table-cell fargo-rate">{player.fargoRate || 'N/A'}</div>
            {isPublicView ? (
              window.innerWidth <= 768 ? (
                <div className="table-cell wins-losses-combined" style={{ 
                  transform: 'translateX(-5px)', 
                  marginLeft: '8px', 
                  paddingLeft: '8px',
                  position: 'relative',
                  textAlign: 'center'
                }}>{player.wins || 0}/{player.losses || 0}</div>
              ) : (
                <>
                  <div className="table-cell wins">{player.wins || 0}</div>
                  <div className="table-cell losses">{player.losses || 0}</div>
                </>
              )
            ) : (
              window.innerWidth <= 768 ? (
                <div className="table-cell wins-losses-combined" style={{ 
                  transform: 'translateX(-5px)', 
                  marginLeft: '8px', 
                  paddingLeft: '8px',
                  position: 'relative',
                  textAlign: 'center'
                }}>{player.wins || 0}/{player.losses || 0}</div>
              ) : (
                <>
                  <div className="table-cell wins">{player.wins || 0}</div>
                  <div className="table-cell losses">{player.losses || 0}</div>
                </>
              )
            )}
            {isPublicView && window.innerWidth > 768 ? (
              <div className="table-cell last-match">
                {player.lastMatch ? (
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: player.lastMatch.result === 'W' ? '#4CAF50' : '#f44336' }}>
                    {player.lastMatch.result === 'W' ? '' : ''} {
                      isPublicView ? 
                        (() => {
                          const parts = player.lastMatch.opponent.split(' ');
                          if (parts.length >= 2) {
                            return parts[0] + ' ' + parts[1].charAt(0) + '.';
                          }
                          return player.lastMatch.opponent;
                        })() :
                        player.lastMatch.opponent
                    }
                  </div>
                ) : (
                  <span style={{ color: '#999', fontSize: '0.9rem' }}>No matches</span>
                )}
              </div>
             ) : isPublicView && window.innerWidth <= 768 ? (
               <div className="table-cell last-match-mobile" style={{
                 padding: '0 3px',
                 fontSize: '0.6rem',
                 whiteSpace: 'nowrap',
                 overflow: 'hidden',
                 textOverflow: 'ellipsis',
                 maxWidth: '100%'
               }}>
                 {player.lastMatch && player.lastMatch.opponent ? (
                   <div className="last-match-mobile-details" style={{
                     whiteSpace: 'nowrap',
                     overflow: 'hidden',
                     textOverflow: 'ellipsis',
                     maxWidth: '100%'
                   }}>
                     <div className="last-match-result-mobile" style={{
                       fontWeight: 'bold',
                       color: player.lastMatch.result === 'W' ? '#4CAF50' : '#f44336',
                       fontSize: '0.6rem',
                       whiteSpace: 'nowrap',
                       overflow: 'hidden',
                       textOverflow: 'ellipsis',
                       maxWidth: '100%'
                     }}>
                       {player.lastMatch.result === 'W' ? 'W' : 'L'} vs {
                         isPublicView ?
                           (() => {
                             const parts = player.lastMatch.opponent.split(' ');
                             if (parts.length >= 2) {
                               return parts[0] + ' ' + parts[1].charAt(0) + '.';
                             }
                             return player.lastMatch.opponent;
                           })() :
                           player.lastMatch.opponent
                       }
                     </div>
                   </div>
                 ) : (
                   <span className="no-matches-mobile" style={{ 
                     color: '#999', 
                     fontSize: '0.7rem' 
                   }}>No matches</span>
                 )}
               </div>
            ) : (
              <div className="table-cell status">
                {(() => {
                  const playerStatus = getPlayerStatus(player);
                  return <span className={playerStatus.className}>{playerStatus.text}</span>;
                })()}
              </div>
            )}
            {!isPublicView && (
              <div className="table-cell bca-status">
                {player.sanctioned && player.sanctionYear === new Date().getFullYear() ? (
                  <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓</span>
                ) : (
                  <span style={{ color: '#f44336', fontWeight: 'bold' }}>✗</span>
                )}
              </div>
            )}
            {!isPublicView && (
              <div className="table-cell last-match">
                {player.lastMatch ? (
                  <div style={{ fontSize: '1.0rem', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold', color: player.lastMatch.result === 'W' ? '#4CAF50' : '#f44336' }}>
                      {player.lastMatch.result === 'W' ? '' : ''} {
                        window.innerWidth <= 768 ? 
                          (() => {
                            const parts = player.lastMatch.opponent.split(' ');
                            if (parts.length >= 2) {
                              return parts[0] + ' ' + parts[1].charAt(0) + '.';
                            }
                            return player.lastMatch.opponent;
                          })() :
                          player.lastMatch.opponent
                      }
                    </div>
                    <div style={{ color: '#666', fontSize: '0.7rem' }}>
                      {formatDateForDisplay(player.lastMatch.date)}
                    </div>
                    {player.lastMatch.venue && (
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>
                        {player.lastMatch.venue}
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#999', fontSize: '1.0rem' }}>No matches</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

LadderTable.displayName = 'LadderTable';

export default LadderTable;
