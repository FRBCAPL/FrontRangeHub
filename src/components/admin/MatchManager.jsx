import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    status: 'completed',
    paymentVerified: false,
    gameType: '8-ball',
    raceLength: 5
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
        
        // Sort matches by date (most recent first)
        const sortedMatches = (data || []).sort((a, b) => {
          const dateA = new Date(a.completedDate || a.scheduledDate || a.createdAt);
          const dateB = new Date(b.completedDate || b.scheduledDate || b.createdAt);
          return dateB - dateA; // Most recent first
        });
        
        setMatches(sortedMatches);
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
      player1: match.player1 ? `${match.player1.firstName} ${match.player1.lastName}` : '',
      player2: match.player2 ? `${match.player2.firstName} ${match.player2.lastName}` : '',
      winner: match.winner ? `${match.winner.firstName} ${match.winner.lastName}` : '',
      score: match.score || '',
      scheduledDate: toLocalDateString(match.scheduledDate),
      completedDate: toLocalDateString(match.completedDate),
      status: match.status || 'completed',
      paymentVerified: match.paymentVerified || false,
      gameType: match.gameType || '8-ball',
      raceLength: match.raceLength || 5
    });
    setShowEditModal(true);
  };

  const handleDeleteMatch = (match) => {
    setSelectedMatch(match);
    setShowDeleteModal(true);
  };

  const handleQuickSetWinner = async (match) => {
    if (!match.score || match.score === 'N/A') {
      alert('Cannot determine winner: No valid score found');
      return;
    }

    // Parse the score to determine winner
    const scoreParts = match.score.split('-');
    if (scoreParts.length !== 2) {
      alert('Cannot determine winner: Invalid score format');
      return;
    }

    const player1Score = parseInt(scoreParts[0]);
    const player2Score = parseInt(scoreParts[1]);
    
    let winnerId = null;
    if (player1Score > player2Score) {
      winnerId = match.player1?._id;
    } else if (player2Score > player1Score) {
      winnerId = match.player2?._id;
    } else {
      alert('Cannot determine winner: Scores are tied');
      return;
    }

    if (!winnerId) {
      alert('Cannot determine winner: Player information missing');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/matches/${match._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winner: winnerId,
          score: match.score,
          status: match.status
        }),
      });

      if (response.ok) {
        alert(`Winner set to: ${winnerId === match.player1?._id ? `${match.player1?.firstName} ${match.player1?.lastName}` : `${match.player2?.firstName} ${match.player2?.lastName}`}`);
        loadMatches(); // Refresh the matches list
      } else {
        const errorData = await response.json();
        alert(`Failed to set winner: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error setting winner:', error);
      alert(`Failed to set winner: ${error.message}`);
    }
  };

  const saveMatch = async () => {
    if (!selectedMatch) return;

    // Validate that if status is completed, we have required fields
    if (editForm.status === 'completed') {
      if (!editForm.winner || editForm.winner.trim() === '') {
        setError('Winner is required when marking match as completed');
        return;
      }
      if (!editForm.score || editForm.score.trim() === '') {
        setError('Score is required when marking match as completed');
        return;
      }
    }

    setLoading(true);
    try {
      // Convert player names back to IDs
      const convertNameToId = (name, originalId) => {
        if (!name || name.trim() === '') return originalId;
        
        // If the name hasn't changed, keep the original ID
        const originalPlayer = selectedMatch.player1?._id === originalId ? selectedMatch.player1 : selectedMatch.player2;
        if (originalPlayer && name === `${originalPlayer.firstName} ${originalPlayer.lastName}`) {
          return originalId;
        }
        
        // Find player by name in the matches list
        const foundPlayer = matches.find(match => 
          `${match.player1?.firstName} ${match.player1?.lastName}` === name || 
          `${match.player2?.firstName} ${match.player2?.lastName}` === name
        );
        
        if (foundPlayer) {
          if (`${foundPlayer.player1?.firstName} ${foundPlayer.player1?.lastName}` === name) {
            return foundPlayer.player1?._id;
          } else if (`${foundPlayer.player2?.firstName} ${foundPlayer.player2?.lastName}` === name) {
            return foundPlayer.player2?._id;
          }
        }
        
        // If not found, return original ID
        return originalId;
      };

      // Fix timezone issue by ensuring dates are sent as local dates
      const formData = {
        ...editForm,
        player1: convertNameToId(editForm.player1, selectedMatch.player1?._id),
        player2: convertNameToId(editForm.player2, selectedMatch.player2?._id),
        winner: editForm.winner ? convertNameToId(editForm.winner, selectedMatch.winner?._id) : '',
        scheduledDate: editForm.scheduledDate ? `${editForm.scheduledDate}T12:00:00` : null,
        completedDate: editForm.completedDate ? `${editForm.completedDate}T12:00:00` : null,
        paymentVerified: editForm.paymentVerified
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
        const result = await response.json();
        console.log('✅ Match update successful:', result);
        setSuccess('Match updated successfully');
        setShowEditModal(false);
        loadMatches();
        
        // Dispatch custom event to notify other components that matches have changed
        window.dispatchEvent(new CustomEvent('matchesUpdated', {
          detail: { action: 'update', matchId: selectedMatch._id }
        }));
      } else {
        const errorData = await response.json();
        console.error('❌ Match update failed:', errorData);
        setError(`Failed to update match: ${errorData.error || 'Unknown error'}`);
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
                    {match.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {match.status === 'pending_payment_verification' && (
                    <span style={{
                      backgroundColor: '#FF9800',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      marginLeft: '8px'
                    }}>
                      💰 PAYMENT NEEDED
                    </span>
                  )}
                  <div className="match-actions">
                    {match.score && match.score !== 'N/A' && !match.winner && match.status === 'pending_payment_verification' && (
                      <button 
                        onClick={() => handleQuickSetWinner(match)}
                        className="quick-fix-btn"
                        title="Auto-set winner from score"
                        style={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '4px'
                        }}
                      >
                        🎯 Set Winner
                      </button>
                    )}
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
                    <strong>Winner:</strong> {match.winner ? `${match.winner.firstName} ${match.winner.lastName}` : 
                      match.score && match.score !== 'N/A' ? 
                        (() => {
                          // Auto-determine winner from score for pending verification matches
                          const scoreParts = match.score.split('-');
                          if (scoreParts.length === 2) {
                            const player1Score = parseInt(scoreParts[0]);
                            const player2Score = parseInt(scoreParts[1]);
                            if (player1Score > player2Score) {
                              return `${match.player1?.firstName} ${match.player1?.lastName} (Auto-detected from ${match.score})`;
                            } else if (player2Score > player1Score) {
                              return `${match.player2?.firstName} ${match.player2?.lastName} (Auto-detected from ${match.score})`;
                            }
                          }
                          return 'Not Set';
                        })() : 'Not Set'}
                  </div>
                  <div className="detail">
                    <strong>Date:</strong> {formatDate(match.scheduledDate || match.completedDate)}
                  </div>
                  <div className="detail">
                    <strong>Status:</strong> 
                    <span style={{
                      color: match.status === 'completed' ? '#4CAF50' : 
                             match.status === 'pending_payment_verification' ? '#FF9800' : 
                             match.status === 'scheduled' ? '#2196F3' : '#666',
                      fontWeight: 'bold',
                      marginLeft: '5px'
                    }}>
                      {match.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {match.paymentMethod && (
                    <div className="detail">
                      <strong>Payment Method:</strong> {match.paymentMethod}
                    </div>
                  )}
                  {match.paymentVerified !== undefined && (
                    <div className="detail">
                      <strong>Payment Verified:</strong> 
                      <span style={{
                        color: match.paymentVerified ? '#4CAF50' : '#FF9800',
                        fontWeight: 'bold',
                        marginLeft: '5px'
                      }}>
                        {match.paymentVerified ? 'YES' : 'NO'}
                      </span>
                    </div>
                  )}
                  {match.reportedBy && (
                    <div className="detail">
                      <strong>Reported By:</strong> {match.reportedBy.firstName ? `${match.reportedBy.firstName} ${match.reportedBy.lastName}` : match.reportedBy}
                    </div>
                  )}
                  {match.notes && (
                    <div className="detail">
                      <strong>Notes:</strong> {match.notes}
                    </div>
                  )}
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
      {showEditModal && selectedMatch && createPortal(
        <div className="modal-overlay" style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.7)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="modal-header" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '15px 20px', 
              borderBottom: '1px solid #444',
              backgroundColor: '#333'
            }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Edit Match</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >×</button>
            </div>
            
            <div style={{ padding: '10px 20px', backgroundColor: '#333', borderBottom: '1px solid #444', fontSize: '12px', color: '#ccc' }}>
              💡 <strong>Tip:</strong> Use the dropdowns to select players. This prevents typos and ensures accurate player selection.
              <br />
              <strong>Available Players:</strong> {selectedMatch.player1?.firstName} {selectedMatch.player1?.lastName} | {selectedMatch.player2?.firstName} {selectedMatch.player2?.lastName}
              {editForm.status === 'completed' && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#2d4a2d', borderRadius: '4px', border: '1px solid #4CAF50' }}>
                  ✅ <strong>To complete a match:</strong> Winner and Score are required
                </div>
              )}
              {selectedMatch.status === 'pending_payment_verification' && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#4a3c2d', borderRadius: '4px', border: '1px solid #ff9800' }}>
                  💰 <strong>Payment Verification:</strong> Check the "Verify Payment" box to confirm payment has been received. If match has winner/score, it will auto-complete.
                </div>
              )}
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>Player 1:</label>
                <div style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>
                  Current: {selectedMatch.player1?.firstName} {selectedMatch.player1?.lastName}
                </div>
                <select
                  value={editForm.player1}
                  onChange={(e) => setEditForm({...editForm, player1: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #555',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Player 1</option>
                  <option value={`${selectedMatch.player1?.firstName} ${selectedMatch.player1?.lastName}`}>
                    {selectedMatch.player1?.firstName} {selectedMatch.player1?.lastName}
                  </option>
                  <option value={`${selectedMatch.player2?.firstName} ${selectedMatch.player2?.lastName}`}>
                    {selectedMatch.player2?.firstName} {selectedMatch.player2?.lastName}
                  </option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Player 2:</label>
                <div style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>
                  Current: {selectedMatch.player2?.firstName} {selectedMatch.player2?.lastName}
                </div>
                <select
                  value={editForm.player2}
                  onChange={(e) => setEditForm({...editForm, player2: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #555',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Player 2</option>
                  <option value={`${selectedMatch.player1?.firstName} ${selectedMatch.player1?.lastName}`}>
                    {selectedMatch.player1?.firstName} {selectedMatch.player1?.lastName}
                  </option>
                  <option value={`${selectedMatch.player2?.firstName} ${selectedMatch.player2?.lastName}`}>
                    {selectedMatch.player2?.firstName} {selectedMatch.player2?.lastName}
                  </option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Winner:</label>
                <div style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>
                  Current: {selectedMatch.winner?.firstName} {selectedMatch.winner?.lastName || 'Not Set'}
                  {!selectedMatch.winner && selectedMatch.score && (
                    <div style={{ color: '#ff9800', marginTop: '4px' }}>
                      ⚠️ Match has score but no winner set. Please select the winner.
                    </div>
                  )}
                </div>
                <select
                  value={editForm.winner}
                  onChange={(e) => setEditForm({...editForm, winner: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #555',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Winner</option>
                  <option value={`${selectedMatch.player1?.firstName} ${selectedMatch.player1?.lastName}`}>
                    {selectedMatch.player1?.firstName} {selectedMatch.player1?.lastName}
                  </option>
                  <option value={`${selectedMatch.player2?.firstName} ${selectedMatch.player2?.lastName}`}>
                    {selectedMatch.player2?.firstName} {selectedMatch.player2?.lastName}
                  </option>
                </select>
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
                  <option value="pending_payment_verification">Pending Payment Verification</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Game Type:</label>
                <select
                  value={editForm.gameType}
                  onChange={(e) => setEditForm({...editForm, gameType: e.target.value})}
                >
                  <option value="8-ball">8-ball</option>
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Race Length:</label>
                <input
                  type="number"
                  value={editForm.raceLength}
                  onChange={(e) => setEditForm({...editForm, raceLength: parseInt(e.target.value) || 5})}
                  min="1"
                  max="21"
                  placeholder="5"
                />
              </div>
              </div>
              
              {selectedMatch.status === 'pending_payment_verification' && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editForm.paymentVerified}
                      onChange={(e) => setEditForm({...editForm, paymentVerified: e.target.checked})}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span>✅ Verify Payment</span>
                  </label>
                  <div style={{ marginTop: '4px', color: '#888', fontSize: '12px' }}>
                    Check this box to verify that the payment has been received (cash in dropbox, online payment confirmed, etc.)
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer" style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '10px', 
              padding: '15px 20px', 
              borderTop: '1px solid #444',
              backgroundColor: '#333'
            }}>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="cancel-btn"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={saveMatch} 
                className="save-btn" 
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: loading ? '#666' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMatch && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default MatchManager;
