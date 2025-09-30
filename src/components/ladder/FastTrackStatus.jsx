import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';

const FastTrackStatus = ({ userLadderData, userPin, onShowFastTrackModal, onShowPlayerChoiceModal }) => {
  const [fastTrackStatus, setFastTrackStatus] = useState(null);
  const [gracePeriodStatus, setGracePeriodStatus] = useState(null);
  const [reverseFastTrackStatus, setReverseFastTrackStatus] = useState(null);
  const [reverseGracePeriodStatus, setReverseGracePeriodStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);

  // Fetch fast track status when user data changes
  useEffect(() => {
    if (userLadderData?.playerId === 'ladder' && userLadderData?.unifiedAccount?.unifiedUserId) {
      fetchFastTrackStatus();
      fetchGracePeriodStatus();
      fetchReverseFastTrackStatus();
      fetchReverseGracePeriodStatus();
    }
  }, [userLadderData]);

  const fetchFastTrackStatus = async () => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/fast-track/status/${userLadderData.unifiedAccount.unifiedUserId}`, {
        headers: {
          'Authorization': `Bearer ${userPin}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFastTrackStatus(data.fastTrack);
      } else {
        console.error('Failed to fetch fast track status');
        setFastTrackStatus(null);
      }
    } catch (error) {
      console.error('Error fetching fast track status:', error);
      setFastTrackStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchGracePeriodStatus = async () => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/fast-track/grace-period/${userLadderData.unifiedAccount.unifiedUserId}`, {
        headers: {
          'Authorization': `Bearer ${userPin}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGracePeriodStatus(data.gracePeriod);
      } else {
        console.error('Failed to fetch grace period status');
        setGracePeriodStatus(null);
      }
    } catch (error) {
      console.error('Error fetching grace period status:', error);
      setGracePeriodStatus(null);
    }
  };

  const fetchReverseFastTrackStatus = async () => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/reverse-fast-track/status/${userLadderData.unifiedAccount.unifiedUserId}`, {
        headers: {
          'Authorization': `Bearer ${userPin}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReverseFastTrackStatus(data);
      } else {
        console.error('Failed to fetch reverse fast track status');
        setReverseFastTrackStatus(null);
      }
    } catch (error) {
      console.error('Error fetching reverse fast track status:', error);
      setReverseFastTrackStatus(null);
    }
  };

  const fetchReverseGracePeriodStatus = async () => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/reverse-fast-track/grace-period/${userLadderData.unifiedAccount.unifiedUserId}`, {
        headers: {
          'Authorization': `Bearer ${userPin}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReverseGracePeriodStatus(data);
      } else {
        console.error('Failed to fetch reverse grace period status');
        setReverseGracePeriodStatus(null);
      }
    } catch (error) {
      console.error('Error fetching reverse grace period status:', error);
      setReverseGracePeriodStatus(null);
    }
  };

  const handlePlayerChoice = async (choice) => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/fast-track/player-choice/${userLadderData.unifiedAccount.unifiedUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userPin}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ choice })
      });
      
      if (response.ok) {
        setShowChoiceModal(false);
        // Refresh status
        fetchFastTrackStatus();
        fetchGracePeriodStatus();
        // Refresh page to show updated ladder position
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to record choice'}`);
      }
    } catch (error) {
      console.error('Error recording player choice:', error);
      alert('Error recording your choice. Please try again.');
    }
  };

  // Don't render if user doesn't have ladder data
  if (!userLadderData || userLadderData.playerId !== 'ladder') {
    return null;
  }

  // Show grace period status if active
  if (gracePeriodStatus?.isActive) {
    return (
      <div className="status-item fast-track-grace-period" style={{ 
        flex: '1.2', 
        minWidth: '160px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center',
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '8px',
        padding: '8px'
      }}>
        <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Grace Period</span>
        <span 
          className="value" 
          style={{ 
            color: '#ffc107', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            lineHeight: '1.1'
          }}
          onClick={() => onShowFastTrackModal && onShowFastTrackModal()}
        >
          {gracePeriodStatus.daysRemaining > 0 ? 
            `${gracePeriodStatus.daysRemaining} days left` : 
            'Move up now!'
          }
        </span>
      </div>
    );
  }

  // Show fast track status if available
  if (fastTrackStatus?.hasFastTrack && !fastTrackStatus.isExpired) {
    return (
      <div className="status-item fast-track-status" style={{ 
        flex: '1.2', 
        minWidth: '160px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '8px',
        padding: '8px'
      }}>
        <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Fast Track</span>
        <span 
          className="value" 
          style={{ 
            color: '#10b981', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            lineHeight: '1.1'
          }}
          onClick={() => onShowFastTrackModal && onShowFastTrackModal()}
        >
          {fastTrackStatus.challengesRemaining} challenges left
        </span>
      </div>
    );
  }

  // Show reverse grace period status if active
  if (reverseGracePeriodStatus?.isActive) {
    return (
      <div className="status-item reverse-fast-track-grace-period" style={{ 
        flex: '1.2', 
        minWidth: '160px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center',
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '8px',
        padding: '8px'
      }}>
        <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Reverse Grace Period</span>
        <span 
          className="value" 
          style={{ 
            color: '#ffc107', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            lineHeight: '1.1'
          }}
          onClick={() => onShowFastTrackModal && onShowFastTrackModal()}
        >
          {reverseGracePeriodStatus.daysRemaining > 0 ? 
            `${reverseGracePeriodStatus.daysRemaining} days left` : 
            'Choose now!'
          }
        </span>
      </div>
    );
  }

  // Show reverse fast track status if available
  if (reverseFastTrackStatus?.hasReverseFastTrack && !reverseFastTrackStatus.isExpired) {
    return (
      <div className="status-item reverse-fast-track-status" style={{ 
        flex: '1.2', 
        minWidth: '160px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center',
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '8px',
        padding: '8px'
      }}>
        <span className="label" style={{ fontSize: '0.7rem', marginBottom: '1px' }}>Reverse Fast Track</span>
        <span 
          className="value" 
          style={{ 
            color: '#22c55e', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            lineHeight: '1.1'
          }}
          onClick={() => onShowFastTrackModal && onShowFastTrackModal()}
        >
          {reverseFastTrackStatus.challengesRemaining} challenges left
        </span>
      </div>
    );
  }

  // Show choice modal if player needs to make a choice
  if (userLadderData.fargoRate < 500 && userLadderData.ladder === '500-549' && !showChoiceModal) {
    // This would be triggered by the backend when a player falls back under 499
    // For now, we'll show it as a placeholder
    return null;
  }

  return null;
};

export default FastTrackStatus;
