import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import {
  getMatchReportingBaseDollars,
  getMatchReportingFeeDollars,
  isPastMatchReportingDeadline,
  isReporterTheSelectedWinner,
  LADDER_MATCH_REPORTING_LATE_FEE
} from '@shared/utils/utils/phaseSystem.js';
import { MATCH_FEE_WHEN_YOU_PAY_BULLETS, REPORT_RESULTS_MENU_LABEL } from '@shared/utils/utils/ladderPaymentCopy.js';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import ReportMatchFlowStepper from './ReportMatchFlowStepper.jsx';
import './LadderMatchReportingModal.css';

/** Dev-only: fake match id so pay APIs are not called. */
export const PREVIEW_PAYMENT_MATCH_ID = '__preview_payment_ui__';

function readPreviewMatchPaymentParam() {
  if (typeof window === 'undefined') return false;
  try {
    const hash = window.location.hash || '';
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    if (hashQuery && new URLSearchParams(hashQuery).get('preview_match_payment') === '1') return true;
    return new URLSearchParams(window.location.search || '').get('preview_match_payment') === '1';
  } catch {
    return false;
  }
}

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
  preselectedMatchId = null, // Match ID to pre-select when modal opens
  /** Dev: from LadderApp when URL had ?preview_match_payment=1 (removed from address bar after open). */
  forceDevPaymentPreview = false
}) => {
  const previewPaymentAppliedRef = useRef(false);
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
  const [adminConfirmedForfeit, setAdminConfirmedForfeit] = useState(false);
  
  // Payment state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  /** Collapsible: card, cash, Venmo, league-specific methods (keeps payment step calmer by default). */
  const [otherPaymentWaysOpen, setOtherPaymentWaysOpen] = useState(false);
  
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
    } else {
      previewPaymentAppliedRef.current = false;
      setOtherPaymentWaysOpen(false);
    }
  }, [isOpen, playerName, selectedLadder, userLadderData]);

  useEffect(() => {
    if (!showPaymentForm) setOtherPaymentWaysOpen(false);
  }, [showPaymentForm]);

  // Dev: ?preview_match_payment=1 on /ladder (or forceDevPaymentPreview from parent after URL strip) → payment UI layout preview
  useEffect(() => {
    if (!import.meta.env.DEV || !isOpen || loading) return;
    if (!readPreviewMatchPaymentParam() && !forceDevPaymentPreview) return;
    if (previewPaymentAppliedRef.current) return;
    previewPaymentAppliedRef.current = true;

    const today = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();
    const em = String(playerName || 'preview@local.test').trim().toLowerCase();
    const senderName = 'You (preview)';
    const receiverName = 'Opponent (preview)';
    setShowExampleMode(false);
    setError('');
    setMessage('');
    setSelectedMatch({
      _id: PREVIEW_PAYMENT_MATCH_ID,
      senderName,
      receiverName,
      senderId: 'preview-sender',
      receiverId: 'preview-receiver',
      player1: { email: em },
      player2: { email: 'other-player@preview.local' },
      date: today,
      time: '7:00 PM',
      location: 'Legends Brews & Cues (preview)',
      matchFormat: 'race-to-5',
      raceLength: 5
    });
    setMatchDate(today);
    setWinner(senderName);
    setScoreFormat('race-to-5');
    setWinnerGames('5');
    setLoserGames('3');
    setScore('');
    setShowPaymentForm(true);
  }, [isOpen, loading, playerName, forceDevPaymentPreview]);

  // Pre-select match if preselectedMatchId is provided (skip when dev payment preview owns the form)
  useEffect(() => {
    if (forceDevPaymentPreview) return;
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
  }, [isOpen, preselectedMatchId, pendingMatches, selectedMatch, forceDevPaymentPreview]);

  useEffect(() => {
    setAdminConfirmedForfeit(false);
  }, [selectedMatch?._id]);

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
    const normalized = normalizeToYMD(matchDateValue);
    setMatchDate(normalized || toLocalYMD(new Date()));
    
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
    const today = toLocalYMD(new Date());
    const exampleMatch = {
      _id: 'example-match',
      senderName: 'John Doe',
      receiverName: 'Jane Smith',
      date: today,
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
    setMatchDate(today); // Example starts on-time; user can change to test late pricing
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
    const isLate = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
    const fee = getMatchReportingFeeDollars({ adminConfirmedForfeit, isLate });
    return userCredits >= fee;
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

    // Use formatted score immediately so it's always saved (React state is async and may not update before submit)
    const formattedScore = formatScore(winnerGames, loserGames);
    setScore(formattedScore);

    // Handle example mode
    if (showExampleMode) {
      setMessage('✅ Example match result submitted! (This was just a test - no actual match was reported)');
      setTimeout(() => {
        handleBackToList();
      }, 3000);
      return;
    }

    // Skip payment checks for admin users - pass formattedScore so it's always saved
    if (isAdmin) {
      await submitMatchResultAsAdmin(formattedScore);
      return;
    }

    if (!matchDate) {
      setError('Please set the match date.');
      return;
    }

    if (!isReporterTheSelectedWinner(playerName, winner, selectedMatch)) {
      setError('Only the winning player can report the match and pay the reporting fee.');
      return;
    }

    if (adminConfirmedForfeit && loserGames !== '0') {
      setError('Admin-confirmed forfeit matches must be reported as a win with the loser on 0 games.');
      return;
    }

    // Check if user can use credits - pass formattedScore so it's saved after payment
    if (canUseCredits()) {
      await submitMatchResultWithCredits(formattedScore);
    } else {
      setShowPaymentForm(true);
    }
  };

  const submitMatchResultAsAdmin = async (scoreOverride = null) => {
    try {
      setSubmitting(true);
      setError('');

      if (selectedMatch?._id === PREVIEW_PAYMENT_MATCH_ID) {
        setError('Dev preview: remove ?preview_match_payment=1 from the URL to submit a real match.');
        return;
      }

      if (adminConfirmedForfeit && loserGames !== '0') {
        setError('Admin-confirmed forfeit matches must be reported with the loser on 0 games.');
        return;
      }

      // Use passed score so it's always saved (state may be stale). Same for all ladders.
      const scoreToSave = scoreOverride != null && String(scoreOverride).trim() !== '' ? String(scoreOverride).trim() : score;
      const winnerId = winner === selectedMatch.senderName ? selectedMatch.senderId : selectedMatch.receiverId;
      const isLate = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
      const notesData = [notes?.trim() || '', adminConfirmedForfeit ? '[Reduced fee: admin-confirmed forfeit]' : '', isLate ? `[Late reporting: $${LADDER_MATCH_REPORTING_LATE_FEE} fee applied]` : ''].filter(Boolean).join('\n') || null;

      console.log('🔍 Admin submitting ladder match result:', {
        matchId: selectedMatch._id,
        winnerId: winnerId,
        score: scoreToSave,
        notes: notesData,
        matchDate: matchDate
      });

      const result = await supabaseDataService.updateMatchStatus(
        selectedMatch._id,
        'completed',
        { winnerId: winnerId },
        scoreToSave || null,
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

  const submitMatchResultWithCredits = async (scoreOverride = null) => {
    try {
      if (selectedMatch?._id === PREVIEW_PAYMENT_MATCH_ID) {
        setMessage('Dev preview only. Remove ?preview_match_payment=1 from the URL to use credits on a real match.');
        return;
      }
      const isLate = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
      const fee = getMatchReportingFeeDollars({ adminConfirmedForfeit, isLate });
      const reportingFeeBaseDollars = getMatchReportingBaseDollars({ adminConfirmedForfeit });
      const response = await fetch(`${BACKEND_URL}/api/monetization/use-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerEmail: playerName,
          amount: fee,
          description: 'Ladder match reporting fee',
          reportingFeeBaseDollars
        })
      });

      if (response.ok) {
        await submitMatchResult(scoreOverride);
        setUserCredits(prev => prev - fee);
      } else {
        throw new Error('Failed to use credits');
      }
    } catch (error) {
      console.error('Credit payment error:', error);
      setError('Credit payment failed. Please try again.');
    }
  };

  const handleCashPayment = async () => {
    if (selectedMatch?._id === PREVIEW_PAYMENT_MATCH_ID) {
      setMessage('Dev preview only. Remove ?preview_match_payment=1 from the URL to record a real cash payment.');
      return;
    }
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

      const isLate = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
      const fee = getMatchReportingFeeDollars({ adminConfirmedForfeit, isLate });
      const reportingFeeBaseDollars = getMatchReportingBaseDollars({ adminConfirmedForfeit });

      const paymentPromises = [
        fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'match_fee',
            playerEmail: playerName,
            playerName: playerName,
            amount: fee,
            reportingFeeBaseDollars,
            paymentMethod: 'cash',
            matchId: selectedMatch._id,
            playerId: playerName,
            description: `Match reporting fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            notes: `Cash payment at Legends red dropbox - Match reporting fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            status: 'pending_verification'
          })
        })
      ];

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
          await recordMatchWithPendingPayment(formatScore(winnerGames, loserGames));
          
          const paymentAmount = fee.toFixed(0);
          setMessage(`💰 Cash Payment Recorded Successfully!

🎯 Match Result Submitted
💵 Amount Due: $${paymentAmount} cash
📦 Drop Location: RED dropbox at Legends Brews & Cues

✅ Your match result has been recorded and is pending admin verification. Once your cash payment is verified, ladder positions will be updated automatically.

Thank you for your payment!`);
        } else {
          // Payment processed immediately; pass score from form so it's always saved (same for all ladders)
          await submitMatchResult(formatScore(winnerGames, loserGames));
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

  const recordMatchWithPendingPayment = async (scoreOverride = null) => {
    try {
      const scoreToSave = scoreOverride != null && String(scoreOverride).trim() !== '' ? String(scoreOverride).trim() : score;
      let raceLength = 5;
      if (scoreFormat === 'other' && customRaceTo) {
        raceLength = parseInt(customRaceTo) || 5;
      } else if (scoreFormat && scoreFormat.startsWith('race-to-')) {
        raceLength = parseInt(scoreFormat.split('-')[2]) || 5;
      }

      const response = await fetch(`${BACKEND_URL}/api/ladder/matches/${selectedMatch._id}/record-pending-payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winner: winner === selectedMatch.senderName ? selectedMatch.senderId : selectedMatch.receiverId,
          score: scoreToSave,
          notes: (() => {
            const isLate = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
            return [notes?.trim() || '', adminConfirmedForfeit ? '[Reduced fee: admin-confirmed forfeit]' : '', isLate ? `[Late reporting: $${LADDER_MATCH_REPORTING_LATE_FEE} fee applied]` : ''].filter(Boolean).join('\n') || null;
          })(),
          reportedBy: selectedMatch.player1?.email && String(selectedMatch.player1.email).toLowerCase() === String(playerName).toLowerCase()
            ? selectedMatch.senderId
            : selectedMatch.receiverId,
          reportedAt: new Date().toISOString(),
          paymentMethod: 'cash',
          gameType: gameType,
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
    if (selectedMatch?._id === PREVIEW_PAYMENT_MATCH_ID) {
      setMessage('Dev preview only. Remove ?preview_match_payment=1 from the URL to use this payment path.');
      return;
    }
    setPaymentProcessing(true);
    setError('');

    try {
      const isLate = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
      const fee = getMatchReportingFeeDollars({ adminConfirmedForfeit, isLate });
      const reportingFeeBaseDollars = getMatchReportingBaseDollars({ adminConfirmedForfeit });

      const paymentPromises = [
        fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'match_fee',
            playerEmail: playerName,
            playerName: playerName,
            amount: fee,
            reportingFeeBaseDollars,
            paymentMethod: paymentMethodId,
            matchId: selectedMatch._id,
            playerId: playerName,
            description: `Match reporting fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            notes: `Match reporting fee for ${selectedMatch.senderName} vs ${selectedMatch.receiverName}`,
            status: 'completed'
          })
        })
      ];

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
          // Submit match result after payments recorded; pass score from form so it's always saved
          await submitMatchResult(formatScore(winnerGames, loserGames));
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

  const submitMatchResult = async (scoreOverride = null) => {
    try {
      setSubmitting(true);
      setError('');

      if (selectedMatch?._id === PREVIEW_PAYMENT_MATCH_ID) {
        setError('Dev preview: remove ?preview_match_payment=1 from the URL to submit a real match.');
        return;
      }

      // Use passed score so it's always saved (state may be stale). Same for all ladders.
      const scoreToSave = scoreOverride != null && String(scoreOverride).trim() !== '' ? String(scoreOverride).trim() : score;
      const winnerId = winner === selectedMatch.senderName ? selectedMatch.senderId : selectedMatch.receiverId;
      const isLate = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
      const notesData = [notes?.trim() || '', adminConfirmedForfeit ? '[Reduced fee: admin-confirmed forfeit]' : '', isLate ? `[Late reporting: $${LADDER_MATCH_REPORTING_LATE_FEE} fee applied]` : ''].filter(Boolean).join('\n') || null;

      let raceLength = 5;
      if (scoreFormat === 'other' && customRaceTo) {
        raceLength = parseInt(customRaceTo) || 5;
      } else if (scoreFormat && scoreFormat.startsWith('race-to-')) {
        raceLength = parseInt(scoreFormat.split('-')[2]) || 5;
      }

      console.log('🔍 Submitting ladder match result:', {
        matchId: selectedMatch._id,
        winnerId: winnerId,
        score: scoreToSave,
        notes: notesData,
        gameType: gameType,
        raceLength: raceLength,
        matchDate: matchDate
      });

      const result = await supabaseDataService.updateMatchStatus(
        selectedMatch._id,
        'completed',
        { winnerId: winnerId },
        scoreToSave || null,
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

  const toLocalYMD = (dateLike) => {
    if (!(dateLike instanceof Date) || Number.isNaN(dateLike.getTime())) return '';
    const y = dateLike.getFullYear();
    const m = String(dateLike.getMonth() + 1).padStart(2, '0');
    const d = String(dateLike.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const normalizeToYMD = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : toLocalYMD(parsed);
  };

  const getLadderDisplayName = (ladderName) => {
    switch (ladderName) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return ladderName;
    }
  };

  // Keep displayed pricing aligned with submit/payment logic (no admin bypass for late-fee calculation).
  const isLateReporting = !!(matchDate && isPastMatchReportingDeadline(matchDate, { isAdmin: false }));
  const matchReportingBaseDollars = getMatchReportingBaseDollars({ adminConfirmedForfeit });
  const matchReportingLateDollars = isLateReporting ? LADDER_MATCH_REPORTING_LATE_FEE : 0;
  const matchReportingFee = getMatchReportingFeeDollars({ adminConfirmedForfeit, isLate: isLateReporting });
  const poolFromBase = matchReportingBaseDollars / 2;
  const platformFromBase = matchReportingBaseDollars / 2;
  const prizePoolTotal = poolFromBase + matchReportingLateDollars;
  const isPreviewPaymentUi = selectedMatch?._id === PREVIEW_PAYMENT_MATCH_ID;

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
            ⚔️ {REPORT_RESULTS_MENU_LABEL}
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

        {!loading && (
          <ReportMatchFlowStepper
            stepIndex={!selectedMatch ? 0 : !showPaymentForm ? 1 : 2}
            isMobile={isMobile}
          />
        )}

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
                      <span>📅 {formatDate(matchDate || selectedMatch.date || selectedMatch.match_date || selectedMatch.scheduledDate || selectedMatch.scheduled_date)} {selectedMatch.time ? `at ${selectedMatch.time}` : ''}</span>
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
                    <span style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: 1.35 }}>
                      {isLateReporting ? (
                        <>Winner pays <strong style={{ color: '#fff' }}>${matchReportingFee.toFixed(2)}</strong> total <span style={{ color: '#bdbdbd' }}>(includes ${LADDER_MATCH_REPORTING_LATE_FEE} late — 48+ hrs after match date)</span></>
                      ) : (
                        <>Winner pays <strong style={{ color: '#fff' }}>${matchReportingBaseDollars.toFixed(2)}</strong> <span style={{ color: '#bdbdbd' }}>if you post within 48 hours of the match date</span></>
                      )}
                    </span>
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
                      Fee questions?
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
                        onChange={(e) => setMatchDate((e.target.value || '').trim())}
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
                      {matchDate && (
                        <small style={{ color: '#8aa0b8', fontSize: '0.68rem', display: 'block', marginTop: '2px' }}>
                          Selected: {matchDate}
                        </small>
                      )}
                      {matchDate && (
                        <small style={{
                          display: 'block',
                          marginTop: '4px',
                          fontSize: '0.74rem',
                          color: isLateReporting ? '#f59e0b' : '#34d399'
                        }}>
                          {isLateReporting ? `Late fee applies (+$${LADDER_MATCH_REPORTING_LATE_FEE})` : 'On-time reporting (no late fee)'}
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

                    {(winner && (isReporterTheSelectedWinner(playerName, winner, selectedMatch) || isAdmin)) && (
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        color: '#e0e0e0',
                        fontSize: '0.85rem',
                        lineHeight: 1.35
                      }}>
                        <input
                          type="checkbox"
                          checked={adminConfirmedForfeit}
                          onChange={(e) => setAdminConfirmedForfeit(e.target.checked)}
                          style={{ marginTop: '3px' }}
                        />
                        <span>
                          <strong>Admin-confirmed forfeit</strong> — reduced <strong>$5</strong> reporting fee (win must be reported with loser on 0). Check only after an admin has confirmed this with you.
                        </span>
                      </label>
                    )}

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
                        {submitting
                          ? 'Working…'
                          : (isLateReporting
                            ? `Continue — pay $${matchReportingFee.toFixed(0)} (includes late fee)`
                            : `Continue — pay $${matchReportingBaseDollars.toFixed(0)} reporting fee`)}
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
                  {isPreviewPaymentUi && (
                    <div style={{
                      background: 'rgba(255, 193, 7, 0.15)',
                      border: '1px solid rgba(255, 193, 7, 0.45)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      marginBottom: '1rem',
                      color: '#ffe082',
                      fontSize: isMobile ? '0.78rem' : '0.85rem',
                      lineHeight: 1.45
                    }}>
                      <strong>Practice screen</strong> (developers only). Payments are turned off. Close this window and use Report Match as usual when you are ready to post a real match.
                    </div>
                  )}
                  <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.72rem' : '0.78rem', textAlign: 'center', margin: '0 0 0.25rem 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Almost done
                  </p>
                  <h3 style={{ color: '#f1f5f9', marginBottom: '0.35rem', fontSize: isMobile ? '1.2rem' : '1.35rem', textAlign: 'center', fontWeight: 700 }}>
                    Pay to post this result
                  </h3>
                  {selectedMatch && (
                    <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.8rem' : '0.85rem', textAlign: 'center', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                      <strong style={{ color: '#e2e8f0' }}>{selectedMatch.senderName}</strong>
                      {' vs '}
                      <strong style={{ color: '#e2e8f0' }}>{selectedMatch.receiverName}</strong>
                    </p>
                  )}
                  <p style={{ color: '#cbd5e1', fontSize: isMobile ? '0.82rem' : '0.88rem', textAlign: 'center', margin: '0 auto 1.1rem', lineHeight: 1.45, maxWidth: '22rem' }}>
                    As the <strong>winner</strong>, you pay once here. Your opponent does not pay a reporting fee for this match.
                  </p>
                  
                  {/* Simple Payment Summary */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Amount due
                    </div>
                    <div style={{ color: '#4ade80', fontSize: isMobile ? '1.35rem' : '1.55rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                      ${matchReportingFee.toFixed(2)}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: isMobile ? '0.78rem' : '0.82rem', marginBottom: '0.65rem' }}>
                      {matchReportingLateDollars > 0
                        ? <><strong>${matchReportingBaseDollars.toFixed(2)}</strong> base + <strong>${matchReportingLateDollars.toFixed(2)}</strong> late reporting</>
                        : <><strong>${matchReportingBaseDollars.toFixed(2)}</strong> — on time (within 48 hours of the match date)</>}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '0.6rem', textAlign: 'left' }}>
                      <div style={{ color: '#94a3b8', fontSize: isMobile ? '0.68rem' : '0.72rem', fontWeight: 600, marginBottom: '0.35rem' }}>Where this payment goes</div>
                      <ul style={{ color: '#e2e8f0', fontSize: isMobile ? '0.74rem' : '0.8rem', lineHeight: 1.5, margin: 0, paddingLeft: '1.15rem' }}>
                        {adminConfirmedForfeit ? (
                          <>
                            <li><strong>${poolFromBase.toFixed(2)}</strong> to this ladder&apos;s prize pool, <strong>${platformFromBase.toFixed(2)}</strong> to platform support</li>
                            {matchReportingLateDollars > 0 && (
                              <li>The <strong>${matchReportingLateDollars.toFixed(2)}</strong> late portion goes entirely to the prize pool (pool total <strong>${prizePoolTotal.toFixed(2)}</strong>)</li>
                            )}
                          </>
                        ) : matchReportingLateDollars > 0 ? (
                          <>
                            <li><strong>${poolFromBase.toFixed(2)}</strong> prize pool + <strong>${platformFromBase.toFixed(2)}</strong> platform from the base fee</li>
                            <li>The <strong>${matchReportingLateDollars.toFixed(2)}</strong> late fee goes entirely to the prize pool (pool gets <strong>${prizePoolTotal.toFixed(2)}</strong> from you)</li>
                          </>
                        ) : (
                          <li><strong>${poolFromBase.toFixed(2)}</strong> to this ladder&apos;s prize pool · <strong>${platformFromBase.toFixed(2)}</strong> to help run the app</li>
                        )}
                      </ul>
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
                          <div style={{ color: '#86efac', fontWeight: 'bold', fontSize: isMobile ? '0.95rem' : '1rem' }}>
                            Use prepaid credits
                          </div>
                          <div style={{ color: '#bbf7d0', fontSize: isMobile ? '0.78rem' : '0.84rem', marginTop: '0.25rem', lineHeight: 1.35 }}>
                            You have <strong>${userCredits.toFixed(2)}</strong> — debits your balance, usually no wait
                          </div>
                        </div>
                        
                      <button
                          onClick={canUseCredits() ? submitMatchResultWithCredits : () => setError(`Insufficient credits. You have $${userCredits.toFixed(2)} but need $${matchReportingFee.toFixed(2)}`)}
                          disabled={isPreviewPaymentUi || !canUseCredits()}
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
                          {canUseCredits() ? `Pay $${matchReportingFee.toFixed(2)} with credits` : 'Not enough credits'}
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
                          <div style={{ color: '#ffedd5', fontSize: isMobile ? '0.8rem' : '0.85rem', lineHeight: 1.35 }}>
                            You need <strong>${Math.max(0, matchReportingFee - userCredits).toFixed(2)}</strong> more in your balance
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
                  Add credits
                      </button>
                    </div>
                  )}
                    </div>
                  </div>

                  {/* Payment Methods — collapsed by default */}
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setOtherPaymentWaysOpen((o) => !o)}
                      aria-expanded={otherPaymentWaysOpen}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        textAlign: 'left',
                        background: 'rgba(15, 23, 42, 0.55)',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        borderRadius: '10px',
                        padding: isMobile ? '0.65rem 0.85rem' : '0.75rem 1rem',
                        cursor: 'pointer',
                        color: '#e2e8f0',
                        fontSize: isMobile ? '0.88rem' : '0.95rem',
                        fontWeight: 600,
                        transition: 'background 0.2s ease, border-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.75)';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.55)';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.35)';
                      }}
                    >
                      <span style={{ flex: 1, lineHeight: 1.35 }}>
                        Other ways to pay
                        {!otherPaymentWaysOpen && (
                          <span style={{ display: 'block', fontWeight: 400, color: '#94a3b8', fontSize: isMobile ? '0.74rem' : '0.8rem', marginTop: '0.25rem' }}>
                            Card, cash at Legends, Venmo — tap to expand
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden
                        style={{
                          flexShrink: 0,
                          color: '#94a3b8',
                          fontSize: isMobile ? '0.78rem' : '0.82rem',
                          fontWeight: 600
                        }}
                      >
                        {otherPaymentWaysOpen ? 'Hide' : 'Show'}
                      </span>
                    </button>

                    {otherPaymentWaysOpen && (
                    <>
                    <div style={{ color: '#94a3b8', fontSize: isMobile ? '0.76rem' : '0.82rem', margin: '0.65rem 0 0.75rem', textAlign: 'center', lineHeight: 1.4 }}>
                      Pick the option that matches how you are paying. Your league may not show every type.
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
                            <div style={{ color: '#93c5fd', fontSize: isMobile ? '0.74rem' : '0.8rem', marginTop: '0.25rem', lineHeight: 1.35 }}>
                              Secure card checkout — completes when your bank approves
                            </div>
                          </div>
                          
                          {method.paymentLink ? (
                            <a 
                              href={isPreviewPaymentUi ? '#' : method.paymentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              aria-disabled={isPreviewPaymentUi}
                              onClick={(e) => {
                                if (isPreviewPaymentUi) {
                                  e.preventDefault();
                                  setMessage('Dev preview: external pay link disabled. Remove preview_match_payment from the URL for a real checkout.');
                                }
                              }}
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
                                display: 'block',
                                pointerEvents: isPreviewPaymentUi ? 'none' : 'auto',
                                opacity: isPreviewPaymentUi ? 0.55 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (isPreviewPaymentUi) return;
                                e.target.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
                                e.target.style.boxShadow = '0 3px 8px rgba(33, 150, 243, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                if (isPreviewPaymentUi) return;
                                e.target.style.background = 'linear-gradient(135deg, #2196f3, #1976d2)';
                                e.target.style.boxShadow = '0 2px 6px rgba(33, 150, 243, 0.3)';
                              }}
                            >
                              Open checkout · ${matchReportingFee.toFixed(0)}
                            </a>
                          ) : (
                            <button
                              onClick={() => handleQuickPayment(method.id)}
                              disabled={paymentProcessing || isPreviewPaymentUi}
                              style={{
                                background: paymentProcessing || isPreviewPaymentUi ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #2196f3, #1976d2)',
                                color: '#fff',
                                border: 'none',
                                padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                fontWeight: 'bold',
                                cursor: paymentProcessing || isPreviewPaymentUi ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: paymentProcessing || isPreviewPaymentUi ? 0.6 : 1,
                                boxShadow: paymentProcessing || isPreviewPaymentUi ? 'none' : '0 2px 6px rgba(33, 150, 243, 0.3)',
                                width: '100%'
                              }}
                              onMouseEnter={(e) => {
                                if (!paymentProcessing && !isPreviewPaymentUi) {
                                  e.target.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
                                  e.target.style.boxShadow = '0 3px 8px rgba(33, 150, 243, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = paymentProcessing || isPreviewPaymentUi ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #2196f3, #1976d2)';
                                e.target.style.boxShadow = paymentProcessing || isPreviewPaymentUi ? 'none' : '0 2px 6px rgba(33, 150, 243, 0.3)';
                              }}
                            >
                              I paid with my card — record ${matchReportingFee.toFixed(0)}
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
                            Cash at Legends
                          </div>
                          <div style={{ color: '#fecaca', fontSize: isMobile ? '0.74rem' : '0.8rem', marginTop: '0.25rem', lineHeight: 1.35 }}>
                            Leave cash in the <strong>red dropbox</strong>. We record it here; staff confirms when they pick it up.
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
                          disabled={paymentProcessing || isPreviewPaymentUi}
                          style={{
                            background: paymentProcessing || isPreviewPaymentUi ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 68, 68, 0.9)',
                            color: '#fff',
                            border: 'none',
                            padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                            borderRadius: '6px',
                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                            fontWeight: 'bold',
                            cursor: paymentProcessing || isPreviewPaymentUi ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: paymentProcessing || isPreviewPaymentUi ? 0.6 : 1,
                            boxShadow: paymentProcessing || isPreviewPaymentUi ? 'none' : '0 2px 6px rgba(255, 68, 68, 0.3)',
                            width: '100%'
                          }}
                          onMouseEnter={(e) => {
                            if (!paymentProcessing && !isPreviewPaymentUi) {
                              e.target.style.background = 'rgba(255, 68, 68, 1)';
                              e.target.style.boxShadow = '0 3px 8px rgba(255, 68, 68, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = paymentProcessing || isPreviewPaymentUi ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 68, 68, 0.9)';
                            e.target.style.boxShadow = paymentProcessing || isPreviewPaymentUi ? 'none' : '0 2px 6px rgba(255, 68, 68, 0.3)';
                          }}
                        >
                          {paymentProcessing ? 'Saving…' : `Record $${matchReportingFee.toFixed(0)} cash payment`}
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
                              href={isPreviewPaymentUi ? '#' : method.paymentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              aria-disabled={isPreviewPaymentUi}
                              onClick={(e) => {
                                if (isPreviewPaymentUi) {
                                  e.preventDefault();
                                  setMessage('Dev preview: external pay link disabled. Remove preview_match_payment from the URL for a real checkout.');
                                }
                              }}
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
                                display: 'block',
                                pointerEvents: isPreviewPaymentUi ? 'none' : 'auto',
                                opacity: isPreviewPaymentUi ? 0.55 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (isPreviewPaymentUi) return;
                                e.target.style.background = 'rgba(76, 175, 80, 1)';
                              }}
                              onMouseLeave={(e) => {
                                if (isPreviewPaymentUi) return;
                                e.target.style.background = 'rgba(76, 175, 80, 0.8)';
                              }}
                            >
                                Open link · ${matchReportingFee.toFixed(0)}
                            </a>
                          ) : (
                            <button
                              onClick={() => handleQuickPayment(method.id)}
                              disabled={paymentProcessing || isPreviewPaymentUi}
                              style={{
                                background: paymentProcessing || isPreviewPaymentUi ? 'rgba(255, 255, 255, 0.1)' : 'rgba(76, 175, 80, 0.8)',
                                color: '#fff',
                                border: 'none',
                                padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1rem',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                fontWeight: 'bold',
                                cursor: paymentProcessing || isPreviewPaymentUi ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: paymentProcessing || isPreviewPaymentUi ? 0.6 : 1,
                                width: '100%'
                              }}
                              onMouseEnter={(e) => {
                                if (!paymentProcessing && !isPreviewPaymentUi) {
                                  e.target.style.background = 'rgba(76, 175, 80, 1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = paymentProcessing || isPreviewPaymentUi ? 'rgba(255, 255, 255, 0.1)' : 'rgba(76, 175, 80, 0.8)';
                              }}
                            >
                                {paymentProcessing ? 'Saving…' : `Record $${matchReportingFee.toFixed(0)} (other method)`}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                    </>
                    )}
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
                    ← Go back and edit score or details
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
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '88px 1rem 1rem',
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
            <div style={{ textAlign: 'center', marginBottom: '0.75rem', paddingRight: '2rem' }}>
              <h2 style={{ color: '#ff4444', margin: '0 0 0.25rem 0', fontSize: '1.35rem' }}>
                💳 How payments work
              </h2>
              <p style={{ color: '#ccc', margin: 0, fontSize: '0.85rem', lineHeight: 1.45 }}>
                Playing on the ladder is free. You only pay a small reporting fee when the winner posts a match result.
              </p>
            </div>

            {/* Content */}
            <div className="match-reporting-payment-info-grid" style={{ margin: '0 auto' }}>
              {/* Ladder access */}
              <div style={{
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem'
              }}>
                <h3 style={{ color: '#2196f3', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                  📅 Ladder access — free
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.3rem 0' }}>Your account includes:</p>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    <li>All ladder divisions for your skill level</li>
                    <li>Challenges, standings, and match history</li>
                    <li>Tournament sign-ups when offered</li>
                  </ul>
                  <p style={{ margin: 0, color: '#81c784', fontSize: '0.75rem' }}>
                    There is no monthly ladder membership fee.
                  </p>
                </div>
              </div>

              {/* Match reporting */}
              <div style={{
                background: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem'
              }}>
                <h3 style={{ color: '#4caf50', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                  🏆 When you pay ($10 standard)
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    {MATCH_FEE_WHEN_YOU_PAY_BULLETS.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p style={{ margin: 0, color: '#ffb74d', fontSize: '0.75rem' }}>
                    Full policy: open <strong>Ladder of Legends Rules</strong> from the ladder page anytime.
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
                  💳 Ways to pay
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.3rem 0' }}>On the pay screen you may see options such as:</p>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    <li>Account <strong>credits</strong> (buy ahead for a quick checkout)</li>
                    <li><strong>Card</strong> through Square, where enabled</li>
                    <li><strong>Cash</strong> at Legends (red dropbox) — recorded in the app, then confirmed by staff</li>
                    <li><strong>Venmo, Cash App,</strong> or other links the league turns on for you</li>
                  </ul>
                  <p style={{ margin: 0, color: '#81c784', fontSize: '0.75rem' }}>
                    Credits are usually the fastest path if you keep a small balance.
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
                  🛡️ Verification timing
                </h3>
                <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                    <li><strong>New accounts:</strong> Cash or manual methods may need a quick admin check (often within about a day)</li>
                    <li><strong>After several good payments:</strong> The app can auto-approve more often</li>
                    <li><strong>Established players:</strong> May qualify for faster or instant paths where the league enables them</li>
                  </ul>
                  <p style={{ margin: 0, color: '#ce93d8', fontSize: '0.75rem' }}>
                    Card/credit payments typically clear as soon as the processor approves them.
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
