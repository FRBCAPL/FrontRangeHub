import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import { toLocalDateISO } from '@shared/utils/utils/dateUtils.js';
import './MatchManager.css';

const MatchManager = forwardRef(({ selectedLadder = '499-under', userToken, onReportMatch, onEditMatch, refreshTrigger }, ref) => {
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

  useEffect(() => {
    if (selectedLadder) {
      loadMatches();
    } else {
      setMatches([]);
    }
  }, [selectedLadder]);

  // When parent (e.g. LadderPlayerManagement) saves an edit in its modal, it bumps refreshTrigger so we refetch
  useEffect(() => {
    if (selectedLadder && refreshTrigger != null) {
      loadMatches();
    }
  }, [selectedLadder, refreshTrigger]);

  useEffect(() => {
    const handler = () => { if (selectedLadder) loadMatches(); };
    window.addEventListener('matchesUpdated', handler);
    return () => window.removeEventListener('matchesUpdated', handler);
  }, [selectedLadder]);

  // Transform Supabase match to display format (player1=challenger/winner, player2=defender/loser)
  const transformSupabaseMatch = (match) => {
    const parseName = (fullName) => {
      if (!fullName || typeof fullName !== 'string') return { firstName: 'TBD', lastName: '' };
      const parts = fullName.trim().split(' ');
      return {
        firstName: parts[0] || 'TBD',
        lastName: (parts.slice(1) || []).join(' ') || ''
      };
    };
    const winnerParts = parseName(match.winner_name);
    const loserParts = parseName(match.loser_name);
    const winnerId = match.winner_id;
    const loserId = match.loser_id;
    const isCompleted = match.status === 'completed';
    return {
      _id: match.id,
      id: match.id,
      player1: { _id: winnerId, firstName: winnerParts.firstName, lastName: winnerParts.lastName },
      player2: { _id: loserId, firstName: loserParts.firstName, lastName: loserParts.lastName },
      winner: isCompleted ? { _id: winnerId, firstName: winnerParts.firstName, lastName: winnerParts.lastName } : null,
      winner_id: winnerId,
      loser_id: loserId,
      score: match.score || 'N/A',
      scheduledDate: match.match_date,
      completedDate: match.match_date,
      status: match.status || 'scheduled',
      gameType: match.game_type || '8-ball',
      raceLength: match.race_length ?? 5,
      ladder: match.ladder_id || selectedLadder,
      notes: match.notes,
      location: match.location,
      match_type: match.match_type
    };
  };

  const loadMatches = async () => {
    if (!selectedLadder) return;
    setLoading(true);
    setError('');
    try {
      const result = await supabaseDataService.getAllMatchesForLadder(selectedLadder);
      if (!result.success) {
        throw new Error(result.error || 'Failed to load matches');
      }
      const rawMatches = (result.matches || []).filter(m =>
        !m.ladder_id || m.ladder_id === selectedLadder
      );
      const transformed = rawMatches.map(m => transformSupabaseMatch(m));
      const sorted = transformed.sort((a, b) => {
        const dateA = new Date(a.scheduledDate || a.completedDate || 0);
        const dateB = new Date(b.scheduledDate || b.completedDate || 0);
        return dateB - dateA;
      });
      setMatches(sorted);
    } catch (err) {
      setError('Error loading matches: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMatchesRef = useRef(loadMatches);
  loadMatchesRef.current = loadMatches;
  useImperativeHandle(ref, () => ({ refresh: () => loadMatchesRef.current() }), [selectedLadder]);

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

    const scoreParts = match.score.split('-');
    if (scoreParts.length !== 2) {
      alert('Cannot determine winner: Invalid score format');
      return;
    }

    const player1Score = parseInt(scoreParts[0]);
    const player2Score = parseInt(scoreParts[1]);

    let winnerId = null;
    let loserId = null;
    let winnerName = '';
    let loserName = '';
    if (player1Score > player2Score) {
      winnerId = match.player1?._id;
      loserId = match.player2?._id;
      winnerName = `${match.player1?.firstName} ${match.player1?.lastName}`.trim();
      loserName = `${match.player2?.firstName} ${match.player2?.lastName}`.trim();
    } else if (player2Score > player1Score) {
      winnerId = match.player2?._id;
      loserId = match.player1?._id;
      winnerName = `${match.player2?.firstName} ${match.player2?.lastName}`.trim();
      loserName = `${match.player1?.firstName} ${match.player1?.lastName}`.trim();
    } else {
      alert('Cannot determine winner: Scores are tied');
      return;
    }

    if (!winnerId || !loserId) {
      alert('Cannot determine winner: Player information missing');
      return;
    }

    try {
      setLoading(true);
      // Use updateMatchStatus so challenge is marked completed, ladder_id backfilled, stats/positions updated
      const result = await supabaseDataService.updateMatchStatus(
        match._id,
        'completed',
        { winnerId: winnerId },
        match.score || null,
        null,
        null
      );
      if (result.success) {
        setSuccess(`Winner set to: ${winnerName}`);
        loadMatches();
        window.dispatchEvent(new CustomEvent('matchesUpdated', { detail: { action: 'update', matchId: match._id } }));
      } else {
        setError(`Failed to set winner: ${result.error}`);
      }
    } catch (err) {
      setError('Error setting winner: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveMatch = async () => {
    if (!selectedMatch) return;

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
    setError('');
    try {
      const getPlayerIdFromName = (name) => {
        if (!name || !name.trim()) return null;
        const m = matches.find(m =>
          `${m.player1?.firstName} ${m.player1?.lastName}`.trim() === name.trim() ||
          `${m.player2?.firstName} ${m.player2?.lastName}`.trim() === name.trim()
        );
        if (m && `${m.player1?.firstName} ${m.player1?.lastName}`.trim() === name.trim()) return m.player1?._id;
        if (m && `${m.player2?.firstName} ${m.player2?.lastName}`.trim() === name.trim()) return m.player2?._id;
        return selectedMatch.player1 && `${selectedMatch.player1?.firstName} ${selectedMatch.player1?.lastName}`.trim() === name.trim() ? selectedMatch.player1._id
          : selectedMatch.player2 && `${selectedMatch.player2?.firstName} ${selectedMatch.player2?.lastName}`.trim() === name.trim() ? selectedMatch.player2._id
          : null;
      };

      const player1Id = getPlayerIdFromName(editForm.player1) || selectedMatch.player1?._id;
      const player2Id = getPlayerIdFromName(editForm.player2) || selectedMatch.player2?._id;
      const p1Name = editForm.player1?.trim() || `${selectedMatch.player1?.firstName || ''} ${selectedMatch.player1?.lastName || ''}`.trim();
      const p2Name = editForm.player2?.trim() || `${selectedMatch.player2?.firstName || ''} ${selectedMatch.player2?.lastName || ''}`.trim();

      let winner_id = player1Id;
      let loser_id = player2Id;
      let winner_name = p1Name;
      let loser_name = p2Name;
      if (editForm.status === 'completed' && editForm.winner?.trim()) {
        const winnerName = editForm.winner.trim();
        if (winnerName === p1Name || (player1Id && getPlayerIdFromName(winnerName) === player1Id)) {
          winner_id = player1Id;
          loser_id = player2Id;
          winner_name = p1Name;
          loser_name = p2Name;
        } else {
          winner_id = player2Id;
          loser_id = player1Id;
          winner_name = p2Name;
          loser_name = p1Name;
        }
      }

      // Prefer scheduled date when editing; ensure we have a string from the form (not stale)
      const scheduledInput = (editForm.scheduledDate != null && editForm.scheduledDate !== '')
        ? String(editForm.scheduledDate).trim()
        : '';
      const completedInput = (editForm.completedDate != null && editForm.completedDate !== '')
        ? String(editForm.completedDate).trim()
        : '';
      const dateInput = scheduledInput || completedInput || null;
      const matchDate = dateInput
        ? toLocalDateISO(dateInput)
        : (selectedMatch.scheduledDate ? new Date(selectedMatch.scheduledDate).toISOString() : null);

      // When completing a match, use updateMatchStatus so challenge is marked completed,
      // ladder_id is backfilled, and stats/positions are updated (same for all ladders).
      if (editForm.status === 'completed') {
        const result = await supabaseDataService.updateMatchStatus(
          selectedMatch._id,
          'completed',
          { winnerId: winner_id },
          editForm.score || null,
          editForm.notes || null,
          matchDate
        );
        if (result.success) {
          setSuccess('Match updated successfully');
          setShowEditModal(false);
          setMatches(prev => prev.map(m => {
            if (m._id !== selectedMatch._id) return m;
            return {
              ...m,
              scheduledDate: matchDate,
              completedDate: matchDate,
              status: 'completed',
              score: editForm.score || null,
              gameType: editForm.gameType || m.gameType,
              raceLength: editForm.raceLength ?? m.raceLength,
              winner: editForm.winner ? {
                ...m.winner,
                firstName: editForm.winner.trim().split(' ')[0] || m.winner?.firstName,
                lastName: editForm.winner.trim().split(' ').slice(1).join(' ') || m.winner?.lastName
              } : m.winner
            };
          }));
          await loadMatches();
          window.dispatchEvent(new CustomEvent('matchesUpdated', { detail: { action: 'update', matchId: selectedMatch._id } }));
        } else {
          setError(`Failed to update match: ${result.error}`);
        }
      } else {
        const updateData = {
          match_date: matchDate,
          game_type: editForm.gameType || '8-ball',
          race_length: parseInt(editForm.raceLength) || 5,
          status: editForm.status,
          score: null,
          winner_id,
          loser_id,
          winner_name,
          loser_name
        };
        const result = await supabaseDataService.updateMatch(selectedMatch._id, updateData);
        if (result.success) {
          setSuccess('Match updated successfully');
          setShowEditModal(false);
          setMatches(prev => prev.map(m => {
            if (m._id !== selectedMatch._id) return m;
            return {
              ...m,
              scheduledDate: matchDate,
              completedDate: editForm.status === 'completed' ? matchDate : m.completedDate,
              status: editForm.status,
              score: m.score,
              gameType: editForm.gameType || m.gameType,
              raceLength: editForm.raceLength ?? m.raceLength,
              winner: m.winner
            };
          }));
          await loadMatches();
          window.dispatchEvent(new CustomEvent('matchesUpdated', { detail: { action: 'update', matchId: selectedMatch._id } }));
        } else {
          setError(`Failed to update match: ${result.error}`);
        }
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
    setError('');
    try {
      const result = await supabaseDataService.deleteMatch(selectedMatch._id);
      if (result.success) {
        setSuccess('Match deleted successfully');
        setShowDeleteModal(false);
        loadMatches();
        window.dispatchEvent(new CustomEvent('matchesUpdated', { detail: { action: 'delete', matchId: selectedMatch._id } }));
      } else {
        setError(`Failed to delete match: ${result.error}`);
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

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
      <div className="match-manager-search">
        <input
          type="text"
          placeholder="Search matches by player name or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="match-count">
          Showing {filteredMatches.length} of {matches.length} matches
        </div>
      </div>

      <div className="matches-list">
        <div className="matches-header">
          <h3>Matches — {selectedLadder} ({filteredMatches.length} of {matches.length})</h3>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="no-matches">No matches found</div>
        ) : (
          <div className="matches-grid">
            {filteredMatches.map((match) => (
              <div key={match._id} className="admin-match-card">
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
                    {onReportMatch ? (
                      <button 
                        onClick={() => onReportMatch(match)}
                        className="report-result-btn"
                        title="Report Match Result"
                        style={{
                          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        📊 Report Match
                      </button>
                    ) : null}
                    <button 
                      onClick={() => onEditMatch ? onEditMatch(match) : handleEditMatch(match)}
                      className="edit-btn"
                      title="Edit Match"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteMatch(match)}
                      className="delete-btn"
                      title="Delete Match"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="match-players" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: '8px' }}>
                  <span className="player" style={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{match.player1?.firstName} {match.player1?.lastName}</strong>
                    {match.winner?._id === match.player1?._id && <span className="winner"> 👑</span>}
                  </span>
                  <span className="vs" style={{ flexShrink: 0 }}>vs</span>
                  <span className="player" style={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{match.player2?.firstName} {match.player2?.lastName}</strong>
                    {match.winner?._id === match.player2?._id && <span className="winner"> 👑</span>}
                  </span>
                </div>

                <div className="match-details">
                  <div className="detail">
                    <strong>Ladder:</strong>
                    <span>{match.ladder || 'N/A'}</span>
                  </div>
                  <div className="detail">
                    <strong>Date:</strong>
                    <span>
                      {formatDate(match.scheduledDate || match.completedDate)}
                      {formatTime(match.scheduledDate || match.completedDate) !== '—' && ` · ${formatTime(match.scheduledDate || match.completedDate)}`}
                    </span>
                  </div>
                  <div className="detail">
                    <strong>Format:</strong>
                    <span>{match.gameType || '8-ball'} · Race to {match.raceLength ?? 5}</span>
                  </div>
                  <div className="detail">
                    <strong>Location:</strong>
                    <span>{match.location || '—'}</span>
                  </div>
                  <div className="detail">
                    <strong>Score:</strong>
                    <span>{match.score || 'N/A'}</span>
                  </div>
                  <div className="detail">
                    <strong>Winner:</strong>
                    <span>
                      {match.winner ? `${match.winner.firstName} ${match.winner.lastName}` : 
                        match.score && match.score !== 'N/A' ? 
                          (() => {
                            const scoreParts = match.score.split('-');
                            if (scoreParts.length === 2) {
                              const p1 = parseInt(scoreParts[0]);
                              const p2 = parseInt(scoreParts[1]);
                              if (p1 > p2) return `${match.player1?.firstName} ${match.player1?.lastName} (from score)`;
                              if (p2 > p1) return `${match.player2?.firstName} ${match.player2?.lastName} (from score)`;
                            }
                            return 'Not Set';
                          })() : 'Not Set'}
                    </span>
                  </div>
                  {match.notes && (
                    <div className="detail detail-full">
                      <strong>Notes:</strong>
                      <span>{match.notes}</span>
                    </div>
                  )}
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
});

MatchManager.displayName = 'MatchManager';

export default MatchManager;
