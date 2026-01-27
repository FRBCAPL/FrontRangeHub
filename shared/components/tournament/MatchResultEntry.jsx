import React, { useState } from 'react';
import tournamentService from '@shared/services/services/tournamentService';

const MatchResultEntry = ({ match, onResultSubmitted, onCancel }) => {
  const [selectedWinner, setSelectedWinner] = useState('');
  const [score, setScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!selectedWinner) {
      setError('Please select a winner');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const winnerId = selectedWinner === 'player1' ? match.player1_id : match.player2_id;
      const winnerName = selectedWinner === 'player1' ? match.player1_name : match.player2_name;
      const loserId = selectedWinner === 'player1' ? match.player2_id : match.player1_id;
      const loserName = selectedWinner === 'player1' ? match.player2_name : match.player1_name;

      const result = await tournamentService.updateMatchResult(
        match.id,
        winnerId,
        winnerName,
        loserId,
        loserName,
        score || null
      );

      if (result.success) {
        if (onResultSubmitted) {
          onResultSubmitted(result.data);
        }
      } else {
        setError(result.error || 'Failed to submit result');
      }
    } catch (err) {
      console.error('Error submitting result:', err);
      setError('An error occurred while submitting the result');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.95)',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '2px solid #00ff00',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ color: '#00ff00', margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>
          Enter Match Result
        </h3>
        <div style={{ color: '#8b5cf6', fontSize: '0.9rem' }}>
          Round {match.round_number} • Match {match.match_number}
        </div>
      </div>

      {/* Match Info */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ color: '#ffc107', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {formatCurrency(match.payout_amount)}
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Prize Money</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ 
            flex: 1, 
            textAlign: 'center',
            padding: '0.75rem',
            background: selectedWinner === 'player1' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: selectedWinner === 'player1' ? '2px solid #00ff00' : '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setSelectedWinner('player1')}
          >
            <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
              {match.player1_name}
            </div>
            {selectedWinner === 'player1' && (
              <div style={{ color: '#00ff00', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                ✅ Winner
              </div>
            )}
          </div>

          <div style={{ color: '#666', fontSize: '1.5rem', fontWeight: 'bold' }}>
            VS
          </div>

          <div style={{ 
            flex: 1, 
            textAlign: 'center',
            padding: '0.75rem',
            background: selectedWinner === 'player2' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: selectedWinner === 'player2' ? '2px solid #00ff00' : '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setSelectedWinner('player2')}
          >
            <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
              {match.player2_name}
            </div>
            {selectedWinner === 'player2' && (
              <div style={{ color: '#00ff00', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                ✅ Winner
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Dropdown */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
          Score (Optional)
        </label>
        <select
          value={score}
          onChange={(e) => setScore(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem'
          }}
        >
          <option value="">Select Score (Optional)</option>
          <option value="7-0">7-0</option>
          <option value="7-1">7-1</option>
          <option value="7-2">7-2</option>
          <option value="7-3">7-3</option>
          <option value="7-4">7-4</option>
          <option value="7-5">7-5</option>
          <option value="7-6">7-6</option>
          <option value="8-0">8-0</option>
          <option value="8-1">8-1</option>
          <option value="8-2">8-2</option>
          <option value="8-3">8-3</option>
          <option value="8-4">8-4</option>
          <option value="8-5">8-5</option>
          <option value="8-6">8-6</option>
          <option value="8-7">8-7</option>
          <option value="9-0">9-0</option>
          <option value="9-1">9-1</option>
          <option value="9-2">9-2</option>
          <option value="9-3">9-3</option>
          <option value="9-4">9-4</option>
          <option value="9-5">9-5</option>
          <option value="9-6">9-6</option>
          <option value="9-7">9-7</option>
          <option value="9-8">9-8</option>
          <option value="10-0">10-0</option>
          <option value="10-1">10-1</option>
          <option value="10-2">10-2</option>
          <option value="10-3">10-3</option>
          <option value="10-4">10-4</option>
          <option value="10-5">10-5</option>
          <option value="10-6">10-6</option>
          <option value="10-7">10-7</option>
          <option value="10-8">10-8</option>
          <option value="10-9">10-9</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          color: '#ff4444',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <button
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedWinner}
          style={{
            padding: '0.75rem',
            background: selectedWinner && !submitting 
              ? 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)'
              : 'rgba(100, 100, 100, 0.3)',
            border: 'none',
            borderRadius: '8px',
            color: selectedWinner && !submitting ? '#000' : '#666',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: selectedWinner && !submitting ? 'pointer' : 'not-allowed'
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Result'}
        </button>
      </div>
    </div>
  );
};

export default MatchResultEntry;

