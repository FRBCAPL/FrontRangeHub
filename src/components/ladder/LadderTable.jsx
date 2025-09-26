import React, { memo } from 'react';
import { formatDateForDisplay } from '../../utils/dateUtils';

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
  return (
    <div className="ladder-table-modal" style={isPublicView ? { width: '100%', maxWidth: 'none', minWidth: '100%', padding: '0', margin: '0', boxSizing: 'border-box', border: '0' } : {}}>
      <div className={`ladder-table ${!isPublicView ? 'logged-in-view' : ''}`} style={isPublicView ? { position: 'relative', width: '100%', maxWidth: 'none', minWidth: '100%', overflowX: 'hidden', overflowY: 'visible', boxSizing: 'border-box', border: '0' } : { position: 'relative' }}>
        <div className="table-header" style={isPublicView ? { width: '100%', maxWidth: 'none', minWidth: '100%', border: '0' } : {}}>
          <div className="header-cell">Rank</div>
          <div className="header-cell">Player</div>
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
                return userLadderData?.canChallenge;
              })() && (
                <div style={{ marginTop: '4px' }}>
                  {(() => {
                    console.log('🔍 LadderTable: Checking challenge for', userLadderData.firstName, 'vs', player.firstName, 'canChallenge:', userLadderData.canChallenge);
                    const challengeType = getChallengeType(userLadderData, player);
                    console.log('🔍 LadderTable: Challenge type result:', challengeType);
                    if (challengeType) {
                      return (
                        <button
                          onClick={() => handleChallengePlayer(player, challengeType)}
                          style={{
                            background: challengeType === 'challenge' ? '#ff4444' : 
                                       challengeType === 'smackdown' ? '#f59e0b' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                        >
                          {challengeType === 'challenge' ? 'Challenge' : 
                           challengeType === 'smackdown' ? 'SmackDown' : 'SmackBack'}
                        </button>
                      );
                    } else {
                      return (
                        <div className="challenge-reason-text" style={{
                          fontSize: '0.6rem',
                          color: '#888',
                          fontStyle: 'italic',
                          marginTop: '2px'
                        }}>
                          {getChallengeReason(userLadderData, player)}
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
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
              <div className="table-cell last-match">
                {player.lastMatch ? (
                  <div style={{ fontSize: '1.0rem', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold', color: player.lastMatch.result === 'W' ? '#4CAF50' : '#f44336' }}>
                      {player.lastMatch.result === 'W' ? 'W' : 'L'} vs {
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
