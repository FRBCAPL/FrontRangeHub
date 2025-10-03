import React, { useState, useEffect } from 'react';
import DraggableModal from '../modal/DraggableModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const AdminSimulationLadder = ({ userToken, onClose }) => {
  // Use authToken from localStorage if userToken is not provided
  const authToken = userToken || localStorage.getItem('authToken');
  
  const [ladder, setLadder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newPlayer, setNewPlayer] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    fargoRate: 500
  });
  const [newMatch, setNewMatch] = useState({
    player1Email: '',
    player2Email: '',
    winnerEmail: '',
    score: '5-0',
    matchType: 'standard',
    raceLength: 5,
    gameType: '8-ball',
    tableSize: '7-foot',
    venue: 'Legends Brews & Cues',
    notes: ''
  });

  useEffect(() => {
    loadLadder();
  }, []);

  const loadLadder = async () => {
    try {
      setLoading(true);
      console.log('🔍 AdminSimulationLadder: userToken:', userToken ? 'Present' : 'Missing');
      console.log('🔍 AdminSimulationLadder: authToken:', authToken ? 'Present' : 'Missing');
      console.log('🔍 AdminSimulationLadder: Making request to:', `${BACKEND_URL}/api/admin-simulation-ladder`);
      
      const response = await fetch(`${BACKEND_URL}/api/admin-simulation-ladder`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load admin simulation ladder');
      }

      const data = await response.json();
      setLadder(data.ladder);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error loading admin simulation ladder:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin-simulation-ladder/players`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPlayer)
      });

      if (!response.ok) {
        throw new Error('Failed to add player');
      }

      await loadLadder();
      setNewPlayer({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        fargoRate: 500
      });
    } catch (err) {
      setError(err.message);
      console.error('Error adding player:', err);
    }
  };

  const createMatch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin-simulation-ladder/matches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMatch)
      });

      if (!response.ok) {
        throw new Error('Failed to create match');
      }

      await loadLadder();
      setNewMatch({
        player1Email: '',
        player2Email: '',
        winnerEmail: '',
        score: '5-0',
        matchType: 'standard',
        raceLength: 5,
        gameType: '8-ball',
        tableSize: '7-foot',
        venue: 'Legends Brews & Cues',
        notes: ''
      });
    } catch (err) {
      setError(err.message);
      console.error('Error creating match:', err);
    }
  };

  const resetLadder = async () => {
    if (!window.confirm('Are you sure you want to reset the entire admin simulation ladder? This will delete all players, matches, and prize pool data.')) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin-simulation-ladder/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset ladder');
      }

      await loadLadder();
    } catch (err) {
      setError(err.message);
      console.error('Error resetting ladder:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '1.2rem', color: '#8b5cf6' }}>Loading simulation ladder...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '1.2rem', color: '#ef4444' }}>Error: {error}</div>
        <button 
          onClick={loadLadder}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(0, 0, 0, 0.8)', 
      borderRadius: '12px', 
      padding: '1rem',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.3)'
      }}>
        <h2 style={{ color: '#8b5cf6', margin: 0, fontSize: '1.5rem' }}>
          🎮 Admin Simulation Ladder
        </h2>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ✕ Close
        </button>
      </div>
      
      <div style={{ 
        display: 'flex', 
        height: 'calc(95vh - 200px)', 
        gap: '1rem',
        padding: '1rem'
      }}>
        {/* Left Sidebar - Navigation */}
        <div style={{
          width: '200px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>🎮 Simulation</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '0.5rem',
                backgroundColor: activeTab === 'overview' ? '#8b5cf6' : 'transparent',
                color: 'white',
                border: '1px solid #8b5cf6',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              📊 Overview
            </button>
            
            <button
              onClick={() => setActiveTab('players')}
              style={{
                padding: '0.5rem',
                backgroundColor: activeTab === 'players' ? '#8b5cf6' : 'transparent',
                color: 'white',
                border: '1px solid #8b5cf6',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              👥 Players
            </button>
            
            <button
              onClick={() => setActiveTab('matches')}
              style={{
                padding: '0.5rem',
                backgroundColor: activeTab === 'matches' ? '#8b5cf6' : 'transparent',
                color: 'white',
                border: '1px solid #8b5cf6',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🏓 Matches
            </button>
            
            <button
              onClick={() => setActiveTab('prize-pool')}
              style={{
                padding: '0.5rem',
                backgroundColor: activeTab === 'prize-pool' ? '#8b5cf6' : 'transparent',
                color: 'white',
                border: '1px solid #8b5cf6',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              💰 Prize Pool
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '0.5rem',
                backgroundColor: activeTab === 'settings' ? '#8b5cf6' : 'transparent',
                color: 'white',
                border: '1px solid #8b5cf6',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              ⚙️ Settings
            </button>
          </div>
          
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={resetLadder}
              style={{
                padding: '0.5rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🔄 Reset Ladder
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>📊 Simulation Overview</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', color: '#8b5cf6' }}>👥</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                    {ladder?.players?.length || 0}
                  </div>
                  <div style={{ color: '#a0a0a0' }}>Active Players</div>
                </div>
                
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', color: '#10b981' }}>🏓</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                    {ladder?.matches?.length || 0}
                  </div>
                  <div style={{ color: '#a0a0a0' }}>Matches Played</div>
                </div>
                
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', color: '#f59e0b' }}>💰</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                    ${ladder?.prizePool?.totalCollected?.toFixed(2) || '0.00'}
                  </div>
                  <div style={{ color: '#a0a0a0' }}>Prize Pool</div>
                </div>
                
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', color: '#ef4444' }}>🎯</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                    {ladder?.prizePool?.activePlayerCount || 0}
                  </div>
                  <div style={{ color: '#a0a0a0' }}>Prize Eligible</div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>🎮 Simulation Status</h3>
                <div style={{ color: '#e0e0e0', lineHeight: '1.6' }}>
                  <p><strong>Period:</strong> {ladder?.prizePool?.periodName || 'Not set'}</p>
                  <p><strong>Auto Payments:</strong> {ladder?.simulationSettings?.autoProcessPayments ? '✅ Enabled' : '❌ Disabled'}</p>
                  <p><strong>Membership Fee:</strong> ${ladder?.simulationSettings?.simulatedMembershipFee || '10.00'}</p>
                  <p><strong>Match Fee:</strong> ${ladder?.simulationSettings?.simulatedMatchFee || '5.00'}</p>
                  <p><strong>Prize Seeding:</strong> ${ladder?.simulationSettings?.prizePoolSeeding || '5.00'} per player</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'players' && (
            <div>
              <h2 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>👥 Manage Players</h2>
              
              {/* Add Player Form */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>➕ Add New Player</h3>
                <form onSubmit={addPlayer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={newPlayer.email}
                    onChange={(e) => setNewPlayer({...newPlayer, email: e.target.value})}
                    required
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="First Name"
                    value={newPlayer.firstName}
                    onChange={(e) => setNewPlayer({...newPlayer, firstName: e.target.value})}
                    required
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={newPlayer.lastName}
                    onChange={(e) => setNewPlayer({...newPlayer, lastName: e.target.value})}
                    required
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Phone (optional)"
                    value={newPlayer.phone}
                    onChange={(e) => setNewPlayer({...newPlayer, phone: e.target.value})}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Fargo Rate"
                    value={newPlayer.fargoRate}
                    onChange={(e) => setNewPlayer({...newPlayer, fargoRate: parseInt(e.target.value)})}
                    min="0"
                    max="999"
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      gridColumn: '1 / -1'
                    }}
                  >
                    Add Player
                  </button>
                </form>
              </div>
              
              {/* Players List */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>📋 Current Players</h3>
                {ladder?.players?.length > 0 ? (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {ladder.players.map((player, index) => (
                      <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: '50px 1fr 100px 100px 100px',
                        gap: '1rem',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        alignItems: 'center'
                      }}>
                        <div style={{ color: '#8b5cf6', fontWeight: 'bold' }}>#{player.position}</div>
                        <div style={{ color: 'white' }}>{player.firstName} {player.lastName}</div>
                        <div style={{ color: '#a0a0a0' }}>{player.fargoRate}</div>
                        <div style={{ color: '#10b981' }}>{player.wins}W</div>
                        <div style={{ color: '#ef4444' }}>{player.losses}L</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#a0a0a0', textAlign: 'center', padding: '2rem' }}>
                    No players added yet. Add some players to get started!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div>
              <h2 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>🏓 Manage Matches</h2>
              
              {/* Create Match Form */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>➕ Create Match</h3>
                <form onSubmit={createMatch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <select
                    value={newMatch.player1Email}
                    onChange={(e) => setNewMatch({...newMatch, player1Email: e.target.value})}
                    required
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  >
                    <option value="">Select Player 1</option>
                    {ladder?.players?.map((player, index) => (
                      <option key={index} value={player.email}>
                        {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={newMatch.player2Email}
                    onChange={(e) => setNewMatch({...newMatch, player2Email: e.target.value})}
                    required
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  >
                    <option value="">Select Player 2</option>
                    {ladder?.players?.map((player, index) => (
                      <option key={index} value={player.email}>
                        {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={newMatch.winnerEmail}
                    onChange={(e) => setNewMatch({...newMatch, winnerEmail: e.target.value})}
                    required
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  >
                    <option value="">Select Winner</option>
                    {newMatch.player1Email && (
                      <option value={newMatch.player1Email}>
                        {ladder?.players?.find(p => p.email === newMatch.player1Email)?.firstName} {ladder?.players?.find(p => p.email === newMatch.player1Email)?.lastName}
                      </option>
                    )}
                    {newMatch.player2Email && (
                      <option value={newMatch.player2Email}>
                        {ladder?.players?.find(p => p.email === newMatch.player2Email)?.firstName} {ladder?.players?.find(p => p.email === newMatch.player2Email)?.lastName}
                      </option>
                    )}
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Score (e.g., 5-3)"
                    value={newMatch.score}
                    onChange={(e) => setNewMatch({...newMatch, score: e.target.value})}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                  
                  <select
                    value={newMatch.matchType}
                    onChange={(e) => setNewMatch({...newMatch, matchType: e.target.value})}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  >
                    <option value="standard">Standard</option>
                    <option value="smackdown">SmackDown</option>
                    <option value="fast_track">Fast Track</option>
                  </select>
                  
                  <input
                    type="number"
                    placeholder="Race Length"
                    value={newMatch.raceLength}
                    onChange={(e) => setNewMatch({...newMatch, raceLength: parseInt(e.target.value)})}
                    min="1"
                    max="15"
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                  
                  <button
                    type="submit"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      gridColumn: '1 / -1'
                    }}
                  >
                    Create Match
                  </button>
                </form>
              </div>
              
              {/* Matches List */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>📋 Recent Matches</h3>
                {ladder?.matches?.length > 0 ? (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {ladder.matches.slice(-10).reverse().map((match, index) => (
                      <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: '1rem',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        alignItems: 'center'
                      }}>
                        <div style={{ color: 'white', textAlign: 'right' }}>
                          {ladder.players.find(p => p._id === match.player1)?.firstName} {ladder.players.find(p => p._id === match.player1)?.lastName}
                        </div>
                        <div style={{ color: '#8b5cf6', fontWeight: 'bold', textAlign: 'center' }}>
                          {match.score}
                        </div>
                        <div style={{ color: 'white', textAlign: 'left' }}>
                          {ladder.players.find(p => p._id === match.player2)?.firstName} {ladder.players.find(p => p._id === match.player2)?.lastName}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#a0a0a0', textAlign: 'center', padding: '2rem' }}>
                    No matches created yet. Create some matches to see them here!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prize-pool' && (
            <div>
              <h2 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>💰 Prize Pool</h2>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>📊 Prize Pool Status</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                      ${ladder?.prizePool?.totalCollected?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ color: '#a0a0a0' }}>Total Collected</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                      ${ladder?.prizePool?.currentBalance?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ color: '#a0a0a0' }}>Current Balance</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                      {ladder?.prizePool?.activePlayerCount || 0}
                    </div>
                    <div style={{ color: '#a0a0a0' }}>Active Players</div>
                  </div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>🏆 Prize Distribution</h3>
                {ladder?.prizePool?.prizeCategories?.map((category, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '1rem',
                    padding: '0.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    alignItems: 'center'
                  }}>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>{category.name}</div>
                    <div style={{ color: '#8b5cf6' }}>
                      {category.isFixedAmount ? `$${category.amount?.toFixed(2)}` : `${category.percentage}%`}
                    </div>
                    <div style={{ color: '#10b981' }}>
                      ${category.amount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>⚙️ Simulation Settings</h2>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>🎮 Current Settings</h3>
                <div style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
                  <p><strong>Auto Process Payments:</strong> {ladder?.simulationSettings?.autoProcessPayments ? '✅ Enabled' : '❌ Disabled'}</p>
                  <p><strong>Auto Generate Matches:</strong> {ladder?.simulationSettings?.autoGenerateMatches ? '✅ Enabled' : '❌ Disabled'}</p>
                  <p><strong>Simulated Membership Fee:</strong> ${ladder?.simulationSettings?.simulatedMembershipFee || '10.00'}</p>
                  <p><strong>Simulated Match Fee:</strong> ${ladder?.simulationSettings?.simulatedMatchFee || '5.00'}</p>
                  <p><strong>Prize Pool Seeding:</strong> ${ladder?.simulationSettings?.prizePoolSeeding || '5.00'} per active player</p>
                </div>
                
                <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
                  <h4 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>ℹ️ Simulation Info</h4>
                  <div style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <p>• This is a completely independent simulation ladder for testing purposes</p>
                    <p>• All payments are automatically processed and simulated</p>
                    <p>• Prize pools are separate from real ladders</p>
                    <p>• Players and matches are isolated from production data</p>
                    <p>• Use this to test features before implementing on real ladders</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSimulationLadder;
