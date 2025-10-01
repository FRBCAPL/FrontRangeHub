import React, { useState } from 'react';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';
import { getMinDateForInput } from '../../utils/dateUtils';
import './RescheduleRequestModal.css';

const RescheduleRequestModal = ({ 
  isOpen, 
  onClose, 
  match, 
  currentUser,
  onRescheduleSubmitted 
}) => {
  const [proposedDates, setProposedDates] = useState([]);
  const [proposedTimes, setProposedTimes] = useState({});
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('19:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddDate = () => {
    if (!newDate) {
      setError('Please select a date');
      return;
    }
    
    if (proposedDates.includes(newDate)) {
      setError('This date is already added');
      return;
    }
    
    setProposedDates([...proposedDates, newDate]);
    setProposedTimes({...proposedTimes, [newDate]: newTime});
    setNewDate('');
    setNewTime('19:00');
    setError('');
  };

  const handleRemoveDate = (dateToRemove) => {
    setProposedDates(proposedDates.filter(d => d !== dateToRemove));
    const newTimes = {...proposedTimes};
    delete newTimes[dateToRemove];
    setProposedTimes(newTimes);
  };

  const handleTimeChange = (date, time) => {
    setProposedTimes({...proposedTimes, [date]: time});
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Validate
    if (proposedDates.length === 0) {
      setError('Please add at least one proposed date');
      setLoading(false);
      return;
    }

    if (!reason || reason.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters)');
      setLoading(false);
      return;
    }

    try {
      const currentUserId = currentUser.playerId || currentUser._id;
      
      const response = await fetch(`${BACKEND_URL}/api/reschedule/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match._id,
          requestedBy: currentUserId,
          proposedDates,
          proposedTimes,
          reason: reason.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to submit reschedule request');
      }

      if (onRescheduleSubmitted) {
        onRescheduleSubmitted(result);
      }
      
      // Reset form
      setProposedDates([]);
      setProposedTimes({});
      setReason('');
      
      onClose();
    } catch (err) {
      console.error('Error submitting reschedule request:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !match) return null;

  const rescheduleCount = match.rescheduleCount || 0;
  const canReschedule = rescheduleCount < 2;

  // Determine opponent name
  const player1Id = match.player1?._id || match.challenger?._id;
  const currentUserId = currentUser.playerId || currentUser._id;
  
  const player1Name = match.player1 ? `${match.player1.firstName} ${match.player1.lastName}` : 
                      match.challenger ? `${match.challenger.firstName} ${match.challenger.lastName}` : 'Player 1';
  const player2Name = match.player2 ? `${match.player2.firstName} ${match.player2.lastName}` : 
                      match.defender ? `${match.defender.firstName} ${match.defender.lastName}` : 'Player 2';
  
  const opponentName = currentUserId === player1Id ? player2Name : player1Name;

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title="📅 Request Reschedule"
      maxWidth="700px"
    >
      <div style={{ padding: '20px' }}>
        {/* Reschedule Count Warning */}
        <div style={{ 
          background: canReschedule ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
          border: `1px solid ${canReschedule ? 'rgba(16, 185, 129, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`, 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '20px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
              <strong>Reschedules Used:</strong> {rescheduleCount}/2
            </span>
            <span style={{ 
              color: canReschedule ? '#10b981' : '#dc2626',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>
              {canReschedule ? `✅ ${2 - rescheduleCount} reschedule${2 - rescheduleCount > 1 ? 's' : ''} remaining` : '❌ Limit reached'}
            </span>
          </div>
          {!canReschedule && (
            <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '8px 0 0 0' }}>
              This match has been rescheduled the maximum number of times. Please contact admin for further rescheduling.
            </p>
          )}
        </div>

        {canReschedule ? (
          <>
            {/* Current Schedule */}
            <div style={{ 
              background: 'rgba(255, 68, 68, 0.1)', 
              border: '1px solid rgba(255, 68, 68, 0.3)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ color: '#ff4444', margin: '0 0 12px 0' }}>Current Schedule</h4>
              <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                <div><strong>Opponent:</strong> {opponentName}</div>
                <div><strong>Scheduled:</strong> {new Date(match.scheduledDate).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}</div>
                {match.venue && <div><strong>Location:</strong> {match.venue}</div>}
              </div>
            </div>

            {/* Proposed Dates */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#10b981', marginBottom: '12px' }}>Propose New Date(s)</h4>
              
              {/* Add Date Form */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: '1' }}>
                  <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={getMinDateForInput()}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #444',
                      background: '#333',
                      color: '#fff'
                    }}
                  />
                </div>
                <div style={{ flex: '0.7' }}>
                  <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #444',
                      background: '#333',
                      color: '#fff'
                    }}
                  />
                </div>
                <div style={{ flex: '0.3', display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleAddDate}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Proposed Dates List */}
              {proposedDates.length > 0 && (
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  borderRadius: '8px', 
                  padding: '12px' 
                }}>
                  <h5 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                    Proposed Dates:
                  </h5>
                  {proposedDates.map((date, index) => (
                    <div 
                      key={index}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px',
                        marginBottom: '4px'
                      }}
                    >
                      <span style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {proposedTimes[date] && ` at ${new Date(`2000-01-01T${proposedTimes[date]}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(date)}
                        style={{
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reason */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Reason for Reschedule <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="3"
                placeholder="Example: I have a work conflict and can't make the original time..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              {reason.length > 0 && reason.length < 5 && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  Reason must be at least 5 characters
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div style={{ 
                padding: '12px', 
                background: 'rgba(220, 38, 38, 0.1)', 
                border: '1px solid rgba(220, 38, 38, 0.3)', 
                borderRadius: '4px', 
                color: '#ff6b6b', 
                marginBottom: '20px',
                fontSize: '0.9rem'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Info Note */}
            <p style={{ 
              color: '#999', 
              fontSize: '0.85rem', 
              margin: '0 0 20px 0',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '4px'
            }}>
              ℹ️ {opponentName} will receive your reschedule request and can accept, counter with different dates, or decline. They have 3 days to respond.
            </p>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              marginTop: '20px'
            }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={loading || proposedDates.length === 0 || !reason.trim() || reason.length < 5}
                style={{
                  padding: '12px 24px',
                  background: loading || proposedDates.length === 0 || !reason.trim() || reason.length < 5 ? '#666' : 
                             'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading || proposedDates.length === 0 || !reason.trim() || reason.length < 5 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Submitting...' : 'Send Reschedule Request'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: '#dc2626', fontSize: '1.1rem', marginBottom: '20px' }}>
              ❌ This match has reached the maximum number of reschedules (2).
            </p>
            <p style={{ color: '#999', fontSize: '0.95rem', marginBottom: '20px' }}>
              Please contact the admin if you need to reschedule this match again.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default RescheduleRequestModal;

