import React, { useState } from 'react';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';
import { getMinDateForInput } from '../../utils/dateUtils';
import './RescheduleResponseModal.css';

const RescheduleResponseModal = ({ 
  isOpen, 
  onClose, 
  rescheduleRequest, 
  currentUser,
  onResponseSubmitted 
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [responseNote, setResponseNote] = useState('');
  const [showCounter, setShowCounter] = useState(false);
  const [counterDates, setCounterDates] = useState([]);
  const [counterTimes, setCounterTimes] = useState({});
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('19:00');
  const [counterReason, setCounterReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!selectedDate) {
      setError('Please select a date to accept');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/reschedule/${rescheduleRequest._id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedDate,
          selectedTime: rescheduleRequest.proposedTimes?.[selectedDate] || null,
          responseNote: responseNote.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept reschedule');
      }

      if (onResponseSubmitted) {
        onResponseSubmitted('accepted', result);
      }
      
      onClose();
    } catch (err) {
      console.error('Error accepting reschedule:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/reschedule/${rescheduleRequest._id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseNote: responseNote.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline reschedule');
      }

      if (onResponseSubmitted) {
        onResponseSubmitted('declined', result);
      }
      
      onClose();
    } catch (err) {
      console.error('Error declining reschedule:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCounterDate = () => {
    if (!newDate) {
      setError('Please select a date');
      return;
    }
    
    if (counterDates.includes(newDate)) {
      setError('This date is already added');
      return;
    }
    
    setCounterDates([...counterDates, newDate]);
    setCounterTimes({...counterTimes, [newDate]: newTime});
    setNewDate('');
    setNewTime('19:00');
    setError('');
  };

  const handleRemoveCounterDate = (dateToRemove) => {
    setCounterDates(counterDates.filter(d => d !== dateToRemove));
    const newTimes = {...counterTimes};
    delete newTimes[dateToRemove];
    setCounterTimes(newTimes);
  };

  const handleSubmitCounter = async () => {
    if (counterDates.length === 0) {
      setError('Please add at least one proposed date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/reschedule/${rescheduleRequest._id}/counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposedDates: counterDates,
          proposedTimes: counterTimes,
          reason: counterReason.trim() || 'Counter-proposal with different dates'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit counter-proposal');
      }

      if (onResponseSubmitted) {
        onResponseSubmitted('countered', result);
      }
      
      onClose();
    } catch (err) {
      console.error('Error submitting counter-proposal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !rescheduleRequest) return null;

  const requesterName = rescheduleRequest.requestedBy ? 
    `${rescheduleRequest.requestedBy.firstName} ${rescheduleRequest.requestedBy.lastName}` : 
    'Opponent';

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title="📅 Reschedule Request"
      maxWidth="700px"
    >
      <div style={{ padding: '20px' }}>
        {!showCounter ? (
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
                <div><strong>Scheduled:</strong> {new Date(rescheduleRequest.currentDate).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}</div>
              </div>
            </div>

            {/* Proposed Dates */}
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ color: '#10b981', margin: '0 0 12px 0' }}>
                Proposed Dates from {requesterName}
              </h4>
              {rescheduleRequest.proposedDates.map((date, index) => {
                const dateStr = new Date(date).toISOString().split('T')[0];
                const time = rescheduleRequest.proposedTimes?.[dateStr] || rescheduleRequest.proposedTimes?.[date];
                
                return (
                  <label 
                    key={index}
                    style={{ 
                      display: 'block',
                      padding: '12px',
                      background: selectedDate === dateStr ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                      border: selectedDate === dateStr ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="radio"
                      name="selectedDate"
                      value={dateStr}
                      checked={selectedDate === dateStr}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{ marginRight: '12px' }}
                    />
                    <span style={{ color: '#e0e0e0', fontSize: '0.95rem' }}>
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {time && ` at ${new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}`}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Reason */}
            {rescheduleRequest.reason && (
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '20px' 
              }}>
                <h5 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '0.9rem' }}>Reason for Reschedule:</h5>
                <p style={{ color: '#e0e0e0', fontSize: '0.9rem', margin: '0' }}>
                  {rescheduleRequest.reason}
                </p>
              </div>
            )}

            {/* Response Note */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
                Your Response Note (Optional)
              </label>
              <textarea
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows="3"
                placeholder="Add a note to your response..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff',
                  resize: 'vertical'
                }}
              />
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

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              marginTop: '20px'
            }}>
              <button
                onClick={handleDecline}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#666' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Processing...' : 'Decline'}
              </button>
              
              <button
                onClick={() => setShowCounter(true)}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#666' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Counter
              </button>
              
              <button
                onClick={handleAccept}
                disabled={loading || !selectedDate}
                style={{
                  padding: '12px 24px',
                  background: loading || !selectedDate ? '#666' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading || !selectedDate ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Processing...' : !selectedDate ? 'Select Date First' : 'Accept'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Counter-Proposal Section */}
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 12px 0' }}>🔄 Counter with Different Dates</h4>
              <p style={{ color: '#e0e0e0', fontSize: '0.9rem', margin: '0' }}>
                Propose alternative dates that work better for you
              </p>
            </div>

            {/* Original Proposed Dates (for reference) */}
            <div style={{ 
              background: 'rgba(255, 68, 68, 0.1)', 
              border: '1px solid rgba(255, 68, 68, 0.3)', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '20px' 
            }}>
              <h5 style={{ color: '#ff4444', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                Original Proposed Dates:
              </h5>
              {rescheduleRequest.proposedDates.map((date, index) => {
                const dateStr = new Date(date).toISOString().split('T')[0];
                const time = rescheduleRequest.proposedTimes?.[dateStr] || rescheduleRequest.proposedTimes?.[date];
                
                return (
                  <div key={index} style={{ color: '#e0e0e0', fontSize: '0.85rem', marginBottom: '4px' }}>
                    • {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {time && ` at ${new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}`}
                  </div>
                );
              })}
            </div>

            {/* Add Counter Date Form */}
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#10b981', marginBottom: '12px' }}>Your Counter-Proposal</h5>
              
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
                    onClick={handleAddCounterDate}
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

              {/* Counter Dates List */}
              {counterDates.length > 0 && (
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  borderRadius: '8px', 
                  padding: '12px' 
                }}>
                  <h5 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                    Your Proposed Dates:
                  </h5>
                  {counterDates.map((date, index) => (
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
                        {counterTimes[date] && ` at ${new Date(`2000-01-01T${counterTimes[date]}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCounterDate(date)}
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

            {/* Counter Reason */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
                Reason (Optional)
              </label>
              <textarea
                value={counterReason}
                onChange={(e) => setCounterReason(e.target.value)}
                rows="3"
                placeholder="Explain why these dates work better for you..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff',
                  resize: 'vertical'
                }}
              />
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

            {/* Counter Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setShowCounter(false)}
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
                Back
              </button>
              
              <button
                onClick={handleSubmitCounter}
                disabled={loading || counterDates.length === 0}
                style={{
                  padding: '12px 24px',
                  background: loading || counterDates.length === 0 ? '#666' : 
                             'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading || counterDates.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Submitting...' : 'Send Counter-Proposal'}
              </button>
            </div>
          </>
        )}
      </div>
    </DraggableModal>
  );
};

export default RescheduleResponseModal;

