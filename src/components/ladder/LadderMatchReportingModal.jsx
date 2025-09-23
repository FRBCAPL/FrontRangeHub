import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config.js';

const LadderMatchReportingModal = ({ 
  isOpen, 
  onClose, 
  playerName, 
  selectedLadder,
  onMatchReported,
  isAdmin = false
}) => {
  const [pendingMatches, setPendingMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState({
    _id: 'test-match',
    senderName: 'John Doe',
    receiverName: 'Jane Smith',
    date: '2024-01-15',
    time: '7:00 PM',
    location: 'Legends Brews & Cues'
  }); // TEMP: Show form directly for testing
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
        
        // Transform the data to match the expected format
        const transformedMatches = playerMatches.map(match => ({
          _id: match._id,
          senderName: match.player1?.firstName + ' ' + match.player1?.lastName,
          receiverName: match.player2?.firstName + ' ' + match.player2?.lastName,
          date: match.scheduledDate ? new Date(match.scheduledDate).toISOString().split('T')[0] : '',
          time: match.scheduledDate ? new Date(match.scheduledDate).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }) : '',
          location: match.location || 'TBD',
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

      // Submit match result directly without payment/credit checks for admin
      const response = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${selectedLadder}/matches/${selectedMatch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: winner,
          score: score,
          notes: notes,
          completedDate: new Date().toISOString(),
          reportedBy: 'admin' // Mark as admin-reported
        })
      });

      if (response.ok) {
        setMessage('✅ Match result recorded successfully by admin!');
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          if (onMatchReported) {
            onMatchReported();
          }
        }, 2000);
      } else {
        const errorData = await response.json();
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

      const matchData = {
        challengeId: selectedMatch._id,
        winner: winner,
        loser: winner === selectedMatch.senderName ? selectedMatch.receiverName : selectedMatch.senderName,
        score: score,
        notes: notes,
        reportedBy: playerName
      };

      const response = await fetch(`${BACKEND_URL}/api/challenges/report-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData)
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Match result reported successfully!');
        
        // Update local state
        setPendingMatches(prev => prev.filter(m => m._id !== selectedMatch._id));
        
        // Notify parent component
        if (onMatchReported) {
          onMatchReported(data.challenge);
        }
        
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to report match result');
      }
    } catch (error) {
      console.error('Error reporting match result:', error);
      setError(error.message || 'Failed to report match result');
    } finally {
      setSubmitting(false);
    }
  };


  const formatDate = (dateString) => {
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
    <div className="prize-pool-modal">
      <div className="prize-pool-modal-content">
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
            fontSize: '1.2rem',
            fontWeight: 'bold',
            flex: '1'
          }}>
            {getLadderDisplayName(selectedLadder)} Ladder
          </div>
          
          {/* Center - Title */}
          <h2 style={{
            color: '#ff4444',
            margin: '0',
            fontSize: '1.8rem',
            textAlign: 'center',
            flex: '2'
          }}>
            ⚔️ Report Match Result
            {isAdmin && (
              <div style={{
                background: 'rgba(245, 158, 66, 0.2)',
                border: '1px solid rgba(245, 158, 66, 0.4)',
                borderRadius: '6px',
                padding: '8px',
                marginTop: '10px',
                fontSize: '0.9rem',
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
                  <h3 style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '1.3rem' }}>
                    📋 Pending Matches to Report
                  </h3>
                  
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
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
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
                    <div style={{ color: '#e0e0e0', fontSize: '0.9rem', marginBottom: '8px' }}>
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
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
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
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
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
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: '1rem'
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
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: '1rem'
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
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: '1rem'
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
                        gridTemplateColumns: '1fr auto 1fr', 
                        gap: '0.75rem', 
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
                            Winner Games
                          </label>
                          <select
                            value={winnerGames}
                            onChange={(e) => handleScoreChange('winner', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: scoreError ? '2px solid #f44336' : '1px solid rgba(76, 175, 80, 0.3)',
                              background: 'rgba(0, 0, 0, 0.8)',
                              color: '#4caf50',
                              fontSize: '1.2rem',
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
                        <div style={{ 
                          color: '#ccc', 
                          fontSize: '1.5rem', 
                          fontWeight: 'bold',
                          textAlign: 'center',
                          marginTop: '1.5rem'
                        }}>
                          -
                        </div>
                        
                        {/* Loser Score */}
                        <div>
                          <label style={{ 
                            display: 'block', 
                            color: '#f44336', 
                            fontSize: '0.9rem', 
                            marginBottom: '0.25rem',
                            fontWeight: 'bold'
                          }}>
                            Loser Games
                          </label>
                          <select
                            value={loserGames}
                            onChange={(e) => handleScoreChange('loser', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: scoreError ? '2px solid #f44336' : '1px solid rgba(244, 67, 54, 0.3)',
                              background: 'rgba(0, 0, 0, 0.8)',
                              color: '#f44336',
                              fontSize: '1.2rem',
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
                          <div style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '1.1rem' }}>
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
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.3)',
                          color: '#fff',
                          fontSize: '1rem',
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
                          padding: '12px 16px',
                          borderRadius: '8px',
                          cursor: submitting || !winner || !winnerGames || !loserGames || scoreError || (scoreFormat === 'other' && !customRaceTo) ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
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
                          padding: '12px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1rem',
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
                  <h3 style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '1.3rem', textAlign: 'center' }}>
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
                    <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Total Amount Due
                    </div>
                    <div style={{ color: '#4caf50', fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      ${(!membership || !membership.isActive) ? '10.00' : '5.00'}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
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
                          padding: '1rem 2rem',
                          borderRadius: '8px',
                          fontSize: '1.1rem',
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
                    <div style={{ color: '#ccc', fontSize: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                      Or pay with one of these methods:
                        </div>
                    
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
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
                              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                              {method.name}
                            </div>
                            {method.username && (
                                <div style={{ color: '#4caf50', fontSize: '0.9rem', marginTop: '0.25rem' }}>
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
                                  padding: '0.75rem 1.5rem',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
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
                                  padding: '0.75rem 1.5rem',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
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
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
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
