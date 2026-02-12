import React, { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { checkPaymentStatus, showPaymentRequiredModal } from '@shared/utils/utils/paymentStatus.js';
import { formatDateForDisplay } from '@shared/utils/utils/dateUtils';
import { getCurrentPhase } from '@shared/utils/utils/phaseSystem.js';
import PromotionalPeriodModal from '@shared/components/modal/modal/PromotionalPeriodModal.jsx';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import BCASanctioningPaymentModal from './BCASanctioningPaymentModal';
import FastTrackStatus from './FastTrackStatus';
import FastTrackModal from './FastTrackModal';
import PlayerChoiceModal from './PlayerChoiceModal';
import { BACKEND_URL } from '@shared/config/config.js';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

const UserStatusCard = memo(({ 
  userLadderData, 
  setShowUnifiedSignup, 
  setShowProfileModal,
  isAdmin,
  isProfileComplete,
  setShowPaymentDashboard,
  setShowPaymentInfo,
  userPin,
  onJoinAssignedLadder,
  isFreePeriod
}) => {
  const navigate = useNavigate();
  const [showPromotionalModal, setShowPromotionalModal] = useState(false);
  const [declineStatus, setDeclineStatus] = useState(null);
  const [loadingDeclineStatus, setLoadingDeclineStatus] = useState(false);
  const [showDeclineRulesModal, setShowDeclineRulesModal] = useState(false);
  const [showBCASanctioningModal, setShowBCASanctioningModal] = useState(false);
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);
  const [showPlayerChoiceModal, setShowPlayerChoiceModal] = useState(false);
  const [showMembershipStatusModal, setShowMembershipStatusModal] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [loadingMembershipStatus, setLoadingMembershipStatus] = useState(false);
  const [fastTrackStatus, setFastTrackStatus] = useState(null);
  const [gracePeriodStatus, setGracePeriodStatus] = useState(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const isInFreePeriod = isFreePeriod ?? userLadderData?.phaseInfo?.isFree ?? getCurrentPhase().isFree;
  const hasChallengeAccess = Boolean(userLadderData?.canChallenge);
  const hasEffectiveFreeAccess = isInFreePeriod || (hasChallengeAccess && !membershipStatus?.isCurrent);

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

  useEffect(() => {
    setShowMobileDetails(false);
  }, [userLadderData?.email]);

  useEffect(() => {
    if (!isMobile || !showMobileDetails) return undefined;

    const originalOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowMobileDetails(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobile, showMobileDetails]);

  const fetchDeclineStatus = async () => {
    if (!userLadderData?.email) return;
    
    setLoadingDeclineStatus(true);
    try {
      const email = userLadderData.email || userLadderData.unifiedAccount?.email;
      
      // Use Supabase instead of old API
      const result = await supabaseDataService.getPlayerDeclineStatus(email);
      
      if (result.success) {
        const status = result.declineStatus || result.data;
        if (status) {
          setDeclineStatus({
            availableDeclines: status.availableDeclines ?? status.declinesRemaining ?? 0,
            ...status
          });
        } else {
          setDeclineStatus(null);
        }
      } else {
        console.error('Failed to fetch decline status:', result.error);
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
      
      // Use Supabase instead of old API
      const result = await supabaseDataService.getPlayerGracePeriodStatus(email);
      
      console.log('⏳ Grace Period: Supabase result:', result);
      if (result.success) {
        console.log('⏳ Grace Period: Response data:', result.data);
        setGracePeriodStatus(result.data);
      } else {
        console.error('⏳ Grace Period: Failed to fetch grace period status:', result.error);
        setGracePeriodStatus(null);
      }
    } catch (error) {
      console.error('⏳ Grace Period: Error fetching grace period status:', error);
      setGracePeriodStatus(null);
    }
  };

  const openStatusModalFromSheet = (openAction) => {
    if (isMobile && showMobileDetails) {
      setShowMobileDetails(false);
      window.setTimeout(() => {
        openAction();
      }, 30);
      return;
    }
    openAction();
  };

  const formatMembershipDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString();
  };

  const openMembershipStatusModal = async () => {
    if (!userLadderData?.email) return;
    setLoadingMembershipStatus(true);
    setShowMembershipStatusModal(true);
    try {
      const paymentStatus = await checkPaymentStatus(userLadderData.email);
      setMembershipStatus(paymentStatus);
    } catch (error) {
      setMembershipStatus({
        isCurrent: false,
        message: 'Unable to load membership status right now.',
        lastPayment: null,
        nextDue: null
      });
    } finally {
      setLoadingMembershipStatus(false);
    }
  };

  const additionalStatusItems = (
    <>
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
            onClick={() => openStatusModalFromSheet(() => setShowBCASanctioningModal(true))}
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
              color: hasChallengeAccess || isInFreePeriod ? '#4CAF50' : '#ffc107',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              lineHeight: '1.1'
            }}
            onClick={async () => {
              openStatusModalFromSheet(() => {
                openMembershipStatusModal();
              });
            }}
          >
            {hasChallengeAccess
              ? '✅ Access Enabled'
              : (isInFreePeriod ? '🎉 FREE PERIOD' : '💳 Payment Required')}
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
            onClick={() => openStatusModalFromSheet(() => setShowDeclineRulesModal(true))}
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
          onClick={() => openStatusModalFromSheet(() => setShowProfileModal(true))}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span className="label">Profile Status:</span>
          <span className="value" style={{ color: '#ffc107' }}>
            {!isProfileComplete
              ? 'Incomplete - Add availability and locations to receive challenges'
              : 'Complete - Ready to receive challenges'
            }
          </span>
        </div>
      )}
      {(userLadderData?.playerId === 'pending' || userLadderData?.pendingApproval) && !isAdmin && (
        <div
          className="status-item pending-notice"
          style={{ cursor: 'default' }}
        >
          <span className="label">Account Status:</span>
          <span className="value" style={{ color: '#f59e0b' }}>
            Pending Approval - Registration submitted, awaiting admin review
          </span>
        </div>
      )}
      {(userLadderData?.playerId === 'approved_no_ladder' || userLadderData?.needsLadderPlacement) && !isAdmin && (
        <div
          className="status-item approved-no-ladder-notice"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const ladderName = userLadderData?.assignedLadderLabel || 'your assigned';
            const confirmed = window.confirm(
              `You are approved but not yet placed.\n\nJoin ${ladderName} ladder now?`
            );
            if (confirmed) {
              openStatusModalFromSheet(() => onJoinAssignedLadder && onJoinAssignedLadder());
            }
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span className="label">Account Status:</span>
          <span className="value" style={{ color: '#10b981' }}>
            Approved - Click to join {userLadderData?.assignedLadderLabel || 'assigned ladder'}
          </span>
        </div>
      )}
      {userLadderData?.playerId === 'unknown' && (
        <div
          className="status-item unknown-notice"
          style={{ cursor: 'pointer' }}
          onClick={() => openStatusModalFromSheet(() => setShowUnifiedSignup(true))}
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
        onShowFastTrackModal={() => openStatusModalFromSheet(() => setShowFastTrackModal(true))}
        onShowPlayerChoiceModal={() => openStatusModalFromSheet(() => setShowPlayerChoiceModal(true))}
      />

      {/* Grace Period - Show for ALL players if in grace period */}
      {(() => {
        console.log('⏳ Rendering grace period check:', { gracePeriodStatus, inGracePeriod: gracePeriodStatus?.inGracePeriod });
        return gracePeriodStatus && gracePeriodStatus.inGracePeriod && (
          <div className="status-item grace-period" style={{ flex: '1.4', minWidth: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
            onClick={() => openStatusModalFromSheet(() => setShowFastTrackModal(true))}
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
            onClick={() => openStatusModalFromSheet(() => setShowDeclineRulesModal(true))}
          >
            <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>🚫 Declines</span>
            <span className="value" style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 'bold' }}>2/2 Available</span>
          </div>

          {/* Fast Track - After choosing to move down */}
          <div className="status-item fast-track-status" style={{ flex: '1.2', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
            onClick={() => openStatusModalFromSheet(() => setShowFastTrackModal(true))}
          >
            <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>⚡ Fast Track</span>
            <span className="value" style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>2 challenges left</span>
          </div>
        </>
      )}
    </>
  );

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
        <div className="status-info" style={isMobile ? { paddingTop: '8px' } : undefined}>
          {userLadderData?.firstName && (
            <p style={{ 
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#10b981',
              marginBottom: '5px',
              marginTop: '10px',
              paddingTop: '4px',
              lineHeight: '1.1'
            }}>
              Hi, {userLadderData.firstName}! 👋
            </p>
          )}
          <h3>Your Ladder Status</h3>
        <div className="status-details">
          {isMobile ? (
            <div className="status-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'center', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '7px 8px', textAlign: 'center' }}>
                  <span className="label" style={{ fontSize: '0.66rem', lineHeight: '1' }}>Fargo</span>
                  <div className="value" style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '2px', textAlign: 'center', width: '100%' }}>
                    {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' :
                     userLadderData?.fargoRate === 0 ? 'No Rate' : userLadderData?.fargoRate || 'N/A'}
                  </div>
                  {userLadderData?.fargoRate !== 0 && !userLadderData?.needsClaim && userLadderData?.playerId !== 'unknown' && (
                    <div className="label" style={{ fontSize: '0.58rem', color: '#888', marginTop: '2px', lineHeight: '1' }}>
                      {userLadderData?.fargoRateUpdatedAt ? (
                        <>Updated {(() => {
                          const updatedDate = new Date(userLadderData.fargoRateUpdatedAt);
                          const now = new Date();
                          const diffTime = Math.abs(now - updatedDate);
                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                          if (diffDays === 0) return 'today';
                          if (diffDays === 1) return 'yesterday';
                          if (diffDays < 30) return `${diffDays}d ago`;
                          if (diffDays < 60) return '1m ago';
                          return `${Math.floor(diffDays / 30)}m ago`;
                        })()}</>
                      ) : (
                        'Not updated'
                      )}
                    </div>
                  )}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '7px 8px', textAlign: 'center' }}>
                  <span className="label" style={{ fontSize: '0.66rem', lineHeight: '1' }}>Ladder / Rank</span>
                  <div className="value" style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '2px', textAlign: 'center', width: '100%' }}>
                    {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown'
                      ? 'N/A'
                      : `${userLadderData?.ladder === '499-under' ? '499' :
                          userLadderData?.ladder === '500-549' ? '500-549' :
                          userLadderData?.ladder === '550+' ? '550+' : 'None'} / #${userLadderData?.position || 'N/A'}`}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '7px 8px', textAlign: 'center' }}>
                  <span className="label" style={{ fontSize: '0.66rem', lineHeight: '1' }}>Record</span>
                  <div className="value" style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '2px', textAlign: 'center', width: '100%' }}>
                    {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? (
                      'N/A'
                    ) : (
                      <>
                        <span style={{ color: '#10b981' }}>{userLadderData?.wins || 0}</span>
                        <span style={{ color: '#999', padding: '0 3px' }}>-</span>
                        <span style={{ color: '#dc2626' }}>{userLadderData?.losses || 0}</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '7px 8px', textAlign: 'center' }}>
                  <span className="label" style={{ fontSize: '0.66rem', lineHeight: '1' }}>Best Ever</span>
                  <div className="value" style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#FFD700', marginTop: '2px', textAlign: 'center', width: '100%' }}>
                    {userLadderData?.needsClaim || userLadderData?.playerId === 'unknown' ? 'N/A' : (() => {
                      const progression = userLadderData?.ladderProgression;
                      const bestLadder = !progression || !progression.overallBestLadder
                        ? (userLadderData?.ladder === '499-under' ? '499' :
                           userLadderData?.ladder === '500-549' ? '500-549' :
                           userLadderData?.ladder === '550+' ? '550+' : 'Current')
                        : (progression.overallBestLadder === '499-under' ? '499' :
                           progression.overallBestLadder === '500-549' ? '500-549' :
                           progression.overallBestLadder === '550-plus' ? '550+' : 'N/A');
                      const bestPosition = progression?.overallBestPosition || userLadderData?.highestPosition || userLadderData?.position;
                      return `${bestLadder} #${bestPosition || 'N/A'}`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setShowMobileDetails(true)}
              style={{
                width: '100%',
                marginTop: '2px',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '8px',
                color: '#c4b5fd',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '8px 10px',
                cursor: 'pointer'
              }}
            >
              View More Status Details
            </button>
          )}

          {!isMobile && additionalStatusItems}

        </div>
      </div>
      </div>

      {/* Mobile Bottom Sheet: Additional Status Details */}
      {isMobile && showMobileDetails && createPortal(
        <div
          role="presentation"
          onClick={() => setShowMobileDetails(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 130000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More status details"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: '82vh',
              overflowY: 'auto',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              background: 'linear-gradient(180deg, #121026 0%, #0b0b1a 100%)',
              padding: '10px 12px 14px 12px',
              boxShadow: '0 -8px 28px rgba(0, 0, 0, 0.45)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <div
                style={{
                  width: '44px',
                  height: '4px',
                  borderRadius: '999px',
                  background: 'rgba(196, 181, 253, 0.5)'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, color: '#ddd6fe', fontSize: '0.95rem' }}>More Status Details</h4>
              <button
                type="button"
                onClick={() => setShowMobileDetails(false)}
                style={{
                  border: '1px solid rgba(196, 181, 253, 0.35)',
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#ddd6fe',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
            <div className="status-details" style={{ gap: '8px' }}>
              {additionalStatusItems}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Decline Rules Modal */}
      {showMembershipStatusModal && createPortal(
        <DraggableModal
          open={showMembershipStatusModal}
          onClose={() => setShowMembershipStatusModal(false)}
          title="💳 Membership Status"
          maxWidth="540px"
          borderColor="#8b5cf6"
          textColor="#ffffff"
          glowColor="#8b5cf6"
          zIndex={100000}
          style={{
            background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
            color: '#ffffff'
          }}
        >
          <div style={{ padding: '14px' }}>
            <div
              style={{
                background: (membershipStatus?.isCurrent || isInFreePeriod)
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(245, 158, 11, 0.12)',
                border: (membershipStatus?.isCurrent || isInFreePeriod)
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '12px'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#e5e7eb' }}>
                Current Status
              </div>
              {loadingMembershipStatus ? (
                <div style={{ color: '#d1d5db' }}>Loading membership details...</div>
              ) : (
                <>
                  <div style={{ color: '#f3f4f6', marginBottom: '4px' }}>
                    {hasEffectiveFreeAccess
                      ? '🎉 Free Period Active'
                      : (membershipStatus?.isCurrent ? '✅ Active Membership' : '⚠️ Membership Not Active')}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                    {hasEffectiveFreeAccess
                      ? 'No payment required during the free period.'
                      : (membershipStatus?.message || 'Membership status currently unavailable.')}
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '12px'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#e5e7eb' }}>Membership Dates</div>
              <div style={{ color: '#d1d5db', fontSize: '0.92rem', lineHeight: 1.5 }}>
                <div><strong>Start Date:</strong> {hasEffectiveFreeAccess ? 'Free period active' : formatMembershipDate(membershipStatus?.lastPayment)}</div>
                <div><strong>End Date:</strong> {hasEffectiveFreeAccess ? 'No payment due during free period' : formatMembershipDate(membershipStatus?.nextDue)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {!hasEffectiveFreeAccess && !(membershipStatus?.isCurrent) && !hasChallengeAccess && (
                <button
                  onClick={() => {
                    setShowMembershipStatusModal(false);
                    setShowPaymentDashboard(true);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Open Payment Dashboard
                </button>
              )}
              <button
                onClick={() => setShowMembershipStatusModal(false)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </DraggableModal>,
        document.body
      )}

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
