import { BACKEND_URL } from '@shared/config/config.js';

// Legacy endpoints (for backward compatibility)
export const getAllMatches = async (player, division, phase) => {
  const params = new URLSearchParams();
  if (player) params.append('player', player);
  if (division) params.append('division', division);
  if (phase) params.append('phase', phase);
  
  const response = await fetch(`${BACKEND_URL}/api/matches/all-matches?${params}`);
  if (!response.ok) throw new Error('Failed to fetch matches');
  return response.json();
};

export const getCompletedMatches = async (player, division) => {
  const params = new URLSearchParams();
  if (player) params.append('player', player);
  if (division) params.append('division', division);
  
  const response = await fetch(`${BACKEND_URL}/api/matches/completed-matches?${params}`);
  if (!response.ok) throw new Error('Failed to fetch completed matches');
  return response.json();
};

export const getMatchStats = async (player, division) => {
  const response = await fetch(`${BACKEND_URL}/api/matches/stats/${encodeURIComponent(player)}/${encodeURIComponent(division)}`);
  if (!response.ok) throw new Error('Failed to fetch match stats');
  return response.json();
};

// New match endpoints
export const getMatches = async (division = null, status = null) => {
  const params = new URLSearchParams();
  if (division) params.append('division', division);
  if (status) params.append('status', status);
  
  const response = await fetch(`${BACKEND_URL}/api/matches?${params}`);
  if (!response.ok) throw new Error('Failed to fetch matches');
  return response.json();
};

export const getMatchesByStatus = async (division, status) => {
  const response = await fetch(`${BACKEND_URL}/api/matches/status/${encodeURIComponent(division)}/${status}`);
  if (!response.ok) throw new Error('Failed to fetch matches by status');
  return response.json();
};

export const getPlayerMatches = async (playerId, division) => {
  const response = await fetch(`${BACKEND_URL}/api/matches/player/${encodeURIComponent(playerId)}/${encodeURIComponent(division)}`);
  if (!response.ok) throw new Error('Failed to fetch player matches');
  return response.json();
};

export const createMatchFromProposal = async (proposalId) => {
  const response = await fetch(`${BACKEND_URL}/api/matches/from-proposal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ proposalId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create match from proposal');
  }
  
  return response.json();
};

export const completeMatch = async (matchId, winner, score, notes = '') => {
  const response = await fetch(`${BACKEND_URL}/api/matches/${matchId}/complete`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ winner, score, notes })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete match');
  }
  
  return response.json();
};

export const cancelMatch = async (matchId, reason = '') => {
  const response = await fetch(`${BACKEND_URL}/api/matches/${matchId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel match');
  }
  
  return response.json();
};

export const getMatchStatistics = async (division) => {
  const response = await fetch(`${BACKEND_URL}/api/matches/stats/${encodeURIComponent(division)}`);
  if (!response.ok) throw new Error('Failed to fetch match statistics');
  return response.json();
};

// Helper function to get matches for dashboard display
export const getDashboardMatches = async (player, division) => {
  try {
    // Get both scheduled and completed matches using new endpoints
    const [scheduledMatches, completedMatches] = await Promise.all([
      getMatchesByStatus(division, 'scheduled'),
      getMatchesByStatus(division, 'completed')
    ]);
    
    // Filter for the specific player
    const playerScheduled = scheduledMatches.filter(match => 
      match.player1Id === player || match.player2Id === player
    );
    
    const playerCompleted = completedMatches.filter(match => 
      match.player1Id === player || match.player2Id === player
    );
    
    return {
      scheduled: playerScheduled,
      completed: playerCompleted,
      total: playerScheduled.length + playerCompleted.length
    };
    
  } catch (error) {
    console.error('Error fetching dashboard matches:', error);
    // Fallback to legacy endpoints
    const [scheduled, completed] = await Promise.all([
      getAllMatches(player, division, 'scheduled'),
      getCompletedMatches(player, division)
    ]);
    
    return {
      scheduled,
      completed,
      total: scheduled.length + completed.length
    };
  }
}; 