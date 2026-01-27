import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import styles from './dashboard.module.css';
import { 
  EnhancedCard, 
  EnhancedButton, 
  EnhancedList, 
  EnhancedSection,
  ActionBar,
  ErrorDisplay,
  SuccessDisplay,
  ProgressIndicator,
  StatusIndicator
} from './UIEnhancements';
import LoadingSpinner, { SkeletonLoader } from '../LoadingSpinner';

// Match Status Badge Component
export function MatchStatusBadge({ status, size = "medium" }) {
  const statusConfig = {
    scheduled: { color: '#2196f3', icon: '📅', label: 'Scheduled' },
    in_progress: { color: '#ff9800', icon: '🎯', label: 'In Progress' },
    completed: { color: '#4caf50', icon: '✓', label: 'Completed' },
    cancelled: { color: '#f44336', icon: '✗', label: 'Cancelled' },
    pending: { color: '#9e9e9e', icon: '⏳', label: 'Pending' }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const sizeMap = {
    small: { fontSize: '0.7rem', padding: '2px 6px' },
    medium: { fontSize: '0.8rem', padding: '4px 8px' },
    large: { fontSize: '0.9rem', padding: '6px 12px' }
  };

  const dimensions = sizeMap[size] || sizeMap.medium;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: `${config.color}20`,
      color: config.color,
      border: `1px solid ${config.color}40`,
      borderRadius: '12px',
      fontSize: dimensions.fontSize,
      padding: dimensions.padding,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

// Enhanced Match Card Component
export function EnhancedMatchCard({ 
  match, 
  onComplete, 
  onCancel, 
  onViewDetails,
  currentPlayer,
  loading = false 
}) {
  const [showActions, setShowActions] = useState(false);
  const [completing, setCompleting] = useState(false);

  const isPlayerInMatch = match.player1Id === currentPlayer || match.player2Id === currentPlayer;
  const opponent = match.player1Id === currentPlayer ? match.player2Id : match.player1Id;
  const canComplete = isPlayerInMatch && match.status === 'scheduled';
  const canCancel = isPlayerInMatch && ['scheduled', 'pending'].includes(match.status);

  const handleComplete = async () => {
    if (!canComplete) return;
    setCompleting(true);
    try {
      await onComplete(match);
    } catch (error) {
      console.error('Error completing match:', error);
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!canCancel) return;
    if (window.confirm('Are you sure you want to cancel this match?')) {
      try {
        await onCancel(match);
      } catch (error) {
        console.error('Error cancelling match:', error);
      }
    }
  };

  const formatMatchDate = (date) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatMatchTime = (date) => {
    try {
      return format(new Date(date), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div 
      className={styles.dashboardListItem}
      style={{
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onViewDetails && onViewDetails(match)}
    >
      {loading && (
        <div className={styles.loadingOverlay}>
          <LoadingSpinner size="small" text="" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        {/* Match Status */}
        <MatchStatusBadge status={match.status} size="small" />
        
        {/* Match Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '4px'
          }}>
            <span style={{ 
              fontWeight: '600', 
              color: '#fff',
              fontSize: '0.9rem'
            }}>
              {currentPlayer} vs {opponent}
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '0.8rem',
            color: '#ccc'
          }}>
            <span>📅 {formatMatchDate(match.scheduledDate)}</span>
            {formatMatchTime(match.scheduledDate) && (
              <span>🕐 {formatMatchTime(match.scheduledDate)}</span>
            )}
            {match.location && <span>📍 {match.location}</span>}
          </div>
        </div>

        {/* Match Result (if completed) */}
        {match.status === 'completed' && match.winner && (
          <div style={{
            textAlign: 'center',
            padding: '4px 8px',
            background: '#4caf5020',
            border: '1px solid #4caf5040',
            borderRadius: '6px',
            fontSize: '0.8rem'
          }}>
            <div style={{ color: '#4caf50', fontWeight: '600' }}>
              Winner: {match.winner}
            </div>
            {match.score && (
              <div style={{ color: '#ccc', fontSize: '0.7rem' }}>
                Score: {match.score}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (canComplete || canCancel) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginLeft: '12px'
        }}>
          {canComplete && (
            <EnhancedButton
              size="small"
              variant="success"
              loading={completing}
              onClick={(e) => {
                e.stopPropagation();
                handleComplete();
              }}
            >
              Complete
            </EnhancedButton>
          )}
          
          {canCancel && (
            <EnhancedButton
              size="small"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
            >
              Cancel
            </EnhancedButton>
          )}
        </div>
      )}
    </div>
  );
}

// Enhanced Match History Component
export function EnhancedMatchHistory({ 
  matches = [], 
  currentPlayer,
  loading = false,
  error = null,
  onRetry 
}) {
  const [filter, setFilter] = useState('all'); // all, wins, losses, recent
  const [sortBy, setSortBy] = useState('date'); // date, opponent, result

  const filteredMatches = matches.filter(match => {
    if (filter === 'wins') {
      return match.status === 'completed' && match.winner === currentPlayer;
    }
    if (filter === 'losses') {
      return match.status === 'completed' && match.winner !== currentPlayer;
    }
    if (filter === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(match.scheduledDate) >= thirtyDaysAgo;
    }
    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.scheduledDate) - new Date(a.scheduledDate);
      case 'opponent':
        const opponentA = a.player1Id === currentPlayer ? a.player2Id : a.player1Id;
        const opponentB = b.player1Id === currentPlayer ? b.player2Id : b.player1Id;
        return opponentA.localeCompare(opponentB);
      case 'result':
        if (a.status !== 'completed' && b.status !== 'completed') return 0;
        if (a.status !== 'completed') return 1;
        if (b.status !== 'completed') return -1;
        return a.winner === currentPlayer ? -1 : 1;
      default:
        return 0;
    }
  });

  const stats = {
    total: matches.length,
    wins: matches.filter(m => m.status === 'completed' && m.winner === currentPlayer).length,
    losses: matches.filter(m => m.status === 'completed' && m.winner !== currentPlayer).length,
    winRate: matches.filter(m => m.status === 'completed').length > 0 
      ? Math.round((matches.filter(m => m.status === 'completed' && m.winner === currentPlayer).length / 
                   matches.filter(m => m.status === 'completed').length) * 100)
      : 0
  };

  return (
    <EnhancedSection
      title="Match History"
      subtitle={`${stats.total} total matches • ${stats.winRate}% win rate`}
      loading={loading}
      error={error}
      onRetry={onRetry}
      actions={[
        {
          label: "Export",
          variant: "secondary",
          onClick: () => {
            // TODO: Implement export functionality
            console.log('Export match history');
          }
        }
      ]}
    >
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.2)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
            {stats.wins}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Wins</div>
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid rgba(244, 67, 54, 0.2)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f44336' }}>
            {stats.losses}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Losses</div>
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid rgba(255, 152, 0, 0.2)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
            {stats.winRate}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Win Rate</div>
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.2)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Total</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '0.8rem'
          }}
        >
          <option value="all">All Matches</option>
          <option value="wins">Wins Only</option>
          <option value="losses">Losses Only</option>
          <option value="recent">Last 30 Days</option>
        </select>
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '0.8rem'
          }}
        >
          <option value="date">Sort by Date</option>
          <option value="opponent">Sort by Opponent</option>
          <option value="result">Sort by Result</option>
        </select>
      </div>

      {/* Match List */}
      <EnhancedList
        items={sortedMatches}
        loading={loading}
        emptyMessage="No matches found"
        renderItem={(match) => (
          <EnhancedMatchCard
            match={match}
            currentPlayer={currentPlayer}
            onViewDetails={(match) => {
              // TODO: Implement match details modal
              console.log('View match details:', match);
            }}
          />
        )}
      />
    </EnhancedSection>
  );
}

// Enhanced Match Completion Modal Component
export function EnhancedMatchCompletionModal({ 
  match, 
  isOpen, 
  onClose, 
  onComplete,
  loading = false 
}) {
  const [winner, setWinner] = useState('');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (match) {
      setWinner('');
      setScore('');
      setNotes('');
    }
  }, [match]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!winner) return;

    try {
      await onComplete(match._id, { winner, score, notes });
      onClose();
    } catch (error) {
      console.error('Error completing match:', error);
    }
  };

  if (!isOpen || !match) return null;

  const player1 = match.player1Id;
  const player2 = match.player2Id;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.dashboardModalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Complete Match</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px', flex: 1, overflow: 'auto' }}>
          <form onSubmit={handleSubmit}>
            {/* Match Info */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>Match Details</h4>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                <div><strong>{player1}</strong> vs <strong>{player2}</strong></div>
                <div>📅 {format(new Date(match.scheduledDate), 'MMM dd, yyyy')}</div>
                {match.location && <div>📍 {match.location}</div>}
              </div>
            </div>

            {/* Winner Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#fff',
                fontWeight: '500'
              }}>
                Winner *
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: `2px solid ${winner === player1 ? '#e53e3e' : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '8px',
                  background: winner === player1 ? 'rgba(229, 62, 62, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  flex: 1,
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="winner"
                    value={player1}
                    checked={winner === player1}
                    onChange={(e) => setWinner(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ color: '#fff', fontWeight: '500' }}>{player1}</span>
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: `2px solid ${winner === player2 ? '#e53e3e' : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '8px',
                  background: winner === player2 ? 'rgba(229, 62, 62, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  flex: 1,
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="winner"
                    value={player2}
                    checked={winner === player2}
                    onChange={(e) => setWinner(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ color: '#fff', fontWeight: '500' }}>{player2}</span>
                </label>
              </div>
            </div>

            {/* Score */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#fff',
                fontWeight: '500'
              }}>
                Score (Optional)
              </label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g., 7-5, 9-3"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#fff',
                fontWeight: '500'
              }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the match..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <EnhancedButton
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </EnhancedButton>
              
              <EnhancedButton
                variant="success"
                type="submit"
                loading={loading}
                disabled={!winner}
              >
                Complete Match
              </EnhancedButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main Enhanced Match Manager Component
export function EnhancedMatchManager({ 
  matches = [],
  currentPlayer,
  loading = false,
  error = null,
  onRetry,
  onCompleteMatch,
  onCancelMatch,
  onViewMatchDetails
}) {
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, completed, history
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const completedMatches = matches.filter(m => m.status === 'completed');

  const handleCompleteMatch = (match) => {
    setSelectedMatch(match);
    setShowCompletionModal(true);
  };

  const handleCompleteSubmit = async (matchId, data) => {
    try {
      await onCompleteMatch(matchId, data);
      setShowCompletionModal(false);
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error completing match:', error);
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '20px'
      }}>
        {[
          { id: 'upcoming', label: 'Upcoming', count: upcomingMatches.length },
          { id: 'completed', label: 'Completed', count: completedMatches.length },
          { id: 'history', label: 'History', count: matches.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? 'rgba(229, 62, 62, 0.2)' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#e53e3e' : '#ccc',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #e53e3e' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
            <span style={{
              marginLeft: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '0.7rem'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'upcoming' && (
        <EnhancedSection
          title="Upcoming Matches"
          subtitle={`${upcomingMatches.length} scheduled matches`}
          loading={loading}
          error={error}
          onRetry={onRetry}
        >
          <EnhancedList
            items={upcomingMatches}
            loading={loading}
            emptyMessage="No upcoming matches"
            renderItem={(match) => (
              <EnhancedMatchCard
                match={match}
                currentPlayer={currentPlayer}
                onComplete={handleCompleteMatch}
                onCancel={onCancelMatch}
                onViewDetails={onViewMatchDetails}
              />
            )}
          />
        </EnhancedSection>
      )}

      {activeTab === 'completed' && (
        <EnhancedSection
          title="Recently Completed"
          subtitle={`${completedMatches.length} completed matches`}
          loading={loading}
          error={error}
          onRetry={onRetry}
        >
          <EnhancedList
            items={completedMatches.slice(0, 10)} // Show last 10
            loading={loading}
            emptyMessage="No completed matches"
            renderItem={(match) => (
              <EnhancedMatchCard
                match={match}
                currentPlayer={currentPlayer}
                onViewDetails={onViewMatchDetails}
              />
            )}
          />
        </EnhancedSection>
      )}

      {activeTab === 'history' && (
        <EnhancedMatchHistory
          matches={matches}
          currentPlayer={currentPlayer}
          loading={loading}
          error={error}
          onRetry={onRetry}
        />
      )}

      {/* Completion Modal */}
      <EnhancedMatchCompletionModal
        match={selectedMatch}
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setSelectedMatch(null);
        }}
        onComplete={handleCompleteSubmit}
        loading={loading}
      />
    </div>
  );
}
