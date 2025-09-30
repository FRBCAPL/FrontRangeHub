import React, { useState, useEffect } from 'react';
import DraggableModal from '../modal/DraggableModal';
import LadderCounterProposalModal from './LadderCounterProposalModal';
import { BACKEND_URL } from '../../config.js';
import './LadderChallengeConfirmModal.css';

const LadderChallengeConfirmModal = ({ 
  isOpen, 
  onClose, 
  challenge, 
  currentUser,
  onChallengeResponse 
}) => {
  const [userNote, setUserNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [declineStatus, setDeclineStatus] = useState(null);
  const [loadingDeclineStatus, setLoadingDeclineStatus] = useState(false);

  // Fetch decline status when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchDeclineStatus();
    }
  }, [isOpen, currentUser]);

  const fetchDeclineStatus = async () => {
    setLoadingDeclineStatus(true);
    try {
      const email = currentUser.email || currentUser.unifiedAccount?.email;
      const response = await fetch(`${BACKEND_URL}/api/ladder/player/${encodeURIComponent(email)}/decline-status`);
      
      if (response.ok) {
        const data = await response.json();
        setDeclineStatus(data.declineStatus);
      } else {
        console.error('Failed to fetch decline status');
        setDeclineStatus(null);
      }
    } catch (error) {
      console.error('Error fetching decline status:', error);
      setDeclineStatus(null);
    } finally {
      setLoadingDeclineStatus(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/challenge/${challenge._id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: userNote,
          selectedDate: selectedDate
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept challenge');
      }

      // Send confirmation email
      await sendConfirmationEmail({
        to_email: challenge.challenger.email,
        to_name: `${challenge.challenger.firstName} ${challenge.challenger.lastName}`,
        from_name: `${currentUser.firstName} ${currentUser.lastName}`,
        challenge_type: challenge.challengeType,
        entry_fee: challenge.matchDetails.entryFee,
        race_length: challenge.matchDetails.raceLength,
        game_type: challenge.matchDetails.gameType,
        location: challenge.matchDetails.location,
        note: userNote,
        challenge_id: challenge._id,
        match_date: selectedDate
      });

      if (onChallengeResponse) {
        onChallengeResponse('accepted', result);
      }
      
      onClose();
    } catch (err) {
      console.error('Error accepting challenge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/challenge/${challenge._id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: userNote
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline challenge');
      }

      if (onChallengeResponse) {
        onChallengeResponse('declined', result);
      }
      
      // Refresh decline status after declining
      await fetchDeclineStatus();
      
      onClose();
    } catch (err) {
      console.error('Error declining challenge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCounter = () => {
    setShowCounterModal(true);
  };

  const sendConfirmationEmail = async (emailData) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/send-challenge-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        console.error('Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  };

  const getChallengeTypeDescription = (type) => {
    const descriptions = {
      'challenge': 'Challenge Match',
      'smackdown': 'SmackDown Match',
      'smackback': 'SmackBack Match',
      'fast-track': 'Fast Track Challenge',
      'reverse-fast-track': 'Reverse Fast Track Challenge'
    };
    return descriptions[type] || type;
  };

  const getPositionChangeDescription = () => {
    if (challenge.challengeType === 'challenge') {
      return 'If you win: Positions remain unchanged. If challenger wins: You switch positions.';
    } else if (challenge.challengeType === 'smackdown') {
      return 'If challenger wins: You move 3 spots down, challenger moves 2 spots up. If you win: You switch positions.';
    } else if (challenge.challengeType === 'smackback') {
      return 'If challenger wins: They move to 1st place, all others move down. If you win: Positions remain unchanged.';
    } else if (challenge.challengeType === 'fast-track' || challenge.challengeType === 'reverse-fast-track') {
      return 'If challenger wins: They take your position, you move to their old spot, others between move down one. If you win: Positions remain unchanged.';
    }
    return '';
  };

  if (!isOpen || !challenge) return null;

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title={`🎯 ${getChallengeTypeDescription(challenge.challengeType)}`}
      maxWidth="600px"
    >
      <div style={{ padding: '20px' }}>
        {/* Challenge Header */}
        <div style={{ 
          background: 'rgba(255, 68, 68, 0.1)', 
          border: '1px solid rgba(255, 68, 68, 0.3)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ color: '#ff4444', margin: '0 0 12px 0', textAlign: 'center' }}>
            {challenge.challenger.firstName} {challenge.challenger.lastName} vs {challenge.defender.firstName} {challenge.defender.lastName}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', color: '#e0e0e0' }}>
            <div>
              <strong>Challenger:</strong><br />
              Position {challenge.challenger.position}<br />
              {challenge.challenger.ladderName}
            </div>
            <div style={{ fontSize: '24px', color: '#ff4444' }}>⚔️</div>
            <div>
              <strong>Defender:</strong><br />
              Position {challenge.defender.position}<br />
              {challenge.defender.ladderName}
            </div>
          </div>
        </div>

        {/* Challenge Details */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#ffc107', marginBottom: '12px' }}>Match Details</h4>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            borderRadius: '8px', 
            padding: '16px',
            color: '#e0e0e0'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <strong>Entry Fee:</strong> ${challenge.matchDetails.entryFee}
              </div>
              <div>
                <strong>Race Length:</strong> {challenge.matchDetails.raceLength}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <strong>Game Type:</strong> {challenge.matchDetails.gameType}
              </div>
              <div>
                <strong>Table Size:</strong> {challenge.matchDetails.tableSize}
              </div>
            </div>
            <div>
              <strong>Location:</strong> {challenge.matchDetails.location}
            </div>
          </div>
          
          {/* Match Fee Information */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
              💰 Match Fee Information
            </div>
            <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
              The <strong>winner</strong> reports the match and pays the <strong>$5 match fee</strong>.
              <br />
              <em>Only one $5 fee per match - not per player!</em>
            </div>
          </div>
        </div>

        {/* Position Changes */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#ffc107', marginBottom: '12px' }}>Position Changes</h4>
          <div style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px', 
            padding: '12px',
            color: '#e0e0e0',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            {getPositionChangeDescription()}
          </div>
        </div>

        {/* Decline Status */}
        {declineStatus && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '12px' }}>Decline Status</h4>
            <div style={{ 
              background: declineStatus.availableDeclines > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
              border: declineStatus.availableDeclines > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)', 
              borderRadius: '8px', 
              padding: '12px',
              color: '#e0e0e0',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span>
                  <strong>Available Declines:</strong> {declineStatus.availableDeclines}/2
                </span>
                <span style={{ 
                  color: declineStatus.availableDeclines > 0 ? '#10b981' : '#dc2626',
                  fontWeight: 'bold'
                }}>
                  {declineStatus.availableDeclines > 0 ? '✅ Can Decline' : '❌ No Declines Left'}
                </span>
              </div>
              
              {declineStatus.availableDeclines === 0 && (
                <div style={{ 
                  background: 'rgba(220, 38, 38, 0.2)',
                  border: '1px solid rgba(220, 38, 38, 0.4)',
                  borderRadius: '4px',
                  padding: '8px',
                  marginTop: '8px',
                  color: '#fca5a5',
                  fontSize: '0.85rem'
                }}>
                  ⚠️ <strong>Warning:</strong> You have no declines remaining. If you decline this challenge, 
                  the challenger will move up one position and you will move down one position.
                  {declineStatus.nextResetDate && (
                    <div style={{ marginTop: '4px' }}>
                      Next decline resets in {declineStatus.daysUntilNextReset} days.
                    </div>
                  )}
                </div>
              )}
              
              {declineStatus.availableDeclines > 0 && (
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '4px',
                  padding: '8px',
                  marginTop: '8px',
                  color: '#6ee7b7',
                  fontSize: '0.85rem'
                }}>
                  ℹ️ <strong>Decline Effect:</strong> If you decline this challenge, 
                  the challenger will move up one position and you will move down one position.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Challenge Message */}
        {challenge.challengePost.postContent && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '12px' }}>Challenge Message</h4>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              borderRadius: '8px', 
              padding: '12px',
              color: '#e0e0e0',
              fontSize: '0.9rem',
              lineHeight: '1.4',
              whiteSpace: 'pre-line'
            }}>
              {challenge.challengePost.postContent}
            </div>
          </div>
        )}

        {/* Preferred Dates Selection */}
        {challenge.matchDetails.preferredDates && challenge.matchDetails.preferredDates.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '12px' }}>Select Match Date</h4>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              borderRadius: '8px', 
              padding: '12px',
              color: '#e0e0e0'
            }}>
              <p style={{ marginBottom: '12px', fontSize: '0.9rem', color: '#ccc' }}>
                Choose from the challenger's preferred dates:
              </p>
              {challenge.matchDetails.preferredDates.map((date, index) => (
                <label key={index} style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  background: selectedDate === date ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  border: selectedDate === date ? '1px solid #10b981' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="selectedDate"
                    value={date}
                    checked={selectedDate === date}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </label>
              ))}
              {selectedDate && (
                <div style={{ 
                  marginTop: '12px',
                  padding: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '4px',
                  color: '#10b981',
                  fontSize: '0.9rem'
                }}>
                  ✅ Match scheduled for: {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Response Note */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px' }}>
            Your Response Note (Optional)
          </label>
          <textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
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
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <button
            onClick={handleDecline}
            disabled={loading || loadingDeclineStatus || (declineStatus && declineStatus.availableDeclines === 0)}
            style={{
              padding: '12px 24px',
              background: loading || loadingDeclineStatus || (declineStatus && declineStatus.availableDeclines === 0) ? '#666' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || loadingDeclineStatus || (declineStatus && declineStatus.availableDeclines === 0) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Processing...' : 
             loadingDeclineStatus ? 'Loading...' :
             (declineStatus && declineStatus.availableDeclines === 0) ? 'No Declines Left' : 'Decline'}
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCounter}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: loading ? '#666' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Counter
            </button>
            
            <button
              onClick={handleAccept}
              disabled={loading || (challenge.matchDetails.preferredDates && challenge.matchDetails.preferredDates.length > 0 && !selectedDate)}
              style={{
                padding: '12px 24px',
                background: loading || (challenge.matchDetails.preferredDates && challenge.matchDetails.preferredDates.length > 0 && !selectedDate) ? '#666' : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || (challenge.matchDetails.preferredDates && challenge.matchDetails.preferredDates.length > 0 && !selectedDate) ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Processing...' : 
               (challenge.matchDetails.preferredDates && challenge.matchDetails.preferredDates.length > 0 && !selectedDate) ? 'Select Date First' : 'Accept'}
            </button>
          </div>
        </div>

        {/* Deadline Warning */}
        <div style={{ 
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '4px',
          color: '#ffc107',
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          ⏰ This challenge expires on {new Date(challenge.deadline).toLocaleDateString()}
        </div>
      </div>
      
      {/* Counter-Proposal Modal */}
      <LadderCounterProposalModal
        isOpen={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        challenge={challenge}
        currentUser={currentUser}
        onCounterProposalSubmitted={onChallengeResponse}
      />
    </DraggableModal>
  );
};

export default LadderChallengeConfirmModal;
