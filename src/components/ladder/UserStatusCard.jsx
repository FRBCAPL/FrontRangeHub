import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkPaymentStatus, showPaymentRequiredModal } from '../../utils/paymentStatus.js';
import { formatDateForMountainTime } from '../../utils/dateUtils';

const UserStatusCard = memo(({ 
  userLadderData, 
  setShowUnifiedSignup, 
  isAdmin 
}) => {
  const navigate = useNavigate();

  return (
    <div className="user-status-card">
      <div className="status-info">
        <h3>Your Ladder Status</h3>
        <div className="status-details">
          <div className="status-item">
            <span className="label">Ladder:</span>
            <span className="value">
              {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'None' :
               userLadderData?.ladder === '499-under' ? '499 & Under' : 
               userLadderData?.ladder === '500-549' ? '500-549' : 
               userLadderData?.ladder === '550+' ? '550+' : 'None'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">Position:</span>
            <span className="value">
              {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'Not on ladder' :
               userLadderData?.position || 'Not on ladder'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">FargoRate:</span>
            <span className="value">
              {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' :
               userLadderData?.fargoRate === 0 ? "No FargoRate" : userLadderData?.fargoRate || 'N/A'}
            </span>
          </div>
          {userLadderData?.immunityUntil && (
            <div className="status-item immunity">
              <span className="label">Immunity Until:</span>
              <span className="value">{formatDateForMountainTime(userLadderData.immunityUntil)}</span>
            </div>
          )}
          {userLadderData?.playerId === 'ladder' && (
            <div className="status-item payment-status">
              <span className="label">Challenge Access:</span>
              <span 
                className="value" 
                style={{ color: '#ffc107', cursor: 'pointer' }}
                onClick={async () => {
                  const paymentStatus = await checkPaymentStatus(userLadderData.email);
                  if (paymentStatus.isCurrent) {
                    alert(`✅ Payment Current!\n\nYour $5/month subscription is active.\nYou can participate in challenges and defenses.`);
                  } else {
                    showPaymentRequiredModal(
                      () => navigate('/'),
                      () => console.log('User cancelled payment')
                    );
                  }
                }}
              >
                💳 Payment Required - Click to verify status
              </span>
            </div>
          )}
          {userLadderData?.needsClaim && !isAdmin && (
            <div 
              className="status-item claim-notice"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowUnifiedSignup(true)}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span className="label">Account Status:</span>
              <span className="value" style={{ color: '#2196F3' }}>Not Active - Click to join ladder</span>
            </div>
          )}
          {userLadderData?.playerId === 'unknown' && (
            <div 
              className="status-item unknown-notice"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowUnifiedSignup(true)}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span className="label">Account Status:</span>
              <span className="value" style={{ color: '#ffc107' }}>Not Active - Click to join ladder</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UserStatusCard.displayName = 'UserStatusCard';

export default UserStatusCard;
