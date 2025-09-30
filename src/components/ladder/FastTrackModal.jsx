import React, { useState, useEffect } from 'react';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';

const FastTrackModal = ({ 
  isOpen, 
  onClose, 
  userLadderData, 
  userPin,
  fastTrackStatus,
  gracePeriodStatus 
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartGracePeriod = async () => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/fast-track/start-grace-period/${userLadderData.unifiedAccount.unifiedUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userPin}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Grace period started successfully! You have 2 weeks to maintain your 500+ rating.');
        onClose();
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to start grace period'}`);
      }
    } catch (error) {
      console.error('Error starting grace period:', error);
      alert('Error starting grace period. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title="🚀 Fast Track Re-entry System"
      maxWidth="700px"
      borderColor="#10b981"
      textColor="#ffffff"
      glowColor="#10b981"
      zIndex={100000}
      style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        color: '#ffffff'
      }}
    >
      <div style={{ padding: '20px' }}>
        {/* Current Status */}
        {gracePeriodStatus?.isActive && (
          <div style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px', 
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: '#ffc107',
              margin: '0 0 10px 0',
              fontSize: '1.2rem'
            }}>
              ⏰ Grace Period Active
            </h3>
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1.1rem' }}>
              <strong>{gracePeriodStatus.daysRemaining || 0} days</strong> remaining
            </p>
            <p style={{ color: '#ccc', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
              Maintain your 500+ rating to move up to the 500+ ladder
            </p>
          </div>
        )}

        {fastTrackStatus?.hasFastTrack && !fastTrackStatus.isExpired && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)', 
            borderRadius: '8px', 
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: '#10b981',
              margin: '0 0 10px 0',
              fontSize: '1.2rem'
            }}>
              🚀 Fast Track Active
            </h3>
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1.1rem' }}>
              <strong>{fastTrackStatus.challengesRemaining}</strong> fast track challenges remaining
            </p>
            {fastTrackStatus.daysRemaining > 0 && (
              <p style={{ color: '#ccc', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                Expires in <strong>{fastTrackStatus.daysRemaining} days</strong>
              </p>
            )}
          </div>
        )}

        {/* System Explanation */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#10b981', marginBottom: '12px', fontSize: '1.1rem' }}>How the Fast Track Re-entry System Works</h4>
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)', 
            borderRadius: '8px', 
            padding: '15px'
          }}>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
              <li><strong>Grace Period:</strong> When you hit 500+ Fargo, you get a 2-week grace period</li>
              <li><strong>Ladder Change:</strong> After 2 weeks above 500, you move to the 500+ ladder</li>
              <li><strong>Player Choice:</strong> If you fall back under 499, you choose to stay or move down</li>
              <li><strong>Fast Track:</strong> Moving down gives you 2 extended challenges (6 spots up instead of 4)</li>
              <li><strong>Time Limit:</strong> Fast track privileges expire after 4 weeks</li>
            </ul>
          </div>
        </div>

        {/* Fast Track Challenge Rules */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#ffc107', marginBottom: '12px', fontSize: '1.1rem' }}>Fast Track Challenge Rules</h4>
          <div style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px', 
            padding: '15px'
          }}>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
              <li><strong>Extended Range:</strong> Can challenge up to 6 spots instead of normal 4 spots</li>
              <li><strong>Insertion Mechanics:</strong> Winner takes defender's position, everyone below moves down one spot</li>
              <li><strong>Limited Use:</strong> Only 2 fast track challenges total</li>
              <li><strong>Same Ladder:</strong> Both players must be on the same ladder</li>
              <li><strong>Must Win:</strong> You still have to win the match to advance</li>
            </ul>
          </div>
        </div>

        {/* Benefits */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#10b981', marginBottom: '12px', fontSize: '1.1rem' }}>Why This System is Fair</h4>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            borderRadius: '8px', 
            padding: '15px'
          }}>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
              <li><strong>No Unfair Bumping:</strong> Existing 499 ladder players are never moved down unfairly</li>
              <li><strong>Earned Privileges:</strong> Fast track challenges must be earned by winning matches</li>
              <li><strong>Time Limited:</strong> Privileges expire to prevent abuse</li>
              <li><strong>Player Choice:</strong> You decide whether to stay on 500+ ladder or move down</li>
              <li><strong>Natural Sorting:</strong> Good players rise quickly, others stay where they belong</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          {userLadderData?.fargoRate >= 500 && userLadderData?.ladder === '499-under' && !gracePeriodStatus?.isActive && (
            <button
              onClick={handleStartGracePeriod}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ffc107, #ff8f00)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginRight: '10px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Starting...' : 'Start Grace Period'}
            </button>
          )}
          
          <button
            onClick={onClose}
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
    </DraggableModal>
  );
};

export default FastTrackModal;
