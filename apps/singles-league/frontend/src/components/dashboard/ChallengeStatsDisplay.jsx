import React, { useState, useEffect } from 'react';
import { challengeService } from '@shared/services/services/challengeService';
import styles from './dashboard.module.css';

export default function ChallengeStatsDisplay({ playerName, division, phase }) {
  const [stats, setStats] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerName || !division || phase !== 'challenge') {
      setLoading(false);
      return;
    }

    async function loadChallengeData() {
      try {
        setLoading(true);
        setError(null);

        // Load both stats and limits
        const [statsData, limitsData] = await Promise.all([
          challengeService.getChallengeStats(playerName, division),
          challengeService.getChallengeLimits(playerName, division)
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
  }, [playerName, division, phase]);

  if (phase !== 'challenge') {
    return null;
  }

  if (loading) {
    return (
      <div className={styles.challengeStatsContainer}>
        <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
          Loading challenge statistics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.challengeStatsContainer}>
        <div style={{ 
          textAlign: 'center', 
          padding: '1rem', 
          color: '#e53e3e',
          background: 'rgba(229, 62, 62, 0.1)',
          border: '1px solid #e53e3e',
          borderRadius: '6px'
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!stats || !limits) {
    return null;
  }

  const getStatusColor = (isEligible) => isEligible ? '#28a745' : '#e53e3e';
  const getProgressColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return '#e53e3e';
    if (percentage >= 75) return '#ffc107';
    return '#28a745';
  };

  return (
    <div className={styles.challengeStatsContainer} style={{ padding: '0.75rem', marginBottom: '1rem' }}>
      <div className={styles.challengeStatsHeader} style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ color: '#e53e3e', margin: '0 0 0.25rem 0', fontSize: '1.3rem' }}>
          🏆 Challenge Stats
        </h3>
        <div style={{ fontSize: '0.8rem', color: '#888' }}>
          Week {stats.currentWeek} • Position #{stats.currentStanding || 'N/A'}
        </div>
      </div>

      <div className={styles.challengeStatsGrid} style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
        {/* Challenge Matches */}
        <div className={styles.challengeStatCard} style={{ padding: '0.5rem' }}>
          <div className={styles.challengeStatHeader} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span>Challenges</span>
            <span style={{ 
              color: getStatusColor(stats.isEligibleForChallenges),
              fontWeight: 'bold'
            }}>
              {stats.totalChallengeMatches}/{limits.limits.maxChallengeMatches}
            </span>
          </div>
          <div className={styles.challengeProgressBar} style={{ marginBottom: '0.5rem', height: '6px' }}>
            <div 
              className={styles.challengeProgressFill}
              style={{
                width: `${(stats.totalChallengeMatches / limits.limits.maxChallengeMatches) * 100}%`,
                backgroundColor: getProgressColor(stats.totalChallengeMatches, limits.limits.maxChallengeMatches)
              }}
            />
          </div>
          <div className={styles.challengeStatDetails} style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
            <div>Challenger: {stats.matchesAsChallenger} | Defender: {stats.matchesAsDefender}</div>
            <div style={{ 
              color: stats.remainingChallenges > 0 ? '#28a745' : '#e53e3e',
              fontWeight: 'bold'
            }}>
              Remaining: {stats.remainingChallenges}
            </div>
          </div>
        </div>

        {/* Defense Status */}
        <div className={styles.challengeStatCard} style={{ padding: '0.5rem' }}>
          <div className={styles.challengeStatHeader} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span>Defense</span>
            <span style={{ 
              color: getStatusColor(stats.isEligibleForDefense),
              fontWeight: 'bold'
            }}>
              {stats.requiredDefenses}/{limits.limits.maxRequiredDefenses}
            </span>
          </div>
          <div className={styles.challengeProgressBar} style={{ marginBottom: '0.5rem', height: '6px' }}>
            <div 
              className={styles.challengeProgressFill}
              style={{
                width: `${(stats.requiredDefenses / limits.limits.maxRequiredDefenses) * 100}%`,
                backgroundColor: getProgressColor(stats.requiredDefenses, limits.limits.maxRequiredDefenses)
              }}
            />
          </div>
          <div className={styles.challengeStatDetails} style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
            <div>Required: {stats.requiredDefenses} | Voluntary: {stats.voluntaryDefenses}</div>
            <div style={{ 
              color: stats.remainingDefenses > 0 ? '#28a745' : '#e53e3e',
              fontWeight: 'bold'
            }}>
              Can Defend: {stats.remainingDefenses > 0 ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Weekly Status */}
        <div className={styles.challengeStatCard} style={{ padding: '0.5rem' }}>
          <div className={styles.challengeStatHeader} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span>This Week</span>
            <span style={{ 
              color: limits.weeklyStatus.canChallengeThisWeek || limits.weeklyStatus.canDefendThisWeek ? '#28a745' : '#e53e3e',
              fontWeight: 'bold'
            }}>
              {limits.weeklyStatus.canChallengeThisWeek || limits.weeklyStatus.canDefendThisWeek ? 'Available' : 'Busy'}
            </span>
          </div>
          <div className={styles.challengeStatDetails} style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
            <div>Challenges: {limits.weeklyStatus.challengesThisWeek} | Defenses: {limits.weeklyStatus.defensesThisWeek}</div>
            <div style={{ 
              color: limits.weeklyStatus.canChallengeThisWeek ? '#28a745' : '#e53e3e'
            }}>
              Can Challenge: {limits.weeklyStatus.canChallengeThisWeek ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Eligible Opponents */}
        <div className={styles.challengeStatCard} style={{ padding: '0.5rem' }}>
          <div className={styles.challengeStatHeader} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span>Opponents</span>
            <span style={{ 
              color: stats.eligibleOpponentsCount > 0 ? '#28a745' : '#e53e3e',
              fontWeight: 'bold'
            }}>
              {stats.eligibleOpponentsCount}
            </span>
          </div>
          <div className={styles.challengeStatDetails} style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
            <div>Eligible: {stats.eligibleOpponentsCount} Available</div>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>
              {stats.challengedOpponents.length > 0 ? (
                `Challenged: ${stats.challengedOpponents.slice(0, 2).join(', ')}${stats.challengedOpponents.length > 2 ? '...' : ''}`
              ) : (
                'No previous challenges'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Status Summary */}
      <div className={styles.challengeStatusSummary} style={{ marginTop: '0.5rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0.5rem',
          background: 'rgba(229, 62, 62, 0.1)',
          border: '1px solid #e53e3e',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          <div>
            <strong style={{ color: '#e53e3e' }}>Status:</strong>
            <span style={{ marginLeft: '0.25rem', color: '#fff' }}>
              {stats.hasReachedChallengeLimit ? 'Challenge Limit Reached' : 
               stats.hasReachedDefenseLimit ? 'Defense Limit Reached' : 
               'Active'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#888' }}>
            {new Date(stats.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
} 