import React, { useState, useEffect } from 'react';
import { challengeService } from '@shared/services/services/challengeService';
import { format } from 'date-fns';
import styles from './dashboard.module.css';
import Phase2RulesModal from '@shared/components/modal/modal/Phase2RulesModal';
import Phase1ResultsModal from '@shared/components/modal/modal/Phase1ResultsModal';

export default function Phase2Tracker({ 
  playerName, 
  playerLastName, 
  selectedDivision, 
  phase,
  isMobile,
  // Add props for modal handlers like Phase 1 tracker
  onOpenOpponentsModal,
  onOpenCompletedMatchesModal,
  onOpenStandingsModal,
  onOpenDefenseChallengersModal,
  onOpenAllMatchesModal,
  onOpenProposalListModal,
  onOpenSentProposalListModal,
  onOpenPlayerSearch,
  pendingCount = 0,
  sentCount = 0,
  upcomingMatches = [],
  onMatchClick,
  // Add season data for deadline tracking
  seasonData,
  // Add Phase 1 data for stats display
  completedMatches = [],
  standings = []
}) {
  const [stats, setStats] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showPhase1ResultsModal, setShowPhase1ResultsModal] = useState(false);
  const [phase1Stats, setPhase1Stats] = useState(null);

  const fullPlayerName = `${playerName} ${playerLastName}`;

  // Calculate Phase 1 stats (win/loss record and final position)
  const calculatePhase1Stats = () => {
    let wins = 0;
    let losses = 0;

    // Calculate wins/losses from completed matches
    if (completedMatches && completedMatches.length > 0) {
      completedMatches.forEach(match => {
        if (match.winner === fullPlayerName) {
          wins++;
        } else {
          losses++;
        }
      });
    }

    const winRate = completedMatches && completedMatches.length > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    
    // Get actual standings position
    const getPlayerPosition = (standings, playerName) => {
      if (!standings || standings.length === 0) {
        return null;
      }
      
      const normalizedPlayerName = playerName.toLowerCase().trim();
      const playerEntry = standings.find(entry => 
        entry.name.toLowerCase().trim() === normalizedPlayerName
      );
      
      return playerEntry ? parseInt(playerEntry.rank) : null;
    };

    const getOrdinalSuffix = (num) => {
      const j = num % 10;
      const k = num % 100;
      if (j === 1 && k !== 11) return 'st';
      if (j === 2 && k !== 12) return 'nd';
      if (j === 3 && k !== 13) return 'rd';
      return 'th';
    };

    const actualPosition = getPlayerPosition(standings, fullPlayerName);
    let positionDisplay = 'N/A';
    
    if (actualPosition !== null) {
      positionDisplay = `${actualPosition}${getOrdinalSuffix(actualPosition)}`;
    } else if (completedMatches && completedMatches.length >= 1) {
      // Fallback to estimated position if not in standings but has completed matches
      if (winRate >= 80) positionDisplay = '1st-3rd';
      else if (winRate >= 60) positionDisplay = '4th-6th';
      else if (winRate >= 40) positionDisplay = '7th-9th';
      else positionDisplay = '10th+';
    }

    const stats = {
      wins,
      losses,
      winRate,
      position: positionDisplay,
      totalMatches: completedMatches ? completedMatches.length : 0
    };
    
    console.log('Phase2Tracker - Calculated Phase 1 stats:', stats);
    setPhase1Stats(stats);
  };

  // Calculate Phase 1 stats when component mounts or data changes
  useEffect(() => {
    console.log('Phase2Tracker - Calculating Phase 1 stats:');
    console.log('  completedMatches:', completedMatches);
    console.log('  standings:', standings);
    console.log('  fullPlayerName:', fullPlayerName);
    calculatePhase1Stats();
  }, [completedMatches, standings, fullPlayerName]);

  // Calculate Phase 2 deadline status
  const getPhase2DeadlineStatus = () => {
    // Debug the season data being received
    console.log('Phase2Tracker - Received seasonData:', seasonData);
    console.log('Phase2Tracker - seasonData.phase1End:', seasonData?.phase1End);
    
    if (!seasonData || !seasonData.phase1End) {
      console.log('Phase2Tracker - No seasonData or phase1End found');
      return { days: null, status: 'no_deadline' };
    }
    
    const now = new Date();
    const phase1End = new Date(seasonData.phase1End);
    
         // Debug the date comparison
     console.log('Phase2Tracker - Date comparison:');
     console.log('  now:', now.toISOString());
     console.log('  phase1End:', phase1End.toISOString());
     console.log('  nowTime:', now.getTime());
     console.log('  phase1EndTime:', phase1End.getTime());
     console.log('  isPhase1Active:', now <= phase1End);
     console.log('  currentDate:', now.toLocaleDateString());
     console.log('  phase1EndDate:', phase1End.toLocaleDateString());
    
    // If Phase 1 hasn't ended yet, Phase 2 cannot be over
    if (now <= phase1End) {
      console.log('Phase2Tracker - Phase 1 is still active, returning phase1_active status');
      return { days: null, status: 'phase1_active' };
    }
    
    // Phase 2 ends 4 weeks (28 days) after Phase 1 ends
    const phase2End = new Date(phase1End);
    phase2End.setDate(phase2End.getDate() + 28);
    
    const diffTime = phase2End - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
         console.log('Phase2Tracker - Phase 2 calculation:');
     console.log('  phase2End:', phase2End.toISOString());
     console.log('  diffTime:', diffTime);
     console.log('  diffDays:', diffDays);
     console.log('  status:', diffDays < 0 ? 'passed' : diffDays <= 1 ? 'critical' : diffDays <= 3 ? 'urgent' : diffDays <= 7 ? 'warning' : 'normal');
    
    if (diffDays < 0) {
      return { days: Math.abs(diffDays), status: 'passed' };
    } else if (diffDays <= 1) {
      return { days: diffDays, status: 'critical' };
    } else if (diffDays <= 3) {
      return { days: diffDays, status: 'urgent' };
    } else if (diffDays <= 7) {
      return { days: diffDays, status: 'warning' };
    } else {
      return { days: diffDays, status: 'normal' };
    }
  };

  const deadlineStatus = getPhase2DeadlineStatus();
  
  // Debug the final deadline status
  console.log('Phase2Tracker - Final deadlineStatus:', deadlineStatus);
  console.log('Phase2Tracker - Final deadlineStatus.status:', deadlineStatus?.status);
  console.log('Phase2Tracker - Final deadlineStatus.days:', deadlineStatus?.days);

  useEffect(() => {
    if (!playerName || !playerLastName || !selectedDivision || phase !== 'challenge') {
      setLoading(false);
      return;
    }

    async function loadChallengeData() {
      try {
        setLoading(true);
        setError(null);

        // Load both stats and limits
        const [statsData, limitsData] = await Promise.all([
          challengeService.getChallengeStats(fullPlayerName, selectedDivision),
          challengeService.getChallengeLimits(fullPlayerName, selectedDivision)
        ]);

        setStats(statsData);
        setLimits(limitsData);
      } catch (err) {
        console.error('Error loading challenge data:', err);
        setError('Failed to load challenge statistics');
      } finally {
        setLoading(false);
      }
    }

    loadChallengeData();
  }, [playerName, playerLastName, selectedDivision, phase, fullPlayerName]);

  if (phase !== 'challenge') {
    return null;
  }

  if (loading) {
    return (
      <div style={{
        background: `linear-gradient(135deg, rgba(42, 42, 42, 0.7), rgba(26, 26, 26, 0.8))`,
        border: '2px solid #ff4444',
        borderRadius: isMobile ? '8px' : '12px',
        padding: isMobile ? '1px' : '18px',
        margin: isMobile ? '-15px 0 0 0' : '16px 0',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(2px)',
        textAlign: 'center',
        color: '#888'
      }}>
        Loading Phase 2 challenge statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: `linear-gradient(135deg, rgba(42, 42, 42, 0.7), rgba(26, 26, 26, 0.8))`,
        border: '2px solid #e53e3e',
        borderRadius: isMobile ? '8px' : '12px',
        padding: isMobile ? '1px' : '18px',
        margin: isMobile ? '-15px 0 0 0' : '16px 0',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(2px)',
        textAlign: 'center',
        color: '#e53e3e'
      }}>
        {error}
      </div>
    );
  }

  if (!stats || !limits) {
    return null;
  }

  // Phase 2 Challenge System Logic
  const totalMatches = stats.matchesAsChallenger + stats.requiredDefenses;
  const minRequiredMatches = 2;
  const maxAllowedMatches = 4;
  const remainingMatches = maxAllowedMatches - totalMatches;
  const isMinimumMet = totalMatches >= minRequiredMatches;
  const isMaximumReached = totalMatches >= maxAllowedMatches;
  
  // Challenge limits based on times challenged
  const getChallengeLimit = () => {
    const timesChallenged = limits.dynamicLimits?.timesChallenged || 0;
    if (timesChallenged === 0) return 4;
    if (timesChallenged === 1) return 3;
    if (timesChallenged === 2) return 2;
    return 0; // Can't challenge if challenged 3+ times
  };
  
  const challengesAllowed = getChallengeLimit();
  const challengesIssued = limits.dynamicLimits?.challengesIssued || 0;
  const challengesRemaining = challengesAllowed - challengesIssued;
  
  // Defense requirements
  const requiredDefenses = stats.requiredDefenses || 0;
  const maxRequiredDefenses = 2;
  const canDeclineDefenses = requiredDefenses >= maxRequiredDefenses;

  // Phase 2 Challenge Status Logic
  const getChallengeStatus = () => {
    if (isMaximumReached) {
      return 'completed'; // All 4 matches done
    } else if (isMinimumMet) {
      return 'active'; // Met minimum (2+ matches)
    } else if (totalMatches >= 1) {
      return 'progressing'; // Started but below minimum
    } else {
      return 'ready'; // Haven't started Phase 2
    }
  };

  const getStatusColor = (isEligible) => isEligible ? '#28a745' : '#e53e3e';
  
  const getProgressColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return '#e53e3e';
    if (percentage >= 75) return '#ffc107';
    return '#28a745';
  };

  // Dynamic primary color based on status - using red theme like Phase 1
  const getPrimaryColor = () => {
    // First check if Phase 1 is still active
    if (deadlineStatus.status === 'phase1_active') {
      return '#ffaa00'; // Orange - Phase 1 still active
    }
    
    const status = getChallengeStatus();
    switch (status) {
      case 'completed': return '#00aa00';      // Green - all done
      case 'active': return '#ff4444';         // Red - good progress
      case 'progressing': return '#ff4444';    // Red - started
      case 'ready': return '#ff4444';          // Red - ready to start
      default: return '#ff4444';
    }
  };

  // Status message with emojis - updated to reflect 2-4 total matches
  const getStatusMessage = () => {
    const status = getChallengeStatus();
    
    // Add deadline status to the message with date
    if (deadlineStatus.status === 'phase1_active') {
      const phase1EndDate = seasonData && seasonData.phase1End ? format(new Date(seasonData.phase1End), isMobile ? 'MMM d' : 'MMM d, yyyy') : '';
      return `⏳ Phase 1 still active until ${phase1EndDate}`;
    } else if (deadlineStatus.status === 'passed') {
      return '⚠️ DEADLINE PASSED!';
    } else if (deadlineStatus.status === 'critical') {
      const phase1End = new Date(seasonData.phase1End);
      const phase2End = new Date(phase1End);
      phase2End.setDate(phase2End.getDate() + 28);
      const endDate = format(phase2End, isMobile ? 'MMM d' : 'MMM d, yyyy');
      return `🚨 CRITICAL: ENDS in ${deadlineStatus.days} hours! (${endDate})`;
    } else if (deadlineStatus.status === 'urgent') {
      const phase1End = new Date(seasonData.phase1End);
      const phase2End = new Date(phase1End);
      phase2End.setDate(phase2End.getDate() + 28);
      const endDate = format(phase2End, isMobile ? 'MMM d' : 'MMM d, yyyy');
      return `⚠️ URGENT: ENDS in ${deadlineStatus.days} days! (${endDate})`;
    } else if (deadlineStatus.status === 'warning') {
      const phase1End = new Date(seasonData.phase1End);
      const phase2End = new Date(phase1End);
      phase2End.setDate(phase2End.getDate() + 28);
      const endDate = format(phase2End, isMobile ? 'MMM d' : 'MMM d, yyyy');
      return `⚠️ WARNING: ENDS in ${deadlineStatus.days} days. (${endDate})`;
    } else if (deadlineStatus.status === 'normal') {
      const phase1End = new Date(seasonData.phase1End);
      const phase2End = new Date(phase1End);
      phase2End.setDate(phase2End.getDate() + 28);
      const endDate = format(phase2End, isMobile ? 'MMM d' : 'MMM d, yyyy');
      return `ENDS in ${deadlineStatus.days} days. (${endDate})`;
    }
    
    // Phase 2 Challenge Status Messages
    switch (status) {
      case 'completed':
        return '🎉 Phase 2 Complete! (4/4 matches)';
      case 'active':
        return `🏆 Active in Phase 2! ${totalMatches}/4 matches (min met)`;
      case 'progressing':
        return `📈 Phase 2 in progress! ${totalMatches}/4 matches (need ${minRequiredMatches - totalMatches} more)`;
      case 'ready':
        return `⚔️ Ready for Phase 2! Need 2-4 challenge matches.`;
      default:
        return 'Phase 2 Challenge Status';
    }
  };

  const primaryColor = getPrimaryColor();
  
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(20, 20, 20, 0.9), rgba(0, 0, 0, 0.85))`,
      border: `2px solid rgba(255, 255, 255, 0.2)`,
      borderRadius: isMobile ? '16px' : '20px',
             padding: isMobile ? '6px' : '12px',
      margin: isMobile ? '-15px 0 0 0' : '13px auto',
             width: isMobile ? '100%' : '98%',
       maxWidth: isMobile ? 'none' : '1600px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 4px 16px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)`,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: isExpanded ? 'flex-start' : 'flex-start',
      backdropFilter: 'blur(8px)',
             overflow: isMobile ? 'auto' : 'auto',
             maxHeight: isMobile ? 'none' : 'none',
       height: isMobile ? (isExpanded ? 'auto' : '60px') : (isExpanded ? '380px' : '160px'),
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative'
    }}
    onClick={() => setIsExpanded(!isExpanded)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsExpanded(!isExpanded);
      }
    }}
    role="button"
    tabIndex="0"
    aria-label={isExpanded ? "Collapse Phase 2 tracker" : "Expand Phase 2 tracker"}
    >
             {/* Header */}
       <div style={{
         position: 'relative',
         textAlign: 'center',
         marginBottom: isMobile ? '0px' : '4px',
         padding: isMobile ? '6px' : '8px',
         borderRadius: '12px',
         background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(20, 20, 20, 0.8))',
         border: '1px solid rgba(255,255,255,0.15)',
         boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
       }}>
                           <h3 style={{
              margin: 0,
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '1.1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '4px' : '6px',
              flexWrap: 'wrap',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              letterSpacing: '0.5px',
              minHeight: isMobile ? '2.5rem' : '3rem'
            }}>
                                           {/* Phase 1 Results Button - Left */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPhase1ResultsModal(true);
                        }}
                        aria-label="View Phase 1 results"
                        role="button"
                        tabIndex="0"
                        style={{
                          background: 'linear-gradient(135deg, #22c55e, #16a34a, #15803d)',
                          border: '2px solid rgba(255,255,255,0.8)',
                          color: '#ffffff',
                          fontSize: isMobile ? '0.5rem' : '0.8rem',
                          fontWeight: 'bold',
                          padding: isMobile ? '6px 10px' : '8px 14px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 10px rgba(34, 197, 94, 0.2)',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #4ade80, #22c55e, #16a34a)';
                          e.target.style.transform = 'scale(1.05) translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.6), inset 0 1px 0 rgba(255,255,255,0.4), 0 0 15px rgba(34, 197, 94, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #22c55e, #16a34a, #15803d)';
                          e.target.style.transform = 'scale(1) translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 10px rgba(34, 197, 94, 0.2)';
                        }}
                        >
                                     📊 PHASE 1 RESULTS
                  </button>
                 
                 {/* Phase 2 Indicator - Center */}
                 <span style={{ 
                   fontSize: isMobile ? '0.9rem' : '1.1rem',
                   background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor})`,
                   padding: isMobile ? '4px 8px' : '6px 12px',
                   borderRadius: '8px',
                   boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 10px rgba(255,255,255,0.1)',
                   border: '1px solid rgba(255,255,255,0.3)',
                   textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                   fontWeight: 'bold'
                 }}>
                   Phase 2
                 </span>
                 
                 {/* Rules Button - Right */}
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     setShowRulesModal(true);
                   }}
                   aria-label="Open Phase 2 rules and information"
                   role="button"
                   tabIndex="0"
                   style={{
                     background: 'linear-gradient(135deg, #ff4444, #cc3333, #aa2222)',
                     border: '2px solid rgba(255,255,255,0.8)',
                     color: '#ffffff',
                     fontSize: isMobile ? '0.5rem' : '0.8rem',
                     fontWeight: 'bold',
                     padding: isMobile ? '6px 10px' : '8px 14px',
                     borderRadius: '8px',
                     cursor: 'pointer',
                     transition: 'all 0.3s ease',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                     boxShadow: '0 4px 12px rgba(255, 68, 68, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 10px rgba(255, 68, 68, 0.2)',
                     zIndex: 10
                   }}
                   onMouseEnter={(e) => {
                     e.target.style.background = 'linear-gradient(135deg, #ff6666, #dd4444, #cc3333)';
                     e.target.style.transform = 'scale(1.05) translateY(-2px)';
                     e.target.style.boxShadow = '0 6px 16px rgba(255, 68, 68, 0.6), inset 0 1px 0 rgba(255,255,255,0.4), 0 0 15px rgba(255, 68, 68, 0.3)';
                   }}
                   onMouseLeave={(e) => {
                     e.target.style.background = 'linear-gradient(135deg, #ff4444, #cc3333, #aa2222)';
                     e.target.style.transform = 'scale(1) translateY(0)';
                     e.target.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 10px rgba(255, 68, 68, 0.2)';
                   }}
                 >
                   ⚔️ RULES
                 </button>
                 </h3>
           
                 {/* Status Message - ends in XX days */}
                 <div style={{
                   color: '#ffffff',
                   fontSize: isMobile ? '0.7rem' : '0.95rem',
                   lineHeight: isMobile ? '1.1' : '1.1',
                   marginTop: isMobile ? '2px' : '2px',
                   marginBottom: isMobile ? '2px' : '4px',
                   textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                   fontWeight: '500',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
                   {getStatusMessage()}
                                  </div>
           
                                   {/* Calendar Section - positioned to align with completion counter */}
                  <div style={{
                    position: isMobile ? 'relative' : 'absolute',
                                         left: isMobile ? 'auto' : '8%',
                    top: isMobile ? 'auto' : '50%',
                    transform: isMobile ? 'none' : 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    fontSize: isMobile ? '2.5rem' : '3.2rem',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.25), rgba(220, 53, 69, 0.2), rgba(200, 35, 51, 0.15))',
                    border: '2px solid rgba(255, 68, 68, 0.6)',
                    padding: isMobile ? '4px' : '6px',
                    borderRadius: isMobile ? '12px' : '18px',
                    zIndex: 1,
                    boxShadow: '0 6px 20px rgba(255, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(255, 68, 68, 0.2)',
                    minWidth: isMobile ? '60px' : '80px',
                    minHeight: isMobile ? '75px' : '90px',
                    backdropFilter: 'blur(8px)',
                    margin: isMobile ? '8px auto' : '0'
                  }}
                 onClick={(e) => {
                   e.stopPropagation();
                   setIsExpanded(true);
                   if (onOpenPlayerSearch) onOpenPlayerSearch();
                 }}
                 aria-label="Open player search to schedule Phase 2 matches"
                 role="button"
                 tabIndex="0"
                 onMouseEnter={(e) => {
                   e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                   e.currentTarget.style.background = 'rgba(255, 68, 68, 0.25)';
                   e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 68, 68, 0.5)';
                   e.currentTarget.style.border = '2px solid rgba(255, 68, 68, 0.6)';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                   e.currentTarget.style.background = 'rgba(255, 68, 68, 0.15)';
                   e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                   e.currentTarget.style.border = '1px solid rgba(255, 68, 68, 0.4)';
                 }}
                 >
                                                            <div style={{ 
                       fontSize: isMobile ? '0.35rem' : '0.5rem',
                       color: '#ffffff',
                       fontWeight: 'bold',
                       textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                       marginBottom: isMobile ? '6px' : '8px',
                       textAlign: 'center'
                     }}>
                       Today's Date
                     </div>
                                       <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 1
                    }}>
                                             <div style={{ fontSize: isMobile ? '0.6rem' : '0.85rem' }}>
                         {(() => {
                           const today = new Date();
                           const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                           return dayNames[today.getDay()];
                         })()}
                       </div>
                       <div style={{ fontSize: isMobile ? '0.85rem' : '1.4rem' }}>
                         {(() => {
                           const today = new Date();
                           const month = String(today.getMonth() + 1).padStart(2, '0');
                           const day = String(today.getDate()).padStart(2, '0');
                           const year = String(today.getFullYear()).slice(-2);
                           return `${month}/${day}/${year}`;
                         })()}
                       </div>
                    </div>
                                                            <div style={{ 
                       fontSize: isMobile ? '0.2rem' : '0.45rem', 
                       color: '#ffffff', 
                       fontWeight: 'bold',
                       textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                       marginTop: 'auto',
                       textAlign: 'center',
                       whiteSpace: 'nowrap',
                       background: 'rgba(0, 0, 0, 0.7)',
                       padding: isMobile ? '1px 2px' : '2px 3px',
                       borderRadius: '4px',
                       border: '1px solid rgba(255, 255, 255, 0.3)'
                     }}>
                       {isMobile ? 'Schedule' : 'Click to Schedule Match by Date'}
                     </div>
                 </div>

                                   {/* Proposals Section - positioned on the right side */}
                  <div 
                    style={{
                      position: isMobile ? 'relative' : 'absolute',
                                             right: isMobile ? 'auto' : '8%',
                      top: isMobile ? 'auto' : '50%',
                      transform: isMobile ? 'none' : 'translate(50%, -50%)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.25), rgba(41, 128, 185, 0.2), rgba(30, 100, 150, 0.15))',
                      border: '2px solid rgba(52, 152, 219, 0.6)',
                      padding: isMobile ? '3px' : '5px',
                      borderRadius: isMobile ? '10px' : '16px',
                      zIndex: 1,
                      boxShadow: '0 6px 20px rgba(52, 152, 219, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(52, 152, 219, 0.2)',
                      minWidth: isMobile ? '60px' : '80px',
                      minHeight: isMobile ? '75px' : '90px',
                      backdropFilter: 'blur(8px)',
                      margin: isMobile ? '8px auto' : '0'
                    }}
                   title="Proposal management - view pending and sent proposals"
                   onMouseEnter={(e) => {
                     e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.3), rgba(41, 128, 185, 0.25))';
                     e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                     e.currentTarget.style.border = '2px solid rgba(52, 152, 219, 0.7)';
                     e.currentTarget.style.transform = 'translate(50%, -50%) scale(1.02)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(41, 128, 185, 0.15))';
                     e.currentTarget.style.boxShadow = '0 4px 16px rgba(52, 152, 219, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                     e.currentTarget.style.border = '2px solid rgba(52, 152, 219, 0.5)';
                     e.currentTarget.style.transform = 'translate(50%, -50%) scale(1)';
                   }}
                   >
                                                            <div style={{ 
                       fontSize: isMobile ? '0.45rem' : '0.65rem',
                       color: '#ffffff', 
                       fontWeight: 'bold',
                       textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                       marginBottom: isMobile ? '2px' : '4px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      📋 Proposals
                    </div>
                   
                   <div style={{
                     display: 'flex',
                     flexDirection: 'column',
                                            gap: isMobile ? '2px' : '4px',
                     justifyContent: 'center',
                     width: '100%'
                   }}>
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         if (onOpenProposalListModal) onOpenProposalListModal();
                       }}
                                                                       style={{
                           background: 'linear-gradient(135deg, #d35400 0%, #e67e22 50%, #f39c12 100%)',
                           color: '#ffffff',
                           border: 'none',
                           borderRadius: '6px',
                           padding: isMobile ? '1px 2px' : '3px 4px',
                           fontSize: isMobile ? '0.35rem' : '0.55rem',
                         fontWeight: '600',
                         cursor: 'pointer',
                         boxShadow: '0 2px 6px rgba(211, 84, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         width: '100%',
                         textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                       onMouseEnter={(e) => {
                         e.target.style.background = 'linear-gradient(135deg, #e67e22 0%, #f39c12 50%, #f1c40f 100%)';
                         e.target.style.transform = 'translateY(-2px) scale(1.02)';
                         e.target.style.boxShadow = '0 4px 12px rgba(211, 84, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(0, 0, 0, 0.3)';
                       }}
                       onMouseLeave={(e) => {
                         e.target.style.background = 'linear-gradient(135deg, #d35400 0%, #e67e22 50%, #f39c12 100%)';
                         e.target.style.transform = 'translateY(0) scale(1)';
                         e.target.style.boxShadow = '0 2px 6px rgba(211, 84, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                       }}
                     >
                       📥 {pendingCount} waiting for you
                     </button>
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         if (onOpenSentProposalListModal) onOpenSentProposalListModal();
                       }}
                                                                       style={{
                           background: 'linear-gradient(135deg, #1e8449 0%, #27ae60 50%, #2ecc71 100%)',
                           color: '#ffffff',
                           border: 'none',
                           borderRadius: '6px',
                           padding: isMobile ? '1px 2px' : '3px 4px',
                           fontSize: isMobile ? '0.35rem' : '0.55rem',
                         fontWeight: '600',
                         cursor: 'pointer',
                         boxShadow: '0 2px 6px rgba(30, 132, 73, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         width: '100%',
                         textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                       onMouseEnter={(e) => {
                         e.target.style.background = 'linear-gradient(135deg, #27ae60 0%, #2ecc71 50%, #58d68d 100%)';
                         e.target.style.transform = 'translateY(-2px) scale(1.02)';
                         e.target.style.boxShadow = '0 4px 12px rgba(30, 132, 73, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(0, 0, 0, 0.3)';
                       }}
                       onMouseLeave={(e) => {
                         e.target.style.background = 'linear-gradient(135deg, #1e8449 0%, #27ae60 50%, #2ecc71 100%)';
                         e.target.style.transform = 'translateY(0) scale(1)';
                         e.target.style.boxShadow = '0 2px 6px rgba(30, 132, 73, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                       }}
                     >
                       📤 {sentCount} waiting for opponents
                     </button>
                   </div>
                 </div>
           
                                   {/* Streamlined Phase 2 Progress Counter */}
                  <div style={{
                    color: '#ffffff',
                    fontSize: isMobile ? '0.7rem' : '0.9rem',
                    fontWeight: 'bold',
                    marginTop: isMobile ? '4px' : '2px',
                    marginBottom: isMobile ? '2px' : '4px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    lineHeight: isMobile ? '1.1' : '1.1',
                    textAlign: isMobile ? 'center' : 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: isMobile ? '8px' : '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span>⚔️ {totalMatches}/4 Matches</span>
                    <span>•</span>
                    <span style={{ color: challengesRemaining > 0 ? '#4ade80' : '#ef4444' }}>
                      {challengesRemaining} Challenges Left
                    </span>
                    <span>•</span>
                    <span style={{ color: isMinimumMet ? '#4ade80' : '#fbbf24' }}>
                      {isMinimumMet ? 'Min ✅' : `${minRequiredMatches - totalMatches} to min`}
                    </span>
                  </div>
      </div>

      {/* Show Stats Button */}
      <div style={{
        textAlign: 'center',
        marginBottom: isMobile ? '0px' : '4px'
      }}>
        <div style={{
          fontSize: isMobile ? '0.5rem' : '0.9rem',
          color: '#ffffff',
          fontWeight: 'bold',
          cursor: 'pointer',
          padding: isMobile ? '1px 3px' : '4px 8px',
          borderRadius: '6px',
          display: 'inline-block',
          transition: 'background-color 0.2s ease',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = `${primaryColor}20`}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          {isExpanded ? 'Hide Stats ▲' : 'Show Stats ▼'}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <>
                                            {/* Streamlined Stats Display - 2 Column Layout */}
            <div style={{
              marginBottom: isMobile ? '0.3rem' : '0.5rem'
            }}>
              {/* Main Stats Row - 2 Columns */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: isMobile ? '0.4rem' : '0.6rem',
                marginBottom: isMobile ? '0.3rem' : '0.5rem'
              }}>
                {/* Combined Challenge & Defense Status */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenPlayerSearch) onOpenPlayerSearch();
                  }}
                  style={{ 
                    padding: isMobile ? '0.4rem' : '0.6rem',
                    background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.15), rgba(59, 130, 246, 0.1))',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 68, 68, 0.3)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(255, 68, 68, 0.25), rgba(59, 130, 246, 0.2))';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(255, 68, 68, 0.15), rgba(59, 130, 246, 0.1))';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ 
                    fontSize: isMobile ? '0.5rem' : '0.85rem',
                    fontWeight: 'bold',
                    color: '#ff4444',
                    marginBottom: isMobile ? '3px' : '4px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}>
                    ⚔️ Phase 2 Progress
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: isMobile ? '4px' : '6px',
                    fontSize: isMobile ? '0.4rem' : '0.7rem',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                    marginBottom: isMobile ? '3px' : '4px'
                  }}>
                    <div>
                      <div style={{ color: '#ff4444', fontSize: isMobile ? '0.35rem' : '0.6rem' }}>Challenges</div>
                      <div>{totalMatches}/4</div>
                    </div>
                    <div>
                      <div style={{ color: '#3b82f6', fontSize: isMobile ? '0.35rem' : '0.6rem' }}>Defenses</div>
                      <div>{requiredDefenses}/2</div>
                    </div>
                  </div>
                  {/* Combined Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: isMobile ? '3px' : '4px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: isMobile ? '2px' : '3px',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    <div style={{
                      width: `${(totalMatches / maxAllowedMatches) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${getProgressColor(totalMatches, maxAllowedMatches)}, ${getProgressColor(totalMatches, maxAllowedMatches)}dd)`,
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                      boxShadow: '0 0 4px rgba(255,255,255,0.3)'
                    }} />
                  </div>
                  <div style={{
                    fontSize: isMobile ? '0.35rem' : '0.7rem',
                    color: isMinimumMet ? '#4ade80' : '#fbbf24',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}>
                    {isMinimumMet ? '✅ Min met' : `${minRequiredMatches - totalMatches} to min`}
                  </div>
                </div>

                {/* Consolidated Challenge Limits */}
                <div style={{ 
                  padding: isMobile ? '0.4rem' : '0.6rem',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(255, 193, 7, 0.1))',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: isMobile ? '0.5rem' : '0.85rem',
                    fontWeight: 'bold',
                    color: '#a855f7',
                    marginBottom: isMobile ? '3px' : '4px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}>
                    🎯 Challenge Limits
                  </div>
                  <div style={{
                    fontSize: isMobile ? '0.45rem' : '1rem',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                    marginBottom: isMobile ? '3px' : '4px'
                  }}>
                    {challengesRemaining} remaining
                  </div>
                  <div style={{
                    fontSize: isMobile ? '0.35rem' : '0.6rem',
                    color: '#fbbf24',
                    marginBottom: isMobile ? '2px' : '3px'
                  }}>
                    {limits.dynamicLimits?.timesChallenged || 0} times challenged
                  </div>
                  <div style={{
                    fontSize: isMobile ? '0.35rem' : '0.7rem',
                    color: challengesRemaining > 0 ? '#4ade80' : '#ef4444',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}>
                    {challengesIssued} issued
                  </div>
                </div>
              </div>
            </div>

                     

                     {/* Current Record & Standings Section */}
           <div style={{
             padding: isMobile ? '0.5rem' : '0.8rem',
             background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1))',
             border: '1px solid rgba(34, 197, 94, 0.4)',
             borderRadius: '8px',
             marginBottom: isMobile ? '0.4rem' : '0.6rem',
             color: '#ffffff',
             boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)'
           }}>
             <div style={{
               fontSize: isMobile ? '0.45rem' : '0.8rem',
               fontWeight: 'bold',
               color: '#22c55e',
               marginBottom: isMobile ? '0.3rem' : '0.5rem',
               textAlign: 'center',
               textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
             }}>
               📊 Current Record & Standings
             </div>
             <div style={{
               display: 'grid',
               gridTemplateColumns: 'repeat(3, 1fr)',
               gap: isMobile ? '0.4rem' : '0.6rem',
               fontSize: isMobile ? '0.4rem' : '0.7rem',
               color: '#ffffff',
               textAlign: 'center',
               lineHeight: isMobile ? '1.3' : '1.4'
             }}>
               <div style={{
                 background: 'rgba(255,255,255,0.1)',
                 padding: isMobile ? '0.2rem' : '0.3rem',
                 borderRadius: '4px',
                 border: '1px solid rgba(255,255,255,0.2)'
               }}>
                 <div style={{ fontWeight: 'bold', color: '#22c55e', marginBottom: '2px' }}>
                   Wins
                 </div>
                 <div style={{ fontSize: isMobile ? '0.35rem' : '0.6rem', fontWeight: 'bold' }}>
                   {phase1Stats?.wins || 0}
                 </div>
               </div>
               <div style={{
                 background: 'rgba(255,255,255,0.1)',
                 padding: isMobile ? '0.2rem' : '0.3rem',
                 borderRadius: '4px',
                 border: '1px solid rgba(255,255,255,0.2)'
               }}>
                 <div style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: '2px' }}>
                   Losses
                 </div>
                 <div style={{ fontSize: isMobile ? '0.35rem' : '0.6rem', fontWeight: 'bold' }}>
                   {phase1Stats?.losses || 0}
                 </div>
               </div>
               <div style={{
                 background: 'rgba(255,255,255,0.1)',
                 padding: isMobile ? '0.2rem' : '0.3rem',
                 borderRadius: '4px',
                 border: '1px solid rgba(255,255,255,0.2)'
               }}>
                 <div style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '2px' }}>
                   Win Rate
                 </div>
                 <div style={{ fontSize: isMobile ? '0.35rem' : '0.6rem', fontWeight: 'bold' }}>
                   {phase1Stats?.winRate || 0}%
                 </div>
               </div>
             </div>
             <div style={{
               marginTop: isMobile ? '0.3rem' : '0.5rem',
               padding: isMobile ? '0.2rem' : '0.3rem',
               background: 'rgba(168, 85, 247, 0.2)',
               borderRadius: '4px',
               border: '1px solid rgba(168, 85, 247, 0.4)',
               textAlign: 'center'
             }}>
               <div style={{ fontWeight: 'bold', color: '#a855f7', marginBottom: '2px', fontSize: isMobile ? '0.35rem' : '0.6rem' }}>
                 Current Standings Position
               </div>
               <div style={{ fontSize: isMobile ? '0.4rem' : '0.7rem', fontWeight: 'bold' }}>
                 {phase1Stats?.position || 'N/A'}
               </div>
             </div>
           </div>

           

                     {/* Quick Actions Section */}
           <div style={{
             display: 'grid',
             gridTemplateColumns: 'repeat(2, 1fr)',
             gap: isMobile ? '0.4rem' : '0.6rem',
             marginBottom: isMobile ? '0.3rem' : '0.5rem'
           }}>
             {/* Schedule Section */}
             <div style={{
               padding: isMobile ? '0.4rem' : '0.6rem',
               background: 'rgba(255,255,255,0.1)',
               borderRadius: '6px',
               border: '1px solid rgba(255,255,255,0.1)',
               textAlign: 'center',
               cursor: 'pointer',
               transition: 'background-color 0.2s ease'
             }}
             onClick={(e) => {
               e.stopPropagation();
               if (onOpenPlayerSearch) onOpenPlayerSearch();
             }}
             onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'}
             onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
             >
               <div style={{
                 fontSize: isMobile ? '0.4rem' : '0.7rem',
                 fontWeight: 'bold',
                 color: '#e0e0e0',
                 marginBottom: isMobile ? '1px' : '2px'
               }}>
                 📅 Schedule Match
               </div>
               <div style={{
                 fontSize: isMobile ? '0.35rem' : '0.8rem',
                 color: '#ffffff',
                 fontWeight: 'bold',
                 textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                 marginBottom: isMobile ? '1px' : '2px'
               }}>
                 {stats.eligibleOpponentsCount} available
               </div>
               <div style={{
                 fontSize: isMobile ? '0.35rem' : '0.65rem',
                 color: '#e0e0e0',
                 fontStyle: 'italic',
                 textAlign: 'center',
                 fontWeight: '500'
               }}>
                 click to schedule
               </div>
             </div>

             {/* Matches Section */}
             <div style={{
               padding: isMobile ? '0.4rem' : '0.6rem',
               background: 'rgba(255,255,255,0.1)',
               borderRadius: '6px',
               border: '1px solid rgba(255,255,255,0.1)',
               textAlign: 'center',
               cursor: 'pointer',
               transition: 'background-color 0.2s ease'
             }}
             onClick={(e) => {
               e.stopPropagation();
               if (onOpenAllMatchesModal) onOpenAllMatchesModal();
             }}
             onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'}
             onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
             >
               <div style={{
                 fontSize: isMobile ? '0.4rem' : '0.7rem',
                 fontWeight: 'bold',
                 color: '#e0e0e0',
                 marginBottom: isMobile ? '1px' : '2px'
               }}>
                 🏆 View Matches
               </div>
               <div style={{
                 fontSize: isMobile ? '0.35rem' : '0.8rem',
                 color: '#ffffff',
                 fontWeight: 'bold',
                 textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                 marginBottom: isMobile ? '1px' : '2px'
               }}>
                 {upcomingMatches.length} upcoming
               </div>
               <div style={{
                 fontSize: isMobile ? '0.35rem' : '0.65rem',
                 color: '#e0e0e0',
                 fontStyle: 'italic',
                 textAlign: 'center',
                 fontWeight: '500'
               }}>
                 click for details
               </div>
             </div>
           </div>

          {/* Upcoming Matches List - Only show if there are matches */}
          {upcomingMatches.length > 0 && (
                         <div style={{
               marginBottom: isMobile ? '0.3rem' : '0.5rem'
             }}>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.7rem',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: isMobile ? '0.2rem' : '0.4rem',
                textAlign: 'center',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                Upcoming Matches
              </div>
              <div style={{
                maxHeight: isMobile ? '50px' : '60px',
                overflowY: 'auto',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                padding: isMobile ? '0.2rem' : '0.4rem'
              }}>
                {upcomingMatches.slice(0, 2).map((match, index) => {
                  let opponent = '';
                  if (match.senderName && match.receiverName) {
                    opponent = match.senderName.trim().toLowerCase() === fullPlayerName.toLowerCase()
                      ? match.receiverName
                      : match.senderName;
                  }
                  
                  return (
                    <div
                      key={match._id || index}
                      style={{
                        fontSize: isMobile ? '0.3rem' : '0.6rem',
                        color: '#ffffff',
                        padding: isMobile ? '0.15rem 0.25rem' : '0.25rem 0.4rem',
                        marginBottom: isMobile ? '0.1rem' : '0.15rem',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        textAlign: 'center'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMatchClick) onMatchClick(match);
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    >
                      VS {opponent || 'Unknown'} - {match.date || 'No Date'}
                    </div>
                  );
                })}
                {upcomingMatches.length > 2 && (
                  <div style={{
                    fontSize: isMobile ? '0.3rem' : '0.6rem',
                    color: '#e0e0e0',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    padding: isMobile ? '0.15rem' : '0.25rem'
                  }}>
                    +{upcomingMatches.length - 2} more...
                  </div>
                )}
              </div>
            </div>
          )}

                                 {/* Consolidated Status Summary */}
            <div style={{ 
              padding: isMobile ? '0.4rem' : '0.6rem',
              background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(0,0,0,0.2))',
              borderRadius: '6px',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              fontSize: isMobile ? '0.35rem' : '0.65rem',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: isMobile ? '0.3rem' : '0.5rem'
            }}>
              <div style={{ fontWeight: 'bold', color: '#ffc107', marginBottom: '3px' }}>
                💡 Phase 2 Status
              </div>
              <div style={{ fontSize: isMobile ? '0.3rem' : '0.55rem', lineHeight: '1.3' }}>
                {isMinimumMet ? (
                  <span style={{ color: '#4ade80' }}>✅ Minimum met ({totalMatches}/4 matches)</span>
                ) : (
                  <span style={{ color: '#fbbf24' }}>📈 Need {minRequiredMatches - totalMatches} more to minimum</span>
                )}
                {challengesRemaining > 0 && (
                  <span style={{ color: '#3b82f6' }}> • Can challenge {challengesRemaining} more (max 4 spots higher)</span>
                )}
              </div>
            </div>


                 </>
       )}
       
               {/* Phase 2 Rules Modal */}
        <Phase2RulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          isMobile={isMobile}
        />

        {/* Phase 1 Results Modal */}
        <Phase1ResultsModal
          isOpen={showPhase1ResultsModal}
          onClose={() => setShowPhase1ResultsModal(false)}
          phase1Stats={phase1Stats}
          playerName={playerName}
          playerLastName={playerLastName}
          isMobile={isMobile}
        />
     </div>
   );
 } 