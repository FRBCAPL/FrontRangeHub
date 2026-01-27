import React, { useState } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { BACKEND_URL } from '@shared/config/config.js';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import { getMinDateForInput, formatDateForDisplay } from '@shared/utils/utils/dateUtils.js';
import './LadderCounterProposalModal.css';

const LadderCounterProposalModal = ({ 
  isOpen, 
  onClose, 
  challenge, 
  currentUser,
  onCounterProposalSubmitted 
}) => {
  const [counterProposal, setCounterProposal] = useState({
    entryFee: challenge?.matchDetails?.entryFee || 5,
    raceLength: challenge?.matchDetails?.raceLength || 5,
    gameType: challenge?.matchDetails?.gameType || '8-ball',
    tableSize: challenge?.matchDetails?.tableSize || '7-foot',
    location: challenge?.matchDetails?.location || 'Legends Brews & Cues',
    preferredDates: [],
    note: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newDate, setNewDate] = useState('');

  // Available options
  const gameTypes = ['8-ball', '9-ball', '10-ball', 'mixed'];
  const tableSizes = ['7-foot', '9-foot'];
  const locations = [
    'Legends Brews & Cues',
    'Shooters Pool Hall',
    'Rack Em Up',
    'The Break Room',
    'Corner Pocket',
    'Cue Club',
    'Pool Palace',
    'Billiards & Brews',
    'The Rack',
    'My House'
  ];

  const raceLengths = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

  const handleInputChange = (field, value) => {
    setCounterProposal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPreferredDate = () => {
    if (newDate && !counterProposal.preferredDates.includes(newDate)) {
      setCounterProposal(prev => ({
        ...prev,
        preferredDates: [...prev.preferredDates, newDate]
      }));
      setNewDate('');
    }
  };

  const removePreferredDate = (dateToRemove) => {
    setCounterProposal(prev => ({
      ...prev,
      preferredDates: prev.preferredDates.filter(date => date !== dateToRemove)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Use Supabase instead of old backend API
      const result = await supabaseDataService.counterProposeChallenge(challenge._id || challenge.id, {
        ...counterProposal,
        preferredDates: counterProposal.preferredDates
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit counter-proposal');
      }

      // Send counter-proposal email to challenger
      await sendCounterProposalEmail({
        to_email: challenge.challenger.email,
        to_name: `${challenge.challenger.firstName} ${challenge.challenger.lastName}`,
        from_name: `${currentUser.firstName} ${currentUser.lastName}`,
        original_challenge_type: challenge.challengeType,
        original_entry_fee: challenge.matchDetails.entryFee,
        original_race_length: challenge.matchDetails.raceLength,
        original_game_type: challenge.matchDetails.gameType,
        original_location: challenge.matchDetails.location,
        counter_entry_fee: counterProposal.entryFee,
        counter_race_length: counterProposal.raceLength,
        counter_game_type: counterProposal.gameType,
        counter_location: counterProposal.location,
        counter_dates: counterProposal.preferredDates,
        counter_note: counterProposal.note,
        challenge_id: challenge._id
      });

      if (onCounterProposalSubmitted) {
        onCounterProposalSubmitted('counter-proposed', result);
      }
      
      onClose();
    } catch (err) {
      console.error('Error submitting counter-proposal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendCounterProposalEmail = async (emailData) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/send-counter-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        console.error('Failed to send counter-proposal email');
      }
    } catch (error) {
      console.error('Error sending counter-proposal email:', error);
    }
  };

  if (!isOpen || !challenge) return null;

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title="🔄 Counter-Proposal"
      maxWidth="700px"
    >
      <div style={{ padding: '20px' }}>
        {/* Original Challenge Display */}
        <div style={{ 
          background: 'rgba(255, 68, 68, 0.1)', 
          border: '1px solid rgba(255, 68, 68, 0.3)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ color: '#ff4444', margin: '0 0 12px 0' }}>Original Challenge</h4>
          <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><strong>Entry Fee:</strong> ${challenge.matchDetails.entryFee}</div>
              <div><strong>Race Length:</strong> {challenge.matchDetails.raceLength}</div>
              <div><strong>Game Type:</strong> {challenge.matchDetails.gameType}</div>
              <div><strong>Location:</strong> {challenge.matchDetails.location}</div>
            </div>
          </div>
        </div>

        {/* Counter-Proposal Form */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#10b981', marginBottom: '16px' }}>Your Counter-Proposal</h4>
          
          {/* Entry Fee */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
              Entry Fee ($)
            </label>
            <input
              type="number"
              value={counterProposal.entryFee}
              onChange={(e) => handleInputChange('entryFee', parseInt(e.target.value) || 0)}
              min="0"
              max="50"
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

          {/* Race Length */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
              Race Length
            </label>
            <select
              value={counterProposal.raceLength}
              onChange={(e) => handleInputChange('raceLength', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            >
              {raceLengths.map(length => (
                <option key={length} value={length}>Race to {length}</option>
              ))}
            </select>
          </div>

          {/* Game Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
              Game Type
            </label>
            <select
              value={counterProposal.gameType}
              onChange={(e) => handleInputChange('gameType', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            >
              {gameTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Table Size */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
              Table Size
            </label>
            <select
              value={counterProposal.tableSize}
              onChange={(e) => handleInputChange('tableSize', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            >
              {tableSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
              Location
            </label>
            <select
              value={counterProposal.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            >
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Preferred Dates */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
              Preferred Dates
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={getMinDateForInput()}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff'
                }}
              />
              <button
                type="button"
                onClick={addPreferredDate}
                disabled={!newDate}
                style={{
                  padding: '8px 16px',
                  background: newDate ? '#10b981' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newDate ? 'pointer' : 'not-allowed'
                }}
              >
                Add
              </button>
            </div>
            
            {counterProposal.preferredDates.length > 0 && (
              <div style={{ 
                background: 'rgba(0, 0, 0, 0.3)', 
                borderRadius: '4px', 
                padding: '8px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {counterProposal.preferredDates.map((date, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '4px 0',
                    borderBottom: index < counterProposal.preferredDates.length - 1 ? '1px solid #444' : 'none'
                  }}>
                    <span style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                      {formatDateForDisplay(date, { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePreferredDate(date)}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Counter-Proposal Note */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
              Counter-Proposal Note
            </label>
            <textarea
              value={counterProposal.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              rows="3"
              placeholder="Explain your counter-proposal..."
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
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ 
            background: 'rgba(255, 0, 0, 0.1)', 
            border: '1px solid #ff0000', 
            borderRadius: '4px', 
            padding: '8px', 
            marginBottom: '16px',
            color: '#ff6666'
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading || counterProposal.preferredDates.length === 0}
            style={{
              padding: '12px 24px',
              background: loading || counterProposal.preferredDates.length === 0 ? '#666' : 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || counterProposal.preferredDates.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Submitting...' : 
             counterProposal.preferredDates.length === 0 ? 'Add Dates First' : 'Submit Counter-Proposal'}
          </button>
        </div>
      </div>
    </DraggableModal>
  );
};

export default LadderCounterProposalModal;
