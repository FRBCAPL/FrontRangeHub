import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';
import { supabaseDataService } from '../../services/supabaseDataService.js';

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
    if (!userLadderData?.email) return;
    
    setLoading(true);
    try {
      console.log('🔍 Starting grace period via Supabase for:', userLadderData.email);
      
      // Use Supabase service to start grace period
      const result = await supabaseDataService.startFastTrackGracePeriod(userLadderData.email);
      
      if (result.success) {
        alert(`✅ ${result.message}\n\nGrace period expires in 14 days.`);
        onClose();
        window.location.reload();
      } else {
        alert(`Error: ${result.error || 'Failed to start grace period'}`);
      }
    } catch (error) {
      console.error('Error starting grace period:', error);
      alert('Error starting grace period. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
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
      <div style={{ padding: '15px' }}>
        {/* Current Status */}
        {gracePeriodStatus?.isActive && (
          <div style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px', 
            padding: '12px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: '#ffc107',
              margin: '0 0 6px 0',
              fontSize: '1.1rem'
            }}>
              ⏰ Grace Period Active
            </h3>
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1rem' }}>
              <strong>{gracePeriodStatus.daysRemaining || 0} days</strong> remaining
            </p>
            <p style={{ color: '#ccc', margin: '5px 0 0 0', fontSize: '0.85rem' }}>
              Maintain your 500+ rating to move up to the 500+ ladder
            </p>
          </div>
        )}

        {fastTrackStatus?.hasFastTrack && !fastTrackStatus.isExpired && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)', 
            borderRadius: '8px', 
            padding: '12px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: '#10b981',
              margin: '0 0 6px 0',
              fontSize: '1.1rem'
            }}>
              🚀 Fast Track Active
            </h3>
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1rem' }}>
              <strong>{fastTrackStatus.challengesRemaining}</strong> fast track challenges remaining
            </p>
            {fastTrackStatus.daysRemaining > 0 && (
              <p style={{ color: '#ccc', margin: '5px 0 0 0', fontSize: '0.85rem' }}>
                Expires in <strong>{fastTrackStatus.daysRemaining} days</strong>
              </p>
            )}
          </div>
        )}

        {/* System Explanation */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ color: '#10b981', marginBottom: '8px', fontSize: '1rem', textAlign: 'center' }}>How the Fast Track Re-entry System Works</h4>
          
          {/* Over Ladder Max */}
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)', 
            borderRadius: '8px', 
            padding: '12px',
            marginBottom: '8px'
          }}>
            <h5 style={{ color: '#3b82f6', margin: '0 0 6px 0', fontSize: '0.95rem' }}>📈 When Your Fargo Goes Over Ladder Max:</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
              <li><strong>Grace Period:</strong> You get 14 days to see if your rating stays high</li>
              <li><strong>Still Over After 14 Days:</strong> Automatically move UP to next ladder</li>
              <li><strong>Drop Back Under Max:</strong> Stay on current ladder, nothing happens</li>
            </ul>
          </div>

          {/* Under Ladder Min */}
          <div style={{ 
            background: 'rgba(249, 115, 22, 0.1)', 
            border: '1px solid rgba(249, 115, 22, 0.3)', 
            borderRadius: '8px', 
            padding: '12px'
          }}>
            <h5 style={{ color: '#f97316', margin: '0 0 6px 0', fontSize: '0.95rem' }}>📉 When Your Fargo Drops Under Ladder Min:</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
              <li><strong>Grace Period:</strong> You get 14 days to recover your rating</li>
              <li><strong>Recover Above Min:</strong> Stay on current ladder, nothing happens</li>
              <li><strong>Still Under After 14 Days:</strong> Choose to stay OR move down with Fast Track</li>
              <li><strong>Fast Track Benefits:</strong> 2 extended challenges (6 spots range instead of 4)</li>
              <li><strong>Time Limit:</strong> Fast Track expires after 4 weeks</li>
            </ul>
          </div>
        </div>

        {/* Fast Track Challenge Rules */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem', textAlign: 'center' }}>Fast Track Challenge Rules</h4>
          <div style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px', 
            padding: '12px'
          }}>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
              <li><strong>Extended Range:</strong> Can challenge up to 6 spots instead of normal 4 spots</li>
              <li><strong>Insertion Mechanics:</strong> Winner takes defender's position, everyone below moves down one spot</li>
              <li><strong>Limited Use:</strong> Only 2 fast track challenges total</li>
              <li><strong>Same Ladder:</strong> Both players must be on the same ladder</li>
              <li><strong>Must Win:</strong> You still have to win the match to advance</li>
            </ul>
          </div>
        </div>

        {/* Benefits */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ color: '#10b981', marginBottom: '8px', fontSize: '1rem', textAlign: 'center' }}>Why This System is Fair</h4>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            borderRadius: '8px', 
            padding: '12px'
          }}>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
              <li><strong>No Unfair Bumping:</strong> Existing ladder players are never moved down unfairly</li>
              <li><strong>Earned Privileges:</strong> Fast track challenge positions must be earned by winning matches</li>
              <li><strong>Time Limited:</strong> Privileges expire to prevent abuse</li>
              <li><strong>Player Choice:</strong> You decide whether to stay on the higher ladder or move down</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
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
  );
};

export default FastTrackModal;
