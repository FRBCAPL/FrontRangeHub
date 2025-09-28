import React from 'react';

const MobileLadderModal = ({ 
  isOpen, 
  onClose, 
  players, 
  selectedLadder, 
  isPublicView, 
  userLadderData, 
  getChallengeReason,
  onPlayerClick,
  handleChallengePlayer,
  getChallengeType
}) => {
  if (!isOpen) return null;

  const getChallengeButtons = (player) => {
    if (isPublicView || !userLadderData?.canChallenge) return null;
    
    const isOnCorrectLadder = userLadderData?.ladder === selectedLadder;
    const canShowChallenges = userLadderData?.canChallenge && isOnCorrectLadder;
    
    if (!canShowChallenges) {
      return (
        <div 
          className="challenge-reason-mobile" 
          style={{
            fontSize: '0.9rem',
            color: '#888',
            marginTop: '4px',
            cursor: 'pointer',
            textAlign: 'center',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #888',
            backgroundColor: 'rgba(136, 136, 136, 0.1)'
          }}
          onClick={() => {
            // Create mobile-friendly popup
            const popup = document.createElement('div');
            popup.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(10, 10, 20, 0.95);
              color: white;
              padding: 20px;
              border-radius: 8px;
              border: 2px solid #6B46C1;
              box-shadow: 0 8px 32px rgba(107, 70, 193, 0.4);
              z-index: 10000;
              max-width: 90vw;
              font-size: 14px;
              line-height: 1.4;
              text-align: center;
            `;
            popup.innerHTML = `<div>${getChallengeReason(userLadderData, player)}</div>`;
            
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
              try {
                if (backdrop && backdrop.parentNode) {
                  document.body.removeChild(backdrop);
                }
                if (popup && popup.parentNode) {
                  document.body.removeChild(popup);
                }
              } catch (error) {
                console.warn('Error closing popup:', error);
              }
            };
            
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
            `;
            closeBtn.addEventListener('click', closePopup);
            popup.appendChild(closeBtn);
            
            document.body.appendChild(backdrop);
            document.body.appendChild(popup);
            
            // Auto close after 5 seconds
            setTimeout(closePopup, 5000);
          }}
        >
          {getChallengeReason(userLadderData, player)}
        </div>
      );
    }

    // Check if this player can actually be challenged
    const challengeType = getChallengeType ? getChallengeType(userLadderData, player) : null;
    
    if (!challengeType) {
      // Show reason why can't challenge
      return (
        <div 
          className="challenge-reason-mobile" 
          style={{
            fontSize: '0.9rem',
            color: '#888',
            marginTop: '4px',
            cursor: 'pointer',
            textAlign: 'center',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #888',
            backgroundColor: 'rgba(136, 136, 136, 0.1)'
          }}
          onClick={() => {
            // Create mobile-friendly popup
            const popup = document.createElement('div');
            popup.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(10, 10, 20, 0.95);
              color: white;
              padding: 20px;
              border-radius: 8px;
              border: 2px solid #6B46C1;
              box-shadow: 0 8px 32px rgba(107, 70, 193, 0.4);
              z-index: 10000;
              max-width: 90vw;
              font-size: 14px;
              line-height: 1.4;
              text-align: center;
            `;
            popup.innerHTML = `<div>${getChallengeReason(userLadderData, player)}</div>`;
            
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
              try {
                if (backdrop && backdrop.parentNode) {
                  document.body.removeChild(backdrop);
                }
                if (popup && popup.parentNode) {
                  document.body.removeChild(popup);
                }
              } catch (error) {
                console.warn('Error closing popup:', error);
              }
            };
            
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
            `;
            closeBtn.addEventListener('click', closePopup);
            popup.appendChild(closeBtn);
            
            document.body.appendChild(backdrop);
            document.body.appendChild(popup);
            
            // Auto close after 5 seconds
            setTimeout(closePopup, 5000);
          }}
        >
          {getChallengeReason(userLadderData, player)}
        </div>
      );
    }

    return (
      <div className="challenge-buttons-mobile" style={{ marginTop: '8px' }}>
        <button 
          className="challenge-btn-mobile"
          style={{
            backgroundColor: challengeType === 'challenge' ? '#ff4444' : 
                           challengeType === 'smackdown' ? '#f59e0b' : '#10b981',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '4px'
          }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            if (handleChallengePlayer) {
              handleChallengePlayer(player, challengeType);
            }
          }}
        >
          {challengeType === 'challenge' ? 'Challenge' : 
           challengeType === 'smackdown' ? 'SmackDown' : 'SmackBack'}
        </button>
      </div>
    );
  };

  const formatLastMatch = (player) => {
    if (!player.lastMatch) return 'No matches';
    
    const { opponent, result, score } = player.lastMatch;
    const resultColor = result === 'W' ? '#4CAF50' : '#f44336';
    
    return (
      <div style={{ fontSize: '0.9rem' }}>
        <span style={{ color: resultColor, fontWeight: 'bold' }}>
          {result === 'W' ? 'W' : 'L'}
        </span>
        {' vs '}
        <span style={{ color: resultColor }}>
          {opponent}
        </span>
        {score && (
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
            {score}
          </div>
        )}
      </div>
    );
  };

  const formatStatus = (player) => {
    if (player.immunityUntil) {
      const immunityDate = new Date(player.immunityUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (immunityDate > today) {
        return (
          <span style={{ color: '#FFD700', fontWeight: 'bold' }}>
            Immune until {immunityDate.toLocaleDateString()}
          </span>
        );
      }
    }
    return <span style={{ color: '#4CAF50' }}>Available</span>;
  };

  return (
    <div 
      className="mobile-ladder-container"
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: 'transparent'
      }}
    >

        {/* Players List */}
        <div className="mobile-players-list">
          {players.map((player, index) => (
            <div 
              key={player._id}
              className="mobile-player-card"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onPlayerClick && onPlayerClick(player)}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.borderColor = 'rgba(107, 70, 193, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {/* Rank and Player Name */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '8px' 
              }}>
                <span style={{ 
                  color: '#FFD700', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem',
                  marginRight: '12px',
                  minWidth: '30px'
                }}>
                  {player.position}
                </span>
                <span style={{ 
                  color: 'white', 
                  fontWeight: '500', 
                  fontSize: '1.1rem',
                  flex: 1
                }}>
                  {player.firstName} {player.lastName}
                </span>
              </div>

              {/* Stats Row */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                gap: '8px',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>Fargo</div>
                  <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                    {player.fargoRate || 'N/A'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>W-L</div>
                  <div style={{ color: 'white', fontWeight: 'bold' }}>
                    {player.wins}-{player.losses}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>Status</div>
                  <div style={{ fontSize: '0.8rem' }}>
                    {formatStatus(player)}
                  </div>
                </div>
              </div>

              {/* BCA Status */}
              {!isPublicView && (
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: '8px',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '2px' }}>
                    Fargo Reported
                  </div>
                  <div>
                    {player.sanctioned && player.sanctionYear === new Date().getFullYear() ? (
                      <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓ Yes</span>
                    ) : (
                      <span style={{ color: '#f44336', fontWeight: 'bold' }}>✗ No</span>
                    )}
                  </div>
                </div>
              )}

              {/* Last Match */}
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '2px' }}>
                  Last Match
                </div>
                <div>
                  {formatLastMatch(player)}
                </div>
              </div>

              {/* Challenge Buttons/Reason */}
              {getChallengeButtons(player)}
            </div>
          ))}
        </div>
    </div>
  );
};

export default MobileLadderModal;
