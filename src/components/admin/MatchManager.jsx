import React, { useState, useEffect } from 'react';
import { createSecureHeaders } from '../../utils/security';
import './MatchManager.css';

const MatchManager = ({ userPin }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    player1: '',
    player2: '',
    winner: '',
    score: '',
    scheduledDate: '',
    completedDate: '',
    status: 'completed'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/matches`, {
        headers: createSecureHeaders(userPin)
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      } else {
        const errorText = await response.text();
        setError(`Failed to load matches: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      setError('Error loading matches: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMatch = (match) => {
    setSelectedMatch(match);
    setEditForm({
      player1: match.player1?._id || '',
      player2: match.player2?._id || '',
      winner: match.winner?._id || '',
      score: match.score || '',
      scheduledDate: toLocalDateString(match.scheduledDate),
      completedDate: toLocalDateString(match.completedDate),
      status: match.status || 'completed'
    });
    setShowEditModal(true);
  };

  const handleDeleteMatch = (match) => {
    setSelectedMatch(match);
    setShowDeleteModal(true);
  };

  const saveMatch = async () => {
    if (!selectedMatch) return;

    setLoading(true);
    try {
      // Fix timezone issue by ensuring dates are sent as local dates
      const formData = {
        ...editForm,
        scheduledDate: editForm.scheduledDate ? `${editForm.scheduledDate}T12:00:00` : null,
        completedDate: editForm.completedDate ? `${editForm.completedDate}T12:00:00` : null
      };

      const response = await fetch(`${BACKEND_URL}/api/ladder/matches/${selectedMatch._id}`, {
        method: 'PUT',
        headers: {
          ...createSecureHeaders(userPin),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Match updated successfully');
        setShowEditModal(false);
        loadMatches();
        
        // Dispatch custom event to notify other components that matches have changed
        window.dispatchEvent(new CustomEvent('matchesUpdated', {
          detail: { action: 'update', matchId: selectedMatch._id }
        }));
      } else {
        setError('Failed to update match');
      }
    } catch (err) {
      setError('Error updating match: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = async () => {
    if (!selectedMatch) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/matches/${selectedMatch._id}`, {
        method: 'DELETE',
        headers: createSecureHeaders(userPin)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🗑️ MatchManager: Match deleted successfully from backend');
        console.log('🗑️ MatchManager: Backend response:', result);
        console.log('🗑️ MatchManager: Deleted match details:', {
          id: selectedMatch._id,
          player1: selectedMatch.player1?.firstName + ' ' + selectedMatch.player1?.lastName,
          player2: selectedMatch.player2?.firstName + ' ' + selectedMatch.player2?.lastName,
          scheduledDate: selectedMatch.scheduledDate,
          completedDate: selectedMatch.completedDate
        });
        
        setSuccess('Match deleted successfully');
        setShowDeleteModal(false);
        loadMatches();
        
        // Dispatch custom event to notify other components that matches have changed
        console.log('🗑️ MatchManager: Dispatching matchesUpdated event for deleted match:', selectedMatch._id);
        const event = new CustomEvent('matchesUpdated', {
          detail: { action: 'delete', matchId: selectedMatch._id }
        });
        console.log('🗑️ MatchManager: Event created:', event);
        window.dispatchEvent(event);
        console.log('🗑️ MatchManager: Event dispatched successfully');
      } else {
        const errorText = await response.text();
        console.log('🗑️ MatchManager: Delete failed with status:', response.status);
        console.log('🗑️ MatchManager: Error response:', errorText);
        setError(`Failed to delete match: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      setError('Error deleting match: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to convert date to local date string without timezone issues
  const toLocalDateString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter matches based on search term
  const filteredMatches = matches.filter(match => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const player1Name = `${match.player1?.firstName || ''} ${match.player1?.lastName || ''}`.toLowerCase();
    const player2Name = `${match.player2?.firstName || ''} ${match.player2?.lastName || ''}`.toLowerCase();
    const matchId = match._id.toLowerCase();
    const status = match.status.toLowerCase();
    
    return player1Name.includes(searchLower) || 
           player2Name.includes(searchLower) || 
           matchId.includes(searchLower) ||
           status.includes(searchLower);
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'scheduled': return '#2196F3';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  };

  if (loading && matches.length === 0) {
    return <div className="loading">Loading matches...</div>;
  }

  return (
    <div className="match-manager">
      <div className="admin-header">
        <h2>Match Manager</h2>
        <button onClick={loadMatches} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Search/Filter */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search matches by player name, match ID, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
          Showing {filteredMatches.length} of {matches.length} matches
        </div>
      </div>

      <div className="matches-list">
        <div className="matches-header">
          <h3>All Matches ({filteredMatches.length} of {matches.length})</h3>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="no-matches">No matches found</div>
        ) : (
          <div className="matches-grid">
            {filteredMatches.map((match) => (
              <div key={match._id} className="match-card">
                <div className="match-header">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(match.status) }}
                  >
                    {match.status}
                  </span>
                  <div className="match-actions">
                    <button 
                      onClick={() => handleEditMatch(match)}
                      className="edit-btn"
                      title="Edit Match"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => alert('DELETE FUNCTION DISABLED - BUG FIXING IN PROGRESS')}
                      className="delete-btn"
                      title="Delete Match (DISABLED - Bug Fixing)"
                      disabled={true}
                      style={{opacity: 0.5, cursor: 'not-allowed'}}
                    >
                      🗑️ (DISABLED)
                    </button>
                  </div>
                </div>

                <div className="match-players">
                  <div className="player">
                    <strong>{match.player1?.firstName} {match.player1?.lastName}</strong>
                    {match.winner?._id === match.player1?._id && <span className="winner">👑</span>}
                  </div>
                  <div className="vs">vs</div>
                  <div className="player">
                    <strong>{match.player2?.firstName} {match.player2?.lastName}</strong>
                    {match.winner?._id === match.player2?._id && <span className="winner">👑</span>}
                  </div>
                </div>

                <div className="match-details">
                  <div className="detail">
                    <strong>Match ID:</strong> {match._id}
                  </div>
                  <div className="detail">
                    <strong>Score:</strong> {match.score || 'N/A'}
                  </div>
                  <div className="detail">
                    <strong>Date:</strong> {formatDate(match.scheduledDate || match.completedDate)}
                  </div>
                  <div className="detail">
                    <strong>Status:</strong> {match.status}
                  </div>
                  <div className="detail">
                    <strong>Ladder:</strong> {match.ladder || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedMatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Match</h3>
              <button onClick={() => setShowEditModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Player 1:</label>
                <input
                  type="text"
                  value={editForm.player1}
                  onChange={(e) => setEditForm({...editForm, player1: e.target.value})}
                  placeholder="Player 1 ID"
                />
              </div>
              
              <div className="form-group">
                <label>Player 2:</label>
                <input
                  type="text"
                  value={editForm.player2}
                  onChange={(e) => setEditForm({...editForm, player2: e.target.value})}
                  placeholder="Player 2 ID"
                />
              </div>
              
              <div className="form-group">
                <label>Winner:</label>
                <input
                  type="text"
                  value={editForm.winner}
                  onChange={(e) => setEditForm({...editForm, winner: e.target.value})}
                  placeholder="Winner ID"
                />
              </div>
              
              <div className="form-group">
                <label>Score:</label>
                <input
                  type="text"
                  value={editForm.score}
                  onChange={(e) => setEditForm({...editForm, score: e.target.value})}
                  placeholder="e.g., 8-5"
                />
              </div>
              
              <div className="form-group">
                <label>Scheduled Date:</label>
                <input
                  type="date"
                  value={editForm.scheduledDate}
                  onChange={(e) => setEditForm({...editForm, scheduledDate: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Completed Date:</label>
                <input
                  type="date"
                  value={editForm.completedDate}
                  onChange={(e) => setEditForm({...editForm, completedDate: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Status:</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                >
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={saveMatch} className="save-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Match</h3>
              <button onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <p>Are you sure you want to delete this match?</p>
              <div className="match-preview">
                <strong>{selectedMatch.player1?.firstName} {selectedMatch.player1?.lastName}</strong> vs{' '}
                <strong>{selectedMatch.player2?.firstName} {selectedMatch.player2?.lastName}</strong>
                <br />
                <small>Date: {formatDate(selectedMatch.completedDate)}</small>
                <br />
                <small>Status: {selectedMatch.status}</small>
              </div>
              <p className="warning">
                ⚠️ This will permanently delete the match and cannot be undone.
              </p>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={deleteMatch} className="delete-btn" disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManager;
