import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from './DraggableModal';
import { BACKEND_URL } from '../../config.js';

const MatchSchedulingModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Name lookup, 2: Player selection (if multiple), 3: Match selection, 4: Details
  const [playerName, setPlayerName] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [availableMatches, setAvailableMatches] = useState([]);
  const [multiplePlayers, setMultiplePlayers] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [formData, setFormData] = useState({
    challengerName: '',
    challengerEmail: '',
    challengerPhone: '',
    defenderName: '',
    defenderEmail: '',
    defenderPhone: '',
    preferredDate: '',
    preferredTime: '',
    location: '',
    gameType: '9-ball',
    raceLength: '7',
    notes: '',
    matchType: 'challenge'
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMatchTypeInfo, setShowMatchTypeInfo] = useState(null);
  const [showOpponentAgreement, setShowOpponentAgreement] = useState(false);
  const [opponentAgreed, setOpponentAgreed] = useState(null);
  const [facebookPostMade, setFacebookPostMade] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [customRaceLength, setCustomRaceLength] = useState('');

  // Fetch locations when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  // Generate time options from 10am to 10pm in 30-minute increments
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 10; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 22 && minute > 0) break; // Stop at 10pm
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  };

  // Fetch locations from database
  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations`);
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const getMatchTypeDescription = (type) => {
    const descriptions = {
      'challenge': {
        title: 'Challenge Match',
        description: 'A standard ladder challenge where you challenge a player above you on the ladder. Win to move up in position!',
        rules: [
          'Players can challenge opponents up to 4 spots above them',
          'Challenger wins: Players switch positions',
          'Defender wins: Ladder positions remain unchanged',
          'Must be accepted when called out',
          'Standard entry fee applies'
        ]
      },
      'smackdown': {
        title: 'SmackDown Match',
        description: 'An intense match with special rules and higher stakes. The challenger pays full entry fee, defender pays 50%.',
        rules: [
          'Any player can call out a "SmackDown"',
          'Player calls out an opponent no more than 5 spots below them',
          'The Challenger pays the full entry fee; the Defender pays 50% of the entry fee',
          'If Challenger Wins: Opponent moves THREE spots down, challenger moves TWO spots up (but not into first place)',
          'If Challenger Loses: Players switch positions',
          'First place must be earned via a Challenge Match or SmackBack match',
          'High stakes, high reward match!'
        ]
      },
      'smackback': {
        title: 'SmackBack Match',
        description: 'A special match where a SmackDown defender can challenge for 1st place in their next match.',
        rules: [
          'If the SmackDown defender wins, they can challenge for 1st place in their next match with a SmackBack',
          'The Challenger pays the full entry fee; the Defender pays 50% of the entry fee',
          'If Challenger Wins: Moves into 1st place, all other positions move down one spot',
          'If Defender Wins: Ladder positions remain unchanged',
          'Only available after winning a SmackDown as defender within 7 days'
        ]
      }
    };
    return descriptions[type] || {
      title: 'Unknown Match Type',
      description: 'This match type is not recognized.',
      rules: ['Contact an administrator for more information.']
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlayerSelection = async (playerId) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/match-scheduling/lookup-player-by-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      });

      const data = await response.json();

      if (data.success) {
        setPlayerInfo(data.player);
        setAvailableMatches(data.availableMatches || []);
        setStep(3); // Go to match selection step
      } else {
        setError(data.message || 'Failed to load player matches.');
      }
    } catch (error) {
      console.error('Error looking up player by ID:', error);
      setError('Failed to lookup player matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameLookup = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/match-scheduling/lookup-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.multipleMatches) {
          // Multiple players found, show selection
          setMultiplePlayers(data.playerOptions || []);
          setStep(2); // Go to player selection step
        } else {
          // Single player found, proceed to match selection
          setPlayerInfo(data.player);
          setAvailableMatches(data.availableMatches || []);
          setStep(3); // Go to match selection step
        }
      } else {
        setError(data.message || 'Player not found. Please check your name and try again.');
      }
    } catch (error) {
      console.error('Error looking up player:', error);
      setError('Failed to lookup player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelection = (match) => {
    setSelectedMatch(match);
    setFormData(prev => ({
      ...prev,
      challengerName: playerInfo.name,
      challengerEmail: playerInfo.email || '',
      challengerPhone: playerInfo.phone || '',
      defenderName: match.defenderName,
      defenderEmail: match.defenderEmail || '',
      defenderPhone: match.defenderPhone || '',
      matchType: match.matchType || 'challenge'
    }));
    setShowOpponentAgreement(true);
  };

  const handleOpponentAgreement = (agreed) => {
    setOpponentAgreed(agreed);
    if (agreed) {
      // Opponent agreed, proceed to step 3
      setShowOpponentAgreement(false);
      setStep(4);
    } else {
      // Opponent didn't agree, ask about Facebook post
      setFacebookPostMade(null);
    }
  };

  const resetOpponentAgreementState = () => {
    setShowOpponentAgreement(false);
    setOpponentAgreed(null);
    setFacebookPostMade(null);
    setCustomTime('');
    setCustomLocation('');
  };

  const handleFacebookPostResponse = (postMade) => {
    setFacebookPostMade(postMade);
    if (postMade) {
      // Facebook post made, proceed with warning
      resetOpponentAgreementState();
      setStep(4);
    } else {
      // No Facebook post, don't allow to proceed
      resetOpponentAgreementState();
      setError('You must have opponent agreement or make a Facebook callout post before scheduling a match. Please contact your opponent first.');
    }
  };

  const resetForm = () => {
    setStep(1);
    setPlayerName('');
    setPlayerInfo(null);
    setAvailableMatches([]);
    setSelectedMatch(null);
    setFormData({
      challengerName: '',
      challengerEmail: '',
      challengerPhone: '',
      defenderName: '',
      defenderEmail: '',
      defenderPhone: '',
      preferredDate: '',
      preferredTime: '',
      location: '',
      notes: '',
      matchType: 'challenge'
    });
    setMessage('');
    setError('');
    setShowMatchTypeInfo(null);
    setShowOpponentAgreement(false);
    setOpponentAgreed(null);
    setFacebookPostMade(null);
    setCustomTime('');
    setCustomLocation('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/match-scheduling/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          status: 'pending_approval',
          submittedAt: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Match scheduling request submitted successfully! You will receive an email and in-app notification when an admin reviews your request.');
        // Close modal after 3 seconds
        setTimeout(() => {
          resetForm();
          onClose();
        }, 3000);
      } else {
        setError(data.message || 'Failed to submit match scheduling request');
      }
    } catch (error) {
      console.error('Error submitting match scheduling request:', error);
      setError('Failed to submit match scheduling request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderStep1 = () => (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'rgba(33, 150, 243, 0.1)',
        border: '1px solid rgba(33, 150, 243, 0.3)',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#2196F3', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
          🎯 Smart Match Scheduling
        </h3>
        <p style={{ color: '#ccc', margin: '0', fontSize: '0.9rem', lineHeight: '1.4' }}>
          Enter your name to see available matches based on ladder positions and rules. 
          The system will show you who you can challenge!
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '1rem', fontWeight: '600' }}>
          Your Name *
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your full name as it appears on the ladder"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #555',
            background: '#333',
            color: '#fff',
            fontSize: '1rem',
            boxSizing: 'border-box'
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleNameLookup()}
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid rgba(244, 67, 54, 0.3)',
          borderRadius: '6px',
          padding: '10px',
          marginBottom: '15px',
          color: '#f44336',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: '#ccc',
            border: '1px solid #555',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleNameLookup}
          disabled={loading || !playerName.trim()}
          style={{
            padding: '12px 24px',
            background: loading || !playerName.trim() ? '#666' : 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || !playerName.trim() ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          {loading ? 'Looking up...' : 'Find My Matches'}
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '20px', textAlign: 'center' }}>
        Multiple Players Found
      </h3>
      
      <p style={{ color: '#ccc', marginBottom: '20px', textAlign: 'center' }}>
        We found {multiplePlayers.length} players with similar names. Please select the correct player:
      </p>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {multiplePlayers.map((player, index) => (
          <div
            key={player._id}
            onClick={() => handlePlayerSelection(player._id)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid #555',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = '#2196F3';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.borderColor = '#555';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>
                  {player.fullName}
                </div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  Position #{player.position} • {player.ladderName} • Fargo: {player.fargoRate}
                </div>
              </div>
              <div style={{ color: '#2196F3', fontSize: '1.2rem' }}>
                →
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '20px' }}>
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setMultiplePlayers([]);
          }}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            color: '#ccc',
            border: '1px solid #555',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'rgba(76, 175, 80, 0.1)',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#4CAF50', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
          🎯 Available Matches for {playerInfo?.name}
        </h3>
        <div style={{ 
          background: 'rgba(33, 150, 243, 0.1)', 
          border: '1px solid rgba(33, 150, 243, 0.3)', 
          borderRadius: '6px', 
          padding: '10px', 
          marginBottom: '10px' 
        }}>
          <p style={{ color: '#2196F3', margin: '0', fontSize: '0.9rem', fontWeight: '600' }}>
            📍 Position: #{playerInfo?.position} • {playerInfo?.ladderName} • FargoRate: {playerInfo?.fargoRate}
          </p>
        </div>
        <p style={{ color: '#ccc', margin: '0', fontSize: '0.9rem', lineHeight: '1.4' }}>
          Based on your ladder position, here are the players you can challenge:
        </p>
      </div>

      {availableMatches.length === 0 ? (
        <div style={{
          background: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          color: '#FF9800'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>No Available Matches</h4>
          <p style={{ margin: '0', fontSize: '0.9rem' }}>
            There are currently no valid challenges available for your ladder position.
          </p>
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {availableMatches.map((match, index) => (
            <div
              key={index}
              onClick={() => handleMatchSelection(match)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${match.color || '#555'}`,
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = match.color || '#2196F3';
                e.target.style.background = `${match.color || '#2196F3'}20`;
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 4px 15px ${match.color || '#2196F3'}40`;
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = match.color || '#555';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '1.2rem', 
                      marginRight: '8px',
                      color: match.color || '#2196F3'
                    }}>
                      {match.icon || '⚔️'}
                    </span>
                    <h4 style={{ 
                      color: '#fff', 
                      margin: '0', 
                      fontSize: '1.1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      flex: 1
                    }}>
                      {match.matchType === 'challenge' ? 'Standard Challenge' :
                       match.matchType === 'smackdown' ? 'SmackDown' :
                       match.matchType === 'smackback' ? 'SmackBack' : 'Match'}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMatchTypeInfo(match.matchType);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '8px'
                      }}
                      title="Learn more about this match type"
                    >
                      ℹ️
                    </button>
                  </div>
                  
                  <h5 style={{ color: '#fff', margin: '0 0 5px 0', fontSize: '1rem' }}>
                    vs {match.defenderName}
                  </h5>
                  
                  <p style={{ color: '#ccc', margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                    Position: #{match.defenderPosition} • {match.ladderName}
                  </p>
                  
                  {match.reason && (
                    <p style={{ 
                      color: match.color || '#4CAF50', 
                      margin: '5px 0 0 0', 
                      fontSize: '0.8rem',
                      fontStyle: 'italic'
                    }}>
                      {match.reason}
                    </p>
                  )}
                </div>
                
                <div style={{ 
                  color: match.color || '#2196F3', 
                  fontSize: '1.5rem',
                  marginLeft: '15px'
                }}>
                  →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '20px' }}>
        <button
          type="button"
          onClick={() => {
            resetOpponentAgreementState();
            setStep(1);
          }}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: '#ccc',
            border: '1px solid #555',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: '#ccc',
            border: '1px solid #555',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'rgba(156, 39, 176, 0.1)',
        border: '1px solid rgba(156, 39, 176, 0.3)',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#9C27B0', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
          📅 Schedule Match Details
        </h3>
        <div style={{ 
          background: 'rgba(156, 39, 176, 0.1)', 
          border: '1px solid rgba(156, 39, 176, 0.3)', 
          borderRadius: '6px', 
          padding: '10px', 
          marginBottom: '10px' 
        }}>
          <p style={{ color: '#9C27B0', margin: '0 0 5px 0', fontSize: '0.9rem', fontWeight: '600' }}>
            {formData.matchType === 'challenge' ? '⚔️ Standard Challenge' :
             formData.matchType === 'smackdown' ? '💥 SmackDown' :
             formData.matchType === 'smackback' ? '🚀 SmackBack' : '🎯 Match'}
          </p>
          <p style={{ color: '#ccc', margin: '0', fontSize: '0.9rem', lineHeight: '1.4' }}>
            {formData.challengerName} vs {formData.defenderName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Match Details */}
        <div style={{ marginBottom: '25px' }}>
          <h4 style={{ color: '#9C27B0', margin: '0 0 15px 0', fontSize: '1rem' }}>
            📅 Match Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9rem' }}>
                Match Date *
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9rem' }}>
                Start Time * <span style={{ color: '#888', fontSize: '0.8rem' }}>(Mountain Time)</span>
              </label>
              <select
                name="preferredTime"
                value={formData.preferredTime}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setFormData(prev => ({ ...prev, preferredTime: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, preferredTime: e.target.value }));
                    setCustomTime('');
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Select a time</option>
                {generateTimeOptions().map((time, index) => (
                  <option key={index} value={time.value}>
                    {time.label}
                  </option>
                ))}
                <option value="other">Other (specify below)</option>
              </select>
              
              {formData.preferredTime === '' && (
                <input
                  type="text"
                  value={customTime}
                  onChange={(e) => {
                    setCustomTime(e.target.value);
                    setFormData(prev => ({ ...prev, preferredTime: e.target.value }));
                  }}
                  placeholder="Enter custom time (e.g., 9:30 AM)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.9rem',
                    marginTop: '5px'
                  }}
                />
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9rem' }}>
                Location *
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setFormData(prev => ({ ...prev, location: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, location: e.target.value }));
                    setCustomLocation('');
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Select a location</option>
                {loadingLocations ? (
                  <option value="" disabled>Loading locations...</option>
                ) : (
                  locations.map((location, index) => (
                    <option key={index} value={location.name}>
                      {location.name}
                    </option>
                  ))
                )}
                <option value="other">Other (specify below)</option>
              </select>
              
              {formData.location === '' && (
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => {
                    setCustomLocation(e.target.value);
                    setFormData(prev => ({ ...prev, location: e.target.value }));
                  }}
                  placeholder="Enter custom location"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.9rem',
                    marginTop: '5px'
                  }}
                />
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9rem' }}>
                Game Type *
              </label>
              <select
                name="gameType"
                value={formData.gameType}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              >
                <option value="8-ball">8-Ball</option>
                <option value="9-ball">9-Ball</option>
                <option value="10-ball">10-Ball</option>
                <option value="mixed">Mixed (Multiple Games)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9rem' }}>
                Race Length *
              </label>
              <select
                name="raceLength"
                value={formData.raceLength}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setFormData(prev => ({ ...prev, raceLength: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, raceLength: e.target.value }));
                    setCustomRaceLength('');
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              >
                <option value="7">Race to 7</option>
                <option value="9">Race to 9</option>
                <option value="11">Race to 11</option>
                <option value="13">Race to 13</option>
                <option value="15">Race to 15</option>
                <option value="other">Other (specify below)</option>
              </select>
              
              {formData.raceLength === '' && (
                <input
                  type="number"
                  value={customRaceLength}
                  onChange={(e) => {
                    setCustomRaceLength(e.target.value);
                    setFormData(prev => ({ ...prev, raceLength: e.target.value }));
                  }}
                  placeholder="Enter custom race length (e.g., 21)"
                  min="1"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.9rem',
                    marginTop: '5px'
                  }}
                />
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9rem' }}>
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Any additional information about the match..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '15px',
            color: '#f44336',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '15px',
            color: '#4CAF50',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        {/* Submit Button */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => {
              resetOpponentAgreementState();
              setStep(3);
            }}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#ccc',
              border: '1px solid #555',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 20px',
              background: submitting ? '#666' : 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Match Request'}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(
    <>
      <DraggableModal
        open={isOpen}
        onClose={() => {
          resetForm();
          onClose();
        }}
        title={`📅 Schedule Ladder Match ${step > 1 ? `- Step ${step}` : ''}`}
        maxWidth="600px"
        maxHeight="700px"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </DraggableModal>

      {/* Match Type Info Modal */}
      {showMatchTypeInfo && (
        <DraggableModal
          open={!!showMatchTypeInfo}
          onClose={() => setShowMatchTypeInfo(null)}
          title={`${getMatchTypeDescription(showMatchTypeInfo).title} - Match Rules`}
          maxWidth="500px"
          maxHeight="600px"
        >
          <div style={{ padding: '20px' }}>
            <div style={{
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#2196F3', margin: '0 0 10px 0', fontSize: '1.2rem' }}>
                {showMatchTypeInfo === 'challenge' ? '⚔️' :
                 showMatchTypeInfo === 'smackdown' ? '💥' :
                 showMatchTypeInfo === 'smackback' ? '🚀' : '🎯'} {getMatchTypeDescription(showMatchTypeInfo).title}
              </h3>
              <p style={{ color: '#ccc', margin: '0', fontSize: '0.95rem', lineHeight: '1.5' }}>
                {getMatchTypeDescription(showMatchTypeInfo).description}
              </p>
            </div>

            <div>
              <h4 style={{ color: '#9C27B0', margin: '0 0 15px 0', fontSize: '1.1rem' }}>
                📋 Match Rules:
              </h4>
              <ul style={{ color: '#ccc', paddingLeft: '20px', margin: '0' }}>
                {getMatchTypeDescription(showMatchTypeInfo).rules.map((rule, index) => (
                  <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4', fontSize: '0.9rem' }}>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowMatchTypeInfo(null)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Opponent Agreement Modal */}
      {showOpponentAgreement && selectedMatch && (
        <DraggableModal
          open={showOpponentAgreement}
          onClose={() => setShowOpponentAgreement(false)}
          title="Opponent Agreement Required"
          maxWidth="500px"
          maxHeight="600px"
        >
          <div style={{ padding: '20px' }}>
            <div style={{
              background: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#FF9800', margin: '0 0 10px 0', fontSize: '1.2rem' }}>
                🤝 Opponent Agreement Required
              </h3>
              <p style={{ color: '#ccc', margin: '0', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Before scheduling a match, you must have your opponent's agreement. This ensures fair play and proper match etiquette.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '1.1rem' }}>
                Has {selectedMatch.defenderName} agreed to this match?
              </h4>
              
              {opponentAgreed === null && (
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleOpponentAgreement(true)}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    ✅ Yes, They Agreed
                  </button>
                  <button
                    onClick={() => handleOpponentAgreement(false)}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    ❌ No, They Haven't
                  </button>
                </div>
              )}

              {opponentAgreed === false && facebookPostMade === null && (
                <div>
                  <div style={{
                    background: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ color: '#f44336', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
                      📱 Facebook Callout Post
                    </h4>
                    <p style={{ color: '#ccc', margin: '0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      If your opponent hasn't agreed yet, you can make a Facebook callout post to publicly challenge them. 
                      This is the proper way to issue a challenge when direct agreement isn't possible.
                    </p>
                  </div>

                  <h4 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '1.1rem' }}>
                    Have you made a Facebook callout post for this match?
                  </h4>
                  
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleFacebookPostResponse(true)}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                    >
                      ✅ Yes, I Posted
                    </button>
                    <button
                      onClick={() => handleFacebookPostResponse(false)}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                    >
                      ❌ No, I Haven't
                    </button>
                  </div>
                </div>
              )}

              {facebookPostMade === true && (
                <div style={{
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ color: '#2196F3', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
                    ⚠️ Important Notice
                  </h4>
                  <p style={{ color: '#ccc', margin: '0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Your opponent must still agree to the match before admin approval. The Facebook post serves as a public challenge, 
                    but the opponent needs to confirm their participation.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => resetOpponentAgreementState()}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#ccc',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              
              {(opponentAgreed === true || facebookPostMade === true) && (
                <button
                  onClick={() => {
                    resetOpponentAgreementState();
                    setStep(4);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  Continue to Schedule
                </button>
              )}
            </div>
          </div>
        </DraggableModal>
      )}
    </>,
    document.body
  );
};

export default MatchSchedulingModal;