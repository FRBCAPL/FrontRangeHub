import React, { useState, useEffect } from 'react';
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
  const [emailError, setEmailError] = useState('');
  const [existingPlayers, setExistingPlayers] = useState(null);
  const [showExistingPlayerOptions, setShowExistingPlayerOptions] = useState(false);
  const [showClaimingForm, setShowClaimingForm] = useState(false);
  const [claimingLoading, setClaimingLoading] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Helper function to mask email addresses
  const maskEmail = (email) => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  };

  // Helper function to mask phone numbers
  const maskPhone = (phone) => {
    if (!phone) return '';
    if (phone.length <= 4) return '***-***-****';
    return `${phone.slice(0, 3)}-***-${phone.slice(-4)}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time email validation
    if (name === 'email') {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (value && !emailRegex.test(value)) {
setEmailError('Please enter a valid email address (e.g., john@example.com)');
      } else {
        setEmailError('');
      }
    }
  };

  // Handle player selection
  const handlePlayerSelection = (player) => {
    setSelectedPlayer(player);
    setShowPlayerSelection(false);
    setShowClaimingForm(true);
    
    // Pre-fill form with selected player data
    setFormData(prev => ({
      ...prev,
      firstName: player.firstName,
      lastName: player.lastName,
      email: '', // Let user enter their email
      fargoRate: player.fargoRate || '',
      // Make name fields read-only
      nameReadOnly: true
    }));
    
    setMessage(`Claiming account for ${player.firstName} ${player.lastName}. Please enter your email address. This will require admin approval.`);
  };

  // Check for existing players in any system
  const checkForExistingPlayers = async () => {
    if (!formData.firstName || !formData.lastName) {
      setError('Please enter your first and last name');
      return;
    }

    // Only require email if it's provided - allow checking by name only
    if (formData.email) {
      // Validate email format if provided
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-signup/check-existing-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim()
        })
      });

      const data = await response.json();
      console.log('🔍 Existing player check response:', data);
      
      if (data.success && (data.hasExistingPlayers || data.hasUnifiedAccount || data.hasPartialMatch)) {
        setExistingPlayers(data);
        
        if (data.hasUnifiedAccount) {
          setMessage('You already have a unified account! Please use your existing login credentials.');
          setShowExistingPlayerOptions(true);
          setShowPlayerSelection(false);
        } else if (data.showPlayerSelection && data.foundPlayers && data.foundPlayers.length > 0) {
          setMessage('We found potential matches! Please select which account is yours:');
          setShowPlayerSelection(true);
          setShowExistingPlayerOptions(false);
        } else if (data.hasPartialMatch) {
          setMessage(data.partialMatchWarning);
          setShowExistingPlayerOptions(true);
          setShowPlayerSelection(false);
        } else if (data.foundPlayers && data.foundPlayers.some(player => player.player.requiresAdminApproval)) {
          const hasPlaceholderEmail = data.foundPlayers.some(player => player.player.hasPlaceholderEmail);
          if (hasPlaceholderEmail) {
            setMessage('We found your account! You can claim it with your email address, but it will need admin approval.');
          } else {
            setMessage('We found your account! You can claim it, but it will need admin approval.');
          }
          setShowExistingPlayerOptions(true);
          setShowPlayerSelection(false);
        } else {
          setMessage('We found existing accounts for you! Please choose how you\'d like to proceed.');
          setShowExistingPlayerOptions(true);
          setShowPlayerSelection(false);
        }
      } else {
        // No existing players found, proceed with ladder search
        searchExistingLadderPlayer();
      }
    } catch (error) {
      setError('Error checking for existing players. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Claim existing accounts
  const claimExistingAccounts = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setClaimingLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-signup/claim-existing-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        })
      });

      const data = await response.json();
      if (data.success) {
        let successMessage = '✅ Accounts successfully claimed and unified!';
        if (data.user.hasLeagueProfile && data.user.hasLadderProfile) {
          successMessage += ' You now have access to both league and ladder systems.';
        } else if (data.user.hasLeagueProfile) {
          successMessage += ' You now have access to the league system.';
        } else if (data.user.hasLadderProfile) {
          successMessage += ' You now have access to the ladder system.';
        }
        successMessage += ` Your PIN is: ${data.user.pin}`;
        
        setMessage(successMessage);
        setShowClaimingForm(false);
        setShowExistingPlayerOptions(false);
        
        setTimeout(() => {
          onSuccess && onSuccess(data.user);
          onClose();
        }, 5000);
      } else {
        setError(data.message || 'Failed to claim accounts');
      }
    } catch (error) {
      setError('Error claiming accounts. Please try again.');
    } finally {
      setClaimingLoading(false);
    }
  };

  // Search for existing ladder player (original function)
  const searchExistingLadderPlayer = async () => {
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
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address (e.g., john@example.com)');
      return;
    }

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address (e.g., john@example.com)');
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
        }, 8000); // Give more time to read the longer message
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
    setEmailError('');
    setExistingPlayers(null);
    setShowExistingPlayerOptions(false);
    setShowClaimingForm(false);
    setClaimingLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  console.log('🔍 UnifiedSignupModal: About to render DraggableModal with isOpen:', isOpen);
  
  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .unified-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 200000;
            padding: 20px;
          }
          .unified-modal-container {
            background: #1a1a1a;
            border: 2px solid #e53e3e;
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(229, 62, 62, 0.3);
            max-width: 80%;
            width: 80%
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .unified-modal-header {
            background: linear-gradient(135deg, #e53e3e, #c53030);
            color: white;
            padding: 1rem;
            border-bottom: 1px solid #c53030;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
          }
          .unified-modal-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 1rem;
            max-height: calc(85vh - 80px);
          }
          .unified-modal-content::-webkit-scrollbar {
            width: 8px;
          }
          .unified-modal-content::-webkit-scrollbar-track {
            background: #333;
            border-radius: 4px;
          }
          .unified-modal-content::-webkit-scrollbar-thumb {
            background: #4CAF50;
            border-radius: 4px;
          }
          .unified-modal-content::-webkit-scrollbar-thumb:hover {
            background: #45a049;
          }
          .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
          }
          .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}
      </style>
      
      <div className="unified-modal-overlay" onClick={handleClose}>
        <div className="unified-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="unified-modal-header">
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Join Front Range Pool Hub</h2>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>
          <div className="unified-modal-content">
        {!signupType && !showPlayerSelection && !showExistingPlayerOptions && !showClaimingForm ? (
          // Step 1: Choose signup type
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#fff', fontSize: '1.1rem' }}>
              How would you like to join?
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                className="signup-option-btn"
                onClick={() => setSignupType('check-existing')}
                style={{
                  background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                    padding: '0.6rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                      fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}
              >
                🔍 Check if I'm Already in the System
                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', marginTop: '0.3rem' }}>
                  Search for existing league or ladder accounts
                </div>
              </button>

              <button
                className="signup-option-btn"
                onClick={() => setSignupType('existing-league')}
                style={{
                  background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                  color: 'white',
                  border: 'none',
                    padding: '0.6rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                      fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}
              >
                🎯 I'm in the League
                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', marginTop: '0.3rem' }}>
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
                    padding: '0.6rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                      fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}
              >
                🆕 I'm New Here
                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', marginTop: '0.3rem' }}>
                  Create a new account for both systems
                </div>
              </button>
            </div>
          </div>
        ) : signupType === 'check-existing' && !showPlayerSelection && !showExistingPlayerOptions && !showClaimingForm ? (
          // Step 2: Check for existing players (only show when no results)
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                onClick={() => setSignupType(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4CAF50',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  marginRight: '0.5rem'
                }}
              >
                ←
              </button>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>Check for Existing Accounts</h3>
            </div>
            
            {/* Only show the form if we haven't found existing players yet */}
            {!showExistingPlayerOptions && !showPlayerSelection && !showClaimingForm && (
              <>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                  Enter your name and email to search for existing league or ladder accounts:
                </p>
                
                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
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
                      padding: '0.6rem',
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
                  placeholder="Email Address (optional but recommended)"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: emailError ? '2px solid #f44336' : '1px solid #555',
                    background: '#333',
                    color: '#fff',
                    marginBottom: '0.5rem'
                  }}
                />
                {emailError && (
                  <div style={{
                    color: '#f44336',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    marginBottom: '0.5rem'
                  }}>
                    {emailError}
                  </div>
                )}

                <button
                  onClick={checkForExistingPlayers}
                  disabled={loading}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {loading ? 'Searching...' : '🔍 Search for My Accounts'}
                </button>
              </>
            )}
          </div>
        ) : signupType === 'existing-ladder' ? (
          // Step 3: Existing ladder player
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                onClick={() => setSignupType(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4CAF50',
                  cursor: 'pointer',
                  fontSize: '1rem',
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
                
                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
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
                      padding: '0.6rem',
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
                    padding: '0.6rem 1.2rem',
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
                  padding: '0.8rem',
                  marginBottom: '0.6rem'
                }}>
                  <h4 style={{ color: '#4CAF50', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
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
                      padding: '0.6rem',
                      borderRadius: '6px',
                      border: emailError ? '2px solid #f44336' : '1px solid #555',
                      background: '#333',
                      color: '#fff',
                      marginBottom: '0.5rem'
                    }}
                  />
                  {emailError && (
                    <div style={{
                      color: '#f44336',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem',
                      marginBottom: '0.5rem'
                    }}>
                      {emailError}
                    </div>
                  )}
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number (optional)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
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
                    padding: '0.6rem 1.2rem',
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
                  fontSize: '1rem',
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

            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <input
                type="text"
                name="firstName"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={handleInputChange}
                style={{
                  flex: 1,
                  padding: '0.6rem',
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
                  padding: '0.6rem',
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
                padding: '0.6rem',
                borderRadius: '6px',
                border: emailError ? '2px solid #f44336' : '1px solid #555',
                background: '#333',
                color: '#fff',
                marginBottom: '0.5rem'
              }}
            />
            {emailError && (
              <div style={{
                color: '#f44336',
                fontSize: '0.8rem',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                {emailError}
              </div>
            )}

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.6rem',
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
                padding: '0.6rem',
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
                  padding: '0.6rem',
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
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #555',
                  background: '#333',
                  color: '#fff'
                }}
              >
                <option value="">No current league</option>
                <option value="USAPL">USAPL</option>
                <option value="BCAPL">BCAPL</option>
                <option value="APA">APA</option>
                <option value="TAP">TAP</option>       
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

        {/* Player Selection */}
        {showPlayerSelection && existingPlayers && existingPlayers.foundPlayers && existingPlayers.foundPlayers.length > 0 && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '1rem'
          }}>
            <h4 style={{ color: '#4CAF50', margin: '0 0 0.8rem 0', textAlign: 'center', fontSize: '1rem' }}>
              🎯 Select Your Account
            </h4>
            
            <div style={{ marginBottom: '1rem' }}>
              {existingPlayers.foundPlayers.map((foundPlayer, index) => (
                <div
                  key={index}
                  onClick={() => handlePlayerSelection(foundPlayer.player)}
                  style={{
                    background: 'rgba(76, 175, 80, 0.1)',
                    border: '2px solid #4CAF50',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(76, 175, 80, 0.2)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(76, 175, 80, 0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h5 style={{ color: '#4CAF50', margin: '0 0 0.3rem 0', fontSize: '1rem' }}>
                        {foundPlayer.player.firstName} {foundPlayer.player.lastName}
                      </h5>
                      <p style={{ color: '#ccc', margin: '0 0 0.3rem 0', fontSize: '0.85rem' }}>
                        {foundPlayer.system === 'ladder' ? '📈 Ladder Player' : '🏆 League Player'}
                      </p>
                      {foundPlayer.player.position && (
                        <p style={{ color: '#fff', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}>
                          Position: #{foundPlayer.player.position} in {foundPlayer.player.ladderName}
                        </p>
                      )}
                      {foundPlayer.player.fargoRate && (
                        <p style={{ color: '#fff', margin: '0', fontSize: '0.8rem' }}>
                          Fargo Rate: {foundPlayer.player.fargoRate}
                        </p>
                      )}
                    </div>
                    <div style={{ color: '#4CAF50', fontSize: '1.5rem' }}>
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                setShowPlayerSelection(false);
                setShowExistingPlayerOptions(false);
                setMessage('');
                setExistingPlayers(null);
              }}
              style={{
                background: 'rgba(158, 158, 158, 0.2)',
                color: '#fff',
                border: '1px solid #9e9e9e',
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.3s ease'
              }}
            >
              ← Back to Search
            </button>
          </div>
        )}

        {/* Existing Player Options */}
        {showExistingPlayerOptions && existingPlayers && (
          <div style={{
            background: 'rgba(33, 150, 243, 0.1)',
            border: '2px solid #2196F3',
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '1rem'
          }}>
            {existingPlayers.hasUnifiedAccount ? (
              <>
                <h4 style={{ color: '#FF9800', margin: '0 0 1rem 0', textAlign: 'center' }}>
                  ⚠️ Unified Account Already Exists
                </h4>
                
                <div style={{
                  background: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid #FF9800',
                  borderRadius: '6px',
                  padding: '0.8rem',
                  marginBottom: '0.6rem'
                }}>
                  <h5 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>
                    🔗 Your Unified Account
                  </h5>
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                    <div><strong>Name:</strong> {existingPlayers.unifiedAccount.firstName} {existingPlayers.unifiedAccount.lastName}</div>
                    {existingPlayers.unifiedAccount.email && (
                      <div><strong>Email:</strong> {maskEmail(existingPlayers.unifiedAccount.email)}</div>
                    )}
                    <div><strong>Status:</strong> {existingPlayers.unifiedAccount.isApproved ? '✅ Approved' : '⏳ Pending Approval'}</div>
                    <div><strong>Active:</strong> {existingPlayers.unifiedAccount.isActive ? '✅ Active' : '❌ Inactive'}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <p style={{ color: '#fff', marginBottom: '1rem' }}>
                    You already have a unified account! Please use your existing login credentials to log into the HUB to access both the League and Ladder systems, instead of creating a new account.
                  </p>
                  
                  <button
                    onClick={() => {
                      setShowExistingPlayerOptions(false);
                      setExistingPlayers(null);
                      setMessage('');
                      onClose();
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                      color: 'white',
                      border: 'none',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    🔑 Close and Use Existing Login
                  </button>
                </div>
              </>
            ) : existingPlayers.hasPartialMatch ? (
              <>
                <h4 style={{ color: '#f44336', margin: '0 0 0.8rem 0', textAlign: 'center', fontSize: '1rem' }}>
                  ⚠️ Information Mismatch
                </h4>
                
                <div style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid #f44336',
                  borderRadius: '6px',
                  padding: '0.8rem',
                  marginBottom: '0.6rem'
                }}>
                  <p style={{ color: '#fff', margin: '0 0 0.8rem 0', textAlign: 'center', fontSize: '0.9rem' }}>
                    {existingPlayers.partialMatchWarning}
                  </p>
                  
                  {/* Show specific match information if available */}
                  {existingPlayers.emailFound && existingPlayers.emailMatchPlayer && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      padding: '0.6rem',
                      marginBottom: '0.6rem'
                    }}>
                      <p style={{ color: '#fff', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}>
                        <strong>Email found in system:</strong>
                      </p>
                      <p style={{ color: '#4CAF50', margin: '0', fontSize: '0.8rem' }}>
                        Email: {maskEmail(existingPlayers.emailMatchPlayer.email)}
                      </p>
                      <p style={{ color: '#fff', margin: '0.3rem 0 0 0', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        Please use the name that matches this email on record.
                      </p>
                    </div>
                  )}
                  
                  {existingPlayers.nameFound && existingPlayers.nameMatchPlayer && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      padding: '0.6rem',
                      marginBottom: '0.6rem'
                    }}>
                      <p style={{ color: '#fff', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}>
                        <strong>Name found in system:</strong>
                      </p>
                      <p style={{ color: '#4CAF50', margin: '0', fontSize: '0.8rem' }}>
                        Name: {existingPlayers.nameMatchPlayer.firstName} {existingPlayers.nameMatchPlayer.lastName}
                      </p>
                      <p style={{ color: '#4CAF50', margin: '0', fontSize: '0.8rem' }}>
                        Email: {maskEmail(existingPlayers.nameMatchPlayer.email)}
                      </p>
                    </div>
                  )}
                  
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setShowExistingPlayerOptions(false);
                        setExistingPlayers(null);
                        setMessage('');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        border: '1px solid #f44336',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        marginRight: '0.5rem'
                      }}
                    >
                      Try Again
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowExistingPlayerOptions(false);
                        setExistingPlayers(null);
                        setMessage('You can proceed with creating a new account.');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      Create New Account
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h4 style={{ color: '#2196F3', margin: '0 0 1rem 0', textAlign: 'center' }}>
                  🎯 We Found Your Existing Accounts!
                </h4>
                
                {existingPlayers.foundPlayers.map((foundPlayer, index) => (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid #2196F3',
                    borderRadius: '6px',
                    padding: '0.8rem',
                    marginBottom: '0.6rem'
                  }}>
                    <h5 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>
                      {foundPlayer.system === 'league' ? '🏆 League Account' : '🏅 Ladder Account'}
                    </h5>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                      <div><strong>Name:</strong> {foundPlayer.player.firstName} {foundPlayer.player.lastName}</div>
                      {foundPlayer.player.email && <div><strong>Email:</strong> {maskEmail(foundPlayer.player.email)}</div>}
                      {foundPlayer.player.phone && <div><strong>Phone:</strong> {maskPhone(foundPlayer.player.phone)}</div>}
                      {foundPlayer.system === 'ladder' && (
                        <>
                          <div><strong>Position:</strong> #{foundPlayer.player.position}</div>
                          <div><strong>Ladder:</strong> {foundPlayer.player.ladderName}</div>
                          <div><strong>Fargo Rate:</strong> {foundPlayer.player.fargoRate}</div>
                        </>
                      )}
                      {foundPlayer.system === 'league' && foundPlayer.player.divisions && foundPlayer.player.divisions.length > 0 && (
                        <div><strong>Divisions:</strong> {foundPlayer.player.divisions.join(', ')}</div>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <p style={{ color: '#fff', marginBottom: '1rem' }}>
                    You can claim your existing account(s) or create a new unified account that links everything together.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setShowClaimingForm(true);
                        setShowExistingPlayerOptions(false);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      🔗 Claim My Existing Account(s)
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowExistingPlayerOptions(false);
                        setExistingPlayers(null);
                        setMessage('You can proceed with creating a new account.');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        border: '1px solid #2196F3',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Create New Account Instead
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Account Claiming Form */}
        {showClaimingForm && (
          <div style={{
            background: 'rgba(33, 150, 243, 0.1)',
            border: '2px solid #2196F3',
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '1rem'
          }}>
            <h4 style={{ color: '#2196F3', margin: '0 0 1rem 0', textAlign: 'center' }}>
              🔗 Claim Your Existing Accounts
            </h4>
            
            {selectedPlayer && (
              <div style={{
                background: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid #FF9800',
                borderRadius: '6px',
                padding: '0.8rem',
                marginBottom: '1rem'
              }}>
                <p style={{ color: '#FF9800', margin: '0', textAlign: 'center', fontSize: '0.9rem' }}>
                  ⚠️ This claim will require admin approval before you can access your account.
                </p>
              </div>
            )}
            
            <p style={{ color: '#fff', marginBottom: '1rem', textAlign: 'center' }}>
              Please confirm your information to claim and unify your existing accounts:
            </p>
            
            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <input
                type="text"
                name="firstName"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={selectedPlayer ? undefined : handleInputChange}
                required
                readOnly={selectedPlayer ? true : false}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: selectedPlayer ? '1px solid #4CAF50' : '1px solid #555',
                  background: selectedPlayer ? 'rgba(76, 175, 80, 0.1)' : '#333',
                  color: selectedPlayer ? '#4CAF50' : '#fff',
                  cursor: selectedPlayer ? 'not-allowed' : 'text'
                }}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={selectedPlayer ? undefined : handleInputChange}
                required
                readOnly={selectedPlayer ? true : false}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: selectedPlayer ? '1px solid #4CAF50' : '1px solid #555',
                  background: selectedPlayer ? 'rgba(76, 175, 80, 0.1)' : '#333',
                  color: selectedPlayer ? '#4CAF50' : '#fff',
                  cursor: selectedPlayer ? 'not-allowed' : 'text'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="email"
                name="email"
                placeholder="Email Address *"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: emailError ? '1px solid #f44336' : '1px solid #555',
                  background: '#333',
                  color: '#fff'
                }}
              />
              {emailError && (
                <div style={{ color: '#f44336', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {emailError}
                </div>
              )}
            </div>

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number (optional)"
              value={formData.phone}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid #555',
                background: '#333',
                color: '#fff',
                marginBottom: '1rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={claimExistingAccounts}
                disabled={claimingLoading}
                style={{
                  flex: 1,
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                      fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}
              >
                {claimingLoading ? 'Claiming...' : '🔗 Claim My Accounts'}
              </button>
              
              <button
                onClick={() => {
                  setShowClaimingForm(false);
                  setShowExistingPlayerOptions(true);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid #2196F3',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

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
            background: 'rgba(76, 175, 80, 0.15)',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '0.8rem',
            color: '#4CAF50',
            fontSize: '1rem',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
            position: 'relative'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
            {message}
            <div style={{ 
              marginTop: '1rem', 
                      fontSize: '0.75rem',
              fontWeight: 'normal',
              color: '#2e7d32'
            }}>
              This window will close automatically in a few seconds, or click outside to close now.
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UnifiedSignupModal;
