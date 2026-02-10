import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import { getCurrentPhase, canReportMatchesWithoutMembership } from '@shared/utils/utils/phaseSystem.js';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import './LadderMatchReportingModal.css';

const LadderMatchReportingModal = ({ 
  isOpen, 
  onClose, 
  playerName, 
  selectedLadder,
  onMatchReported,
  isAdmin = false,
  onPaymentInfoModalReady,
  setShowPaymentDashboard,
  userLadderData = null,
  preselectedMatchId = null // Match ID to pre-select when modal opens
}) => {
  // Get current phase information
  const phaseInfo = getCurrentPhase();
  const isFreePhase = phaseInfo.isFree;
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
  const [gameType, setGameType] = useState('8-ball'); // Game type field
  const [matchDate, setMatchDate] = useState(''); // Actual match date
  
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
      console.log('🔍 Report Modal - Opening with playerName:', playerName, 'selectedLadder:', selectedLadder);
      fetchPendingMatches();
      fetchMembershipStatus();
      loadPaymentMethods();
      loadUserPaymentData();
    }
  }, [isOpen, playerName, selectedLadder, userLadderData]);

  // Pre-select match if preselectedMatchId is provided
  useEffect(() => {
    if (isOpen && preselectedMatchId && pendingMatches.length > 0 && !selectedMatch) {
      const matchToSelect = pendingMatches.find(m => (m._id || m.id) === preselectedMatchId);
      if (matchToSelect) {
        console.log('🔍 Pre-selecting match:', matchToSelect);
        // Initialize the form like handleReportMatch does
        setSelectedMatch(matchToSelect);
        setWinner('');
        setScore('');
        
        // Auto-detect race-to value from match data
        let defaultRaceFormat = 'race-to-5'; // fallback default
        if (matchToSelect.matchFormat) {
          defaultRaceFormat = matchToSelect.matchFormat;
        } else if (matchToSelect.raceLength) {
          defaultRaceFormat = `race-to-${matchToSelect.raceLength}`;
        }
        setScoreFormat(defaultRaceFormat);
        
        // Extract race-to number and set as default winner score
        const raceToMatch = defaultRaceFormat.match(/race-to-(\d+)/);
        if (raceToMatch) {
          const raceTo = parseInt(raceToMatch[1]);
          setWinnerGames(raceTo.toString());
          setLoserGames('0');
        }
      }
    }
  }, [isOpen, preselectedMatchId, pendingMatches, selectedMatch]);

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
      
      console.log('🔍 Report Modal - Fetching scheduled matches using Supabase...');
      console.log('🔍 Report Modal - Looking for playerName:', playerName);
      console.log('🔍 Report Modal - userLadderData:', userLadderData);
      
      // Use Supabase service to get scheduled matches for this player
      const result = await supabaseDataService.getScheduledMatchesForPlayer(playerName, selectedLadder);
      
      if (result.success) {
        console.log('🔍 Report Modal - Matches from Supabase:', result.matches);
        setPendingMatches(result.matches);
      } else {
        console.error('🔍 Report Modal - Supabase Error:', result.error);
        setError('Failed to load pending matches');
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
      // Use Supabase payment status instead of MongoDB backend
      const paymentStatus = await supabaseDataService.getPaymentStatus(playerName);
      console.log('🔍 Match Reporting Modal - Payment status from Supabase:', paymentStatus);
      
      // Also check unified account status directly from Supabase
      let hasUnifiedAccountDirect = false;
      try {
        const profileData = await supabaseDataService.getPlayerProfileData(playerName, 'ladder');
        if (profileData.success && profileData.data?.user) {
          hasUnifiedAccountDirect = true;
          console.log('🔍 Match Reporting Modal - Found unified account via direct check');
        }
      } catch (e) {
        console.log('🔍 Match Reporting Modal - Could not check unified account directly:', e);
      }
      
      if (paymentStatus) {
        // Convert Supabase payment_status format to expected membership format
        const membershipData = {
          hasMembership: paymentStatus.hasMembership || false,
          status: paymentStatus.status || 'inactive',
          isActive: paymentStatus.hasMembership && (paymentStatus.status === 'active' || paymentStatus.status === 'free_phase'),
          isPromotionalPeriod: paymentStatus.isPromotionalPeriod || false,
          hasUnifiedAccount: hasUnifiedAccountDirect || userLadderData?.unifiedAccount?.hasUnifiedAccount === true
        };
        console.log('🔍 Match Reporting Modal - Converted membership data:', membershipData);
        setMembership(membershipData);
      } else {
        console.log('🔍 Match Reporting Modal - No payment status found, setting membership with unified account check');
        setMembership({
          hasMembership: false,
          status: 'inactive',
          isActive: false,
          isPromotionalPeriod: false,
          hasUnifiedAccount: hasUnifiedAccountDirect || userLadderData?.unifiedAccount?.hasUnifiedAccount === true
        });
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
      // Still try to check unified account
      let hasUnifiedAccountDirect = false;
      try {
        const profileData = await supabaseDataService.getPlayerProfileData(playerName, 'ladder');
        if (profileData.success && profileData.data?.user) {
          hasUnifiedAccountDirect = true;
        }
      } catch (e) {
        // Ignore
      }
      setMembership({
        hasMembership: false,
        status: 'inactive',
        isActive: false,
        isPromotionalPeriod: false,
        hasUnifiedAccount: hasUnifiedAccountDirect || userLadderData?.unifiedAccount?.hasUnifiedAccount === true
      });
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
    
    // Auto-detect race-to value from match data
    let defaultRaceFormat = 'race-to-5'; // fallback default
    if (match.matchFormat) {
      defaultRaceFormat = match.matchFormat;
    } else if (match.raceLength) {
      defaultRaceFormat = `race-to-${match.raceLength}`;
    }
    setScoreFormat(defaultRaceFormat);
    
    // Extract race-to number and set as default winner score
    const raceToMatch = defaultRaceFormat.match(/race-to-(\d+)/);
    const raceToNumber = raceToMatch ? parseInt(raceToMatch[1]) : 5;
    setWinnerGames(raceToNumber.toString());
    
    // Initialize match date from scheduled date, or default to today
    // Try multiple possible date field names
    const matchDateValue = match.date || match.scheduledDate || match.match_date || match.scheduled_date;
    if (matchDateValue) {
      try {
        setMatchDate(new Date(matchDateValue).toISOString().split('T')[0]);
      } catch (e) {
        console.error('Error parsing match date:', e);
        setMatchDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      setMatchDate(new Date().toISOString().split('T')[0]);
    }
    
    setCustomRaceTo('');
    setLoserGames('');
    setNotes('');
    setScoreError('');
    setGameType(match.gameType || '8-ball'); // Initialize from match data or default to 8-ball
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
    setGameType('8-ball');
    setMatchDate('2024-01-15'); // Pre-fill with example match date
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

    // Check if membership is active (skip during Phase 1 testing)
    // membership.isActive is set from Supabase payment_status data
    const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
    
    // Check if user has unified account (grace period for users without payment_status record)
    // Check both userLadderData and membership object (which now includes hasUnifiedAccount)
    const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                               userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
    
    const noPaymentRecord = !membership || 
      (membership.hasMembership === false && 
       membership.status === 'inactive' && 
       !membership.isPromotionalPeriod &&
       Object.keys(membership).length <= 3); // Default fallback object
    
    // Check if Phase 2 should be treated as promotional for existing users
    // Phase 2 (Trial Launch) is promotional - users can report matches even without active membership
    const isPhase2Promotional = phaseInfo.phase === 2; // Phase 2 is Trial Launch (promotional pricing)
    
    // Allow if: free phase, has active membership, OR has unified account (grace period), OR Phase 2 promotional
    // Phase 2 allows unified accounts to proceed (promotional period)
    const canProceed = isFreePhase || 
                       hasActiveMembership || 
                       (hasUnifiedAccount && noPaymentRecord) ||
                       (isPhase2Promotional && hasUnifiedAccount); // Phase 2 allows unified accounts
    
    console.log('🔍 Match Reporting Modal - Membership check:', {
      isFreePhase,
      hasActiveMembership,
      hasUnifiedAccount,
      noPaymentRecord,
      isPhase2Promotional,
      canProceed,
      phaseInfo: phaseInfo.name,
      membership: membership
    });
    
    if (!canProceed) {
      console.log('❌ Membership check failed:', {
        membership,
        hasActiveMembership,
        isFreePhase,
        hasUnifiedAccount,
        noPaymentRecord,
        phaseInfo: phaseInfo.description
      });
      setError(`❌ Active membership required to report matches (${phaseInfo.description}). Please renew your membership first.`);
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

      // Determine winner ID from the selected match data
      const winnerId = winner === selectedMatch.senderName ? selectedMatch.senderId : selectedMatch.receiverId;
      const scoreData = score;
      const notesData = notes;

      console.log('🔍 Admin submitting ladder match result:', {
        matchId: selectedMatch._id,
        winnerId: winnerId,
        score: scoreData,
        notes: notesData,
        matchDate: matchDate
      });

      // Use Supabase to update match status (replaces MongoDB backend call)
      const result = await supabaseDataService.updateMatchStatus(
        selectedMatch._id,
        'completed',
        { winnerId: winnerId },
        scoreData,
        notesData,
        matchDate
      );

      if (result.success) {
        setMessage('✅ Match result recorded successfully by admin!');
        
        // Update local state
        setPendingMatches(prev => prev.filter(m => m._id !== selectedMatch._id));
        
        // Notify parent component
        if (onMatchReported) {
          onMatchReported(result.data);
        }
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        console.error('🔍 Admin match reporting error:', result.error);
        setError(`Failed to record match result: ${result.error}`);
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
      // Validate required data
      if (!selectedMatch) {
        throw new Error('No match selected for payment');
      }
      
      if (!playerName) {
        throw new Error('Player name not found');
      }

      // Check membership status - use same logic as handleSubmitResult
      const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
      const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                 userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
      const isPhase2Promotional = phaseInfo.phase === 2; // Phase 2 is Trial Launch (promotional)
      
      // Calculate membership renewal amount based on phase
      // All phases: $5/month membership
      const membershipFee = phaseInfo.membershipFee || 5.00;
      
      // Only charge match fee + membership if: not free phase, no active membership, no unified account, and not Phase 2 promotional
      const needsMembershipRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
      const totalAmount = isFreePhase ? 5.00 : (needsMembershipRenewal ? (5.00 + membershipFee) : 5.00);
      
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
            description: `Match fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            notes: `Cash payment at Legends red dropbox - Match fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            status: 'pending_verification' // Backend will determine if verification is needed
          })
        })
      );
      
      // If membership is expired, also record membership renewal as cash
      // Membership fee is $5/month across all phases
      if (needsMembershipRenewal) {
        const membershipFee = phaseInfo.membershipFee || 5.00; // Default to $5 if not set
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
              amount: membershipFee,
              paymentMethod: 'cash',
              playerId: playerName,
              description: `Membership renewal for ${playerName} (${phaseInfo.name})`,
              notes: `Cash payment at Legends red dropbox - Membership renewal for ${playerName} (${phaseInfo.name})`,
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
        const paymentResponses = await Promise.all(
          responses.map(async r => {
            try {
              return await r.json();
            } catch (e) {
              console.error('Error parsing payment response:', e, r);
              return { success: false, error: 'Failed to parse response' };
            }
          })
        );
        
        // Check if all payments succeeded
        const allSucceeded = paymentResponses.every(r => r.success !== false);
        
        if (!allSucceeded) {
          const failedResponses = paymentResponses.filter(r => !r.success);
          console.error('Some payments failed:', failedResponses);
          throw new Error(`Failed to record payment(s): ${failedResponses.map(r => r.error || r.message || 'Unknown error').join(', ')}`);
        }
        
        const needsVerification = paymentResponses.some(r => r.payment?.status === 'pending_verification' || r.requiresVerification);
        
        if (needsVerification) {
          // Record the match result with pending payment verification status
          await recordMatchWithPendingPayment();
          
          // Create detailed cash payment success message
          // Check membership status
          const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
          const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                   userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
          const isPhase2Promotional = phaseInfo.phase === 2;
          const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
          const membershipFee = phaseInfo.membershipFee || 5.00;
          const totalAmount = isFreePhase ? 5.00 : (needsRenewal ? (5.00 + membershipFee) : 5.00);
          const paymentAmount = totalAmount.toFixed(0);
          setMessage(`💰 Cash Payment Recorded Successfully!

🎯 Match Result Submitted
💵 Amount Due: $${paymentAmount} cash
📦 Drop Location: RED dropbox at Legends Brews & Cues

✅ Your match result has been recorded and is pending admin verification. Once your cash payment is verified, ladder positions will be updated automatically.

Thank you for your payment!`);
        } else {
          // Payment processed immediately, submit match normally
          await submitMatchResult();
          setMessage(`🎉 Match Complete! 
          
💰 Cash Payment Processed
🎯 Match Result Recorded
📊 Ladder positions updated automatically

Great game! Your match is now complete and reflected in the ladder rankings.`);
        }
        
        setTimeout(() => {
          onClose();
          // Call onMatchReported to refresh the pending matches list
          if (onMatchReported) {
            onMatchReported();
          }
        }, 8000);
      } else {
        // Check response status and get error details
        const failedResponses = responses.filter(r => !r.ok);
        const errorDetails = await Promise.all(
          failedResponses.map(async r => {
            try {
              const errorData = await r.json();
              return errorData.message || errorData.error || `HTTP ${r.status}: ${r.statusText}`;
            } catch (e) {
              return `HTTP ${r.status}: ${r.statusText}`;
            }
          })
        );
        throw new Error(`Failed to record cash payment(s): ${errorDetails.join(', ')}`);
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      setError(`Failed to record cash payment: ${error.message}. Please try again or contact support.`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const recordMatchWithPendingPayment = async () => {
    try {
      // Extract race length from scoreFormat or customRaceTo
      let raceLength = 5; // default
      if (scoreFormat === 'other' && customRaceTo) {
        raceLength = parseInt(customRaceTo) || 5;
      } else if (scoreFormat && scoreFormat.startsWith('race-to-')) {
        raceLength = parseInt(scoreFormat.split('-')[2]) || 5;
      }
      
      // Use the game type selected by the user
      const selectedGameType = gameType;
      
      // Record the match result with pending payment verification status
      const response = await fetch(`${BACKEND_URL}/api/ladder/matches/${selectedMatch._id}/record-pending-payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winner: winner === selectedMatch.senderName ? selectedMatch.senderId : selectedMatch.receiverId,
          score: score,
          notes: notes,
          reportedBy: selectedMatch.senderName === playerName ? selectedMatch.senderId : selectedMatch.receiverId,
          reportedAt: new Date().toISOString(),
          paymentMethod: 'cash',
          gameType: selectedGameType,
          raceLength: raceLength
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
      // Check membership status - use same logic as handleSubmitResult
      const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
      const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                 userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
      const isPhase2Promotional = phaseInfo.phase === 2; // Phase 2 is Trial Launch (promotional)
      
      // Calculate membership renewal amount based on phase
      // All phases: $5/month membership
      const membershipFee = phaseInfo.membershipFee || 5.00;
      
      // Only charge match fee + membership if: not free phase, no active membership, no unified account, and not Phase 2 promotional
      const needsMembershipRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
      const totalAmount = isFreePhase ? 5.00 : (needsMembershipRenewal ? (5.00 + membershipFee) : 5.00);
      
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
            playerEmail: playerName,
            playerName: playerName,
            amount: 5.00,
            paymentMethod: paymentMethodId,
            matchId: selectedMatch._id,
            playerId: playerName,
            description: `Match fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            notes: `Match fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            status: 'completed'
          })
        })
      );
      
      // If membership is expired, also record membership renewal
      // Use phase-specific membership fee (Phase 2: $5, Phase 3: $10)
      if (needsMembershipRenewal) {
        const membershipFee = phaseInfo.membershipFee || 5.00; // Default to $5 if not set
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
              amount: membershipFee,
              paymentMethod: paymentMethodId,
              playerId: playerName,
              description: `Membership renewal for ${playerName} (${phaseInfo.name})`,
              notes: `Membership renewal for ${playerName} (${phaseInfo.name})`,
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
          setMessage(`💰 Payment Recorded Successfully!

🎯 Match Result Submitted  
⏳ Pending Admin Verification
📊 Ladder positions will update once verified

Your payment has been recorded and your match result submitted. Admin will verify and process your match shortly.`);
          setTimeout(() => {
            onClose();
            onMatchReported();
          }, 8000);
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

      // Determine winner ID from the selected match data
      const winnerId = winner === selectedMatch.senderName ? selectedMatch.senderId : selectedMatch.receiverId;
      const scoreData = score;
      const notesData = notes;
      
      // Extract race length from scoreFormat or customRaceTo
      let raceLength = 5; // default
      if (scoreFormat === 'other' && customRaceTo) {
        raceLength = parseInt(customRaceTo) || 5;
      } else if (scoreFormat && scoreFormat.startsWith('race-to-')) {
        raceLength = parseInt(scoreFormat.split('-')[2]) || 5;
      }
      
      // Use the game type selected by the user
      const selectedGameType = gameType;

      console.log('🔍 Submitting ladder match result:', {
        matchId: selectedMatch._id,
        winnerId: winnerId,
        score: scoreData,
        notes: notesData,
        gameType: selectedGameType,
        raceLength: raceLength,
        matchDate: matchDate
      });

      // Use Supabase to update match status (replaces MongoDB backend call)
      const result = await supabaseDataService.updateMatchStatus(
        selectedMatch._id,
        'completed',
        { winnerId: winnerId },
        scoreData,
        notesData,
        matchDate
      );

      if (result.success) {
        // Create a more detailed success message
        const winnerName = winner === selectedMatch.senderName ? selectedMatch.senderName : selectedMatch.receiverName;
        const loserName = winner === selectedMatch.senderName ? selectedMatch.receiverName : selectedMatch.senderName;
        const finalScore = formatScore(winnerGames, loserGames);
        
        setMessage(`🎉 Match Result Submitted Successfully! 
        
🏆 Winner: ${winnerName} (${finalScore})
🥈 Loser: ${loserName}

Your match has been recorded and ladder positions will be updated automatically. Great game!`);
        
        // Update local state
        setPendingMatches(prev => prev.filter(m => m._id !== selectedMatch._id));
        
        // Notify parent component
        if (onMatchReported) {
          onMatchReported(result.data);
        }
        
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        console.error('🔍 Match reporting error from Supabase:', result.error);
        setError(result.error || 'Failed to report match result');
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
    if (!dateString) return 'TBD';
    
    try {
      // Handle YYYY-MM-DD format without timezone issues
      if (dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        if (year && month && day) {
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
        }
      }
      // Fallback for other date formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e, dateString);
    }
    return 'TBD';
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
    <div className="prize-pool-modal match-reporting-modal" style={isMobile ? { padding: '4px' } : undefined}>
      <div 
        className="prize-pool-modal-content"
        style={isMobile ? {
          width: '98vw',
          maxWidth: '98vw',
          maxHeight: '55vh',
          overflowY: 'auto',
          padding: '8px'
        } : {
          overflowY: 'auto'
        }}
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
            color: '#ffd700',
            fontSize: isMobile ? '1rem' : '1.2rem',
            fontWeight: 'bold',
            flex: '1'
          }}>
            {getLadderDisplayName(selectedLadder)} Ladder
          </div>
          
          {/* Center - Title */}
          <h2 style={{
            color: '#10b981',
            margin: '0',
            fontSize: isMobile ? '1.1rem' : '1.4rem',
            textAlign: 'center',
            flex: '2'
          }}>
            ⚔️ Report Match Result
            {isAdmin && (
              <div style={{
                background: 'rgba(245, 158, 66, 0.2)',
                border: '1px solid rgba(245, 158, 66, 0.4)',
                borderRadius: '4px',
                padding: '4px 6px',
                marginTop: '6px',
                fontSize: '0.75rem',
                color: '#f59e42'
              }}>
                🔧 Admin Mode
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
                  background: 'rgba(76, 175, 80, 0.2)',
                  border: '2px solid rgba(76, 175, 80, 0.6)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '1.5rem',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  color: '#4caf50',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                  animation: 'pulse 2s infinite'
                }}>
                  {message}
                </div>
              )}

              {/* Pending Matches List */}
              {!selectedMatch && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ color: '#ff4444', margin: '0', fontSize: isMobile ? '1rem' : '1.1rem' }}>
                      📋 Pending Matches
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
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
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
                                📅 {formatDate(match.date || match.match_date || match.scheduledDate)} {match.time ? `at ${match.time}` : ''}
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
                <div style={{ marginBottom: '1rem' }}>
                    {showExampleMode && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{
                        background: 'rgba(255, 193, 7, 0.2)',
                        border: '1px solid rgba(255, 193, 7, 0.4)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        color: '#ffc107',
                        fontSize: '0.75rem'
                      }}>
                        🧪 Example Mode
                      </span>
                    </div>
                  )}
                  
                  {/* Match Details - compact inline */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.5rem',
                    marginBottom: '0.4rem'
                  }}>
                    <div style={{ color: '#ccc', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <span><strong style={{ color: '#fff' }}>{selectedMatch.senderName}</strong> vs <strong style={{ color: '#fff' }}>{selectedMatch.receiverName}</strong></span>
                      <span>📅 {(() => {
                        // Try multiple date field names and formats
                        const dateValue = selectedMatch.date || selectedMatch.match_date || selectedMatch.scheduledDate || selectedMatch.scheduled_date;
                        if (dateValue) {
                          return formatDate(dateValue);
                        }
                        return 'TBD';
                      })()} {selectedMatch.time ? `at ${selectedMatch.time}` : ''}</span>
                      {selectedMatch.location && <span>📍 {selectedMatch.location}</span>}
                    </div>
                  </div>
                  
                  {/* Match Fee Information - compact */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: '#e0e0e0', fontSize: '0.8rem' }}>Winner pays $5 fee</span>
                    <button
                      onClick={() => setShowPaymentInfo(true)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                        padding: '4px 8px',
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

                  {/* Reporting Form */}
                  <form onSubmit={handleSubmitResult}>
                    {/* Match Date, Format, Game Type - 3 columns on desktop */}
                  <div style={{
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', 
                      gap: '0.5rem', 
                    marginBottom: '0.5rem'
                  }}>
                    {/* Match Date */}
                    <div>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        Match Date *
                      </label>
                      <input
                        type="date"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.4rem' : '0.4rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: isMobile ? '0.9rem' : '0.9rem'
                        }}
                      />
                      {isMobile && (
                        <small style={{ color: '#aaa', fontSize: '0.7rem', display: 'block', marginTop: '1px' }}>
                          Adjust if different date
                        </small>
                      )}
                    </div>
                    {/* Match Format Selection */}
                      <div>
                        <label style={{ display: 'block', color: '#ccc', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
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
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          textAlign: 'center'
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

                      {/* Game Type Selection */}
                      <div>
                        <label style={{ display: 'block', color: '#ccc', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          Game Type *
                        </label>
                      <select
                        value={gameType}
                        onChange={(e) => setGameType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.45rem' : '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          textAlign: 'center'
                        }}
                      >
                        <option value="8-ball" style={{ background: '#000', color: '#fff' }}>8-Ball</option>
                        <option value="9-ball" style={{ background: '#000', color: '#fff' }}>9-Ball</option>
                        <option value="10-ball" style={{ background: '#000', color: '#fff' }}>10-Ball</option>
                        <option value="mixed" style={{ background: '#000', color: '#fff' }}>Mixed</option>
                      </select>
                      </div>
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

                    {/* Winner + Final Score - side by side on desktop */}
                  <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      alignItems: 'start'
                    }}>
                    {/* Winner Selection */}
                    <div>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        Winner *
                      </label>
                      <select
                        value={winner}
                        onChange={(e) => setWinner(e.target.value)}
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.4rem' : '0.4rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          fontSize: '0.9rem',
                          textAlign: 'center'
                        }}
                        required
                      >
                        <option value="" style={{ background: '#000', color: '#fff' }}>Select winner</option>
                        <option value={selectedMatch.senderName} style={{ background: '#000', color: '#fff' }}>{selectedMatch.senderName}</option>
                        <option value={selectedMatch.receiverName} style={{ background: '#000', color: '#fff' }}>{selectedMatch.receiverName}</option>
                      </select>
                    </div>

                    {/* Standardized Score Input */}
                    <div>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.3rem', fontWeight: 'bold' }}>
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
                  </div>

                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes..."
                        rows={2}
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
                    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        type="submit"
                        disabled={submitting || !winner || !winnerGames || !loserGames || scoreError || (scoreFormat === 'other' && !customRaceTo)}
                        style={{
                          background: 'rgba(255, 68, 68, 0.8)',
                          border: 'none',
                          color: '#fff',
                          padding: isMobile ? '8px 12px' : '10px 14px',
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
                          setGameType('8-ball');
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ccc',
                          padding: isMobile ? '8px 12px' : '10px 14px',
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
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#fff', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      Total Amount Due
                    </div>
                    <div style={{ color: '#4caf50', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      ${(() => {
                        const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
                        const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                                 userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
                        const isPhase2Promotional = phaseInfo.phase === 2;
                        const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
                        const membershipFee = phaseInfo.membershipFee || 5.00;
                        const totalAmount = isFreePhase ? 5.00 : (needsRenewal ? (5.00 + membershipFee) : 5.00);
                        return totalAmount.toFixed(2);
                      })()}
                    </div>
                    <div style={{ color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.8rem' }}>
                      {isFreePhase ? 
                        'Match Fee ($5) - Promotional Period!' : 
                        ((() => {
                          const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
                          const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                                   userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
                          const isPhase2Promotional = phaseInfo.phase === 2;
                          const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
                          return needsRenewal;
                        })() ? 
                        'Match Fee ($5) + Membership Renewal ($5)' : 
                          'Match Fee ($5)')
                      }
                    </div>
                  </div>

                  {/* Credit Payment Option */}
                    <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      background: 'rgba(76, 175, 80, 0.1)',
                      border: '2px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ color: '#4caf50', fontWeight: 'bold', fontSize: isMobile ? '0.95rem' : '1rem' }}>
                            💳 Pay with Credits (${userCredits.toFixed(2)} available)
                          </div>
                          <div style={{ color: '#4caf50', fontSize: isMobile ? '0.8rem' : '0.85rem', marginTop: '0.25rem' }}>
                            ⚡ Instant processing - No admin approval needed!
                          </div>
                        </div>
                        
                      <button
                          onClick={canUseCredits() ? submitMatchResultWithCredits : () => setError(`Insufficient credits. You have $${userCredits.toFixed(2)} but need $5.00`)}
                          disabled={!canUseCredits()}
                        style={{
                            background: canUseCredits() ? 'linear-gradient(135deg, #4caf50, #45a049)' : 'rgba(255, 255, 255, 0.1)',
                            color: canUseCredits() ? '#fff' : '#888',
                          border: 'none',
                            padding: isMobile ? '0.6rem 1.1rem' : '0.75rem 1.5rem',
                          borderRadius: '8px',
                            fontSize: isMobile ? '0.85rem' : '0.9rem',
                            fontWeight: 'bold',
                            cursor: canUseCredits() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                            boxShadow: canUseCredits() ? '0 2px 8px rgba(76, 175, 80, 0.3)' : 'none',
                            opacity: canUseCredits() ? 1 : 0.6
                          }}
                          onMouseEnter={(e) => {
                            if (canUseCredits()) {
                              e.target.style.background = 'linear-gradient(135deg, #45a049, #4caf50)';
                              e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = canUseCredits() ? 'linear-gradient(135deg, #4caf50, #45a049)' : 'rgba(255, 255, 255, 0.1)';
                            e.target.style.boxShadow = canUseCredits() ? '0 2px 8px rgba(76, 175, 80, 0.3)' : 'none';
                          }}
                        >
                          {canUseCredits() ? '💳 Pay $5' : 'Insufficient'}
                        </button>
                      </div>
                      
                      {!canUseCredits() && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          background: 'rgba(255, 152, 0, 0.1)',
                          border: '1px solid rgba(255, 152, 0, 0.3)',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginTop: '0.5rem'
                        }}>
                          <div style={{ color: '#ff9800', fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
                            Need ${(5.00 - userCredits).toFixed(2)} more credits
                          </div>
                <button
                  onClick={() => setShowPaymentDashboard(true)}
                  style={{
                    background: 'linear-gradient(135deg, #ff9800, #f57c00)',
                    color: '#fff',
                    border: 'none',
                    padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                    boxShadow: '0 2px 6px rgba(255, 152, 0, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #f57c00, #ff9800)';
                    e.target.style.boxShadow = '0 4px 10px rgba(255, 152, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
                    e.target.style.boxShadow = '0 2px 6px rgba(255, 152, 0, 0.3)';
                        }}
                      >
                  💰 Buy Credits
                      </button>
                    </div>
                  )}
                    </div>
                  </div>

                  {/* Payment Methods - Simplified */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ color: '#ccc', fontSize: isMobile ? '0.9rem' : '0.95rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                      Or pay with one of these methods:
                        </div>
                    
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                    
                    {/* Credit/Debit Card Option - Moved to top */}
                    {availablePaymentMethods.filter(method => method.id === 'creditCard' || method.id === 'square').map((method) => (
                      <div key={method.id} style={{
                        background: 'rgba(33, 150, 243, 0.1)',
                        border: '2px solid rgba(33, 150, 243, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div>
                            <div style={{ color: '#2196f3', fontWeight: 'bold', fontSize: isMobile ? '0.9rem' : '0.95rem' }}>
                              💳 {method.name}
                            </div>
                            <div style={{ color: '#2196f3', fontSize: isMobile ? '0.75rem' : '0.8rem', marginTop: '0.25rem' }}>
                              ⚡ Instant processing after Square approval
                            </div>
                          </div>
                          
                          {method.paymentLink ? (
                            <a 
                              href={method.paymentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                                color: '#fff',
                                padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 6px rgba(33, 150, 243, 0.3)',
                                textAlign: 'center',
                                display: 'block'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
                                e.target.style.boxShadow = '0 3px 8px rgba(33, 150, 243, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'linear-gradient(135deg, #2196f3, #1976d2)';
                                e.target.style.boxShadow = '0 2px 6px rgba(33, 150, 243, 0.3)';
                              }}
                            >
                              Pay ${(() => {
                                const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
                                const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                                         userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
                                const isPhase2Promotional = phaseInfo.phase === 2;
                                const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
                                const membershipFee = phaseInfo.membershipFee || 5.00;
                                const totalAmount = isFreePhase ? 5.00 : (needsRenewal ? (5.00 + membershipFee) : 5.00);
                                return totalAmount.toFixed(0);
                              })()}
                            </a>
                          ) : (
                            <button
                              onClick={() => handleQuickPayment(method.id)}
                              disabled={paymentProcessing}
                              style={{
                                background: paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #2196f3, #1976d2)',
                                color: '#fff',
                                border: 'none',
                                padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                fontWeight: 'bold',
                                cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: paymentProcessing ? 0.6 : 1,
                                boxShadow: paymentProcessing ? 'none' : '0 2px 6px rgba(33, 150, 243, 0.3)',
                                width: '100%'
                              }}
                              onMouseEnter={(e) => {
                                if (!paymentProcessing) {
                                  e.target.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
                                  e.target.style.boxShadow = '0 3px 8px rgba(33, 150, 243, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #2196f3, #1976d2)';
                                e.target.style.boxShadow = paymentProcessing ? 'none' : '0 2px 6px rgba(33, 150, 243, 0.3)';
                              }}
                            >
                              Mark Paid ${(() => {
                                const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
                                const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                                         userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
                                const isPhase2Promotional = phaseInfo.phase === 2;
                                const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
                                const membershipFee = phaseInfo.membershipFee || 5.00;
                                const totalAmount = isFreePhase ? 5.00 : (needsRenewal ? (5.00 + membershipFee) : 5.00);
                                return totalAmount.toFixed(0);
                              })()}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Cash Payment Option */}
                    <div style={{
                      background: 'rgba(255, 68, 68, 0.1)',
                      border: '2px solid rgba(255, 68, 68, 0.4)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '0.9rem' : '0.95rem' }}>
                            💵 Cash Payment (Recommended)
                          </div>
                          <div style={{ color: '#ff4444', fontSize: isMobile ? '0.75rem' : '0.8rem', marginTop: '0.25rem' }}>
                            Drop cash in RED dropbox at Legends • Admin will verify payment
                          </div>
                          {/* Trust Level Information */}
                          <div style={{ 
                            color: userPaymentHistory?.trustLevel === 'trusted' ? '#4caf50' : 
                                   userPaymentHistory?.trustLevel === 'verified' ? '#ff9800' : '#ff4444', 
                            fontSize: isMobile ? '0.7rem' : '0.75rem', 
                            marginTop: '0.25rem',
                            fontWeight: '500'
                          }}>
                            {userPaymentHistory?.trustLevel === 'trusted' ? 
                              '⚡ Instant processing' : 
                              userPaymentHistory?.trustLevel === 'verified' ? 
                              '🔄 Auto-processing' : 
                              '⏳ Requires admin approval'
                            }
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleCashPayment()}
                          disabled={paymentProcessing}
                          style={{
                            background: paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 68, 68, 0.9)',
                            color: '#fff',
                            border: 'none',
                            padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                            borderRadius: '6px',
                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                            fontWeight: 'bold',
                            cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: paymentProcessing ? 0.6 : 1,
                            boxShadow: paymentProcessing ? 'none' : '0 2px 6px rgba(255, 68, 68, 0.3)',
                            width: '100%'
                          }}
                          onMouseEnter={(e) => {
                            if (!paymentProcessing) {
                              e.target.style.background = 'rgba(255, 68, 68, 1)';
                              e.target.style.boxShadow = '0 3px 8px rgba(255, 68, 68, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 68, 68, 0.9)';
                            e.target.style.boxShadow = paymentProcessing ? 'none' : '0 2px 6px rgba(255, 68, 68, 0.3)';
                          }}
                        >
                          {paymentProcessing ? 'Processing...' : `💵 Record Cash Payment $${(() => {
                            const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
                            const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                                     userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
                            const isPhase2Promotional = phaseInfo.phase === 2;
                            const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
                            return isFreePhase ? '5' : (needsRenewal ? '10' : '5');
                          })()}`}
                        </button>
                      </div>
                    </div>
                    
                    {availablePaymentMethods.filter(method => method.id !== 'cash' && method.id !== 'creditCard' && method.id !== 'square').map((method) => (
                      <div key={method.id} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        transition: 'all 0.2s ease'
                      }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div>
                              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '0.9rem' : '0.95rem' }}>
                              {method.name}
                            </div>
                            {method.username && (
                                <div style={{ color: '#4caf50', fontSize: isMobile ? '0.75rem' : '0.8rem', marginTop: '0.25rem' }}>
                                  {method.username}
                              </div>
                            )}
                            {/* Trust Level Information */}
                            <div style={{ 
                              color: userPaymentHistory?.trustLevel === 'trusted' ? '#4caf50' : 
                                     userPaymentHistory?.trustLevel === 'verified' ? '#ff9800' : '#ff4444', 
                              fontSize: isMobile ? '0.7rem' : '0.75rem', 
                              marginTop: '0.25rem',
                              fontWeight: '500'
                            }}>
                              {userPaymentHistory?.trustLevel === 'trusted' ? 
                                '⚡ Instant processing' : 
                                userPaymentHistory?.trustLevel === 'verified' ? 
                                '🔄 Auto-processing' : 
                                '⏳ Requires admin approval'
                              }
                            </div>
                        </div>
                        
                          {method.paymentLink ? (
                            <a 
                              href={method.paymentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                background: 'rgba(76, 175, 80, 0.8)',
                                color: '#fff',
                                padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                textAlign: 'center',
                                display: 'block'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(76, 175, 80, 1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(76, 175, 80, 0.8)';
                              }}
                            >
                                Pay ${(() => {
                                const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
                                const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                                         userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
                                const isPhase2Promotional = phaseInfo.phase === 2;
                                const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
                                const membershipFee = phaseInfo.membershipFee || 5.00;
                                const totalAmount = isFreePhase ? 5.00 : (needsRenewal ? (5.00 + membershipFee) : 5.00);
                                return totalAmount.toFixed(0);
                              })()}
                            </a>
                          ) : (
                            <button
                              onClick={() => handleQuickPayment(method.id)}
                              disabled={paymentProcessing}
                              style={{
                                background: paymentProcessing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(76, 175, 80, 0.8)',
                                color: '#fff',
                                border: 'none',
                                padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                fontWeight: 'bold',
                                cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: paymentProcessing ? 0.6 : 1,
                                width: '100%'
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
                                {paymentProcessing ? 'Processing...' : `Mark Paid $${(() => {
                                  const hasActiveMembership = membership?.isActive || (membership?.hasMembership && (membership?.status === 'active' || membership?.status === 'free_phase'));
                                  const hasUnifiedAccount = membership?.hasUnifiedAccount === true || 
                                                           userLadderData?.unifiedAccount?.hasUnifiedAccount === true;
                                  const isPhase2Promotional = phaseInfo.phase === 2;
                                  const needsRenewal = !isFreePhase && !hasActiveMembership && !hasUnifiedAccount && !isPhase2Promotional;
                                  const membershipFee = phaseInfo.membershipFee || 5.00;
                                const totalAmount = isFreePhase ? 5.00 : (needsRenewal ? (5.00 + membershipFee) : 5.00);
                                return totalAmount.toFixed(0);
                                })()}`}
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
                      padding: isMobile ? '8px 12px' : '10px 14px',
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
          padding: '1rem',
          zIndex: 10000,
          overflow: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'rgba(20, 20, 20, 0.95)',
            border: '2px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            maxWidth: '800px',
            width: 'min(600px, 95vw)',
            maxHeight: 'calc(100vh - 2rem)',
            overflowY: 'auto',
            position: 'relative',
            margin: 'auto'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowPaymentInfo(false)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '12px',
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
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ color: '#ff4444', margin: '0 0 0.25rem 0', fontSize: '1.35rem' }}>
                💳 Payment Information
              </h2>
              <p style={{ color: '#ccc', margin: 0, fontSize: '0.85rem' }}>
                Subscription and match reporting fees
              </p>
            </div>

            {/* Content */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
              gap: '0.75rem',
              margin: '0 auto'
            }}>
              {/* Membership Subscription */}
              <div style={{
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem'
              }}>
                <h3 style={{ color: '#2196f3', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                  📅 Monthly Membership - $5/mo
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.3rem 0' }}><strong>Includes:</strong></p>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    <li>Access to all ladder divisions</li>
                    <li>Challenge other players</li>
                    <li>View ladder standings and statistics</li>
                    <li>Participate in tournaments and events</li>
                    <li>Receive notifications and updates</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50', fontSize: '0.75rem' }}>
                    Expired? Renew ($5) + match fee ($5) = $10.
                  </p>
                </div>
              </div>

              {/* Match Reporting Fee */}
              <div style={{
                background: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem'
              }}>
                <h3 style={{ color: '#4caf50', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                  🏆 Match Fee - $5/match
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.3rem 0' }}><strong>How it works:</strong></p>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    <li>Only the <strong>winner</strong> pays the $5 fee</li>
                    <li>One fee per match (not per player)</li>
                    <li>Fee is paid when reporting the match result</li>
                    <li>Supports ladder and prize pools</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#ff9800', fontSize: '0.75rem' }}>
                    Winner pays $5; loser pays nothing.
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem'
              }}>
                <h3 style={{ color: '#ffc107', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                  💳 Payment Methods
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.3rem 0' }}><strong>We accept:</strong></p>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    <li>CashApp</li>
                    <li>Venmo</li>
                    <li>PayPal</li>
                    <li>Credit/Debit Cards (via Square)</li>
                    <li>Credits (pre-purchased)</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50', fontSize: '0.75rem' }}>
                    Tip: Buy credits for instant reporting!
                  </p>
                </div>
              </div>

              {/* Trust System */}
              <div style={{
                background: 'rgba(156, 39, 176, 0.1)',
                border: '1px solid rgba(156, 39, 176, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem'
              }}>
                <h3 style={{ color: '#9c27b0', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                  🛡️ Trust & Verification
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.3rem 0' }}><strong>Verification:</strong></p>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    <li><strong>New users:</strong> Payments require admin verification (24-48 hours)</li>
                    <li><strong>Verified users:</strong> 3+ successful payments = auto-approval</li>
                    <li><strong>Trusted:</strong> 10+ payments = instant</li>
                  </ul>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50', fontSize: '0.75rem' }}>
                    Build trust for faster processing!
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <button
                onClick={() => setShowPaymentInfo(false)}
                style={{
                  background: 'rgba(255, 68, 68, 0.8)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
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
