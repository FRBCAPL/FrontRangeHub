import React, { useState, useEffect } from 'react';
import DraggableModal from '../modal/DraggableModal.jsx';
import { BACKEND_URL } from '../../config.js';

const UnifiedSignupModal = ({ isOpen, onClose, onSuccess }) => {
  console.log('🔍 UnifiedSignupModal: Component rendered with isOpen:', isOpen);
  
  const [signupType, setSignupType] = useState(null); // 'new', 'existing-ladder', 'existing-league'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    fargoRate: '',
    experience: '',
    currentLeague: '',
    joinLeague: false,
    joinLadder: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [foundPlayer, setFoundPlayer] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Search for existing ladder player
  const searchExistingPlayer = async () => {
    if (!formData.firstName || !formData.lastName) {
      setError('Please enter your first and last name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-signup/search-ladder-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      });

      const data = await response.json();
      console.log('🔍 Search response:', data);
      if (data.success && data.player) {
        setFoundPlayer(data.player);
        console.log('🔍 Found player data:', data.player);
        console.log('🔍 isClaimed:', data.player.isClaimed);
        console.log('🔍 isClaimedBySamePerson:', data.player.isClaimedBySamePerson);
        setMessage(`Found you on the ${data.player.ladderName} ladder at position #${data.player.position}!`);
      } else {
        // Show the specific error message from the backend
        setError(data.message || 'No ladder player found with that name. Please check your spelling or choose "New User" instead.');
      }
    } catch (error) {
      setError('Error searching for player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Claim existing ladder position
  const claimLadderPosition = async () => {
    // Check if position is already claimed
    if (foundPlayer.isClaimed) {
      if (foundPlayer.isClaimedBySamePerson) {
        setError('You have already claimed this position. Please contact admin if you need help accessing your account.');
      } else {
        setError('This position has already been claimed by another player. Please contact admin if you believe this is an error.');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-signup/claim-ladder-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: foundPlayer._id,
          email: formData.email,
          phone: formData.phone
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Account created successfully! You can now access both league and ladder systems.');
        setTimeout(() => {
          onSuccess && onSuccess(data.user);
          onClose();
        }, 2000);
      } else {
        // Handle specific error cases
        if (data.message && data.message.includes('already claimed')) {
          setError('This position has already been claimed by another player. Please contact admin if you believe this is an error.');
        } else {
          setError(data.message || 'Failed to claim position');
        }
      }
    } catch (error) {
      setError('Error claiming position. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create new user account
  const createNewAccount = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.experience) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.joinLeague && !formData.joinLadder) {
      setError('Please select at least one option (League or Ladder)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-signup/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          fargoRate: formData.fargoRate || 400,
          experience: formData.experience,
          currentLeague: formData.currentLeague,
          joinLeague: formData.joinLeague,
          joinLadder: formData.joinLadder
        })
      });

      const data = await response.json();
      if (data.success) {
        let successMessage = '✅ Account created successfully! Admin approval required.';
        if (data.user.ladderApplicationCreated) {
          successMessage += ' Your ladder application has been submitted and will be reviewed by the ladder admin.';
        }
        successMessage += ' You will be notified when approved.';
        
        setMessage(successMessage);
        setTimeout(() => {
          onSuccess && onSuccess(data.user);
          onClose();
        }, 4000); // Give more time to read the longer message
      } else {
        setError(data.message || 'Failed to create account');
      }
    } catch (error) {
      setError('Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSignupType(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      fargoRate: '',
      experience: '',
      currentLeague: ''
    });
    setError('');
    setMessage('');
    setFoundPlayer(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  console.log('🔍 UnifiedSignupModal: About to render DraggableModal with isOpen:', isOpen);
  
  return (
    <DraggableModal
      open={isOpen}
      onClose={handleClose}
      title="Join Front Range Pool Hub"
      maxWidth="600px"
      zIndex={200000}
    >
      <div style={{ padding: '1rem 0' }}>
        {!signupType ? (
          // Step 1: Choose signup type
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: '#fff' }}>
              How would you like to join?
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="signup-option-btn"
                onClick={() => setSignupType('existing-ladder')}
                style={{
                  background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                🏆 I'm Already on the Ladder
                <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '0.5rem' }}>
                  Claim your existing ladder position
                </div>
              </button>

              <button
                className="signup-option-btn"
                onClick={() => setSignupType('existing-league')}
                style={{
                  background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                🎯 I'm in the League
                <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '0.5rem' }}>
                  Add ladder access to your account
                </div>
              </button>

              <button
                className="signup-option-btn"
                onClick={() => setSignupType('new')}
                style={{
                  background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                🆕 I'm New Here
                <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '0.5rem' }}>
                  Create a new account for both systems
                </div>
              </button>
            </div>
          </div>
        ) : signupType === 'existing-ladder' ? (
          // Step 2: Existing ladder player
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                onClick={() => setSignupType(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4CAF50',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  marginRight: '0.5rem'
                }}
              >
                ←
              </button>
              <h3 style={{ color: '#fff', margin: 0 }}>Claim Your Ladder Position</h3>
            </div>

            {!foundPlayer ? (
              <div>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                  Enter your name to find your ladder position:
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #555',
                      background: '#333',
                      color: '#fff'
                    }}
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #555',
                      background: '#333',
                      color: '#fff'
                    }}
                  />
                </div>

                <button
                  onClick={searchExistingPlayer}
                  disabled={loading}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {loading ? 'Searching...' : 'Find My Position'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid #4CAF50',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{ color: '#4CAF50', margin: '0 0 0.5rem 0' }}>
                    ✅ Found: {foundPlayer.firstName} {foundPlayer.lastName}
                  </h4>
                  <p style={{ color: '#ccc', margin: 0 }}>
                    Ladder: {foundPlayer.ladderName} | Position: #{foundPlayer.position} | FargoRate: {foundPlayer.fargoRate}
                  </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="email"
                    name="email"
                    placeholder="Your Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #555',
                      background: '#333',
                      color: '#fff',
                      marginBottom: '0.5rem'
                    }}
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number (optional)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #555',
                      background: '#333',
                      color: '#fff',
                      marginBottom: '0.5rem'
                    }}
                  />
                </div>

                <button
                  onClick={claimLadderPosition}
                  disabled={loading}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {loading ? 'Creating Account...' : 'Claim Position & Create Account'}
                </button>
              </div>
            )}
          </div>
        ) : signupType === 'new' ? (
          // Step 3: New user
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                onClick={() => setSignupType(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF9800',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  marginRight: '0.5rem'
                }}
              >
                ←
              </button>
              <h3 style={{ color: '#fff', margin: 0 }}>Create New Account</h3>
            </div>

            <p style={{ color: '#ccc', marginBottom: '1rem' }}>
              Fill out the form below to create your account:
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <input
                type="text"
                name="firstName"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={handleInputChange}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff'
                }}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={handleInputChange}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff'
                }}
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email Address *"
              value={formData.email}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #555',
                background: '#333',
                color: '#fff',
                marginBottom: '0.5rem'
              }}
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #555',
                background: '#333',
                color: '#fff',
                marginBottom: '0.5rem'
              }}
            />

            <input
              type="number"
              name="fargoRate"
              placeholder="FargoRate (optional)"
              value={formData.fargoRate}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #555',
                background: '#333',
                color: '#fff',
                marginBottom: '0.5rem'
              }}
            />

            {/* What do you want to join? */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#fff', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                What would you like to join? *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="joinLeague"
                    checked={formData.joinLeague || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, joinLeague: e.target.checked }))}
                    style={{ marginRight: '0.5rem' }}
                  />
                  🎯 League
                </label>
                <label style={{ display: 'flex', alignItems: 'center', color: '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="joinLadder"
                    checked={formData.joinLadder || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, joinLadder: e.target.checked }))}
                    style={{ marginRight: '0.5rem' }}
                  />
                  🏆 Ladder
                </label>
              </div>
            </div>

            {/* Experience Level */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#fff', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Experience Level *
              </label>
              <select
                name="experience"
                value={formData.experience || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff'
                }}
              >
                <option value="">Select your experience level</option>
                <option value="Beginner">Beginner (0-2 years)</option>
                <option value="Intermediate">Intermediate (2-5 years)</option>
                <option value="Advanced">Advanced (5+ years)</option>
                <option value="Professional">Professional/Competitive</option>
              </select>
            </div>

            {/* Current League */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#fff', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Current League (if any)
              </label>
              <select
                name="currentLeague"
                value={formData.currentLeague || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff'
                }}
              >
                <option value="">No current league</option>
                <option value="BCAPL">BCAPL</option>
                <option value="APA">APA</option>
                <option value="TAP">TAP</option>
                <option value="USAPL">USAPL</option>
                <option value="Local League">Local League</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              onClick={createNewAccount}
              disabled={loading}
              style={{
                background: '#FF9800',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        ) : null}

        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid #f44336',
            borderRadius: '6px',
            padding: '1rem',
            marginTop: '1rem',
            color: '#f44336'
          }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid #4CAF50',
            borderRadius: '6px',
            padding: '1rem',
            marginTop: '1rem',
            color: '#4CAF50'
          }}>
            ✅ {message}
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default UnifiedSignupModal;
