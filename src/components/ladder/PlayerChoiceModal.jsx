import React, { useState } from 'react';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';

const PlayerChoiceModal = ({ 
  isOpen, 
  onClose, 
  userLadderData, 
  userPin,
  onChoiceMade 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);

  if (!isOpen) return null;

  const handleChoice = async (choice) => {
    if (!userLadderData?.unifiedAccount?.unifiedUserId) return;
    
    setLoading(true);
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
        setSelectedChoice(choice);
        if (onChoiceMade) {
          onChoiceMade(choice);
        }
        onClose();
        // Refresh page to show updated ladder position
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to record choice'}`);
      }
    } catch (error) {
      console.error('Error recording player choice:', error);
      alert('Error recording your choice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title="🤔 Choose Your Ladder Path"
      maxWidth="600px"
      borderColor="#ffc107"
      textColor="#ffffff"
      glowColor="#ffc107"
      zIndex={100000}
      style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        color: '#ffffff'
      }}
    >
      <div style={{ padding: '20px' }}>
        {/* Explanation */}
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
            Your Fargo rating has fallen below 499
          </h3>
          <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1rem' }}>
            You need to choose your ladder path. This choice cannot be changed later.
          </p>
        </div>

        {/* Choice Options */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          {/* Option 1: Stay on 500+ Ladder */}
          <div style={{ 
            flex: 1,
            background: 'rgba(0, 0, 0, 0.3)', 
            border: '2px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px', 
            padding: '20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.3s ease'
          }}
          onClick={() => !loading && handleChoice('stay')}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#ffc107';
              e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)';
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.3)';
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
            }
          }}
          >
            <h4 style={{ 
              color: '#ffc107', 
              margin: '0 0 10px 0', 
              fontSize: '1.1rem',
              textAlign: 'center'
            }}>
              🏆 Stay on 500+ Ladder
            </h4>
            <ul style={{ 
              color: '#e0e0e0', 
              paddingLeft: '15px', 
              margin: 0, 
              fontSize: '0.9rem', 
              lineHeight: '1.4' 
            }}>
              <li>Keep your current position on the 500+ ladder</li>
              <li>Work your way up through normal challenges</li>
              <li>No special privileges</li>
              <li>Standard 4-spot challenge range</li>
            </ul>
          </div>

          {/* Option 2: Move Down with Fast Track */}
          <div style={{ 
            flex: 1,
            background: 'rgba(0, 0, 0, 0.3)', 
            border: '2px solid rgba(16, 185, 129, 0.3)', 
            borderRadius: '8px', 
            padding: '20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.3s ease'
          }}
          onClick={() => !loading && handleChoice('move_down')}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
            }
          }}
          >
            <h4 style={{ 
              color: '#10b981', 
              margin: '0 0 10px 0', 
              fontSize: '1.1rem',
              textAlign: 'center'
            }}>
              🚀 Move Down with Fast Track
            </h4>
            <ul style={{ 
              color: '#e0e0e0', 
              paddingLeft: '15px', 
              margin: 0, 
              fontSize: '0.9rem', 
              lineHeight: '1.4' 
            }}>
              <li>Start at bottom of 499 ladder</li>
              <li>Get 2 fast track challenges (6 spots up)</li>
              <li>4 weeks to use fast track privileges</li>
              <li>Climb back up quickly if you're good enough</li>
            </ul>
          </div>
        </div>

        {/* Important Notice */}
        <div style={{ 
          background: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
            ⚠️ Important: This choice cannot be changed later. Choose carefully!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ color: '#ffc107', fontSize: '1rem' }}>
              Processing your choice...
            </p>
          </div>
        )}

        {/* Close Button (only show if not loading) */}
        {!loading && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default PlayerChoiceModal;
