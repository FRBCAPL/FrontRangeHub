import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { BACKEND_URL } from '@shared/config/config.js';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

const FastTrackStatus = ({ userLadderData, userPin, onShowFastTrackModal, onShowPlayerChoiceModal }) => {
  const [fastTrackStatus, setFastTrackStatus] = useState(null);
  const [gracePeriodStatus, setGracePeriodStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);

  // Fetch fast track status when user data changes
  useEffect(() => {
    if (userLadderData?.playerId === 'ladder' && userLadderData?.unifiedAccount?.unifiedUserId) {
      fetchFastTrackStatus();
      fetchGracePeriodStatus();
    }
  }, [userLadderData]);

  const fetchFastTrackStatus = async () => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    setLoading(true);
    try {
      // Use Supabase instead of old API
      const result = await supabaseDataService.getFastTrackStatus(userLadderData.unifiedAccount.unifiedUserId);
      
      if (result.success) {
        setFastTrackStatus(result.data);
      } else {
        console.error('Failed to fetch fast track status:', result.error);
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
      // Use Supabase instead of old API
      const result = await supabaseDataService.getFastTrackGracePeriod(userLadderData.unifiedAccount.unifiedUserId);
      
      if (result.success) {
        setGracePeriodStatus(result.data);
      } else {
        console.error('Failed to fetch grace period status:', result.error);
        setGracePeriodStatus(null);
      }
    } catch (error) {
      console.error('Error fetching grace period status:', error);
      setGracePeriodStatus(null);
    }
  };

  const handlePlayerChoice = async (choice) => {
    if (!userLadderData?.email) return;
    
    try {
      console.log('🔍 Submitting Fast Track player choice via Supabase (FastTrackStatus):', { choice, email: userLadderData.email });
      
      // Use Supabase service to submit player choice
      const result = await supabaseDataService.submitFastTrackPlayerChoice(userLadderData.email, choice);
      
      if (result.success) {
        setShowChoiceModal(false);
        
        // Show success message
        if (choice === 'stay') {
          alert('✅ You will remain on your current ladder. Good luck!');
        } else {
          alert(`✅ ${result.message}\n\nYou now have ${result.fastTrackChallenges} Fast Track challenges to use within 4 weeks!`);
        }
        
        // Refresh status
        fetchFastTrackStatus();
        fetchGracePeriodStatus();
        // Refresh page to show updated ladder position
        window.location.reload();
      } else {
        alert(`Error: ${result.error || 'Failed to record choice'}`);
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

  return null;
};

export default FastTrackStatus;
