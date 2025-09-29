import React, { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { checkPaymentStatus, showPaymentRequiredModal } from '../../utils/paymentStatus.js';
import { formatDateForDisplay } from '../../utils/dateUtils';
import PromotionalPeriodModal from '../modal/PromotionalPeriodModal.jsx';
import DraggableModal from '../modal/DraggableModal';
import BCASanctioningPaymentModal from './BCASanctioningPaymentModal';
import LadderNewsTicker from './LadderNewsTicker';
import { BACKEND_URL } from '../../config.js';

const UserStatusCard = memo(({ 
  userLadderData, 
  setShowUnifiedSignup, 
  setShowProfileModal,
  isAdmin,
  isProfileComplete,
  setShowPaymentDashboard,
  setShowPaymentInfo,
  userPin
}) => {
  const navigate = useNavigate();
  const [showPromotionalModal, setShowPromotionalModal] = useState(false);
  const [declineStatus, setDeclineStatus] = useState(null);
  const [loadingDeclineStatus, setLoadingDeclineStatus] = useState(false);
  const [showDeclineRulesModal, setShowDeclineRulesModal] = useState(false);
  const [showBCASanctioningModal, setShowBCASanctioningModal] = useState(false);

  // Handle profile modal opening
  React.useEffect(() => {
    const handleOpenProfileModal = () => {
      setShowPromotionalModal(false);
      setShowProfileModal(true);
    };

    window.addEventListener('openProfileModal', handleOpenProfileModal);
    return () => window.removeEventListener('openProfileModal', handleOpenProfileModal);
  }, [setShowProfileModal]);

  // Fetch decline status when user data changes
  useEffect(() => {
    if (userLadderData?.email && userLadderData?.playerId === 'ladder') {
      fetchDeclineStatus();
    }
  }, [userLadderData]);

  const fetchDeclineStatus = async () => {
    if (!userLadderData?.email) return;
    
    setLoadingDeclineStatus(true);
    try {
      const email = userLadderData.email || userLadderData.unifiedAccount?.email;
      const response = await fetch(`${BACKEND_URL}/api/ladder/player/${encodeURIComponent(email)}/decline-status`);
      
      if (response.ok) {
        const data = await response.json();
        setDeclineStatus(data.declineStatus);
      } else {
        console.error('Failed to fetch decline status');
        setDeclineStatus(null);
      }
    } catch (error) {
      console.error('Error fetching decline status:', error);
      setDeclineStatus(null);
    } finally {
      setLoadingDeclineStatus(false);
    }
  };

  return (
    <>
      <PromotionalPeriodModal
        isOpen={showPromotionalModal}
        onClose={() => setShowPromotionalModal(false)}
        userLadderData={userLadderData}
        isProfileComplete={isProfileComplete}
        setShowPaymentDashboard={setShowPaymentDashboard}
        setShowPaymentInfo={setShowPaymentInfo}
      />
      <div className="user-status-card">
        <div className="status-info">
          <h3>Your Ladder Status</h3>
        <div className="status-details">
          <div className="status-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '0.7', minWidth: '80px' }}>
            <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Ladder</span>
            <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'None' :
               userLadderData?.ladder === '499-under' ? '499 & Under' : 
               userLadderData?.ladder === '500-549' ? '500-549' : 
               userLadderData?.ladder === '550+' ? '550+' : 'None'}
            </span>
          </div>
          <div className="status-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '0.7', minWidth: '80px' }}>
            <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Position</span>
            <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' :
               userLadderData?.position || 'N/A'}
            </span>
          </div>
          <div className="status-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '0.7', minWidth: '80px' }}>
            <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>FargoRate</span>
            <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' :
               userLadderData?.fargoRate === 0 ? "No Rate" : userLadderData?.fargoRate || 'N/A'}
            </span>
          </div>
          {userLadderData?.immunityUntil && (
            <div className="status-item immunity">
              <span className="label">Immunity Until:</span>
              <span className="value">{formatDateForDisplay(userLadderData.immunityUntil)}</span>
            </div>
          )}
          {declineStatus && userLadderData?.playerId === 'ladder' && (
            <div className="status-item decline-status">
              <span className="label">Decline Status:</span>
              <span 
                className="value" 
                style={{ 
                  color: declineStatus.availableDeclines > 0 ? '#10b981' : '#dc2626',
                  cursor: 'pointer'
                }}
                onClick={() => setShowDeclineRulesModal(true)}
              >
                {loadingDeclineStatus ? 'Loading...' : 
                 `${declineStatus.availableDeclines}/2 Available`}
              </span>
            </div>
          )}
          {userLadderData?.playerId === 'ladder' && (
            <div className="status-item payment-status" style={{ flex: '1.2', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Challenge Access</span>
              <span 
                className="value" 
                style={{ 
                  color: userLadderData?.isPromotionalPeriod ? '#4CAF50' : '#ffc107', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.1'
                }}
                onClick={async () => {
                  const paymentStatus = await checkPaymentStatus(userLadderData.email);
                  if (paymentStatus.isCurrent) {
                    alert(`✅ Payment Current!\n\nYour $5/month subscription is active.\nYou can participate in challenges and defenses.`);
                  } else if (userLadderData?.isPromotionalPeriod) {
                    setShowPromotionalModal(true);
                  } else {
                    showPaymentRequiredModal(
                      () => navigate('/'),
                      () => console.log('User cancelled payment')
                    );
                  }
                }}
              >
                {userLadderData?.isPromotionalPeriod ? 
                  '🎉 FREE PERIOD' : 
                  '💳 Payment Required'
                }
              </span>
            </div>
          )}
          {userLadderData?.playerId === 'ladder' && (
            <div className="status-item bca-sanctioning" style={{ flex: '1.2', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>BCA Sanctioning</span>
              <span 
                className="value" 
                style={{ 
                  color: userLadderData?.sanctioned && userLadderData?.sanctionYear === new Date().getFullYear() ? '#4CAF50' : '#ffc107', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.1'
                }}
                onClick={() => setShowBCASanctioningModal(true)}
              >
                {userLadderData?.sanctioned && userLadderData?.sanctionYear === new Date().getFullYear() ? 
                  '✅ Sanctioned' : 
                  '🏆 Get Sanctioned'
                }
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
              <span className="value" style={{ color: '#2196F3' }}>Not Active - Click to claim your ladder position</span>
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
          
          {/* News Ticker - Positioned as a grid item to the right of BCA sanctioning */}
          <div className="status-news-ticker">
            <LadderNewsTicker userPin={userPin} />
          </div>
        </div>
      </div>
      </div>

      {/* Decline Rules Modal */}
      {showDeclineRulesModal && createPortal(
        <DraggableModal
          open={showDeclineRulesModal}
          onClose={() => setShowDeclineRulesModal(false)}
          title="📋 Decline Challenge Rules"
          maxWidth="650px"
          borderColor="#8b5cf6"
          textColor="#ffffff"
          glowColor="#8b5cf6"
          zIndex={100000}
          style={{
            background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
            color: '#ffffff'
          }}
        >
        <div style={{ padding: '20px' }}>
          {/* Current Status */}
          <div style={{ 
            background: declineStatus?.availableDeclines > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
            border: declineStatus?.availableDeclines > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)', 
            borderRadius: '8px', 
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: declineStatus?.availableDeclines > 0 ? '#10b981' : '#dc2626',
              margin: '0 0 10px 0',
              fontSize: '1.2rem'
            }}>
              {declineStatus?.availableDeclines > 0 ? '✅ Declines Available' : '❌ No Declines Left'}
            </h3>
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1.1rem' }}>
              <strong>{declineStatus?.availableDeclines || 0}/2</strong> declines available
            </p>
            {declineStatus?.nextResetDate && (
              <p style={{ color: '#ccc', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                Next decline resets in <strong>{declineStatus.daysUntilNextReset} days</strong>
              </p>
            )}
          </div>

          {/* Decline Rules */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '12px', fontSize: '1.1rem' }}>How the Decline System Works</h4>
            <div style={{ 
              background: 'rgba(255, 193, 7, 0.1)', 
              border: '1px solid rgba(255, 193, 7, 0.3)', 
              borderRadius: '8px', 
              padding: '15px'
            }}>
              <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
                <li><strong>Decline Allowance:</strong> Each player gets 2 declines total</li>
                <li><strong>Decline Effect:</strong> When you decline a challenge, the challenger moves up one position and you move down one position</li>
                <li><strong>Reset System:</strong> Each decline resets 30 days after it was used (not all at once)</li>
                <li><strong>Strategic Use:</strong> Use your declines wisely - they have immediate position consequences</li>
              </ul>
            </div>
          </div>

          {/* Important Warning */}
          <div style={{ 
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
              ⚠️ Important: Declining a challenge results in immediate position changes regardless of match outcome.
            </p>
          </div>

          {/* Example Scenarios */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '12px', fontSize: '1.1rem' }}>Example Scenarios</h4>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              borderRadius: '8px', 
              padding: '12px',
              color: '#e0e0e0',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Scenario 1:</strong> You have 2 declines available. You decline a challenge. You now have 1 decline available, and that declined challenge resets in 30 days.
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Scenario 2:</strong> You have 0 declines available. You must accept all challenges or face immediate position changes.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Scenario 3:</strong> You used a decline 25 days ago. In 5 days, that decline will be restored and you'll have 1 more available.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowDeclineRulesModal(false)}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Got It!
            </button>
          </div>
        </div>
        </DraggableModal>,
        document.body
      )}

      {/* BCA Sanctioning Payment Modal */}
      {showBCASanctioningModal && (
        <BCASanctioningPaymentModal
          isOpen={showBCASanctioningModal}
          onClose={() => setShowBCASanctioningModal(false)}
          playerName={`${userLadderData?.firstName || ''} ${userLadderData?.lastName || ''}`.trim()}
          playerEmail={userLadderData?.email || userLadderData?.unifiedAccount?.email}
          onSuccess={() => {
            setShowBCASanctioningModal(false);
            // Refresh user data to show updated sanctioning status
            window.location.reload();
          }}
        />
      )}
    </>
  );
});

UserStatusCard.displayName = 'UserStatusCard';

export default UserStatusCard;
