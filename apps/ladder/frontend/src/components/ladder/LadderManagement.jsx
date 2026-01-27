import React, { useState, useEffect } from 'react';
import { formatDateForDisplay } from '@shared/utils/utils/dateUtils';
import { csvToJson, getSampleCSV, validatePlayerData } from '@shared/utils/utils/csvToJson';
import { BACKEND_URL } from '@shared/config/config.js';
import './LadderManagement.css';

const LadderManagement = ({ userEmail, userPin }) => {
  // Configure your league ID here - this should match your backend configuration
  const LEAGUE_ID = 'front-range-pool-hub';
  const [selectedLadder, setSelectedLadder] = useState('499-under');
  const [ladderData, setLadderData] = useState([]);
  const [importData, setImportData] = useState('');
  const [importMode, setImportMode] = useState('json'); // 'json' or 'csv'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Match result states
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchFormData, setMatchFormData] = useState({
    player1Id: '',
    player1Name: '',
    player1Position: '',
    player2Id: '',
    player2Name: '',
    player2Position: '',
    winnerId: '',
    score: '',
    matchDate: new Date().toISOString().split('T')[0],
    matchFormat: 'best-of-5',
    location: '',
    notes: ''
  });
  const [matchHistory, setMatchHistory] = useState([]);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  
  // Match editing states
  const [editingMatch, setEditingMatch] = useState(null);
  const [showEditMatchForm, setShowEditMatchForm] = useState(false);
  const [editMatchFormData, setEditMatchFormData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);

  const ladders = [
    { name: '499-under', displayName: '499 & Under' },
    { name: '500-549', displayName: '500-549' },
    { name: '550-plus', displayName: '550+' }
  ];

  useEffect(() => {
    loadLadderData();
  }, [selectedLadder]);

  const loadLadderData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/${selectedLadder}`);
      if (response.ok) {
        const data = await response.json();
        setLadderData(data);
      } else {
        setMessage('Failed to load ladder data');
      }
    } catch (error) {
      console.error('Error loading ladder data:', error);
      setMessage('Error loading ladder data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setMessage('');

      let parsedData;
      
      if (importMode === 'csv') {
        // Convert CSV to JSON
        try {
          const players = csvToJson(importData);
          const validation = validatePlayerData(players);
          
          if (validation.errors.length > 0) {
            setMessage(`Validation errors found: ${validation.errors.length} errors. Please check your data.`);
            return;
          }
          
          parsedData = validation.valid;
        } catch (error) {
          setMessage('Invalid CSV format. Please check your data.');
          return;
        }
      } else {
        // Parse JSON format
        try {
          parsedData = JSON.parse(importData);
        } catch (error) {
          setMessage('Invalid JSON format. Please check your data.');
          return;
        }
      }

              const response = await fetch(`${BACKEND_URL}/api/ladder/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ladderData: parsedData,
          ladderName: selectedLadder
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`Import completed! Imported: ${result.results.imported}, Skipped: ${result.results.skipped}`);
        setImportData('');
        loadLadderData(); // Reload the data
      } else {
        setMessage(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      setMessage('Error importing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePositions = async () => {
    try {
      setLoading(true);
      setMessage('');

      const positions = ladderData.map((player, index) => ({
        email: player.email,
        position: index + 1
      }));

              const response = await fetch(`${BACKEND_URL}/api/ladder/update-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ladderName: selectedLadder,
          positions: positions
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`Positions updated! Updated: ${result.results.updated}`);
        loadLadderData(); // Reload the data
      } else {
        setMessage(`Update failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating positions:', error);
      setMessage('Error updating positions');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Position', 'Name', 'Email', 'FargoRate', 'Status'],
      ...ladderData.map(player => [
        player.position,
        `${player.firstName} ${player.lastName}`,
        player.email,
        player.fargoRate,
        player.isActive ? 'Active' : 'Inactive'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLadder}-ladder.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openFargoUpdater = () => {
    // Open the Fargo updater in a new window/tab
    const fargoUpdaterUrl = `${BACKEND_URL.replace('/api', '')}/static/fargo-updater.html`;
    window.open(fargoUpdaterUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  // Match result functions
  const handleMatchInputChange = (e) => {
    const { name, value } = e.target;
    setMatchFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlayer1Select = (e) => {
    const playerId = e.target.value;
    const player = ladderData.find(p => p._id === playerId);
    if (player) {
      setMatchFormData(prev => ({
        ...prev,
        player1Id: playerId,
        player1Name: `${player.firstName} ${player.lastName}`,
        player1Position: player.position
      }));
    }
  };

  const handlePlayer2Select = (e) => {
    const playerId = e.target.value;
    const player = ladderData.find(p => p._id === playerId);
    if (player) {
      setMatchFormData(prev => ({
        ...prev,
        player2Id: playerId,
        player2Name: `${player.firstName} ${player.lastName}`,
        player2Position: player.position
      }));
    }
  };

  const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    setMatchFormData(prev => ({
      ...prev,
      winnerId
    }));
  };

  const submitMatchResult = async (e) => {
    e.preventDefault();
    
    if (!matchFormData.player1Id || !matchFormData.player2Id || !matchFormData.winnerId) {
      setMessage('Please select both players and a winner');
      return;
    }

    if (matchFormData.player1Id === matchFormData.player2Id) {
      setMessage('Players must be different');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...matchFormData,
          matchDate: new Date(matchFormData.matchDate).toISOString()
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`Match result recorded successfully! ${result.message}`);
        setShowMatchForm(false);
        setMatchFormData({
          player1Id: '',
          player1Name: '',
          player1Position: '',
          player2Id: '',
          player2Name: '',
          player2Position: '',
          winnerId: '',
          score: '',
          matchDate: new Date().toISOString().split('T')[0],
          matchFormat: 'best-of-5',
          location: '',
          notes: ''
        });
        loadLadderData(); // Reload to show updated positions
      } else {
        setMessage(`Match recording failed: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Error recording match result:', error);
      setMessage('Error recording match result');
    } finally {
      setLoading(false);
    }
  };

  const loadMatchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches`);
      if (response.ok) {
        const data = await response.json();
        setMatchHistory(data.matches || []);
      } else {
        setMessage('Failed to load match history');
      }
    } catch (error) {
      console.error('Error loading match history:', error);
      setMessage('Error loading match history');
    } finally {
      setLoading(false);
    }
  };

  // Handle editing a match
  const handleEditMatch = async (match) => {
    try {
      // Fetch full match details
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches/${match.id}`);
      if (response.ok) {
        const data = await response.json();
        setEditingMatch(data.match);
        setEditMatchFormData({
          winner: data.match.winner?.id || '',
          score: data.match.score || '',
          notes: data.match.notes || '',
          adminNotes: data.match.adminNotes || '',
          completedDate: data.match.completedDate ? new Date(data.match.completedDate).toISOString().split('T')[0] : '',
          scheduledDate: data.match.scheduledDate ? new Date(data.match.scheduledDate).toISOString().split('T')[0] : '',
          venue: data.match.venue || '',
          entryFee: data.match.entryFee || 0,
          raceLength: data.match.raceLength || 5,
          gameType: data.match.gameType || '8-ball',
          tableSize: data.match.tableSize || '7-foot',
          status: data.match.status || 'scheduled'
        });
        setShowEditMatchForm(true);
      } else {
        setMessage('Failed to load match details');
      }
    } catch (error) {
      console.error('Error loading match details:', error);
      setMessage('Error loading match details');
    }
  };

  // Handle deleting a match
  const handleDeleteMatch = (match) => {
    setMatchToDelete(match);
    setShowDeleteConfirm(true);
  };

  // Confirm delete match
  const confirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches/${matchToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessage('Match deleted successfully');
        // Reload match history
        await loadMatchHistory();
        // Reload ladder data to update positions
        await loadLadderData();
      } else {
        const errorData = await response.json();
        setMessage(`Failed to delete match: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      setMessage('Error deleting match');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setMatchToDelete(null);
    }
  };

  // Handle edit match form submission
  const handleEditMatchSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingMatch) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches/${editingMatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editMatchFormData)
      });
      
      if (response.ok) {
        setMessage('Match updated successfully');
        setShowEditMatchForm(false);
        setEditingMatch(null);
        // Reload match history
        await loadMatchHistory();
        // Reload ladder data to update positions if winner was changed
        await loadLadderData();
      } else {
        const errorData = await response.json();
        setMessage(`Failed to update match: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating match:', error);
      setMessage('Error updating match');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit form input changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditMatchFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="ladder-management">
      <div className="management-header">
        <h2>Ladder Management</h2>
        <p>Import and manage ladder data from Google Sheets</p>
      </div>

      {/* Ladder Selection */}
      <div className="ladder-selector">
        <label>Select Ladder:</label>
        <select 
          value={selectedLadder} 
          onChange={(e) => setSelectedLadder(e.target.value)}
        >
          {ladders.map(ladder => (
            <option key={ladder.name} value={ladder.name}>
              {ladder.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Import Section */}
      <div className="import-section">
        <h3>Import Data from Google Sheets</h3>
        <div className="import-instructions">
          <p><strong>Instructions:</strong></p>
          <ol>
            <li>Export your Google Sheet as CSV</li>
            <li>Choose your import format below</li>
            <li>Paste the data and click Import</li>
          </ol>
          
          <div className="import-mode-selector">
            <label>
              <input
                type="radio"
                value="csv"
                checked={importMode === 'csv'}
                onChange={(e) => setImportMode(e.target.value)}
              />
              CSV Format (from Google Sheets)
            </label>
            <label>
              <input
                type="radio"
                value="json"
                checked={importMode === 'json'}
                onChange={(e) => setImportMode(e.target.value)}
              />
              JSON Format
            </label>
          </div>
          
          {importMode === 'csv' ? (
            <div>
              <p><strong>Expected CSV format:</strong></p>
              <pre>{getSampleCSV()}</pre>
              <p>Supported columns: Position, Name, Email, FargoRate</p>
            </div>
          ) : (
            <div>
              <p><strong>Expected JSON format:</strong></p>
              <pre>{`[
  {
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "fargoRate": 485,
    "position": 1
  }
]`}</pre>
            </div>
          )}
        </div>
        
        <div className="import-form">
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder={importMode === 'csv' ? "Paste your CSV data here..." : "Paste your JSON data here..."}
            rows={10}
          />
          <button 
            onClick={handleImport} 
            disabled={loading || !importData.trim()}
            className="import-btn"
          >
            {loading ? 'Importing...' : 'Import Data'}
          </button>
        </div>
      </div>

      {/* Current Ladder Data */}
      <div className="ladder-data-section">
        <div className="section-header">
          <h3>Current {ladders.find(l => l.name === selectedLadder)?.displayName} Ladder</h3>
          <div className="action-buttons">
            <button onClick={exportToCSV} className="export-btn">
              Export to CSV
            </button>
            <button onClick={handleUpdatePositions} disabled={loading} className="update-btn">
              {loading ? 'Updating...' : 'Update Positions'}
            </button>
            <button onClick={openFargoUpdater} className="fargo-btn">
              🎯 Update Fargo Ratings
            </button>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading ladder data...</div>
        ) : (
          <div className="ladder-table">
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>FargoRate</th>
                  <th>Status</th>
                  <th>Immunity</th>
                </tr>
              </thead>
              <tbody>
                {ladderData.map((player, index) => (
                  <tr key={player._id || index}>
                    <td>{player.position}</td>
                    <td>{player.firstName} {player.lastName}</td>
                    <td>{player.email}</td>
                    <td>{player.fargoRate}</td>
                    <td>
                      <span className={`status ${player.isActive ? 'active' : 'inactive'}`}>
                        {player.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {player.immunityUntil ? 
                        formatDateForDisplay(player.immunityUntil) : 
                        'None'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {ladderData.length === 0 && (
              <div className="no-data">
                No players found in this ladder. Import some data to get started!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match Result Management Section */}
      <div className="match-management-section">
        <div className="section-header">
          <h3>Match Result Management</h3>
          <div className="action-buttons">
            <button 
              onClick={() => setShowMatchForm(true)} 
              className="add-match-btn"
              disabled={ladderData.length < 2}
            >
              Report Match Result
            </button>
            <button 
              onClick={() => {
                setShowMatchHistory(!showMatchHistory);
                if (!showMatchHistory) {
                  loadMatchHistory();
                }
              }} 
              className="view-history-btn"
            >
              {showMatchHistory ? 'Hide Match History' : 'View Match History'}
            </button>
          </div>
        </div>

        {ladderData.length < 2 && (
          <div className="message warning">
            Need at least 2 players on the ladder to report match results.
          </div>
        )}

        {/* Match Result Form */}
        {showMatchForm && (
          <div className="match-form-overlay">
            <div className="match-form">
              <h4>Report Match Result</h4>
              <form onSubmit={submitMatchResult}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Player 1:</label>
                    <select 
                      value={matchFormData.player1Id} 
                      onChange={handlePlayer1Select}
                      required
                    >
                      <option value="">Select Player 1</option>
                      {ladderData.map(player => (
                        <option key={player._id} value={player._id}>
                          #{player.position} - {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Player 2:</label>
                    <select 
                      value={matchFormData.player2Id} 
                      onChange={handlePlayer2Select}
                      required
                    >
                      <option value="">Select Player 2</option>
                      {ladderData.map(player => (
                        <option key={player._id} value={player._id}>
                          #{player.position} - {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Winner:</label>
                    <select 
                      value={matchFormData.winnerId} 
                      onChange={handleWinnerSelect}
                      required
                    >
                      <option value="">Select Winner</option>
                      {matchFormData.player1Id && (
                        <option value={matchFormData.player1Id}>
                          {matchFormData.player1Name}
                        </option>
                      )}
                      {matchFormData.player2Id && (
                        <option value={matchFormData.player2Id}>
                          {matchFormData.player2Name}
                        </option>
                      )}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Score:</label>
                    <input
                      type="text"
                      name="score"
                      value={matchFormData.score}
                      onChange={handleMatchInputChange}
                      placeholder="e.g., 3-1, 5-3"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Match Date:</label>
                    <input
                      type="date"
                      name="matchDate"
                      value={matchFormData.matchDate}
                      onChange={handleMatchInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Match Format:</label>
                    <select
                      name="matchFormat"
                      value={matchFormData.matchFormat}
                      onChange={handleMatchInputChange}
                      required
                    >
                      <option value="best-of-3">Best of 3</option>
                      <option value="best-of-5">Best of 5</option>
                      <option value="best-of-7">Best of 7</option>
                      <option value="best-of-9">Best of 9</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Location:</label>
                    <input
                      type="text"
                      name="location"
                      value={matchFormData.location}
                      onChange={handleMatchInputChange}
                      placeholder="Pool hall or venue"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Notes:</label>
                    <input
                      type="text"
                      name="notes"
                      value={matchFormData.notes}
                      onChange={handleMatchInputChange}
                      placeholder="Optional match notes"
                    />
                  </div>
                </div>

                <div className="form-buttons">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="submit-btn"
                  >
                    {loading ? 'Recording...' : 'Record Match Result'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowMatchForm(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Match Form */}
        {showEditMatchForm && editingMatch && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Edit Match</h3>
              <form onSubmit={handleEditMatchSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Player 1:</label>
                    <input
                      type="text"
                      value={editingMatch.player1?.name || ''}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label>Player 2:</label>
                    <input
                      type="text"
                      value={editingMatch.player2?.name || ''}
                      disabled
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Winner:</label>
                    <select
                      name="winner"
                      value={editMatchFormData.winner}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select Winner</option>
                      <option value={editingMatch.player1?.id}>{editingMatch.player1?.name}</option>
                      <option value={editingMatch.player2?.id}>{editingMatch.player2?.name}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Score:</label>
                    <input
                      type="text"
                      name="score"
                      value={editMatchFormData.score}
                      onChange={handleEditFormChange}
                      placeholder="e.g., 3-1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status:</label>
                    <select
                      name="status"
                      value={editMatchFormData.status}
                      onChange={handleEditFormChange}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="forfeited">Forfeited</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Completed Date:</label>
                    <input
                      type="date"
                      name="completedDate"
                      value={editMatchFormData.completedDate}
                      onChange={handleEditFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Venue:</label>
                    <input
                      type="text"
                      name="venue"
                      value={editMatchFormData.venue}
                      onChange={handleEditFormChange}
                      placeholder="Pool hall or venue"
                    />
                  </div>
                  <div className="form-group">
                    <label>Entry Fee:</label>
                    <input
                      type="number"
                      name="entryFee"
                      value={editMatchFormData.entryFee}
                      onChange={handleEditFormChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Race Length:</label>
                    <input
                      type="number"
                      name="raceLength"
                      value={editMatchFormData.raceLength}
                      onChange={handleEditFormChange}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Game Type:</label>
                    <select
                      name="gameType"
                      value={editMatchFormData.gameType}
                      onChange={handleEditFormChange}
                    >
                      <option value="8-ball">8-ball</option>
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Table Size:</label>
                    <select
                      name="tableSize"
                      value={editMatchFormData.tableSize}
                      onChange={handleEditFormChange}
                    >
                      <option value="7-foot">7-foot</option>
                      <option value="9-foot">9-foot</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Scheduled Date:</label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={editMatchFormData.scheduledDate}
                      onChange={handleEditFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Notes:</label>
                    <textarea
                      name="notes"
                      value={editMatchFormData.notes}
                      onChange={handleEditFormChange}
                      placeholder="Match notes"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>Admin Notes:</label>
                    <textarea
                      name="adminNotes"
                      value={editMatchFormData.adminNotes}
                      onChange={handleEditFormChange}
                      placeholder="Admin-only notes"
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-buttons">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="submit-btn"
                  >
                    {loading ? 'Updating...' : 'Update Match'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditMatchForm(false);
                      setEditingMatch(null);
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && matchToDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Confirm Delete Match</h3>
              <p>Are you sure you want to delete this match?</p>
              <div className="match-details">
                <p><strong>Players:</strong> {matchToDelete.winner?.name} vs {matchToDelete.loser?.name}</p>
                <p><strong>Score:</strong> {matchToDelete.score}</p>
                <p><strong>Date:</strong> {formatDateForDisplay(matchToDelete.matchDate)}</p>
              </div>
              <p className="warning-text">⚠️ This action cannot be undone and will reverse any position changes.</p>
              <div className="form-buttons">
                <button 
                  onClick={confirmDeleteMatch}
                  disabled={loading}
                  className="delete-btn"
                >
                  {loading ? 'Deleting...' : 'Delete Match'}
                </button>
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMatchToDelete(null);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Match History */}
        {showMatchHistory && (
          <div className="match-history-section">
            <h4>Match History</h4>
            {matchHistory.length === 0 ? (
              <div className="no-data">No matches recorded yet.</div>
            ) : (
              <div className="match-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Winner</th>
                      <th>Loser</th>
                      <th>Score</th>
                      <th>Format</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchHistory.map((match, index) => (
                      <tr key={match.id || index}>
                        <td>{formatDateForDisplay(match.matchDate)}</td>
                        <td>
                          <strong>{match.winner.name}</strong> (#{match.winner.position})
                        </td>
                        <td>
                          {match.loser.name} (#{match.loser.position})
                        </td>
                        <td>{match.score}</td>
                        <td>{match.matchFormat || 'N/A'}</td>
                        <td>{match.location || 'N/A'}</td>
                        <td>
                          <span className={`status ${match.verificationStatus}`}>
                            {match.verificationStatus}
                          </span>
                        </td>
                        <td>
                          <div className="match-actions">
                            <button 
                              className="edit-btn"
                              onClick={() => handleEditMatch(match)}
                              title="Edit Match"
                            >
                              ✏️
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteMatch(match)}
                              title="Delete Match"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LadderManagement;
