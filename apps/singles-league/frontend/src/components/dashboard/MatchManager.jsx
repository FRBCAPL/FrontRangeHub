import React, { useState, useEffect } from 'react';
import { 
  getMatchesByStatus, 
  completeMatch, 
  cancelMatch, 
  getMatchStatistics 
} from '@shared/services/services/matchService.js';
import styles from './dashboard.module.css';

const MatchManager = ({ division, isAdmin = false }) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [winner, setWinner] = useState('');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (division) {
      loadMatches();
      loadStats();
    }
  }, [division]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const [scheduled, completed] = await Promise.all([
        getMatchesByStatus(division, 'scheduled'),
        getMatchesByStatus(division, 'completed')
      ]);
      
      setScheduledMatches(scheduled);
      setCompletedMatches(completed);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const matchStats = await getMatchStatistics(division);
      setStats(matchStats);
    } catch (error) {
      console.error('Error loading match stats:', error);
    }
  };

  const handleCompleteMatch = async () => {
    if (!selectedMatch || !winner || !score) return;

    try {
      await completeMatch(selectedMatch._id, winner, score, notes);
      setShowCompleteModal(false);
      setSelectedMatch(null);
      setWinner('');
      setScore('');
      setNotes('');
      loadMatches();
      loadStats();
    } catch (error) {
      console.error('Error completing match:', error);
      alert('Failed to complete match: ' + error.message);
    }
  };

  const handleCancelMatch = async () => {
    if (!selectedMatch) return;

    try {
      await cancelMatch(selectedMatch._id, cancelReason);
      setShowCancelModal(false);
      setSelectedMatch(null);
      setCancelReason('');
      loadMatches();
      loadStats();
    } catch (error) {
      console.error('Error cancelling match:', error);
      alert('Failed to cancel match: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchStatus = (match) => {
    if (match.status === 'completed') return '✅ Completed';
    if (match.status === 'cancelled') return '❌ Cancelled';
    return '⏳ Scheduled';
  };

  if (loading) {
    return <div className={styles.loading}>Loading matches...</div>;
  }

  return (
    <div className={styles.matchManager}>
      {/* Statistics */}
      {stats && (
        <div className={styles.matchStats}>
          <h3>Match Statistics</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{stats.total}</span>
              <span className={styles.statLabel}>Total Matches</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{stats.scheduled}</span>
              <span className={styles.statLabel}>Scheduled</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{stats.completed}</span>
              <span className={styles.statLabel}>Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Matches */}
      <div className={styles.matchSection}>
        <h3>Scheduled Matches ({scheduledMatches.length})</h3>
        {scheduledMatches.length === 0 ? (
          <p className={styles.noMatches}>No scheduled matches</p>
        ) : (
          <div className={styles.matchList}>
            {scheduledMatches.map((match) => (
              <div key={match._id} className={styles.matchCard}>
                <div className={styles.matchHeader}>
                  <span className={styles.matchStatus}>{getMatchStatus(match)}</span>
                  <span className={styles.matchDate}>{formatDate(match.scheduledDate)}</span>
                </div>
                <div className={styles.matchPlayers}>
                  <span className={styles.player1}>{match.player1Id}</span>
                  <span className={styles.vs}>vs</span>
                  <span className={styles.player2}>{match.player2Id}</span>
                </div>
                <div className={styles.matchDetails}>
                  <span className={styles.location}>📍 {match.location}</span>
                  <span className={styles.type}>🎯 {match.type}</span>
                </div>
                {isAdmin && (
                  <div className={styles.matchActions}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => {
                        setSelectedMatch(match);
                        setShowCompleteModal(true);
                      }}
                    >
                      Complete
                    </button>
                    <button 
                      className={`${styles.actionButton} ${styles.cancelButton}`}
                      onClick={() => {
                        setSelectedMatch(match);
                        setShowCancelModal(true);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Matches */}
      <div className={styles.matchSection}>
        <h3>Completed Matches ({completedMatches.length})</h3>
        {completedMatches.length === 0 ? (
          <p className={styles.noMatches}>No completed matches</p>
        ) : (
          <div className={styles.matchList}>
            {completedMatches.map((match) => (
              <div key={match._id} className={`${styles.matchCard} ${styles.completedMatch}`}>
                <div className={styles.matchHeader}>
                  <span className={styles.matchStatus}>{getMatchStatus(match)}</span>
                  <span className={styles.matchDate}>{formatDate(match.completedDate)}</span>
                </div>
                <div className={styles.matchPlayers}>
                  <span className={`${styles.player1} ${match.winner === match.player1Id ? styles.winner : ''}`}>
                    {match.player1Id}
                  </span>
                  <span className={styles.vs}>vs</span>
                  <span className={`${styles.player2} ${match.winner === match.player2Id ? styles.winner : ''}`}>
                    {match.player2Id}
                  </span>
                </div>
                <div className={styles.matchResult}>
                  <span className={styles.winner}>🏆 Winner: {match.winner}</span>
                  <span className={styles.score}>Score: {match.score}</span>
                </div>
                {match.notes && (
                  <div className={styles.matchNotes}>
                    <span className={styles.notesLabel}>Notes:</span>
                    <span className={styles.notesText}>{match.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Match Modal */}
      {showCompleteModal && selectedMatch && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Complete Match</h3>
            <p>{selectedMatch.player1Id} vs {selectedMatch.player2Id}</p>
            
            <div className={styles.formGroup}>
              <label>Winner:</label>
              <select value={winner} onChange={(e) => setWinner(e.target.value)}>
                <option value="">Select winner</option>
                <option value={selectedMatch.player1Id}>{selectedMatch.player1Id}</option>
                <option value={selectedMatch.player2Id}>{selectedMatch.player2Id}</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Score:</label>
              <input 
                type="text" 
                value={score} 
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g., 7-5"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Notes (optional):</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
            
            <div className={styles.modalActions}>
              <button onClick={handleCompleteMatch} disabled={!winner || !score}>
                Complete Match
              </button>
              <button onClick={() => setShowCompleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Match Modal */}
      {showCancelModal && selectedMatch && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Cancel Match</h3>
            <p>{selectedMatch.player1Id} vs {selectedMatch.player2Id}</p>
            
            <div className={styles.formGroup}>
              <label>Reason for cancellation:</label>
              <textarea 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is this match being cancelled?"
              />
            </div>
            
            <div className={styles.modalActions}>
              <button onClick={handleCancelMatch}>Cancel Match</button>
              <button onClick={() => setShowCancelModal(false)}>Keep Match</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManager;
