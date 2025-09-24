import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../../config.js';
import './GuestApp.css';
import '../hub/LoggedOutHub.css';

// Import the actual LadderApp component
import LadderApp from '../ladder/LadderApp';
import DraggableModal from '../modal/DraggableModal';
import StandaloneLadderModal from './StandaloneLadderModal';
import UnifiedSignupModal from '../auth/UnifiedSignupModal';

const GuestLadderApp = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('info');
  const [guestUser, setGuestUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLadderModal, setShowLadderModal] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [joinFormData, setJoinFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    experience: 'beginner',
    fargoRate: '',
    currentLeague: '',
    currentRanking: '',
    message: '',
    payNow: false,
    paymentMethod: '',
    availability: '',
    locations: ''
  });
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [isClaimMode, setIsClaimMode] = useState(false);
  const [selectedLadderPosition, setSelectedLadderPosition] = useState(null);
  const [generatedPin, setGeneratedPin] = useState('');

  useEffect(() => {
    authenticateGuest();
    loadPaymentConfig();
    checkPaymentStatus();
    
    // Check if we should automatically open the ladder modal
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenModal = urlParams.get('openModal');
    
    if (shouldOpenModal === 'true') {
      console.log('Auto-opening ladder modal from URL parameter');
      setShowLadderModal(true);
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check payment status when component mounts or user returns from payment
  const checkPaymentStatus = async () => {
    try {
      // Check if user is returning from a payment (URL params)
      const urlParams = new URLSearchParams(window.location.search);
      const paymentSuccess = urlParams.get('paymentSuccess');
      
      if (paymentSuccess === 'true') {
        console.log('🎉 User returned from successful payment!');
        
        // Show success message
        alert('🎉 Welcome back! Your payment was successful and your ladder position has been claimed. You now have access to all ladder features!');
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Mark the position as claimed (this will remove the claim button)
        // We'll need to get this from the payment success page or store it in localStorage
        const lastClaimedPosition = JSON.parse(localStorage.getItem('lastClaimedPosition') || '{}');
        if (lastClaimedPosition.ladder && lastClaimedPosition.position) {
          markPositionAsClaimed(lastClaimedPosition.ladder, lastClaimedPosition.position);
          localStorage.removeItem('lastClaimedPosition'); // Clean up
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Load payment configuration
  const loadPaymentConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-config`);
      if (response.ok) {
        const config = await response.json();
        console.log('Payment config loaded:', config);
        console.log('Config structure:', config.config);
        console.log('Promotional message:', config.promotionalMessage);
        setPaymentConfig(config);
      } else {
        console.error('Failed to load payment config:', response.status);
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
    }
  };

  const handlePaymentMethodChange = (e) => {
    const method = e.target.value;
    setJoinFormData(prev => ({ ...prev, paymentMethod: method }));
    
    // Show payment instructions when method is selected
    if (method) {
      setShowPaymentInstructions(true);
    } else {
      setShowPaymentInstructions(false);
    }
  };

  const getPaymentInstructions = (method) => {
    if (!paymentConfig || !paymentConfig.config) return 'Loading payment instructions...';
    
    const methods = paymentConfig.config.paymentMethods;
    const contactInfo = paymentConfig.config.contactInfo;
    
    switch (method) {
      case 'venmo':
        return methods.venmo?.enabled ? 
          `Send $5 to: ${methods.venmo.username}\nNote: "Ladder Membership - ${joinFormData.firstName} ${joinFormData.lastName}"` :
          'Venmo payments are currently unavailable';
      case 'cashapp':
        return methods.cashapp?.enabled ? 
          `Send $5 to: ${methods.cashapp.username}\nNote: "Ladder Membership - ${joinFormData.firstName} ${joinFormData.lastName}"` :
          'CashApp payments are currently unavailable';
      case 'creditCard':
        return methods.creditCard?.enabled ? 
          `Credit/Debit card payments available. Contact: ${contactInfo?.adminPhone || 'frbcapl@gmail.com'}` :
          'Credit card payments are currently unavailable';
      case 'applePay':
        return methods.applePay?.enabled ? 
          `Apple Pay available. Contact: ${contactInfo?.adminPhone || 'frbcapl@gmail.com'}` :
          'Apple Pay is currently unavailable';
      case 'googlePay':
        return methods.googlePay?.enabled ? 
          `Google Pay available. Contact: ${contactInfo?.adminPhone || 'frbcapl@gmail.com'}` :
          'Google Pay is currently unavailable';
      case 'cash':
        return methods.cash?.enabled ? 
          `Cash payments accepted. Contact: ${contactInfo?.adminPhone || 'frbcapl@gmail.com'}` :
          'Cash payments are currently unavailable';
      case 'check':
        return methods.check?.enabled ? 
          `Check payments accepted. Contact: ${contactInfo?.adminPhone || 'frbcapl@gmail.com'}` :
          'Check payments are currently unavailable';
      default:
        return 'Please select a payment method';
    }
  };

  const authenticateGuest = async () => {
    try {
      setLoading(true);
      
      // Authenticate with the guest user credentials
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: 'guest@frontrangepool.com'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGuestUser(data.user);
        console.log('Guest user authenticated:', data.user);
      } else {
        const errorData = await response.json();
        console.error('Guest authentication failed:', errorData);
        setError('Failed to authenticate guest user');
      }
    } catch (error) {
      console.error('Error authenticating guest:', error);
      setError('Network error during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHub = () => {
    navigate('/');
  };

  const handleJoinLadder = () => {
    setShowSignupForm(true);
  };

  // New function to handle claiming a ladder position
  const handleClaimLadderPosition = (ladderPosition) => {
    console.log('Opening claim modal for position:', ladderPosition);
    setSelectedLadderPosition(ladderPosition);
    setIsClaimMode(true);
    
    // Generate unique 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedPin(pin);
    
    // Pre-fill the form with ladder position data
    setJoinFormData({
      firstName: ladderPosition.firstName,
      lastName: ladderPosition.lastName,
      email: '',
      phone: '',
      experience: 'beginner',
      fargoRate: ladderPosition.fargoRate || '',
      currentLeague: '',
      currentRanking: '',
      message: '',
      payNow: false,
      paymentMethod: '',
      availability: '',
      locations: ''
    });
    
    setShowJoinModal(true);
  };



    const handleJoinSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!joinFormData.firstName || !joinFormData.lastName || !joinFormData.email) {
      alert('Please fill in all required fields (First Name, Last Name, and Email)');
      return;
    }

         // Additional validation for claim mode - removed availability/locations validation
     // These will be handled later with profile edit

    setSubmittingJoin(true);

    try {
      let successMessage = '';
      
      if (isClaimMode) {
        // Handle claiming existing ladder position
        if (joinFormData.payNow && joinFormData.paymentMethod) {
          console.log('🔍 Creating payment session for claim...');
          console.log('Payment Method:', joinFormData.paymentMethod);
          
          console.log('🚀 About to call payment API for claim...');
          console.log('🔍 Request body for claim:', {
            playerName: `${joinFormData.firstName} ${joinFormData.lastName}`,
            email: joinFormData.email,
            paymentMethod: joinFormData.paymentMethod,
            amount: 5.00,
            claimData: {
              ladder: selectedLadderPosition.ladder,
              position: selectedLadderPosition.position,
              generatedPin: generatedPin
            }
          });
          // Create payment session for immediate access
          const paymentResponse = await fetch(`${BACKEND_URL}/api/monetization/create-membership-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerName: `${joinFormData.firstName} ${joinFormData.lastName}`,
              email: joinFormData.email,
              paymentMethod: joinFormData.paymentMethod,
              amount: 5.00,
              claimData: {
                ladder: selectedLadderPosition.ladder,
                position: selectedLadderPosition.position,
                generatedPin: generatedPin
              }
            })
          });

          console.log('Payment Response Status:', paymentResponse.status);
          const paymentData = await paymentResponse.json();
          console.log('Payment Response Data:', paymentData);

          if (!paymentResponse.ok) {
            throw new Error('Failed to create payment session. Please try again.');
          }

          console.log('Payment session created for claim:', paymentData);
          
                     // Handle Square payment redirect
           if (paymentData.paymentType === 'square_redirect' && paymentData.paymentUrl) {
             // Store the claimed position for later verification
             localStorage.setItem('lastClaimedPosition', JSON.stringify({
               ladder: selectedLadderPosition.ladder,
               position: selectedLadderPosition.position
             }));
             
             // Redirect to Square payment page
             window.location.href = paymentData.paymentUrl;
             return; // Don't show success message, user is being redirected
           }
          
          // Handle manual payment methods
          successMessage = `🎯 Ladder Position Claim Submitted!\n\nYou have submitted a claim for Position #${selectedLadderPosition.position} in the ${selectedLadderPosition.ladder} ladder.\n\nName: ${joinFormData.firstName} ${joinFormData.lastName}\nEmail: ${joinFormData.email}\nGenerated PIN: ${generatedPin}\n\nPlease complete your payment using the instructions above. Once payment is verified, you'll have immediate access to all ladder features!`;
        } else {
          // Send claim request to admin for approval
                     const claimResponse = await fetch(`${BACKEND_URL}/api/ladder/submit-claim`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({
               firstName: joinFormData.firstName,
               lastName: joinFormData.lastName,
               email: joinFormData.email,
               phone: joinFormData.phone,
               ladder: selectedLadderPosition.ladder,
               position: selectedLadderPosition.position,
               generatedPin: generatedPin,
               fargoRate: joinFormData.fargoRate,
               message: joinFormData.message
               // availability and locations removed - will be handled later with profile edit
             })
           });

          if (!claimResponse.ok) {
            throw new Error('Failed to submit claim request. Please try again.');
          }

          const claimData = await claimResponse.json();
          console.log('Claim submitted:', claimData);
          
          successMessage = `🎯 Ladder Position Claim Submitted!\n\nYou have submitted a claim for Position #${selectedLadderPosition.position} in the ${selectedLadderPosition.ladder} ladder.\n\nName: ${joinFormData.firstName} ${joinFormData.lastName}\nEmail: ${joinFormData.email}\nGenerated PIN: ${generatedPin}\n\nYour claim has been sent to admin for approval. Since you did not pay the $5 monthly fee, admin approval is required before you can access ladder features.\n\nWe'll contact you at ${joinFormData.email} within 24-48 hours with the approval decision.`;
        }
      } else {
        // Handle joining as new player (existing logic)
        if (joinFormData.payNow && joinFormData.paymentMethod) {
          console.log('🔍 Creating payment session for new player...');
          console.log('Payment Method:', joinFormData.paymentMethod);
          
          const paymentResponse = await fetch(`${BACKEND_URL}/api/monetization/create-membership-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerName: `${joinFormData.firstName} ${joinFormData.lastName}`,
              email: joinFormData.email,
              paymentMethod: joinFormData.paymentMethod,
              amount: 5.00
            })
          });

          if (!paymentResponse.ok) {
            throw new Error('Failed to create payment session. Please try again.');
          }

          const paymentData = await paymentResponse.json();
          console.log('Payment session created:', paymentData);
          console.log('Payment Type:', paymentData.paymentType);
          console.log('Payment URL:', paymentData.paymentUrl);
          
          // Handle Square payment redirect for new player membership
          if (paymentData.paymentType === 'square_redirect' && paymentData.paymentUrl) {
            // Redirect to Square payment page
            window.location.href = paymentData.paymentUrl;
            return; // Don't show success message, user is being redirected
          }
        }
        
        successMessage = `📈 Thank you for your interest in joining the Ladder of Legends!\n\nWe've received your application:\n\nName: ${joinFormData.firstName} ${joinFormData.lastName}\nEmail: ${joinFormData.email}\nExperience: ${joinFormData.experience}${joinFormData.fargoRate ? `\nFargoRate: ${joinFormData.fargoRate}` : ''}${joinFormData.currentLeague ? `\nCurrent League: ${joinFormData.currentLeague}` : ''}${joinFormData.currentRanking ? `\nCurrent Ranking: ${joinFormData.currentRanking}` : ''}`;
        
        if (joinFormData.payNow && joinFormData.paymentMethod) {
          successMessage += `\n\nPayment Method: ${joinFormData.paymentMethod}\nPlease complete your payment using the instructions above.`;
        }
        
        successMessage += `\n\nWe'll contact you at ${joinFormData.email} within 24-48 hours to set up your ladder profile and get you started challenging players!\n\nIn the meantime, you can also reach us directly at: frbcapl@gmail.com`;
      }
      
      alert(successMessage);
      
      // Reset form and close modal
      setJoinFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        experience: 'beginner',
        fargoRate: '',
        currentLeague: '',
        currentRanking: '',
        message: '',
        payNow: false,
        paymentMethod: '',
        availability: '',
        locations: ''
      });
      setShowJoinModal(false);
      setIsClaimMode(false);
      setSelectedLadderPosition(null);
      setGeneratedPin('');
    } catch (error) {
      alert('There was an error submitting your application. Please try again or contact us directly at frbcapl@gmail.com');
    } finally {
      setSubmittingJoin(false);
    }
  };

  // Check if a position has already been claimed/paid for
  const [claimedPositions, setClaimedPositions] = useState(new Set());
  
  const isPositionClaimed = (position) => {
    // Check if this position has been claimed in the current session
    return claimedPositions.has(`${position.ladder}-${position.position}`);
  };
  
  // Mark a position as claimed
  const markPositionAsClaimed = (ladder, position) => {
    setClaimedPositions(prev => new Set([...prev, `${ladder}-${position}`]));
  };

  // Mock functions for guest mode - these will show alerts instead of real functionality
  const guestHandlers = {
    onLogout: () => {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="guest-app-container">
        <div className="guest-app-header">
          <h1>📈 Ladder of Legends - Guest Preview</h1>
          <p>Loading guest access...</p>
          <div className="guest-badge">👀 Guest Mode - Limited Access</div>
        </div>
        <div className="loading-spinner">Authenticating guest user...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-app-container">
        <div className="guest-app-header">
          <h1>📈 Ladder of Legends - Guest Preview</h1>
          <p>Error loading guest access</p>
          <div className="guest-badge">👀 Guest Mode - Limited Access</div>
        </div>
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={handleBackToHub} className="back-btn">
            ← Back to Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-app-container">
      {/* Header */}
      <div className="guest-app-header">
        <h1>📈 Ladder of Legends - Guest Preview</h1>
        <p>Experience the actual Ladder of Legends interface with limited functionality</p>
        <div className="guest-badge">👀 Guest Mode - Limited Access</div>
      </div>

      {/* Card Layout */}
      <div className="apps-section">
        <h2 className="section-title">Available Options</h2>
        <div className="apps-grid active-apps">
          {/* View Ladder Card */}
          <div
            className="app-card active guest-mode"
            style={{ '--app-color': '#4CAF50' }}
            onClick={() => setShowLadderModal(true)}
          >
            <div className="app-icon">📊</div>
            <div className="app-info">
              <h3>View Ladder</h3>
              <p>Browse the current ladder rankings and player standings</p>
              <div className="app-status">
                <span className="status-guest-preview">Try Demo</span>
              </div>
            </div>
          </div>

          {/* Try App Interface Card */}
          <div
            className="app-card active guest-mode"
            style={{ '--app-color': '#2196F3' }}
            onClick={() => setCurrentView('app')}
          >
            <div className="app-icon">🎮</div>
            <div className="app-info">
              <h3>Try App Interface</h3>
              <p>Experience the full ladder interface with limited functionality</p>
              <div className="app-status">
                <span className="status-guest-preview">Try Demo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="guest-actions" style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          type="button"
          onClick={handleBackToHub} 
          className="back-btn"
          style={{ marginRight: '10px' }}
        >
          ← Back to Hub
        </button>
        <button 
          type="button"
          onClick={() => setCurrentView('info')} 
          className="info-btn"
          style={{ marginRight: '10px' }}
        >
          ℹ️ Ladder Info
        </button>
        <button 
          type="button"
          onClick={handleJoinLadder} 
          className="join-btn"
        >
          Join Ladder
        </button>
      </div>



      {/* Content */}
      <div className="content-area">
        {console.log('Current view is:', currentView)}
        {currentView === 'app' && (
          <div className="app-preview-section">
            <div className="guest-notice">
              <h3>🎮 Interactive App Preview</h3>
              <p>You can explore the actual Ladder of Legends interface below. Try clicking buttons and opening modals to see how it works!</p>
              <div className="guest-limitations" style={{ textAlign: 'center' }}>
                <strong>Guest Limitations:</strong>
                <ul style={{ textAlign: 'left', display: 'inline-block', margin: '0.5rem auto' }}>
                  <li>• Can view all interfaces and modals</li>
                  <li>• Cannot submit forms or save data</li>
                  <li>• Cannot send real challenges</li>
                  <li>• Cannot access admin features</li>
                  <li>• Cannot claim ladder positions</li>
                </ul>
              </div>
            </div>

            {/* Actual LadderApp Component with real guest user data */}
            <div className="ladder-preview">
                             <LadderApp
                 playerName={guestUser?.firstName || 'Guest'}
                 playerLastName={guestUser?.lastName || 'User'}
                 senderEmail={guestUser?.email || 'guest@frontrangepool.com'}
                 userPin={guestUser?.pin || 'GUEST'}
                 onLogout={guestHandlers.onLogout}
                 isAdmin={false}
                 onClaimLadderPosition={handleClaimLadderPosition}
                 claimedPositions={claimedPositions}
                 isPositionClaimed={isPositionClaimed}
               />
            </div>
          </div>
        )}



        {currentView === 'info' && (
          <div className="info-section">
            <h2>Ladder of Legends Tournament Series Information</h2>
            
                         <div className="info-cards">
               {/* Top Row - Match Types */}
               <div className="info-card">
                 <h3>⚔️ Challenge Matches</h3>
                 <p>Standard ladder climbing system</p>
                 <ul>
                   <li>Challenge  other players<br></br>up to 4 spots above you on the ladder</li>
                   <li>Challenger wins:<br></br> Players switch positions</li>
                   <li>Defender wins:<br></br> Positions remain unchanged</li>
                   <li>7-day immunity for winners</li>
                 </ul>
               </div>

               <div className="info-card">
                 <h3>💥 SmackDown Matches</h3>
                 <p>Shuffle up the ladder system</p>
                 <ul>
                   <li>Call out players up to 5 spots below you on the ladder</li>
                   <li>Challenger pays full entry<br></br> Defender pays 50%</li>
                   <li>Challenger wins: <br></br>Defender moves 3 down<br></br> Challenger moves 2 up</li>
                   <li>Defender wins: Players switch positions</li>
                 </ul>
               </div>

               <div className="info-card">
                 <h3>👑 SmackBack Matches</h3>
                 <p>Jump to 1st place opportunity</p>
                 <ul>
                   <li>Only available after winning a SmackDown as Defender</li>
                   <li>Must call out 1st place within 7 days</li>
                   <li>Challenger wins:<br></br> Challenger claims 1st place<br></br>All others move down</li>
                   <li>Defender wins: Positions unchanged</li>
                 </ul>
               </div>

                               {/* Second Row - Rules & Structure */}
                <div className="info-card">
                  <h3>📅 Top 5 Exception</h3>
                  <p>Special rules for top-ranked players</p>
                  <ul>
                    <li>Top 5 matches:<br></br> Saturdays/Sundays only</li>
                    <li>Location: Legends Brews & Cues (2pm-8pm)</li>
                    <li>Live streamed on Legends Facebook page</li>
                    <li>Admin/TD present as referee</li>
                  </ul>
                </div>

                <div className="info-card">
                  <h3>🎯 Match Rules</h3>
                  <p>Flexible format with minimum requirements</p>
                  <ul>
                    <li>All races are even - No handicaps</li>
                    <li>CSI rule set (8, 9, or 10 ball allowed)</li>
                    <li>7 or 9-foot tables by agreement</li>
                    <li>Winner takes all entry fees and prizes</li>
                  </ul>
                </div>

               <div className="info-card">
                 <h3>💳 Payment Structure</h3>
                 <p>Simple and transparent pricing</p>
                 <ul>
                   <li><strong>Ladder Membership:</strong> $5/month</li>
                   <li><strong>Match Fees:</strong> $5 per match (total)</li>
                   <li><strong>Fee Distribution:</strong> $3 to prize pool<br></br>$2 to platform</li>
                   <li><strong>Payment Methods:</strong> Venmo, Cashapp, CC/Debit, Cash</li>
                   <li><strong>Billing:</strong> Monthly automatic renewal</li>
                 </ul>
               </div>

               {/* Third Row - Sign Up Area */}
               <div className="info-card signup-section">
                 <h3 className="signup-title" style={{ 
                   fontSize: '1.2rem', 
                   lineHeight: '1.3', 
                   marginBottom: '0.5rem',
                   color: '#4CAF50'
                 }}>
                   🎯 Ready to Join?
                 </h3>
                 <p className="signup-subtitle" style={{ 
                   fontSize: '0.9rem', 
                   marginBottom: '0.75rem',
                   color: '#ccc'
                 }}>
                   BCA Sanctioned - Fargo Reported Tournament Series
                 </p>
                 <ul className="signup-benefits" style={{ 
                   fontSize: '0.85rem', 
                   lineHeight: '1.4',
                   paddingLeft: '1.2rem',
                   marginBottom: '1rem'
                 }}>
                   <li><strong>BCA Sanctioned</strong> - Official tournament play</li>
                   <li><strong>Professional System</strong> - Advanced ladder management</li>
                   <li><strong>Fair Competition</strong> - Challenge your way up the rankings</li>
                   <li><strong>Prize Pools</strong> + Earn your bragging rights!</li>
                   <li><strong>Community</strong> - Join Colorado's premier singles play pool community</li>
                 </ul>
                 <button 
                   onClick={handleJoinLadder} 
                   className="signup-btn"
                   style={{
                     width: '100%',
                     padding: '0.8rem 1rem',
                     background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '8px',
                     fontSize: '0.9rem',
                     fontWeight: 'bold',
                     cursor: 'pointer',
                     transition: 'all 0.3s ease',
                     boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                   }}
                 >
                   📈 Join the Ladder Now
                 </button>
               </div>
             </div>

            <div className="join-section">
              <h3>Ready to Challenge?</h3>
              <p>Join the ladder and start climbing the rankings!</p>
              <button onClick={handleJoinLadder} className="join-btn-large">
                📈 Join the Ladder Today
              </button>
              <p className="contact-info">
                Contact: <strong>frbcapl@gmail.com</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Old Join Ladder Modal - Removed, now using UnifiedSignupModal */}
      {false && (
        <DraggableModal
          open={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          title={isClaimMode ? "🎯 Claim Ladder Position" : "📈 Join Ladder of Legends"}
          maxWidth="700px"
          maxHeight="90vh"
          borderColor="#5B21B6"
          glowColor="#5B21B6"
          style={{
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          {/* Claim Mode Info Display */}
          {isClaimMode && selectedLadderPosition && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.08) 100%)',
              border: '1px solid rgba(76, 175, 80, 0.4)',
              borderRadius: '8px',
              padding: '0.6rem',
              marginBottom: '0.8rem',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)'
            }}>
              <div style={{
                color: '#fff',
                fontSize: '0.8rem',
                lineHeight: '1.2',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.8rem'
              }}>
                <span style={{ fontWeight: '600' }}><strong>Position:</strong> #{selectedLadderPosition.position}</span>
                <span style={{ fontWeight: '600' }}><strong>Ladder:</strong> {selectedLadderPosition.ladder}</span>
                <span style={{ fontWeight: '600' }}><strong>PIN:</strong> 
                  <span style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                    color: '#000',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    marginLeft: '0.3rem',
                    fontWeight: 'bold',
                    boxShadow: '0 1px 3px rgba(255, 215, 0, 0.3)'
                  }}>
                    {generatedPin}
                  </span>
                </span>
              </div>
              <p style={{
                color: '#a0a0a0',
                fontSize: '0.7rem',
                margin: '0.3rem 0 0 0',
                fontStyle: 'italic'
              }}>
                This PIN will be used to verify your claim and can also be used to log into your account.
              </p>
            </div>
          )}

          <form onSubmit={handleJoinSubmit} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '0.8rem',
              marginBottom: '0.8rem'
            }}>
              <div>
                <label htmlFor="firstName" style={{
                  display: 'block',
                  color: '#fff',
                  marginBottom: '0.3rem',
                  fontWeight: '600',
                  fontSize: '0.8rem'
                }}>First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  value={joinFormData.firstName}
                  onChange={(e) => setJoinFormData({...joinFormData, firstName: e.target.value})}
                  required
                  disabled={isClaimMode}
                  placeholder="Enter your first name"
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '6px',
                    background: isClaimMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                    color: isClaimMode ? '#888' : '#fff',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box',
                    height: '28px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
              <div>
                <label htmlFor="lastName" style={{
                  display: 'block',
                  color: '#fff',
                  marginBottom: '0.3rem',
                  fontWeight: '600',
                  fontSize: '0.8rem'
                }}>Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  value={joinFormData.lastName}
                  onChange={(e) => setJoinFormData({...joinFormData, lastName: e.target.value})}
                  required
                  disabled={isClaimMode}
                  placeholder="Enter your last name"
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '6px',
                    background: isClaimMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                    color: isClaimMode ? '#888' : '#fff',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box',
                    height: '28px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '0.3rem',
              marginBottom: '0.25rem'
            }}>
                          <div>
              <label htmlFor="email" style={{
                display: 'block',
                color: '#fff',
                marginBottom: '0.3rem',
                fontWeight: '600',
                fontSize: '0.8rem'
              }}>Email Address *</label>
              <input
                type="email"
                id="email"
                value={joinFormData.email}
                onChange={(e) => setJoinFormData({...joinFormData, email: e.target.value})}
                required
                placeholder="Enter your email address"
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box',
                  height: '28px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>

                          <div>
              <label htmlFor="phone" style={{
                display: 'block',
                color: '#fff',
                marginBottom: '0.3rem',
                fontWeight: '600',
                fontSize: '0.8rem'
              }}>Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                value={joinFormData.phone}
                onChange={(e) => setJoinFormData({...joinFormData, phone: e.target.value})}
                placeholder="Enter your phone number (optional)"
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box',
                  height: '28px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>
            </div>

                         {/* Availability and Locations removed - will be handled later with profile edit */}

                         <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1fr', 
               gap: '0.8rem',
               marginBottom: '0.8rem'
             }}>
                               <div>
                  <label htmlFor="fargoRate" style={{
                    display: 'block',
                    color: '#fff',
                    marginBottom: '0.3rem',
                    fontWeight: '600',
                    fontSize: '0.75rem'
                  }}>Fargo Rate (Optional)</label>
                  <input
                    type="number"
                    id="fargoRate"
                    value={joinFormData.fargoRate}
                    onChange={(e) => setJoinFormData({...joinFormData, fargoRate: e.target.value})}
                    min="0"
                    max="850"
                    placeholder="Optional"
                    style={{
                      width: '60%',
                      padding: '0.2rem 0.4rem',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      boxSizing: 'border-box',
                      height: '18px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </div>

                               <div>
                                     <label htmlFor="experience" style={{
                     display: 'block',
                     color: '#fff',
                     marginBottom: '0.3rem',
                     fontWeight: '600',
                     fontSize: '0.75rem'
                   }}>Experience *</label>
                                     <select
                     id="experience"
                     value={joinFormData.experience}
                     onChange={(e) => setJoinFormData({...joinFormData, experience: e.target.value})}
                     required
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.6rem',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box',
                      height: '28px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="beginner" style={{ color: '#000', background: '#fff' }}>Beginner</option>
                    <option value="intermediate" style={{ color: '#000', background: '#fff' }}>Intermediate</option>
                    <option value="advanced" style={{ color: '#000', background: '#fff' }}>Advanced</option>
                    <option value="expert" style={{ color: '#000', background: '#fff' }}>Expert</option>
                  </select>
                </div>
             </div>

                         <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1fr', 
               gap: '0.8rem',
               marginBottom: '0.8rem'
             }}>
               <div>
                 <label htmlFor="currentLeague" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.3rem',
                   fontWeight: '600',
                   fontSize: '0.75rem'
                 }}>Current League (Optional)</label>
                 <input
                   type="text"
                   id="currentLeague"
                   value={joinFormData.currentLeague}
                   onChange={(e) => setJoinFormData({...joinFormData, currentLeague: e.target.value})}
                   placeholder="Optional"
                   style={{
                     width: '100%',
                     padding: '0.3rem 0.5rem',
                     border: '1px solid rgba(255, 255, 255, 0.25)',
                     borderRadius: '6px',
                     background: 'rgba(255, 255, 255, 0.08)',
                     color: '#fff',
                     fontSize: '0.75rem',
                     boxSizing: 'border-box',
                     height: '20px',
                     transition: 'all 0.2s ease',
                     boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                   }}
                 />
               </div>

               <div>
                 <label htmlFor="currentRanking" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.3rem',
                   fontWeight: '600',
                   fontSize: '0.75rem'
                 }}>Current Ranking (Optional)</label>
                 <input
                   type="text"
                   id="currentRanking"
                   value={joinFormData.currentRanking}
                   onChange={(e) => setJoinFormData({...joinFormData, currentRanking: e.target.value})}
                   placeholder="Optional"
                   style={{
                     width: '100%',
                     padding: '0.3rem 0.5rem',
                     border: '1px solid rgba(255, 255, 255, 0.25)',
                     borderRadius: '6px',
                     background: 'rgba(255, 255, 255, 0.08)',
                     color: '#fff',
                     fontSize: '0.75rem',
                     boxSizing: 'border-box',
                     height: '20px',
                     transition: 'all 0.2s ease',
                     boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                   }}
                 />
               </div>
             </div>

            <div style={{ marginBottom: '0.8rem' }}>
              <label htmlFor="message" style={{
                display: 'block',
                color: '#fff',
                marginBottom: '0.3rem',
                fontWeight: '600',
                fontSize: '0.75rem'
              }}>Additional Message</label>
              <textarea
                id="message"
                value={joinFormData.message}
                onChange={(e) => setJoinFormData({...joinFormData, message: e.target.value})}
                placeholder="Optional - Tell us about your pool experience, goals, or questions..."
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  minHeight: '24px',
                  maxHeight: '32px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>

            {/* Payment Section - Only show if no promotional period */}
            {!paymentConfig?.promotionalMessage && (
              <div style={{ 
                marginBottom: '0.8rem',
                padding: '0.6rem',
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.06) 100%)',
                border: '1px solid rgba(76, 175, 80, 0.35)',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(76, 175, 80, 0.15)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.4rem'
                }}>
                  <input
                    type="checkbox"
                    checked={joinFormData.payNow}
                    onChange={(e) => setJoinFormData({...joinFormData, payNow: e.target.checked})}
                    style={{ 
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      margin: '0',
                      accentColor: '#4CAF50'
                    }}
                  />
                  <label style={{ color: '#4caf50', fontWeight: '600', fontSize: '0.85rem' }}>
                    💳 Pay $5 Monthly Fee Now (Optional)
                  </label>
                </div>
                <p style={{ 
                  color: '#b0b0b0', 
                  fontSize: '0.75rem', 
                  margin: '0',
                  fontStyle: 'italic',
                  lineHeight: '1.3'
                }}>
                  If you pay now, you'll be added to the ladder immediately after approval.<br></br> If not, you'll need to pay before being added to the ladder system.
                </p>
                
                {/* Payment Method Selection - Only show if payNow is checked */}
                {joinFormData.payNow && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#4caf50',
                    marginBottom: '0.3rem',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}>Select Payment Method: *</label>
                  <select
                    value={joinFormData.paymentMethod}
                    onChange={handlePaymentMethodChange}
                    required={joinFormData.payNow}
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      border: '2px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="" style={{ color: '#000', background: '#fff' }}>Choose payment method...</option>
                    <option value="venmo" style={{ color: '#000', background: '#fff' }}>Venmo</option>
                    <option value="cashapp" style={{ color: '#000', background: '#fff' }}>CashApp</option>
                    <option value="creditCard" style={{ color: '#000', background: '#fff' }}>Credit/Debit Card</option>
                    <option value="applePay" style={{ color: '#000', background: '#fff' }}>Apple Pay</option>
                    <option value="googlePay" style={{ color: '#000', background: '#fff' }}>Google Pay</option>
                    <option value="cash" style={{ color: '#000', background: '#fff' }}>Cash</option>
                    <option value="check" style={{ color: '#000', background: '#fff' }}>Check</option>
                  </select>
                  
                  {/* Payment Instructions */}
                  {showPaymentInstructions && joinFormData.paymentMethod && (
                    <div style={{ 
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px'
                    }}>
                      <h4 style={{
                        color: '#4CAF50',
                        margin: '0 0 0.3rem 0',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}>💳 Payment Instructions</h4>
                      <div style={{
                        color: '#fff',
                        fontSize: '0.75rem',
                        lineHeight: '1.2',
                        whiteSpace: 'pre-line'
                      }}>
                        {getPaymentInstructions(joinFormData.paymentMethod)}
                      </div>
                      <div style={{
                        marginTop: '0.3rem',
                        padding: '0.3rem',
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '3px',
                        color: '#ffc107',
                        fontSize: '0.75rem'
                      }}>
                        ⚠️ Please complete your payment before submitting this form. Your application will be processed once payment is received.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
            
            {/* Promotional Message - Show during promotional period */}
            {paymentConfig?.promotionalMessage && (
              <div style={{
                marginBottom: '0.8rem',
                padding: '0.8rem',
                background: 'rgba(255, 215, 0, 0.15)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(255, 215, 0, 0.2)'
              }}>
                <p style={{
                  color: '#ffd700',
                  fontSize: '0.8rem',
                  margin: '0',
                  fontWeight: '600',
                  lineHeight: '1.3'
                }}>
                  🎉 {paymentConfig.promotionalMessage}
                </p>
                <p style={{
                  color: '#ffd700',
                  fontSize: '0.65rem',
                  margin: '0.3rem 0 0 0',
                  fontWeight: '400',
                  opacity: 0.9
                }}>
                  No membership fee required during promotional period!<br/>
                  Match fees still apply.
                </p>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '0.8rem',
              marginTop: '0.8rem'
            }}>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                disabled={submittingJoin}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingJoin}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(76, 175, 80, 0.3)'
                }}
              >
                {submittingJoin ? 'Submitting...' : (isClaimMode ? '🎯 Claim Position' : '📈 Join Ladder of Legends')}
              </button>
            </div>
          </form>

          <div style={{
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.06) 100%)',
            border: '1px solid rgba(76, 175, 80, 0.35)',
            borderRadius: '8px',
            padding: '0.6rem',
            marginTop: '0.8rem',
            boxShadow: '0 2px 6px rgba(76, 175, 80, 0.15)'
          }}>
            <h3 style={{
              color: '#4CAF50',
              margin: '0 0 0.4rem 0',
              fontSize: '0.85rem',
              fontWeight: '600'
              }}>📋 What to Expect</h3>
            <ul style={{
              margin: '0',
              paddingLeft: '1rem',
              color: '#b0b0b0',
              fontSize: '0.75rem',
              lineHeight: '1.3'
            }}>
              <li>If you paid the monthly membership now:<br></br> 
              If claiming an account, you will be added immediatly.<br></br>
              New users will be added to the appropriate ladder upon admin approval<br></br></li>
              <br />
             <li>If not paid now, your application will be processed after payment is received</li>
              <li><br></br>Once added to the ladder, you can start challenging players and climbing the rankings
              <br></br>Issue challenges, defend your position, and compete in the ladder system</li>
            </ul>
          </div>
                 </DraggableModal>
       )}

               {/* View Ladder Modal */}
        <StandaloneLadderModal
          isOpen={showLadderModal}
          onClose={() => setShowLadderModal(false)}
          onSignup={handleJoinLadder}
        />

        {/* Unified Signup Modal */}
        <UnifiedSignupModal 
          isOpen={showSignupForm}
          onClose={() => setShowSignupForm(false)}
          onSuccess={(data) => {
            console.log('Signup successful:', data);
            setShowSignupForm(false);
            // You can add any success handling here
          }}
        />
     </div>
   );
 };

export default GuestLadderApp;
