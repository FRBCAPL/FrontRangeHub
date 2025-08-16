import React, { useState, useEffect } from 'react';
import { challengeService } from '../../services/challengeService';
import { format } from 'date-fns';
import styles from './dashboard.module.css';

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
  onOpenAllMatchesModal,
  onOpenProposalListModal,
  onOpenSentProposalListModal,
  onOpenPlayerSearch,
  pendingCount = 0,
  sentCount = 0,
  upcomingMatches = [],
  onMatchClick,
  // Add season data for deadline tracking
  seasonData
}) {
  const [stats, setStats] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const fullPlayerName = `${playerName} ${playerLastName}`;

  // Calculate Phase 2 deadline status
  const getPhase2DeadlineStatus = () => {
    if (!seasonData || !seasonData.phase2End) {
      return { days: null, status: 'no_deadline' };
    }
    
    const now = new Date();
    const phase2End = new Date(seasonData.phase2End);
    const diffTime = phase2End - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
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

  // Calculate dynamic status and colors like Phase1Tracker
  const getChallengeStatus = () => {
    const totalMatches = stats.totalChallengeMatches;
    const maxMatches = limits.limits.maxChallengeMatches;
    const remainingChallenges = stats.remainingChallenges;
    const remainingDefenses = stats.remainingDefenses;
    
    // Determine status based on multiple factors
    if (stats.hasReachedChallengeLimit && stats.hasReachedDefenseLimit) {
      return 'completed'; // All matches done
    } else if (stats.hasReachedChallengeLimit || stats.hasReachedDefenseLimit) {
      return 'limit_reached'; // Hit one limit
    } else if (totalMatches >= 3) {
      return 'active'; // Good progress
    } else if (totalMatches >= 1) {
      return 'progressing'; // Started
    } else {
      return 'ready'; // Haven't started
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
    const status = getChallengeStatus();
    switch (status) {
      case 'completed': return '#00aa00';      // Green - all done
      case 'limit_reached': return '#ff4444';  // Red - hit limit
      case 'active': return '#ff4444';         // Red - good progress
      case 'progressing': return '#ff4444';    // Red - started
      case 'ready': return '#ff4444';          // Red - ready to start
      default: return '#ff4444';
    }
  };

  // Status message with emojis
  const getStatusMessage = () => {
    const status = getChallengeStatus();
    const remainingChallenges = stats.remainingChallenges;
    const remainingDefenses = stats.remainingDefenses;
    
    // Add deadline status to the message
    if (deadlineStatus.status === 'passed') {
      return '⚠️ DEADLINE PASSED!';
    } else if (deadlineStatus.status === 'critical') {
      return `🚨 CRITICAL: ENDS in ${deadlineStatus.days} hours!`;
    } else if (deadlineStatus.status === 'urgent') {
      return `⚠️ URGENT: ENDS in ${deadlineStatus.days} days!`;
    } else if (deadlineStatus.status === 'warning') {
      return `⚠️ WARNING: ENDS in ${deadlineStatus.days} days.`;
    } else if (deadlineStatus.status === 'normal') {
      return `ENDS in ${deadlineStatus.days} days.`;
    }
    
    // Fallback to original status messages if no deadline
    switch (status) {
      case 'completed':
        return '🎉 Phase 2 Complete!';
      case 'limit_reached':
        return '⚠️ Challenge limit reached.';
      case 'active':
        return `🏆 Active in Phase 2! ${remainingChallenges} challenges, ${remainingDefenses} defenses remaining.`;
      case 'progressing':
        return `📈 Phase 2 in progress! ${remainingChallenges} challenges, ${remainingDefenses} defenses remaining.`;
      case 'ready':
        return `⚔️ Ready for Phase 2! ${stats.eligibleOpponentsCount} opponents available.`;
      default:
        return 'Phase 2 Challenge Status';
    }
  };

  const primaryColor = getPrimaryColor();
  
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(42, 42, 42, 0.7), rgba(26, 26, 26, 0.8))`,
      border: `2px solid ${primaryColor}`,
      borderRadius: isMobile ? '8px' : '12px',
      padding: isMobile ? '1px' : '18px',
      margin: isMobile ? '-15px 0 0 0' : '16px 0',
      boxShadow: '0 6px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: isExpanded ? 'flex-start' : 'flex-start',
      backdropFilter: 'blur(2px)',
      overflow: isMobile ? 'auto' : 'hidden',
      maxHeight: isMobile ? 'none' : '35vh',
      height: isMobile ? (isExpanded ? 'auto' : '40px') : (isExpanded ? 'auto' : '160px'),
      transition: 'height 0.3s ease, max-height 0.3s ease'
    }}
    onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        marginBottom: isMobile ? '0px' : '12px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#ffffff',
          fontSize: isMobile ? '0.5rem' : '1.1rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? '2px' : '6px',
          flexWrap: 'wrap',
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)'
        }}>
          {getChallengeStatus() === 'completed' && '🎉'}
          {getChallengeStatus() === 'limit_reached' && '⚠️'}
          {getChallengeStatus() === 'active' && '🏆'}
          {getChallengeStatus() === 'progressing' && '📈'}
          {getChallengeStatus() === 'ready' && '⚔️'}
          <span style={{ fontSize: isMobile ? '0.8rem' : '1.1rem' }}>
            Phase 2
          </span>
        </h3>
        
        {/* Status Message */}
        {!isMobile && (
          <div style={{
            color: '#ffffff',
            fontSize: isMobile ? '0.6rem' : '0.95rem',
            lineHeight: isMobile ? '1.1' : '1.1',
            marginTop: isMobile ? '2px' : '4px',
            marginBottom: isMobile ? '0px' : '8px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            fontWeight: '500'
          }}>
            {getStatusMessage()}
          </div>
        )}
        
        {/* Challenge Progress */}
        {!isMobile && (
          <div style={{
            color: '#ffffff',
            fontSize: isMobile ? '0.55rem' : '0.95rem',
            fontWeight: 'bold',
            marginTop: isMobile ? '2px' : '4px',
            marginBottom: isMobile ? '0px' : '8px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            lineHeight: isMobile ? '1.1' : '1.1'
          }}>
            {stats.totalChallengeMatches}/{limits.limits.maxChallengeMatches} Challenges
          </div>
        )}
        
        {/* Defense Progress */}
        {!isMobile && (
          <div style={{
            color: '#ffffff',
            fontSize: isMobile ? '0.55rem' : '0.95rem',
            fontWeight: 'bold',
            marginTop: isMobile ? '2px' : '4px',
            marginBottom: isMobile ? '0px' : '4px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            lineHeight: isMobile ? '1.1' : '1.1'
          }}>
            {stats.requiredDefenses}/2 Defenses
          </div>
        )}
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
          {/* Main Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: isMobile ? '0.5rem' : '0.75rem',
            marginBottom: isMobile ? '0.75rem' : '1rem'
          }}>
                         {/* Challenge Matches */}
             <div 
               onClick={(e) => {
                 e.stopPropagation();
                 // For Phase 2, we need to open Phase 2 opponents modal
                 if (onOpenPlayerSearch) onOpenPlayerSearch();
               }}
               style={{ 
                 padding: isMobile ? '0.5rem' : '0.75rem',
                 background: 'rgba(255,255,255,0.1)',
                 borderRadius: '6px',
                 border: '1px solid rgba(255,255,255,0.1)',
                 textAlign: 'center',
                 cursor: 'pointer',
                 transition: 'background-color 0.2s ease'
               }}
               onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'}
               onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
             >
              <div style={{ 
                fontSize: isMobile ? '0.45rem' : '0.8rem',
                fontWeight: 'bold',
                color: '#e0e0e0',
                marginBottom: isMobile ? '2px' : '2px'
              }}>
                ⚔️ Challenges
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.9rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                marginBottom: isMobile ? '1px' : '4px'
              }}>
                {stats.totalChallengeMatches}/{limits.limits.maxChallengeMatches}
              </div>
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: isMobile ? '2px' : '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: isMobile ? '1px' : '2px'
              }}>
                <div style={{
                  width: `${(stats.totalChallengeMatches / limits.limits.maxChallengeMatches) * 100}%`,
                  height: '100%',
                  background: getProgressColor(stats.totalChallengeMatches, limits.limits.maxChallengeMatches),
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.75rem',
                color: '#e0e0e0',
                fontStyle: 'italic',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {stats.remainingChallenges} remaining
              </div>
            </div>

            {/* Defense Status */}
            <div style={{ 
              padding: isMobile ? '0.5rem' : '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: isMobile ? '0.45rem' : '0.8rem',
                fontWeight: 'bold',
                color: '#e0e0e0',
                marginBottom: isMobile ? '2px' : '2px'
              }}>
                🛡️ Defenses
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.9rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                marginBottom: isMobile ? '1px' : '4px'
              }}>
                {stats.requiredDefenses}/2
              </div>
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: isMobile ? '2px' : '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: isMobile ? '1px' : '2px'
              }}>
                <div style={{
                  width: `${(stats.requiredDefenses / 2) * 100}%`,
                  height: '100%',
                  background: getProgressColor(stats.requiredDefenses, 2),
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.75rem',
                color: '#e0e0e0',
                fontStyle: 'italic',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {2 - stats.requiredDefenses} required left
              </div>
            </div>

            {/* Weekly Status */}
            <div style={{ 
              padding: isMobile ? '0.5rem' : '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: isMobile ? '0.45rem' : '0.8rem',
                fontWeight: 'bold',
                color: '#e0e0e0',
                marginBottom: isMobile ? '2px' : '2px'
              }}>
                📅 This Week
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.9rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                marginBottom: isMobile ? '1px' : '4px'
              }}>
                {limits.weeklyStatus.canChallengeThisWeek ? '✅' : '❌'} Available
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.75rem',
                color: '#e0e0e0',
                fontStyle: 'italic',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {limits.weeklyStatus.challengesThisWeek} challenges
              </div>
            </div>
          </div>

          {/* Interactive Sections - Like Phase 1 Tracker */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '0.5rem' : '0.75rem',
            marginBottom: isMobile ? '0.75rem' : '1rem'
          }}>
            {/* Proposals Section */}
            <div style={{
              padding: isMobile ? '0.5rem' : '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenProposalListModal) onOpenProposalListModal();
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              <div style={{
                fontSize: isMobile ? '0.45rem' : '0.8rem',
                fontWeight: 'bold',
                color: '#e0e0e0',
                marginBottom: isMobile ? '2px' : '4px'
              }}>
                📨 Proposals
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.9rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                marginBottom: isMobile ? '1px' : '4px'
              }}>
                {pendingCount} waiting
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.75rem',
                color: '#e0e0e0',
                fontStyle: 'italic',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {sentCount} sent
              </div>
            </div>

                         {/* Schedule Section */}
             <div style={{
               padding: isMobile ? '0.5rem' : '0.75rem',
               background: 'rgba(255,255,255,0.1)',
               borderRadius: '6px',
               border: '1px solid rgba(255,255,255,0.1)',
               textAlign: 'center',
               cursor: 'pointer',
               transition: 'background-color 0.2s ease'
             }}
             onClick={(e) => {
               e.stopPropagation();
               // For Phase 2, we need to open player search instead of opponents modal
               if (onOpenPlayerSearch) onOpenPlayerSearch();
             }}
             onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'}
             onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
             >
              <div style={{
                fontSize: isMobile ? '0.45rem' : '0.8rem',
                fontWeight: 'bold',
                color: '#e0e0e0',
                marginBottom: isMobile ? '2px' : '4px'
              }}>
                📅 Schedule
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.9rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                marginBottom: isMobile ? '1px' : '4px'
              }}>
                {stats.eligibleOpponentsCount} available
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.75rem',
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
              padding: isMobile ? '0.5rem' : '0.75rem',
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
                fontSize: isMobile ? '0.45rem' : '0.8rem',
                fontWeight: 'bold',
                color: '#e0e0e0',
                marginBottom: isMobile ? '2px' : '4px'
              }}>
                🏆 Matches
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.9rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                marginBottom: isMobile ? '1px' : '4px'
              }}>
                {upcomingMatches.length} upcoming
              </div>
              <div style={{
                fontSize: isMobile ? '0.4rem' : '0.75rem',
                color: '#e0e0e0',
                fontStyle: 'italic',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                click match for details
              </div>
            </div>
          </div>

          {/* Upcoming Matches List */}
          {upcomingMatches.length > 0 && (
            <div style={{
              marginBottom: isMobile ? '0.75rem' : '1rem'
            }}>
              <div style={{
                fontSize: isMobile ? '0.5rem' : '0.9rem',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                textAlign: 'center',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                Upcoming Matches
              </div>
              <div style={{
                maxHeight: isMobile ? '60px' : '80px',
                overflowY: 'auto',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                padding: isMobile ? '0.25rem' : '0.5rem'
              }}>
                {upcomingMatches.slice(0, 3).map((match, index) => {
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
                        fontSize: isMobile ? '0.35rem' : '0.7rem',
                        color: '#ffffff',
                        padding: isMobile ? '0.2rem 0.3rem' : '0.3rem 0.5rem',
                        marginBottom: isMobile ? '0.1rem' : '0.2rem',
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
                {upcomingMatches.length > 3 && (
                  <div style={{
                    fontSize: isMobile ? '0.35rem' : '0.7rem',
                    color: '#e0e0e0',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    padding: isMobile ? '0.2rem' : '0.3rem'
                  }}>
                    +{upcomingMatches.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}

                     {/* Status Summary */}
           <div style={{ 
             padding: isMobile ? '0.5rem' : '0.75rem',
             background: 'rgba(0,0,0,0.3)',
             borderRadius: '4px',
             border: '1px solid rgba(255,255,255,0.1)',
             fontSize: isMobile ? '0.4rem' : '0.75rem',
             color: '#ffffff',
             textAlign: 'center'
           }}>
             {stats.eligibleOpponentsCount > 0 && stats.remainingChallenges > 0 && limits.weeklyStatus.canChallengeThisWeek ? (
               <div>✅ Can challenge {stats.eligibleOpponentsCount} opponent{stats.eligibleOpponentsCount !== 1 ? 's' : ''} this week</div>
             ) : stats.remainingDefenses > 0 && limits.weeklyStatus.canDefendThisWeek ? (
               <div>✅ Can accept defense challenges this week</div>
             ) : (
               <div>⏳ Waiting for next week or opponent selection</div>
             )}
           </div>

           {/* Phase 2 Deadline Date */}
           {seasonData && seasonData.phase2End && (
             <div style={{
               marginTop: isMobile ? '0.5rem' : '0.75rem',
               padding: isMobile ? '0.4rem' : '0.6rem',
               background: 'rgba(0,0,0,0.4)',
               borderRadius: '4px',
               border: '1px solid rgba(255,255,255,0.1)',
               fontSize: isMobile ? '0.35rem' : '0.65rem',
               color: '#e0e0e0',
               textAlign: 'center',
               fontStyle: 'italic'
             }}>
               ENDS: {seasonData.phase2End ? format(new Date(seasonData.phase2End), isMobile ? 'MMM d' : 'MMM d, yyyy') : 'Loading...'}
             </div>
           )}
        </>
      )}
    </div>
  );
} 