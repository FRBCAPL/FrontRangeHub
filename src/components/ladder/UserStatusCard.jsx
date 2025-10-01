import React, { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { checkPaymentStatus, showPaymentRequiredModal } from '../../utils/paymentStatus.js';
import { formatDateForDisplay } from '../../utils/dateUtils';
import PromotionalPeriodModal from '../modal/PromotionalPeriodModal.jsx';
import DraggableModal from '../modal/DraggableModal';
import BCASanctioningPaymentModal from './BCASanctioningPaymentModal';
import FastTrackStatus from './FastTrackStatus';
import FastTrackModal from './FastTrackModal';
import PlayerChoiceModal from './PlayerChoiceModal';
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
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);
  const [showPlayerChoiceModal, setShowPlayerChoiceModal] = useState(false);
  const [fastTrackStatus, setFastTrackStatus] = useState(null);
  const [gracePeriodStatus, setGracePeriodStatus] = useState(null);

  // Handle profile modal opening
  React.useEffect(() => {
    const handleOpenProfileModal = () => {
      setShowPromotionalModal(false);
      setShowProfileModal(true);
    };

    window.addEventListener('openProfileModal', handleOpenProfileModal);
    return () => window.removeEventListener('openProfileModal', handleOpenProfileModal);
  }, [setShowProfileModal]);

  // Fetch decline status and grace period when user data changes
  useEffect(() => {
    if (userLadderData?.email && userLadderData?.playerId === 'ladder') {
      fetchDeclineStatus();
      fetchGracePeriodStatus();
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

  const fetchGracePeriodStatus = async () => {
    if (!userLadderData?.email) {
      console.log('⏳ Grace Period: No email found in userLadderData');
      return;
    }
    
    try {
      const email = userLadderData.email || userLadderData.unifiedAccount?.email;
      console.log('⏳ Grace Period: Fetching status for email:', email);
      const url = `${BACKEND_URL}/api/ladder/player/${encodeURIComponent(email)}/grace-period-status`;
      console.log('⏳ Grace Period: API URL:', url);
      const response = await fetch(url);
      
      console.log('⏳ Grace Period: Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('⏳ Grace Period: Response data:', data);
        setGracePeriodStatus(data.gracePeriodStatus);
      } else {
        const errorText = await response.text();
        console.error('⏳ Grace Period: Failed to fetch grace period status:', response.status, errorText);
        setGracePeriodStatus(null);
      }
    } catch (error) {
      console.error('⏳ Grace Period: Error fetching grace period status:', error);
      setGracePeriodStatus(null);
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
          {userLadderData?.firstName && (
            <p style={{ 
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#10b981',
              marginBottom: '8px',
              marginTop: '0'
            }}>
              Hi, {userLadderData.firstName}! 👋
            </p>
          )}
          <h3>Your Ladder Status</h3>
        <div className="status-details">
          <div className="status-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '1', minWidth: '100px' }}>
            <span className="label" style={{ fontSize: '0.7rem', marginBottom: '0px', lineHeight: '1' }}></span>
            <span className="label" style={{ fontSize: '0.7rem', marginBottom: '2px', lineHeight: '1' }}>Fargo Rate</span>
            <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' :
               userLadderData?.fargoRate === 0 ? "No Rate" : userLadderData?.fargoRate || 'N/A'}
            </span>
            {userLadderData?.fargoRate !== 0 && !userLadderData?.needsClaim && userLadderData?.playerId !== 'unknown' && (
              <span className="label" style={{ fontSize: '0.6rem', color: '#888', marginTop: '2px', lineHeight: '1' }}>
                {userLadderData?.fargoRateUpdatedAt ? (
                  <>
                    Updated {(() => {
                      const updatedDate = new Date(userLadderData.fargoRateUpdatedAt);
                      const now = new Date();
                      const diffTime = Math.abs(now - updatedDate);
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays === 0) return 'today';
                      if (diffDays === 1) return 'yesterday';
                      if (diffDays < 30) return `${diffDays} days ago`;
                      if (diffDays < 60) return '1 month ago';
                      const diffMonths = Math.floor(diffDays / 30);
                      return `${diffMonths} months ago`;
                    })()}
                  </>
                ) : (
                  'Not yet updated'
                )}
              </span>
            )}
          </div>
          <div className="status-item" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center', flex: '1', minWidth: '100px', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Ladder</span>
              <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' :
                 userLadderData?.ladder === '499-under' ? '499' : 
                 userLadderData?.ladder === '500-549' ? '500-549' : 
                 userLadderData?.ladder === '550+' ? '550+' : 'None'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Position</span>
              <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' :
                 `#${userLadderData?.position || 'N/A'}`}
              </span>
            </div>
          </div>
          <div className="status-item" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center', flex: '1', minWidth: '100px', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Record</span>
              <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? (
                  'N/A'
                ) : (
                  <>
                    <span style={{ color: '#10b981' }}>{userLadderData?.wins || 0}</span>
                    <span style={{ color: '#999', padding: '0 3px' }}>-</span>
                    <span style={{ color: '#dc2626' }}>{userLadderData?.losses || 0}</span>
                  </>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px', lineHeight: '1' }}>Best Ever</span>
              <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px', lineHeight: '1' }}>
                {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' : (() => {
                  const progression = userLadderData?.ladderProgression;
                  if (!progression || !progression.overallBestLadder) {
                    return userLadderData?.ladder === '499-under' ? '499' : 
                           userLadderData?.ladder === '500-549' ? '500-549' : 
                           userLadderData?.ladder === '550+' ? '550+' : 'Current';
                  }
                  return progression.overallBestLadder === '499-under' ? '499' : 
                         progression.overallBestLadder === '500-549' ? '500-549' : 
                         progression.overallBestLadder === '550-plus' ? '550+' : 'N/A';
                })()}
              </span>
              <span className="value" style={{ fontSize: '1rem', fontWeight: 'bold', color: '#FFD700' }}>
                {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' : (() => {
                  const progression = userLadderData?.ladderProgression;
                  const bestPosition = progression?.overallBestPosition || userLadderData?.highestPosition || userLadderData?.position;
                  return `#${bestPosition || 'N/A'}`;
                })()}
              </span>
            </div>
          </div>
          {/* Additional Status Items */}
          {!isAdmin && userLadderData?.immunityUntil && (
            <div className="status-item immunity">
              <span className="label">Immunity Until:</span>
              <span className="value">{formatDateForDisplay(userLadderData.immunityUntil)}</span>
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
          {!isAdmin && declineStatus && userLadderData?.playerId === 'ladder' && (
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
          
          {/* Fast Track Status */}
          <FastTrackStatus 
            userLadderData={userLadderData}
            userPin={userPin}
            onShowFastTrackModal={() => setShowFastTrackModal(true)}
            onShowPlayerChoiceModal={() => setShowPlayerChoiceModal(true)}
          />

          {/* Grace Period - Show for ALL players if in grace period */}
          {(() => {
            console.log('⏳ Rendering grace period check:', { gracePeriodStatus, inGracePeriod: gracePeriodStatus?.inGracePeriod });
            return gracePeriodStatus && gracePeriodStatus.inGracePeriod && (
              <div className="status-item grace-period" style={{ flex: '1.4', minWidth: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                onClick={() => setShowFastTrackModal(true)}
              >
                <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px', lineHeight: '1' }}>⏳ Grace Period</span>
                <span className="label" style={{ fontSize: '0.65rem', marginBottom: '2px', lineHeight: '1', color: '#888' }}>
                  {gracePeriodStatus.reason === 'under_min' ? 'Under Minimum' : 'Over Maximum'}
                </span>
                <span className="value" style={{ color: gracePeriodStatus.daysRemaining <= 7 ? '#ef4444' : '#3b82f6', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {gracePeriodStatus.daysRemaining} days left
                </span>
              </div>
            );
          })()}

          {/* Admin Preview Cards - Always shown for admins to see all possible status cards */}
          {isAdmin && (
            <>
              {/* Immunity Card Preview - Shows when player recently won */}
              <div className="status-item immunity" style={{ flex: '1.2', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                onClick={() => alert('🛡️ Immunity Explanation:\n\nWhen you win a match, you get 7 days of immunity from challenges.\n\nDuring this time:\n• No one can challenge you\n• You can still challenge others\n• You can still defend in scheduled matches\n\nThis gives you a week to enjoy your victory!')}
              >
                <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>🛡️ Immunity</span>
                <span className="value" style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: 'bold' }}>7 days left</span>
              </div>

              {/* Decline Status Preview - Shows available challenge declines */}
              <div className="status-item decline-status" style={{ flex: '1.2', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                onClick={() => setShowDeclineRulesModal(true)}
              >
                <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>🚫 Declines</span>
                <span className="value" style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 'bold' }}>2/2 Available</span>
              </div>

              {/* Fast Track - After choosing to move down */}
              <div className="status-item fast-track-status" style={{ flex: '1.2', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                onClick={() => setShowFastTrackModal(true)}
              >
                <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>⚡ Fast Track</span>
                <span className="value" style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>2 challenges left</span>
              </div>
            </>
          )}

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
        <div style={{ padding: '15px' }}>
          {/* Current Status */}
          <div style={{ 
            background: declineStatus?.availableDeclines > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
            border: declineStatus?.availableDeclines > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)', 
            borderRadius: '8px', 
            padding: '12px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: declineStatus?.availableDeclines > 0 ? '#10b981' : '#dc2626',
              margin: '0 0 6px 0',
              fontSize: '1.1rem'
            }}>
              {declineStatus?.availableDeclines > 0 ? '✅ Declines Available' : '❌ No Declines Left'}
            </h3>
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1rem' }}>
              <strong>{declineStatus?.availableDeclines || 0}/2</strong> declines available
            </p>
            {declineStatus?.nextResetDate && (
              <p style={{ color: '#ccc', margin: '5px 0 0 0', fontSize: '0.85rem' }}>
                Next decline resets in <strong>{declineStatus.daysUntilNextReset} days</strong>
              </p>
            )}
          </div>

          {/* Decline Rules */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>How the Decline System Works</h4>
            <div style={{ 
              background: 'rgba(255, 193, 7, 0.1)', 
              border: '1px solid rgba(255, 193, 7, 0.3)', 
              borderRadius: '8px', 
              padding: '12px'
            }}>
              <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
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
            padding: '10px',
            marginBottom: '12px'
          }}>
            <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
              ⚠️ Important: Declining a challenge results in immediate position changes regardless of match outcome.
            </p>
          </div>

          {/* Example Scenarios */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>Example Scenarios</h4>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              borderRadius: '8px', 
              padding: '10px',
              color: '#e0e0e0',
              fontSize: '0.85rem',
              lineHeight: '1.3'
            }}>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Scenario 1:</strong> You have 2 declines available. You decline a challenge. You now have 1 decline available, and that declined challenge resets in 30 days.
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
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
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
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

      {/* Fast Track Modal */}
      <FastTrackModal
        isOpen={showFastTrackModal}
        onClose={() => setShowFastTrackModal(false)}
        userLadderData={userLadderData}
        userPin={userPin}
        fastTrackStatus={fastTrackStatus}
        gracePeriodStatus={gracePeriodStatus}
      />

      {/* Player Choice Modal */}
      <PlayerChoiceModal
        isOpen={showPlayerChoiceModal}
        onClose={() => setShowPlayerChoiceModal(false)}
        userLadderData={userLadderData}
        userPin={userPin}
        onChoiceMade={(choice) => {
          console.log('Player choice made:', choice);
          // The modal will handle the API call and page refresh
        }}
      />
    </>
  );
});

UserStatusCard.displayName = 'UserStatusCard';

export default UserStatusCard;
