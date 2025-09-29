import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config.js';

const LadderMatchReportingModal = ({ 
  isOpen, 
  onClose, 
  playerName, 
  selectedLadder,
  onMatchReported,
  isAdmin = false,
  onPaymentInfoModalReady
}) => {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const [pendingMatches, setPendingMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showExampleMode, setShowExampleMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Match reporting form state
  const [winner, setWinner] = useState('');
  const [score, setScore] = useState('');
  const [scoreFormat, setScoreFormat] = useState('race-to-5'); // Standard format
  const [customRaceTo, setCustomRaceTo] = useState(''); // For "Other" option
  const [winnerGames, setWinnerGames] = useState('');
  const [loserGames, setLoserGames] = useState('');
  const [notes, setNotes] = useState('');
  const [scoreError, setScoreError] = useState('');
  
  // Payment state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Expose setShowPaymentInfo function to parent component
  useEffect(() => {
    if (onPaymentInfoModalReady) {
      onPaymentInfoModalReady(setShowPaymentInfo);
    }
  }, [onPaymentInfoModalReady]);
  const [membership, setMembership] = useState(null);
  const [userPaymentHistory, setUserPaymentHistory] = useState(null);
  const [userCredits, setUserCredits] = useState(0);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPendingMatches();
      fetchMembershipStatus();
      loadPaymentMethods();
      loadUserPaymentData();
    }
  }, [isOpen, playerName, selectedLadder]);

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/payment-methods`);
      if (response.ok) {
        const data = await response.json();
        setAvailablePaymentMethods(data.paymentMethods);
        setPaymentConfig(data);
        if (data.paymentMethods.length > 0) {
          setPaymentMethod(data.paymentMethods[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const fetchPendingMatches = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch scheduled matches for this ladder
      const response = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${selectedLadder}/matches?status=scheduled`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Filter matches to only show those involving the current player
        const playerMatches = (data.matches || []).filter(match => {
          const player1Email = match.player1?.email || match.player1?.unifiedAccount?.email;
          const player2Email = match.player2?.email || match.player2?.unifiedAccount?.email;
          return player1Email === playerName || player2Email === playerName;
        });
        
        // Helper function to convert date to local date string without timezone issues
        const toLocalDateString = (date) => {
          if (!date) return '';
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // Transform the data to match the expected format
        const transformedMatches = playerMatches.map(match => ({
          _id: match._id,
          senderName: match.player1?.firstName + ' ' + match.player1?.lastName,
          receiverName: match.player2?.firstName + ' ' + match.player2?.lastName,
          date: toLocalDateString(match.scheduledDate),
          time: match.scheduledDate ? new Date(match.scheduledDate).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }) : '',
          location: match.location || match.venue || 'TBD',
          status: match.status,
          createdAt: match.createdAt || new Date().toISOString(),
          matchFormat: match.matchFormat,
          raceLength: match.raceLength
        }));
        
        setPendingMatches(transformedMatches);
      } else {
        console.error('Failed to fetch scheduled matches:', response.status, response.statusText);
        setPendingMatches([]);
      }
    } catch (error) {
      console.error('Error fetching pending matches:', error);
      setError('Failed to load pending matches');
      setPendingMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/membership/${playerName}`);
      if (response.ok) {
        const data = await response.json();
        setMembership(data.membership);
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
    }
  };

  const loadUserPaymentData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/user-payment-data/${playerName}`);
      if (response.ok) {
        const data = await response.json();
        setUserPaymentHistory(data.paymentHistory);
        setUserCredits(data.credits || 0);
      }
    } catch (error) {
      console.error('Error loading user payment data:', error);
    }
  };

  const handleReportMatch = (match) => {
    setSelectedMatch(match);
    setWinner('');
    setScore('');
    setScoreFormat('race-to-5');
    setCustomRaceTo('');
    setWinnerGames('');
    setLoserGames('');
    setNotes('');
    setScoreError('');
    setShowPaymentForm(false);
    setError('');
    setMessage('');
  };

  const handleExampleMode = () => {
    const exampleMatch = {
      _id: 'example-match',
      senderName: 'John Doe',
      receiverName: 'Jane Smith',
      date: '2024-01-15',
      time: '7:00 PM',
      location: 'Legends Brews & Cues',
      matchFormat: 'race-to-5',
      raceLength: 5
    };
    setSelectedMatch(exampleMatch);
    setShowExampleMode(true);
    setWinner('');
    setScore('');
    setScoreFormat('race-to-5');
    setCustomRaceTo('');
    setWinnerGames('');
    setLoserGames('');
    setNotes('');
    setScoreError('');
    setShowPaymentForm(false);
    setError('');
    setMessage('');
  };

  const handleBackToList = () => {
    setSelectedMatch(null);
    setShowExampleMode(false);
    setError('');
    setMessage('');
  };

  // Score validation and formatting functions
  const validateScore = (winnerGames, loserGames, format) => {
    const winnerNum = parseInt(winnerGames);
    const loserNum = parseInt(loserGames);
    
    if (!winnerGames || !loserGames || isNaN(winnerNum) || isNaN(loserNum)) {
      return { valid: false, error: 'Please enter valid numbers for both scores' };
    }
    
    if (winnerNum <= 0 || loserNum <= 0) {
      return { valid: false, error: 'Scores must be greater than 0' };
    }
    
    if (winnerNum === loserNum) {
      return { valid: false, error: 'Winner and loser cannot have the same score' };
    }
    
    // Validate based on format
    let maxGames;
    if (format === 'other') {
      maxGames = parseInt(customRaceTo) || 5;
    } else {
      maxGames = parseInt(format.split('-')[2]) || 5;
    }
    
    if (winnerNum > maxGames || loserNum > maxGames) {
      return { valid: false, error: `Scores cannot exceed ${maxGames} games for ${format.replace('-', ' ')}` };
    }
    
    // Winner must have more games
    if (winnerNum < loserNum) {
      return { valid: false, error: 'Winner must have more games than loser' };
    }
    
    return { valid: true, error: '' };
  };

  const formatScore = (winnerGames, loserGames) => {
    return `${winnerGames}-${loserGames}`;
  };

  const handleScoreChange = (field, value) => {
    if (field === 'winner') {
      setWinnerGames(value);
    } else {
      setLoserGames(value);
    }
    
    // Clear previous errors
    setScoreError('');
    
    // Auto-format the score display
    if (value && (field === 'winner' ? loserGames : winnerGames)) {
      const validation = validateScore(
        field === 'winner' ? value : winnerGames,
        field === 'winner' ? loserGames : value,
        scoreFormat
      );
      
      if (validation.valid) {
        setScore(formatScore(
          field === 'winner' ? value : winnerGames,
          field === 'winner' ? loserGames : value
        ));
      } else {
        setScoreError(validation.error);
        setScore('');
      }
    }
  };

  // Generate options for score dropdowns based on race format
  const generateScoreOptions = () => {
    let maxGames;
    if (scoreFormat === 'other') {
      maxGames = parseInt(customRaceTo) || 5;
    } else {
      maxGames = parseInt(scoreFormat.split('-')[2]) || 5;
    }
    
    const options = [];
    for (let i = 0; i <= maxGames; i++) {
      options.push(i);
    }
    return options;
  };

  // Determine user trust level and payment method
  const getUserTrustLevel = () => {
    if (!userPaymentHistory) return 'new';
    
    const totalPayments = userPaymentHistory.totalPayments || 0;
    const failedPayments = userPaymentHistory.failedPayments || 0;
    const successRate = totalPayments > 0 ? (totalPayments - failedPayments) / totalPayments : 0;
    
    if (totalPayments >= 10 && successRate >= 0.95) return 'trusted';
    if (totalPayments >= 3 && successRate >= 0.8) return 'verified';
    return 'new';
  };

  const canUseCredits = () => {
    const matchFee = 5.00;
    return userCredits >= matchFee;
  };

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    
    if (!winner) {
      setError('Please select a winner');
      return;
    }
    
    // Validate custom race input if "Other" is selected
    if (scoreFormat === 'other' && (!customRaceTo || parseInt(customRaceTo) < 1)) {
      setError('Please enter a valid custom race number (1 or higher)');
      return;
    }
    
    // Validate score
    const validation = validateScore(winnerGames, loserGames, scoreFormat);
    if (!validation.valid) {
      setScoreError(validation.error);
      setError('Please fix the score before submitting');
      return;
    }
    
    // Set the formatted score
    setScore(formatScore(winnerGames, loserGames));

    // Handle example mode
    if (showExampleMode) {
      setMessage('✅ Example match result submitted! (This was just a test - no actual match was reported)');
      setTimeout(() => {
        handleBackToList();
      }, 3000);
      return;
    }

    // Skip payment checks for admin users
    if (isAdmin) {
      await submitMatchResultAsAdmin();
      return;
    }

    // Check if membership is active
    if (!membership || !membership.isActive) {
      setError('❌ Active membership required to report matches. Please renew your membership first.');
      setShowPaymentForm(true);
      return;
    }

    // Check if user can use credits
    if (canUseCredits()) {
      await submitMatchResultWithCredits();
    } else {
      setShowPaymentForm(true);
    }
  };

  const submitMatchResultAsAdmin = async () => {
    try {
      setSubmitting(true);
      setError('');

      // For admin, use the same endpoint pattern as LadderPlayerManagement
      // This should be the working endpoint that was used before
      const response = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${selectedLadder}/matches/${selectedMatch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: winner,
          score: score,
          notes: notes,
          completedDate: new Date().toISOString(),
          status: 'completed',
          reportedBy: 'admin' // Mark as admin-reported
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('✅ Match result recorded successfully by admin!');
        
        // Update local state
        setPendingMatches(prev => prev.filter(m => m._id !== selectedMatch._id));
        
        // Notify parent component
        if (onMatchReported) {
          onMatchReported(data.match);
        }
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('🔍 Admin match reporting error response:', errorData);
        setError(`Failed to record match result: ${errorData.message || errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting match result as admin:', error);
      setError('Failed to record match result');
    } finally {
      setSubmitting(false);
    }
  };

  const submitMatchResultWithCredits = async () => {
    try {
      // Deduct credits and submit match
      const response = await fetch(`${BACKEND_URL}/api/monetization/use-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerEmail: playerName,
          amount: 5.00,
          description: 'Ladder Match Fee'
        })
      });

      if (response.ok) {
        await submitMatchResult();
        setUserCredits(prev => prev - 5.00);
      } else {
        throw new Error('Failed to use credits');
      }
    } catch (error) {
      console.error('Credit payment error:', error);
      setError('Credit payment failed. Please try again.');
    }
  };

  const handleCashPayment = async () => {
    setPaymentProcessing(true);
    setError('');

    try {
      const needsMembershipRenewal = !membership || !membership.isActive;
      const totalAmount = needsMembershipRenewal ? 10.00 : 5.00;
      
      // Create payment record(s) for cash payment
      const paymentPromises = [];
      
      // Always record match fee as cash payment
      paymentPromises.push(
        fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'match_fee',
            playerEmail: playerName,
            playerName: playerName,
            amount: 5.00,
            paymentMethod: 'cash',
            matchId: selectedMatch._id,
            playerId: playerName,
            notes: `Cash payment at Legends red dropbox - Match fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            status: 'pending_verification' // Backend will determine if verification is needed
          })
        })
      );
      
      // If membership is expired, also record membership renewal as cash
      if (needsMembershipRenewal) {
        paymentPromises.push(
          fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'membership',
              playerEmail: playerName,
              playerName: playerName,
              amount: 5.00,
              paymentMethod: 'cash',
              playerId: playerName,
              notes: `Cash payment at Legends red dropbox - Membership renewal for ${playerName}`,
              status: 'pending_verification' // Backend will determine if verification is needed
            })
          })
        );
      }
      
      // Wait for all payments to be recorded
      const responses = await Promise.all(paymentPromises);
      const allSuccessful = responses.every(response => response.ok);
      
      if (allSuccessful) {
        // Check if any payments require verification
        const paymentResponses = await Promise.all(responses.map(r => r.json()));
        const needsVerification = paymentResponses.some(r => r.payment?.status === 'pending_verification');
        
        if (needsVerification) {
          // Record the match result with pending payment verification status
          await recordMatchWithPendingPayment();
          
          setMessage('✅ Cash payment recorded! Please drop your payment in the red dropbox at Legends. Your match has been submitted for admin review and will be processed once payment is verified.');
        } else {
          // Payment processed immediately, submit match normally
          await submitMatchResult();
          setMessage('✅ Cash payment processed! Match result recorded successfully.');
        }
        
        setTimeout(() => {
          onClose();
          // Call onMatchReported to refresh the pending matches list
          if (onMatchReported) {
            onMatchReported();
          }
        }, 4000);
      } else {
        throw new Error('Failed to record cash payment(s)');
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      setError('Failed to record cash payment. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const recordMatchWithPendingPayment = async () => {
    try {
      // Record the match result with pending payment verification status
      const response = await fetch(`${BACKEND_URL}/api/ladder/matches/${selectedMatch._id}/record-pending-payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winner: winner,
          score: score,
          notes: notes,
          reportedBy: playerName,
          reportedAt: new Date().toISOString(),
          status: 'pending_payment_verification',
          paymentMethod: 'cash'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record match with pending payment');
      }

      // Update local state to remove from pending matches
      setPendingMatches(prev => prev.filter(m => m._id !== selectedMatch._id));
      
    } catch (error) {
      console.error('Error recording match with pending payment:', error);
      throw error;
    }
  };

  const handleQuickPayment = async (paymentMethodId) => {
    setPaymentProcessing(true);
    setError('');

    try {
      const needsMembershipRenewal = !membership || !membership.isActive;
      const totalAmount = needsMembershipRenewal ? 10.00 : 5.00;
      
      // Create payment record(s)
      const paymentPromises = [];
      
      // Always record match fee
      paymentPromises.push(
        fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'match_fee',
            email: playerName,
            playerName: playerName,
            amount: 5.00,
            paymentMethod: paymentMethodId,
            matchId: selectedMatch._id,
            playerId: playerName,
            notes: `Match fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            status: 'completed'
          })
        })
      );
      
      // If membership is expired, also record membership renewal
      if (needsMembershipRenewal) {
        paymentPromises.push(
          fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'membership',
              email: playerName,
              playerName: playerName,
              amount: 5.00,
              paymentMethod: paymentMethodId,
              playerId: playerName,
              notes: `Membership renewal for ${playerName}`,
              status: 'completed'
            })
          })
        );
      }
      
      // Wait for all payments to be recorded
      const responses = await Promise.all(paymentPromises);
      const allSuccessful = responses.every(response => response.ok);
      
      if (allSuccessful) {
        const trustLevel = getUserTrustLevel();
        if (trustLevel === 'new') {
          setMessage('✅ Payment recorded! Your match is pending admin verification.');
          setTimeout(() => {
            onClose();
            onMatchReported();
          }, 2000);
        } else {
          // Submit match result after payments recorded
          await submitMatchResult();
        }
      } else {
        throw new Error('Failed to record payment(s)');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment processing failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const submitMatchResult = async () => {
    try {
      setSubmitting(true);
      setError('');

      // Find the winner's player ID from the ladder data
      const winnerPlayer = pendingMatches.find(match => 
        match.senderName === winner || match.receiverName === winner
      );
      
      if (!winnerPlayer) {
        throw new Error('Could not find winner in match data');
      }

      // Determine winner ID - this should be the player's ID from the ladder
      // For now, we'll use the playerName as the identifier
      const winnerId = playerName; // This should be the email or player ID
      const scoreData = score;
      const notesData = notes;

      console.log('🔍 Submitting ladder match result:', {
        matchId: selectedMatch._id,
        winnerId: winnerId,
        score: scoreData,
        notes: notesData
      });

      const response = await fetch(`${BACKEND_URL}/api/ladder/matches/${selectedMatch._id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winnerId: winnerId,
          score: scoreData,
          notes: notesData,
          completedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('✅ Match result reported successfully!');
        
        // Update local state
        setPendingMatches(prev => prev.filter(m => m._id !== selectedMatch._id));
        
        // Notify parent component
        if (onMatchReported) {
          onMatchReported(data.match);
        }
        
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('🔍 Match reporting error response:', errorData);
        
        if (errorData.error === 'Payment verification required') {
          setError('❌ This match has pending cash payments that require admin verification. The match cannot be processed until an administrator approves the cash payment. Please contact an administrator or wait for payment verification.');
        } else {
          setError(errorData.message || errorData.error || 'Failed to report match result');
        }
        return; // Don't throw error, just set the error message
      }
    } catch (error) {
      console.error('Error reporting match result:', error);
      setError(error.message || 'Failed to report match result');
    } finally {
      setSubmitting(false);
    }
  };


  const formatDate = (dateString) => {
    // Handle YYYY-MM-DD format without timezone issues
    if (dateString && dateString.includes('-')) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    // Fallback for other date formats
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLadderDisplayName = (ladderName) => {
    switch (ladderName) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return ladderName;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="prize-pool-modal" style={isMobile ? { padding: '8px' } : undefined}>
      <div 
        className="prize-pool-modal-content"
        style={isMobile ? {
          width: '95vw',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '12px'
        } : undefined}
      >
        {/* Header */}
        <div className="modal-header" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          {/* Left side - Ladder name */}
          <div style={{
            color: '#ff4444',
            fontSize: isMobile ? '1rem' : '1.2rem',
            fontWeight: 'bold',
            flex: '1'
          }}>
            {getLadderDisplayName(selectedLadder)} Ladder
          </div>
          
          {/* Center - Title */}
          <h2 style={{
            color: '#ff4444',
            margin: '0',
            fontSize: isMobile ? '1.3rem' : '1.8rem',
            textAlign: 'center',
            flex: '2'
          }}>
            ⚔️ Report Match Result
            {isAdmin && (
              <div style={{
                background: 'rgba(245, 158, 66, 0.2)',
                border: '1px solid rgba(245, 158, 66, 0.4)',
                borderRadius: '6px',
                padding: isMobile ? '6px' : '8px',
                marginTop: '10px',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                color: '#f59e42'
              }}>
                🔧 Admin Mode - Payment checks bypassed
              </div>
            )}
          </h2>
          
          {/* Right side - Close button */}
          <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#ccc',
                fontSize: isMobile ? '1.2rem' : '1.5rem',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '50%',
                width: isMobile ? '32px' : '40px',
                height: isMobile ? '32px' : '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = '#ccc';
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: '#ccc', marginTop: '1rem' }}>Loading pending matches...</p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '6px',
                  padding: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  color: '#ffc107'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {message && (
                <div style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '6px',
                  padding: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  color: '#4caf50'
                }}>
                  ✅ {message}
                </div>
              )}

              {/* Pending Matches List */}
              {!selectedMatch && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#ff4444', margin: '0', fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                      📋 Pending Matches to Report
                    </h3>
                    <button
                      onClick={handleExampleMode}
                      style={{
                        background: 'rgba(255, 193, 7, 0.2)',
                        border: '1px solid rgba(255, 193, 7, 0.4)',
                        borderRadius: '6px',
                        padding: isMobile ? '6px 10px' : '8px 12px',
                        color: '#ffc107',
                        fontSize: isMobile ? '0.85rem' : '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 193, 7, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 193, 7, 0.2)';
                      }}
                    >
                      🧪 Try Example
                    </button>
                  </div>
                  
                  {pendingMatches.length === 0 ? (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#ccc'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎉</div>
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No pending matches!</div>
                      <div style={{ fontSize: '0.9rem' }}>All your matches have been reported.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {pendingMatches.map((match) => (
                        <div key={match._id} style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.target.style.borderColor = 'rgba(255, 68, 68, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onClick={() => handleReportMatch(match)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                {match.senderName} vs {match.receiverName}
                              </div>
                              <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                📅 {formatDate(match.date)} at {match.time}
                              </div>
                              {match.location && (
                                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                                  📍 {match.location}
                                </div>
                              )}
                            </div>
                            <div style={{
                              background: 'rgba(255, 68, 68, 0.2)',
                              color: '#ff4444',
                              padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: isMobile ? '0.85rem' : '0.9rem',
                              fontWeight: 'bold'
                            }}>
                              Report Result
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Match Reporting Form */}
              {selectedMatch && !showPaymentForm && (
                <div style={{ marginBottom: '2rem' }}>
                  
                  {/* Back Button */}
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                      onClick={handleBackToList}
                      style={{
                        background: 'rgba(108, 117, 125, 0.2)',
                        border: '1px solid rgba(108, 117, 125, 0.4)',
                        borderRadius: '6px',
                        padding: isMobile ? '6px 10px' : '8px 12px',
                        color: '#6c757d',
                        fontSize: isMobile ? '0.85rem' : '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(108, 117, 125, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(108, 117, 125, 0.2)';
                      }}
                    >
                      ← Back to Matches
                    </button>
                    {showExampleMode && (
                      <span style={{
                        marginLeft: '1rem',
                        background: 'rgba(255, 193, 7, 0.2)',
                        border: '1px solid rgba(255, 193, 7, 0.4)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: '#ffc107',
                        fontSize: '0.8rem'
                      }}>
                        🧪 Example Mode
                      </span>
                    )}
                  </div>
                  
                  {/* Match Fee Information */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
                      💰 Match Fee Information
                    </div>
                    <div style={{ color: '#e0e0e0', fontSize: isMobile ? '0.85rem' : '0.9rem', marginBottom: '8px' }}>
                      The <strong>winner</strong> reports the match and pays the <strong>$5 match fee</strong>.
                      <br />
                      <em>Only one $5 fee per match - not per player!</em>
                    </div>
                    <button
                      onClick={() => setShowPaymentInfo(true)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                        padding: isMobile ? '6px 10px' : '6px 12px',
                        borderRadius: '4px',
                        fontSize: isMobile ? '0.8rem' : '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(16, 185, 129, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(16, 185, 129, 0.2)';
                      }}
                    >
                      📋 View Payment Details
                    </button>
                  </div>

                  {/* Match Details */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    <h4 style={{ color: '#fff', margin: '0 0 0.75rem 0' }}>Match Details</h4>
                    <div style={{ color: '#ccc', fontSize: isMobile ? '0.9rem' : '0.9rem' }}>
                      <div><strong>{selectedMatch.senderName}</strong> vs <strong>{selectedMatch.receiverName}</strong></div>
                      <div>📅 {formatDate(selectedMatch.date)} at {selectedMatch.time}</div>
                      {selectedMatch.location && <div>📍 {selectedMatch.location}</div>}
                    </div>
                  </div>

                  {/* Reporting Form */}
                  <form onSubmit={handleSubmitResult}>
                    {/* Match Format Selection */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Match Format *
                      </label>
                      <select
                        value={scoreFormat}
                        onChange={(e) => {
                          setScoreFormat(e.target.value);
                          setScoreError('');
                          setScore('');
                          setCustomRaceTo('');
                          setWinnerGames('');
                          setLoserGames('');
                        }}
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.45rem' : '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: isMobile ? '0.95rem' : '1rem'
                        }}
                      >
                        <option value="race-to-5" style={{ background: '#000', color: '#fff' }}>Race to 5</option>
                        <option value="race-to-7" style={{ background: '#000', color: '#fff' }}>Race to 7</option>
                        <option value="race-to-9" style={{ background: '#000', color: '#fff' }}>Race to 9</option>
                        <option value="race-to-11" style={{ background: '#000', color: '#fff' }}>Race to 11</option>
                        <option value="race-to-13" style={{ background: '#000', color: '#fff' }}>Race to 13</option>
                        <option value="race-to-15" style={{ background: '#000', color: '#fff' }}>Race to 15</option>
                        <option value="race-to-17" style={{ background: '#000', color: '#fff' }}>Race to 17</option>
                        <option value="race-to-19" style={{ background: '#000', color: '#fff' }}>Race to 19</option>
                        <option value="race-to-21" style={{ background: '#000', color: '#fff' }}>Race to 21</option>
                        <option value="other" style={{ background: '#000', color: '#fff' }}>Other (Custom)</option>
                      </select>
                    </div>

                    {/* Custom Race Input - Only show when "Other" is selected */}
                    {scoreFormat === 'other' && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Custom Race to *
                      </label>
                        <input
                          type="number"
                          value={customRaceTo}
                          onChange={(e) => {
                            setCustomRaceTo(e.target.value);
                            setScoreError('');
                            setScore('');
                            setWinnerGames('');
                            setLoserGames('');
                          }}
                          placeholder="Enter number (e.g., 25, 50, 100)"
                          min="1"
                          max="999"
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.45rem' : '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: isMobile ? '0.95rem' : '1rem'
                        }}
                        />
                        <div style={{ 
                          color: '#999', 
                          fontSize: '0.8rem', 
                          marginTop: '0.25rem' 
                        }}>
                          Enter the number of games needed to win (1-999)
                        </div>
                      </div>
                    )}

                    {/* Winner Selection */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Winner *
                      </label>
                      <select
                        value={winner}
                        onChange={(e) => setWinner(e.target.value)}
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.45rem' : '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: isMobile ? '0.95rem' : '1rem'
                        }}
                        required
                      >
                        <option value="" style={{ background: '#000', color: '#fff' }}>Select winner</option>
                        <option value={selectedMatch.senderName} style={{ background: '#000', color: '#fff' }}>{selectedMatch.senderName}</option>
                        <option value={selectedMatch.receiverName} style={{ background: '#000', color: '#fff' }}>{selectedMatch.receiverName}</option>
                      </select>
                    </div>

                    {/* Standardized Score Input */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Final Score *
                      </label>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr', 
                        gap: isMobile ? '0.5rem' : '0.75rem', 
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }} className="score-input-grid">
                        {/* Winner Score */}
                        <div>
                          <label style={{ 
                            display: 'block', 
                            color: '#4caf50', 
                            fontSize: '0.9rem', 
                            marginBottom: '0.25rem',
                            fontWeight: 'bold'
                          }}>
                            {winner ? `${winner} games won` : 'Player games won'}
                          </label>
                          <select
                            value={winnerGames}
                            onChange={(e) => handleScoreChange('winner', e.target.value)}
                            style={{
                              width: '100%',
                              padding: isMobile ? '0.45rem' : '0.5rem',
                              borderRadius: '6px',
                              border: scoreError ? '2px solid #f44336' : '1px solid rgba(76, 175, 80, 0.3)',
                              background: 'rgba(0, 0, 0, 0.8)',
                              color: '#4caf50',
                              fontSize: isMobile ? '1.1rem' : '1.2rem',
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}
                          >
                            <option value="" style={{ background: '#000', color: '#fff' }}>Select</option>
                            {generateScoreOptions().map(num => (
                              <option key={num} value={num} style={{ background: '#000', color: '#fff' }}>
                                {num}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* VS Separator */}
                        {!isMobile && (
                          <div style={{ 
                            color: '#ccc', 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold',
                            textAlign: 'center',
                            marginTop: '1.5rem'
                          }}>
                            -
                          </div>
                        )}
                        
                        {/* Loser Score */}
                        <div>
                          <label style={{ 
                            display: 'block', 
                            color: '#f44336', 
                            fontSize: '0.9rem', 
                            marginBottom: '0.25rem',
                            fontWeight: 'bold'
                          }}>
                            {winner ? `${winner === selectedMatch.senderName ? selectedMatch.receiverName : selectedMatch.senderName} games won` : 'Player games won'}
                          </label>
                          <select
                            value={loserGames}
                            onChange={(e) => handleScoreChange('loser', e.target.value)}
                            style={{
                              width: '100%',
                              padding: isMobile ? '0.45rem' : '0.5rem',
                              borderRadius: '6px',
                              border: scoreError ? '2px solid #f44336' : '1px solid rgba(244, 67, 54, 0.3)',
                              background: 'rgba(0, 0, 0, 0.8)',
                              color: '#f44336',
                              fontSize: isMobile ? '1.1rem' : '1.2rem',
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}
                          >
                            <option value="" style={{ background: '#000', color: '#fff' }}>Select</option>
                            {generateScoreOptions().map(num => (
                              <option key={num} value={num} style={{ background: '#000', color: '#fff' }}>
                                {num}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Score Display */}
                      {score && winner && (
                        <div style={{
                          background: 'rgba(76, 175, 80, 0.1)',
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          textAlign: 'center',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ color: '#4caf50', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem' }}>
                            🏆 {winner} wins: {score}
                          </div>
                        </div>
                      )}
                      
                      {/* Score Error */}
                      {scoreError && (
                        <div style={{
                          background: 'rgba(244, 67, 54, 0.1)',
                          border: '1px solid rgba(244, 67, 54, 0.3)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          color: '#f44336',
                          fontSize: '0.9rem',
                          textAlign: 'center'
                        }}>
                          ⚠️ {scoreError}
                        </div>
                      )}
                      
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional notes about the match..."
                        rows="3"
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.45rem' : '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.3)',
                          color: '#fff',
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <button
                        type="submit"
                        disabled={submitting || !winner || !winnerGames || !loserGames || scoreError || (scoreFormat === 'other' && !customRaceTo)}
                        style={{
                          background: 'rgba(255, 68, 68, 0.8)',
                          border: 'none',
                          color: '#fff',
                          padding: isMobile ? '10px 14px' : '12px 16px',
                          borderRadius: '8px',
                          cursor: submitting || !winner || !winnerGames || !loserGames || scoreError || (scoreFormat === 'other' && !customRaceTo) ? 'not-allowed' : 'pointer',
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          fontWeight: 'bold',
                          opacity: submitting || !winner || !winnerGames || !loserGames || scoreError || (scoreFormat === 'other' && !customRaceTo) ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!submitting && winner && winnerGames && loserGames && !scoreError && !(scoreFormat === 'other' && !customRaceTo)) {
                            e.target.style.background = 'rgba(255, 68, 68, 1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 68, 68, 0.8)';
                        }}
                      >
                        {submitting ? 'Submitting...' : '🏆 Report Match & Pay $5 Fee'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMatch(null);
                          setWinner('');
                          setScore('');
                          setScoreFormat('race-to-5');
                          setCustomRaceTo('');
                          setWinnerGames('');
                          setLoserGames('');
                          setNotes('');
                          setScoreError('');
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ccc',
                          padding: isMobile ? '10px 14px' : '12px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                          e.target.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.color = '#ccc';
                        }}
                      >
                        ← Back to Matches
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Simplified Payment Form */}
              {showPaymentForm && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#ff4444', marginBottom: '1rem', fontSize: isMobile ? '1.15rem' : '1.3rem', textAlign: 'center' }}>
                    💳 Pay Match Fee
                  </h3>
                  
                  {/* Simple Payment Summary */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#fff', fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Total Amount Due
                    </div>
                    <div style={{ color: '#4caf50', fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      ${(!membership || !membership.isActive) ? '10.00' : '5.00'}
                    </div>
                    <div style={{ color: '#ccc', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                      {(!membership || !membership.isActive) ? 
                        'Match Fee ($5) + Membership Renewal ($5)' : 
                        'Match Fee ($5)'
                      }
                    </div>
                  </div>

                  {/* Quick Credit Option */}
                  {canUseCredits() && (
                    <div style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={submitMatchResultWithCredits}
                        style={{
                          background: 'linear-gradient(135deg, #4caf50, #45a049)',
                          color: '#fff',
                          border: 'none',
                          padding: isMobile ? '0.85rem 1.4rem' : '1rem 2rem',
                          borderRadius: '8px',
                          fontSize: isMobile ? '1rem' : '1.1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          width: '100%',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                        }}
                      >
                        💳 Pay with Credits (${userCredits.toFixed(2)} available)
                      </button>
                    </div>
                  )}

                  {/* Payment Methods - Simplified */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ color: '#ccc', fontSize: isMobile ? '0.95rem' : '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                      Or pay with one of these methods:
                        </div>
                    
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                    
                    {/* Cash Payment Option */}
                    <div style={{
                      background: 'rgba(255, 68, 68, 0.1)',
                      border: '1px solid rgba(255, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '1rem',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '0.95rem' : '1rem' }}>
                            💵 Cash Payment
                          </div>
                          <div style={{ color: '#ff4444', fontSize: isMobile ? '0.85rem' : '0.9rem', marginTop: '0.25rem' }}>
                            Pay at Legends - Red Dropbox (Pending Admin Approval)
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleCashPayment()}
                          disabled={paymentProcessing}
                          style={{
                            background: paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 68, 68, 0.8)',
                            color: '#fff',
                            border: 'none',
                            padding: isMobile ? '0.6rem 1.1rem' : '0.75rem 1.5rem',
                            borderRadius: '6px',
                            fontSize: isMobile ? '0.85rem' : '0.9rem',
                            fontWeight: 'bold',
                            cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: paymentProcessing ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!paymentProcessing) {
                              e.target.style.background = 'rgba(255, 68, 68, 1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 68, 68, 0.8)';
                          }}
                        >
                          {paymentProcessing ? 'Processing...' : `Record Cash Payment $${(!membership || !membership.isActive) ? '10' : '5'}`}
                        </button>
                      </div>
                    </div>
                    
                    {availablePaymentMethods.map((method) => (
                      <div key={method.id} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '1rem',
                        transition: 'all 0.2s ease'
                      }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '0.95rem' : '1rem' }}>
                              {method.name}
                            </div>
                            {method.username && (
                                <div style={{ color: '#4caf50', fontSize: isMobile ? '0.85rem' : '0.9rem', marginTop: '0.25rem' }}>
                                  {method.username}
                              </div>
                            )}
                        </div>
                        
                          {method.paymentLink ? (
                            <a 
                              href={method.paymentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                background: 'rgba(76, 175, 80, 0.8)',
                                color: '#fff',
                                  padding: isMobile ? '0.6rem 1.1rem' : '0.75rem 1.5rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.85rem' : '0.9rem',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(76, 175, 80, 1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(76, 175, 80, 0.8)';
                              }}
                            >
                                Pay ${(!membership || !membership.isActive) ? '10' : '5'}
                            </a>
                          ) : (
                            <button
                              onClick={() => handleQuickPayment(method.id)}
                              disabled={paymentProcessing}
                              style={{
                                background: paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(76, 175, 80, 0.8)',
                                color: '#fff',
                                border: 'none',
                                  padding: isMobile ? '0.6rem 1.1rem' : '0.75rem 1.5rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.85rem' : '0.9rem',
                                fontWeight: 'bold',
                                cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: paymentProcessing ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!paymentProcessing) {
                                  e.target.style.background = 'rgba(76, 175, 80, 1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(76, 175, 80, 0.8)';
                              }}
                            >
                                {paymentProcessing ? 'Processing...' : `Mark Paid $${(!membership || !membership.isActive) ? '10' : '5'}`}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Back Button */}
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ccc',
                      padding: isMobile ? '10px 14px' : '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.95rem' : '1rem',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.target.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.color = '#ccc';
                    }}
                  >
                    ← Back to Match Form
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payment Information Modal */}
      {showPaymentInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'rgba(20, 20, 20, 0.95)',
            border: '2px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '95vw',
            width: '95vw',
            maxHeight: '95vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowPaymentInfo(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: '#ccc',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = '#ccc';
              }}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#ff4444', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
                💳 Payment Information
              </h2>
              <p style={{ color: '#ccc', margin: 0, fontSize: '1rem' }}>
                Understanding subscription and match reporting fees
              </p>
            </div>

            {/* Content */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Membership Subscription */}
              <div style={{
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: '8px',
                padding: '1.5rem'
              }}>
                <h3 style={{ color: '#2196f3', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                  📅 Monthly Membership - $5/month
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 0.75rem 0' }}>
                    <strong>What it includes:</strong>
                  </p>
                  <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                    <li>Access to all ladder divisions</li>
                    <li>Challenge other players</li>
                    <li>View ladder standings and statistics</li>
                    <li>Participate in tournaments and events</li>
                    <li>Receive notifications and updates</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50' }}>
                    <strong>Note:</strong> Membership is required to report match results. If your membership expires, you'll need to renew it ($5) plus pay the match fee ($5) = $10 total.
                  </p>
                </div>
              </div>

              {/* Match Reporting Fee */}
              <div style={{
                background: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '8px',
                padding: '1.5rem'
              }}>
                <h3 style={{ color: '#4caf50', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                  🏆 Match Reporting Fee - $5 per match
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 0.75rem 0' }}>
                    <strong>How it works:</strong>
                  </p>
                  <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                    <li>Only the <strong>winner</strong> pays the $5 fee</li>
                    <li>One fee per match (not per player)</li>
                    <li>Fee is paid when reporting the match result</li>
                    <li>Supports the ladder system and prize pools</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#ff9800' }}>
                    <strong>Example:</strong> If you win a match, you pay $5 to report the result. The loser pays nothing.
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '8px',
                padding: '1.5rem'
              }}>
                <h3 style={{ color: '#ffc107', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                  💳 Payment Methods
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 0.75rem 0' }}>
                    <strong>We accept:</strong>
                  </p>
                  <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                    <li>CashApp</li>
                    <li>Venmo</li>
                    <li>PayPal</li>
                    <li>Credit/Debit Cards (via Square)</li>
                    <li>Credits (pre-purchased balance)</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50' }}>
                    <strong>Tip:</strong> Buy credits in advance for instant match reporting without verification delays!
                  </p>
                </div>
              </div>

              {/* Trust System */}
              <div style={{
                background: 'rgba(156, 39, 176, 0.1)',
                border: '1px solid rgba(156, 39, 176, 0.3)',
                borderRadius: '8px',
                padding: '1.5rem'
              }}>
                <h3 style={{ color: '#9c27b0', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                  🛡️ Trust & Verification System
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 0.75rem 0' }}>
                    <strong>How verification works:</strong>
                  </p>
                  <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                    <li><strong>New users:</strong> Payments require admin verification (24-48 hours)</li>
                    <li><strong>Verified users:</strong> 3+ successful payments = auto-approval</li>
                    <li><strong>Trusted users:</strong> 10+ successful payments = instant processing</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50' }}>
                    <strong>Build trust:</strong> Make successful payments to earn faster processing!
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowPaymentInfo(false)}
                style={{
                  background: 'rgba(255, 68, 68, 0.8)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 68, 68, 1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 68, 68, 0.8)';
                }}
              >
                Got it! Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LadderMatchReportingModal;
