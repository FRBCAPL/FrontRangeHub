import React, { useState } from 'react';

const MatchValidationModal = ({ 
  isOpen, 
  onClose, 
  match, 
  onValidate, 
  onReject 
}) => {
  const [validationData, setValidationData] = useState({
    actualDate: '',
    actualTime: '',
    actualLocation: '',
    winner: '',
    score: '',
    notes: '',
    witnesses: '',
    photos: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !match) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!validationData.actualDate || !validationData.winner || !validationData.score) {
        alert('Please fill in all required fields: Date, Winner, and Score');
        return;
      }

      // Call validation function
      await onValidate({
        matchId: match._id,
        ...validationData
      });

      onClose();
    } catch (error) {
      console.error('Error validating match:', error);
      alert('Error validating match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this match completion? This will require the match to be replayed.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(match._id);
      onClose();
    } catch (error) {
      console.error('Error rejecting match:', error);
      alert('Error rejecting match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#222',
        border: '2px solid #444',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, color: '#fff' }}>🎯 Match Validation</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Match Info */}
        <div style={{
          background: '#333',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Match Details</h3>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            <div><strong>Players:</strong> {match.player1} vs {match.player2}</div>
            <div><strong>Scheduled Date:</strong> {match.date}</div>
            <div><strong>Location:</strong> {match.location}</div>
          </div>
        </div>

        {/* Validation Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
              Actual Date Played * <span style={{ color: '#ff4444' }}>Required</span>
            </label>
            <input
              type="date"
              value={validationData.actualDate}
              onChange={(e) => setValidationData({...validationData, actualDate: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
              Actual Time Played
            </label>
            <input
              type="time"
              value={validationData.actualTime}
              onChange={(e) => setValidationData({...validationData, actualTime: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
              Actual Location
            </label>
            <input
              type="text"
              value={validationData.actualLocation}
              onChange={(e) => setValidationData({...validationData, actualLocation: e.target.value})}
              placeholder="Where was the match actually played?"
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
              Winner * <span style={{ color: '#ff4444' }}>Required</span>
            </label>
            <select
              value={validationData.winner}
              onChange={(e) => setValidationData({...validationData, winner: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff'
              }}
              required
            >
              <option value="">Select winner...</option>
              <option value={match.player1}>{match.player1}</option>
              <option value={match.player2}>{match.player2}</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
              Final Score * <span style={{ color: '#ff4444' }}>Required</span>
            </label>
            <input
              type="text"
              value={validationData.score}
              onChange={(e) => setValidationData({...validationData, score: e.target.value})}
              placeholder="e.g., 7-3, 8-2, etc."
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
              Witnesses (optional)
            </label>
            <input
              type="text"
              value={validationData.witnesses}
              onChange={(e) => setValidationData({...validationData, witnesses: e.target.value})}
              placeholder="Names of people who witnessed the match"
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
              Additional Notes
            </label>
            <textarea
              value={validationData.notes}
              onChange={(e) => setValidationData({...validationData, notes: e.target.value})}
              placeholder="Any additional details about the match..."
              rows="3"
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleReject}
              disabled={isSubmitting}
              style={{
                padding: '10px 16px',
                background: '#ff4444',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Rejecting...' : 'Reject Match'}
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 16px',
                background: '#00aa00',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Validating...' : 'Validate Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MatchValidationModal; 