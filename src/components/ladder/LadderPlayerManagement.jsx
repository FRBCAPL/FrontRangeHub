import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL } from '../../config.js';
import DraggableModal from '../modal/DraggableModal';
import LadderApplicationsManager from '../admin/LadderApplicationsManager';
import MatchManager from '../admin/MatchManager';
import EmailManager from '../admin/EmailManager';
import { getCurrentDateString, dateStringToDate, dateToDateString } from '../../utils/dateUtils';
import styles from './LadderPlayerManagement.module.css';

export default function LadderPlayerManagement({ userPin }) {
  // Configure your league ID here - this should match your backend configuration
  const LEAGUE_ID = 'front-range-pool-hub';
  
  // State for available locations
  const [availableLocations, setAvailableLocations] = useState([]);
  
  // View state
  const [currentView, setCurrentView] = useState('players'); // 'players', 'matches', or 'emails'
  
  const [ladderPlayers, setLadderPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    fargoRate: '',
    location: '',
    isActive: true,
    ladderName: '499-under',
    sanctioned: false,
    sanctionYear: new Date().getFullYear(),
    lmsName: ''
  });
  
  // Match result states
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchFormData, setMatchFormData] = useState({
    matchId: '', // For reporting on existing matches
    challengerId: '',
    challengerName: '',
    challengerPosition: '',
    defenderId: '',
    defenderName: '',
    defenderPosition: '',
    winnerId: '',
    score: '',
    matchDate: getCurrentDateString(),
    matchFormat: 'race-to-5',
    location: '',
    notes: ''
  });
  const [matchHistory, setMatchHistory] = useState([]);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  
  // Create match states
  const [showCreateMatchForm, setShowCreateMatchForm] = useState(false);
  const [createMatchFormData, setCreateMatchFormData] = useState({
    matchType: 'challenge', // challenge, defense, position, exhibition
    challengerId: '',
    defenderId: '',
    matchFormat: 'race-to-5',
    proposedDate: getCurrentDateString(),
    location: '',
    notes: ''
  });
  
  // Pending matches for reporting results
  const [pendingMatches, setPendingMatches] = useState([]);
  const [showPendingMatches, setShowPendingMatches] = useState(false);
  
  // Race-to options display state
  const [showExtendedRaceOptions, setShowExtendedRaceOptions] = useState(false);
  
  // Ladder selection state
  const [selectedLadder, setSelectedLadder] = useState('499-under');
  
  // Applications manager state
  const [showApplicationsManager, setShowApplicationsManager] = useState(false);
  
  // Pending match editing states
  const [editingPendingMatch, setEditingPendingMatch] = useState(null);
  const [showEditPendingMatchForm, setShowEditPendingMatchForm] = useState(false);
  const [editPendingMatchFormData, setEditPendingMatchFormData] = useState({});
  const [showDeletePendingConfirm, setShowDeletePendingConfirm] = useState(false);
  const [pendingMatchToDelete, setPendingMatchToDelete] = useState(null);
  
  // Message state for notifications
  const [message, setMessage] = useState('');
  
  // LMS tracking states
  const [showLmsTracking, setShowLmsTracking] = useState(false);
  const [lmsMatches, setLmsMatches] = useState([]);
  const [lmsRefreshKey, setLmsRefreshKey] = useState(0);
  
  // Position swap states
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapFormData, setSwapFormData] = useState({
    player1Id: '',
    player2Id: ''
  });
  
  // Function to clear message after delay
  const clearMessage = () => {
    setTimeout(() => {
      setMessage('');
    }, 5000); // Clear after 5 seconds
  };

  // Helper function to render modals using portals
  const renderModal = (modalContent) => {
    return createPortal(modalContent, document.body);
  };



  // Fetch available locations from the backend
  const fetchLocations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.locations)) {
        setAvailableLocations(data.locations);
        console.log(`Loaded ${data.locations.length} locations from backend`);
      } else {
        console.error('Invalid locations response format:', data);
        setAvailableLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setAvailableLocations([]);
    }
  };

  // Fetch all ladder players across all ladders
  const fetchLadderPlayers = async () => {
    try {
      // Use the working endpoint that we know works
      const response = await fetch(`${BACKEND_URL}/api/ladder/ladders/${selectedLadder}/players`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setLadderPlayers(data);
        console.log(`Loaded ${data.length} ladder players from ladder endpoint`);
      } else {
        console.error('Invalid response format:', data);
        setLadderPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching ladder players:', error);
      setLadderPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    fetchLocations();
    fetchLadderPlayers();
  }, []);

  // Fetch ladder players when selectedLadder changes
  useEffect(() => {
    fetchLadderPlayers();
  }, [selectedLadder]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Add new ladder player
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/player/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setShowAddForm(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          fargoRate: '',
          location: '',
          isActive: true,
          ladderName: '499-under'
        });
        fetchLadderPlayers();
        alert('Ladder player added successfully!');
      } else {
        alert('Error adding ladder player: ' + (data.error || data.message));
      }
    } catch (error) {
      console.error('Error adding ladder player:', error);
      alert('Error adding ladder player');
    }
  };

  // Update existing ladder player
  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    try {
      // Use the correct endpoint for updating ladder players
      const response = await fetch(`${BACKEND_URL}/api/ladder/player/${editingPlayer._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          isActive: formData.isActive,
          fargoRate: formData.fargoRate,
          ladderName: formData.ladderName,
          sanctioned: formData.sanctioned,
          sanctionYear: formData.sanctionYear,
          lmsName: formData.lmsName
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditingPlayer(null);
        setFormData({
          name: '',
          email: '',
          phone: '',
          skillLevel: '',
          location: '',
          isActive: true
        });
        fetchLadderPlayers();
        alert('Ladder player updated successfully!');
      } else {
        alert('Error updating ladder player: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating ladder player:', error);
      alert('Error updating ladder player');
    }
  };

  // Start editing a ladder player
  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setFormData({
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      email: player.unifiedAccount?.email || '',
      phone: player.phone || '',
      fargoRate: player.fargoRate || '',
      location: player.location || '',
      isActive: player.isActive !== false,
      ladderName: player.ladderName || '499-under',
      sanctioned: player.sanctioned || false,
      sanctionYear: player.sanctionYear || new Date().getFullYear(),
      lmsName: player.lmsName || ''
    });
  };

  // Delete ladder player
  const handleDeletePlayer = async (playerEmail) => {
    if (!confirm('Are you sure you want to remove this player from the ladder?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/player/${playerEmail}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ladderName: 'General'
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchLadderPlayers();
        alert('Player removed from ladder successfully!');
      } else {
        alert('Error removing player: ' + data.message);
      }
    } catch (error) {
      console.error('Error removing ladder player:', error);
      alert('Error removing ladder player');
    }
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
    const player = ladderPlayers.find(p => p._id === playerId);
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
    const player = ladderPlayers.find(p => p._id === playerId);
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

  // Select an existing pending match to report results on
  const selectPendingMatch = (match) => {
    setMatchFormData({
      matchId: match._id,
      player1Id: match.challenger?._id || match.player1?._id || '',
      player1Name: `${match.challenger?.firstName || match.player1?.firstName} ${match.challenger?.lastName || match.player1?.lastName}`,
      challengerId: match.challenger?._id || match.player1?._id || '',
      challengerName: `${match.challenger?.firstName || match.player1?.firstName} ${match.challenger?.lastName || match.player1?.lastName}`,
      challengerPosition: match.challenger?.position || match.player1?.position,
      player2Id: match.defender?._id || match.player2?._id || '',
      player2Name: `${match.defender?.firstName || match.player2?.firstName} ${match.defender?.lastName || match.player2?.lastName}`,
      defenderId: match.defender?._id || match.player2?._id || '',
      defenderName: `${match.defender?.firstName || match.player2?.firstName} ${match.defender?.lastName || match.player2?.lastName}`,
      defenderPosition: match.defender?.position || match.player2?.position,
      winnerId: '',
      score: '',
      matchDate: match.scheduledDate ? dateToDateString(new Date(match.scheduledDate)) : getCurrentDateString(),
      matchFormat: match.matchFormat || match.raceLength || 'best-of-5',
      location: match.location || match.venue || '',
      notes: match.notes || ''
    });
    setShowMatchForm(true);
  };

  const submitMatchResult = async (e) => {
    e.preventDefault();
    
    if (!matchFormData.player1Id || !matchFormData.player2Id || !matchFormData.winnerId) {
      alert('Please select both players and a winner');
      return;
    }

    if (matchFormData.player1Id === matchFormData.player2Id) {
      alert('Players must be different');
      return;
    }

    try {
      setLoading(true);

      // If we have a matchId, we're updating an existing match, otherwise creating a new one
      const isUpdating = matchFormData.matchId;
      const url = isUpdating 
        ? `${BACKEND_URL}/api/ladder/matches/${matchFormData.matchId}/complete`
        : `${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches`;
      
      const method = isUpdating ? 'PATCH' : 'POST';
      
      const requestBody = isUpdating 
        ? {
            // For updating existing match with results - match backend expectations
            winnerId: matchFormData.winnerId,
            score: matchFormData.score,
            notes: matchFormData.notes,
            completedAt: new Date().toISOString()
          }
        : {
            // For creating new match
            challengerId: matchFormData.player1Id,
            defenderId: matchFormData.player2Id,
            matchType: 'challenge',
            proposedDate: new Date(matchFormData.matchDate).toISOString(),
            matchFormat: matchFormData.matchFormat,
            location: matchFormData.location,
            notes: matchFormData.notes
          };

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Match result recorded successfully! ${result.message}`);
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
           matchFormat: 'race-to-5',
           location: '',
           notes: ''
         });
        fetchLadderPlayers(); // Reload to show updated positions
      } else {
        alert(`Match recording failed: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Error recording match result:', error);
      alert('Error recording match result');
    } finally {
      setLoading(false);
    }
  };

    const loadMatchHistory = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading match history for ladder:', selectedLadder);
      const url = `${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches`;
      console.log('🔍 API URL:', url);
      
      const response = await fetch(url);
      console.log('🔍 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Match history data:', data);
        setMatchHistory(data.matches || []);
      } else {
        const errorText = await response.text();
        console.error('🔍 API Error:', response.status, errorText);
        alert(`Failed to load match history: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error loading match history:', error);
      alert(`Error loading match history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load pending matches for the selected ladder
  const loadPendingMatches = async () => {
    try {
      setLoading(true);
      
      // Fetch both regular pending matches and match scheduling requests
      const [matchesResponse, schedulingResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches?status=scheduled`),
        fetch(`${BACKEND_URL}/api/match-scheduling/pending`)
      ]);
      
      let allPendingMatches = [];
      
      // Process regular pending matches
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        const regularMatches = (matchesData.matches || []).map(match => ({
          ...match,
          type: 'regular',
          source: 'ladder'
        }));
        allPendingMatches = [...allPendingMatches, ...regularMatches];
      }
      
      // Process match scheduling requests
      if (schedulingResponse.ok) {
        const schedulingData = await schedulingResponse.json();
        const schedulingRequests = (schedulingData.requests || []).map(request => ({
          ...request,
          type: 'scheduling_request',
          source: 'match_scheduling',
          _id: request._id,
          challenger: { firstName: request.challengerName.split(' ')[0], lastName: request.challengerName.split(' ').slice(1).join(' ') },
          defender: { firstName: request.defenderName.split(' ')[0], lastName: request.defenderName.split(' ').slice(1).join(' ') },
          matchType: request.matchType,
          scheduledDate: request.preferredDate,
          location: request.location,
          notes: request.notes,
          status: request.status,
          submittedAt: request.submittedAt
        }));
        allPendingMatches = [...allPendingMatches, ...schedulingRequests];
      }
      
      console.log('Loaded all pending matches:', allPendingMatches);
      setPendingMatches(allPendingMatches);
      
    } catch (error) {
      console.error('Error loading pending matches:', error);
      alert('Error loading pending matches');
    } finally {
      setLoading(false);
    }
  };

  // Check if player is eligible for SmackBack (just won a SmackDown as defender)
  const checkSmackBackEligibility = async (challengerId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches?playerId=${challengerId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        const recentMatches = data.matches || [];
        
        // Look for the most recent completed SmackDown match where this player was the defender (player2) and won
        const recentSmackDownWin = recentMatches.find(match => 
          match.status === 'completed' &&
          match.matchType === 'smackdown' &&
          match.player2?._id === challengerId &&
          match.winner?._id === challengerId &&
          new Date(match.completedDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within last 7 days
        );
        
        return !!recentSmackDownWin;
      }
      return false;
    } catch (error) {
      console.error('Error checking SmackBack eligibility:', error);
      return false;
    }
  };

  // Create a new match between two players
  const createMatch = async (e) => {
    e.preventDefault();
    
    if (!createMatchFormData.challengerId || !createMatchFormData.defenderId) {
      alert('Please select both challenger and defender');
      return;
    }

    if (createMatchFormData.challengerId === createMatchFormData.defenderId) {
      alert('Challenger and defender must be different players');
      return;
    }

    // Get player positions to validate based on match type
    const challenger = ladderPlayers.find(p => p._id === createMatchFormData.challengerId);
    const defender = ladderPlayers.find(p => p._id === createMatchFormData.defenderId);
    
    if (challenger && defender) {
      const challengerPos = challenger.position || 0;
      const defenderPos = defender.position || 0;
      
      switch (createMatchFormData.matchType) {
        case 'challenge':
          // Challenge: Lower position (higher number) challenges higher position (lower number)
          if (challengerPos <= defenderPos) {
            alert('For Challenge Matches: Challenger must have a lower position number than defender');
            return;
          }
          break;
        case 'smackdown':
          // SmackDown: Higher position (lower number) can challenge lower position (higher number) up to 5 positions below
          if (challengerPos >= defenderPos || (defenderPos - challengerPos) > 5) {
            alert('For SmackDown Matches: Challenger must have a higher position number than defender (up to 5 positions below)');
            return;
          }
          break;
        case 'smackback':
          // SmackBack: Only a defender who just won a SmackDown can challenge the 1st place player
          if (defenderPos !== 1) {
            alert('For SmackBack Matches: Can only challenge the player in 1st place');
            return;
          }
          
          // Check if challenger is eligible for SmackBack (just won a SmackDown as defender)
          const isEligible = await checkSmackBackEligibility(createMatchFormData.challengerId);
          if (!isEligible) {
            alert('For SmackBack Matches: Challenger must have just won a SmackDown match as a defender within the last 7 days');
            return;
          }
          break;
        case 'defense':
          // Defense: Higher position (lower number) defends against lower position (higher number)
          if (challengerPos >= defenderPos) {
            alert('For Defense Matches: Challenger must have a higher position number than defender');
            return;
          }
          break;
        case 'position':
          // Position: Players at same position compete
          if (challengerPos !== defenderPos) {
            alert('For Position Matches: Both players must be at the same position');
            return;
          }
          break;
        case 'exhibition':
          // Exhibition: Any positions allowed
          break;
        default:
          alert('Please select a valid match type');
          return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createMatchFormData,
          status: 'scheduled',
          proposedDate: dateStringToDate(createMatchFormData.proposedDate)
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Match created successfully! Players can now play and report the result.');
        setShowCreateMatchForm(false);
                 setCreateMatchFormData({
           matchType: 'challenge',
           challengerId: '',
           defenderId: '',
           matchFormat: 'race-to-5',
           proposedDate: getCurrentDateString(),
           location: '',
           notes: ''
         });
        loadPendingMatches(); // Reload pending matches
      } else {
        alert(`Match creation failed: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Error creating match');
    } finally {
      setLoading(false);
    }
  };

  // Handle create match form input changes
  const handleCreateMatchInputChange = (e) => {
    const { name, value } = e.target;
    setCreateMatchFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle player selection in create match form
  const handleCreateMatchChallengerSelect = (e) => {
    const playerId = e.target.value;
    setCreateMatchFormData(prev => ({
      ...prev,
      challengerId: playerId
    }));
  };

  const handleCreateMatchDefenderSelect = (e) => {
    const playerId = e.target.value;
    setCreateMatchFormData(prev => ({
      ...prev,
      defenderId: playerId
    }));
  };

  const openFargoUpdater = () => {
    // Open the Fargo updater in a new window/tab
    const fargoUpdaterUrl = `${BACKEND_URL.replace('/api', '')}/static/fargo-updater.html`;
    window.open(fargoUpdaterUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  const openLadderPromotion = () => {
    // Open the ladder promotion tool in a new window/tab
    const promotionUrl = `${BACKEND_URL.replace('/api', '')}/static/ladder-promotion.html`;
    window.open(promotionUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  // Handle editing a pending match
  const handleEditPendingMatch = (match) => {
    setEditingPendingMatch(match);
    setEditPendingMatchFormData({
      matchType: match.matchType || 'challenge',
      matchFormat: match.matchFormat || 'race-to-5',
      scheduledDate: match.scheduledDate ? 
        dateToDateString(new Date(match.scheduledDate)) : 
        match.proposedDate ? 
          dateToDateString(new Date(match.proposedDate)) : '',
      location: match.location || match.venue || '',
      notes: match.notes || '',
      entryFee: match.entryFee || 0,
      gameType: match.gameType || '8-ball',
      tableSize: match.tableSize || '7-foot'
    });
    setShowEditPendingMatchForm(true);
  };

  // Handle deleting a pending match
  const handleDeletePendingMatch = (match) => {
    setPendingMatchToDelete(match);
    setShowDeletePendingConfirm(true);
  };

  // Confirm delete pending match
  const confirmDeletePendingMatch = async () => {
    if (!pendingMatchToDelete) return;
    
    try {
      setLoading(true);
      const matchId = pendingMatchToDelete._id || pendingMatchToDelete.id;
      console.log('Deleting match ID:', matchId);
      
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches/${matchId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Reload pending matches
        await loadPendingMatches();
        setMessage('Pending match deleted successfully');
      } else {
        const errorData = await response.json();
        setMessage(`Failed to delete pending match: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting pending match:', error);
      setMessage('Error deleting pending match');
    } finally {
      setLoading(false);
      setShowDeletePendingConfirm(false);
      setPendingMatchToDelete(null);
    }
  };

  // Handle approving a match scheduling request
  const handleApproveSchedulingRequest = async (match) => {
    if (!confirm(`Approve match request: ${match.challenger?.firstName} ${match.challenger?.lastName} vs ${match.defender?.firstName} ${match.defender?.lastName}?\n\nThis will add the match to the calendar.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // First approve the scheduling request
      const approveResponse = await fetch(`${BACKEND_URL}/api/match-scheduling/${match._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewedBy: 'Admin',
          adminNotes: 'Approved by ladder admin'
        })
      });

      if (approveResponse.ok) {
        // Now add the match to both individual calendars AND the main ladder calendar
        try {
          // 1. Add to individual player calendars
          const calendarResponse = await fetch(`${BACKEND_URL}/api/calendar/add-match`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `${match.challenger?.firstName} ${match.challenger?.lastName} vs ${match.defender?.firstName} ${match.defender?.lastName}`,
              description: `Match Type: ${match.matchType}\nLocation: ${match.location}\nNotes: ${match.notes || 'N/A'}`,
              location: match.location,
              startDateTime: match.scheduledDate,
              endDateTime: new Date(new Date(match.scheduledDate).getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
              matchDetails: {
                challenger: `${match.challenger?.firstName} ${match.challenger?.lastName}`,
                defender: `${match.defender?.firstName} ${match.defender?.lastName}`,
                matchType: match.matchType,
                division: selectedLadder,
                proposalId: match._id
              }
            })
          });

          // 2. Create ladder match record for main public calendar
          const ladderMatchResponse = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${selectedLadder}/matches`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              challengerId: match.challengerId || 'unknown',
              defenderId: match.defenderId || 'unknown',
              matchType: match.matchType || 'challenge',
              proposedDate: match.scheduledDate,
              matchFormat: 'race-to-5',
              location: match.location,
              notes: match.notes || '',
              status: 'scheduled'
            })
          });

          if (calendarResponse.ok && ladderMatchResponse.ok) {
            setMessage('✅ Match approved and added to both individual calendars and main ladder calendar!');
          } else if (calendarResponse.ok) {
            setMessage('✅ Match approved and added to individual calendars, but failed to add to main ladder calendar.');
          } else if (ladderMatchResponse.ok) {
            setMessage('✅ Match approved and added to main ladder calendar, but failed to add to individual calendars.');
          } else {
            setMessage('✅ Match approved, but failed to add to calendars. Please add manually.');
          }
        } catch (calendarError) {
          console.error('Error adding to calendar:', calendarError);
          setMessage('✅ Match approved, but failed to add to calendars. Please add manually.');
        }
        
        await loadPendingMatches(); // Reload the list
      } else {
        const errorData = await approveResponse.json();
        setMessage(`❌ Failed to approve request: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving match scheduling request:', error);
      setMessage('❌ Error approving match scheduling request');
    } finally {
      setLoading(false);
    }
  };

  // Handle rejecting a match scheduling request
  const handleRejectSchedulingRequest = async (match) => {
    const reason = prompt(`Reject match request: ${match.challenger?.firstName} ${match.challenger?.lastName} vs ${match.defender?.firstName} ${match.defender?.lastName}?\n\nPlease provide a reason:`);
    
    if (!reason) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/match-scheduling/${match._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewedBy: 'Admin',
          adminNotes: reason
        })
      });

      if (response.ok) {
        setMessage('❌ Match scheduling request rejected.');
        await loadPendingMatches(); // Reload the list
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to reject request: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error rejecting match scheduling request:', error);
      setMessage('❌ Error rejecting match scheduling request');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit pending match form submission
  const handleEditPendingMatchSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingPendingMatch) return;
    
    try {
      setLoading(true);
      
      // Prepare the data for the backend, ensuring proper date formatting
      const updateData = {
        // Only send fields that the backend expects for pending match updates
        scheduledDate: editPendingMatchFormData.scheduledDate ? 
          new Date(editPendingMatchFormData.scheduledDate + 'T12:00:00').toISOString() : 
          null,
        venue: editPendingMatchFormData.location || null,
        notes: editPendingMatchFormData.notes || null,
        entryFee: editPendingMatchFormData.entryFee || 0,
        gameType: editPendingMatchFormData.gameType || '8-ball',
        tableSize: editPendingMatchFormData.tableSize || '7-foot'
      };
      
      console.log('Sending update data:', JSON.stringify(updateData, null, 2));
      console.log('Original form data:', JSON.stringify(editPendingMatchFormData, null, 2));
      
      const matchId = editingPendingMatch._id || editingPendingMatch.id;
      console.log('Editing match ID:', matchId);
      
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Match update successful:', result);
        setMessage('✅ Pending match updated successfully');
        clearMessage();
        setShowEditPendingMatchForm(false);
        setEditingPendingMatch(null);
        // Reload pending matches to show updated data
        await loadPendingMatches();
      } else {
        const errorData = await response.json();
        console.error('Failed to update pending match:', JSON.stringify(errorData, null, 2));
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        setMessage(`❌ Failed to update pending match: ${errorData.message || 'Unknown error'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error updating pending match:', error);
      setMessage('❌ Error updating pending match');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  // Handle edit form input changes
  const handleEditPendingFormChange = (e) => {
    const { name, value } = e.target;
    setEditPendingMatchFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  // LMS tracking functions
  const loadLmsMatches = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches`);
      if (response.ok) {
        const data = await response.json();
        // Filter for completed matches that need LMS entry or are in progress
        const completedMatches = data.matches.filter(match => 
          match.status === 'completed' && 
          (!match.lmsStatus || match.lmsStatus === 'not_entered' || match.lmsStatus === 'scheduled')
        );
        console.log('LMS Matches data:', completedMatches);
        // Debug the first match to see date structure
        if (completedMatches.length > 0) {
          console.log('First match date data:', {
            completedDate: completedMatches[0].completedDate,
            scheduledDate: completedMatches[0].scheduledDate,
            completedDateType: typeof completedMatches[0].completedDate,
            scheduledDateType: typeof completedMatches[0].scheduledDate,
            fullMatch: completedMatches[0]
          });
        }
        setLmsMatches(completedMatches);
        setLmsRefreshKey(Date.now());
      }
    } catch (error) {
      console.error('Error loading LMS matches:', error);
    }
  };

  const markMatchAsLmsScheduled = async (matchId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lmsStatus: 'scheduled',
          lmsScheduledAt: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setMessage('✅ Match marked as scheduled in LMS');
        clearMessage();
        await loadLmsMatches();
      }
    } catch (error) {
      console.error('Error updating LMS status:', error);
      setMessage('❌ Error updating LMS status');
      clearMessage();
    }
  };

  const markMatchAsLmsCompleted = async (matchId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/${LEAGUE_ID}/ladders/${selectedLadder}/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lmsStatus: 'completed',
          lmsCompletedAt: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setMessage('✅ Match marked as scored in LMS');
        clearMessage();
        await loadLmsMatches();
      }
    } catch (error) {
      console.error('Error updating LMS status:', error);
      setMessage('❌ Error updating LMS status');
      clearMessage();
    }
  };

  // Fix all positions - renumber sequentially
  const fixAllPositions = async () => {
    if (!confirm('This will renumber all ladder positions sequentially from 1. Continue?')) {
      return;
    }

    try {
      setMessage('🔄 Fixing all positions...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/ladders/${selectedLadder}/fix-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Positions fixed! ${data.message}`);
        clearMessage();
        await fetchLadderPlayers(); // Refresh the ladder display
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to fix positions'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error fixing positions:', error);
      setMessage('❌ Error fixing positions');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  // Swap player positions
  const swapPlayerPositions = async () => {
    if (!swapFormData.player1Id || !swapFormData.player2Id) {
      alert('Please select both players to swap');
      return;
    }

    if (swapFormData.player1Id === swapFormData.player2Id) {
      alert('Cannot swap a player with themselves');
      return;
    }

    try {
      setMessage('🔄 Swapping player positions...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/players/swap-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player1Id: swapFormData.player1Id,
          player2Id: swapFormData.player2Id
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Positions swapped successfully!`);
        clearMessage();
        setShowSwapModal(false);
        setSwapFormData({ player1Id: '', player2Id: '' });
        await fetchLadderPlayers();
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to swap positions'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error swapping positions:', error);
      setMessage('❌ Error swapping positions');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading ladder players...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{currentView === 'players' ? 'Ladder Player Management' : 'Ladder Match Manager'}</h2>
         <div className={styles.headerContent}>
           <div className={styles.ladderSelector}>
             <label htmlFor="ladderSelect">Select Ladder:</label>
             <select
               id="ladderSelect"
               value={selectedLadder}
               onChange={(e) => setSelectedLadder(e.target.value)}
               className={styles.ladderSelect}
             >
               <option value="499-under">499 & Under</option>
               <option value="500-549">500-549</option>
               <option value="550-plus">550+</option>
             </select>
           </div>
                       <div className={styles.headerButtons}>
        <button 
          className={styles.addButton}
                 onClick={() => {
                   window.scrollTo(0, 0);
                   setShowAddForm(true);
                 }}
        >
          Add New Ladder Player
               </button>
                             <button 
                 className={styles.createMatchButton}
                 onClick={() => {
                   window.scrollTo(0, 0);
                   setShowCreateMatchForm(true);
                 }}
                 disabled={ladderPlayers.filter(p => p.ladderName === selectedLadder).length < 2}
               >
                 Create Match
               </button>
              <button 
                className={styles.pendingMatchesButton}
                onClick={() => {
                  setShowPendingMatches(true);
                  loadPendingMatches();
                }}
              >
                View Pending Matches
              </button>
    {currentView === 'players' ? (
      <div style={{ display: 'flex', gap: '10px', marginLeft: '10px' }}>
        <button 
          className={styles.matchManagerButton}
          onClick={() => setCurrentView('matches')}
          style={{ 
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)', 
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🎯 Match Manager
        </button>
        <button 
          className={styles.emailManagerButton}
          onClick={() => setCurrentView('emails')}
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📧 Email Manager
        </button>
      </div>
    ) : (
      <button 
        className={styles.backButton}
        onClick={() => setCurrentView('players')}
        style={{ 
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', 
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '5px',
          cursor: 'pointer',
          marginLeft: '10px'
        }}
      >
        ← Back to Players
      </button>
    )}
                             <button 
                 className={styles.matchButton}
                 onClick={() => {
                   window.scrollTo(0, 0);
                   setShowMatchForm(true);
                 }}
                 disabled={ladderPlayers.filter(p => p.ladderName === selectedLadder).length < 2}
               >
                 Report Match Result
               </button>
              <button 
                className={styles.historyButton}
                onClick={() => {
                  setShowMatchHistory(!showMatchHistory);
                  if (!showMatchHistory) {
                    loadMatchHistory();
                  }
                }}
              >
                {showMatchHistory ? 'Hide Match History' : 'View Match History'}
        </button>
              <button 
                className={styles.applicationsButton}
                onClick={() => setShowApplicationsManager(true)}
                style={{
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  margin: '5px'
                }}
              >
                🏆 View Pending Applications
        </button>
              <button 
                onClick={openFargoUpdater}
                style={{
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  margin: '5px'
                }}
              >
                🎯 Update Fargo Ratings
        </button>
              <button 
                onClick={openLadderPromotion}
                style={{
                  background: 'linear-gradient(135deg, #28a745, #20c997)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  margin: '5px'
                }}
              >
                ⬆️ Promote Players
        </button>
              <button 
                onClick={() => {
                  setShowLmsTracking(true);
                  // Force refresh by clearing cache and reloading
                  setLmsMatches([]);
                  setTimeout(() => {
                    loadLmsMatches();
                  }, 100);
                }}
                style={{
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  margin: '5px'
                }}
              >
                📊 LMS Tracking
        </button>
              <button 
                onClick={fixAllPositions}
                style={{
                  background: 'linear-gradient(135deg, #00b894, #00cec9)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  margin: '5px'
                }}
              >
                🔢 Fix All Positions
        </button>
              <button 
                onClick={() => setShowSwapModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  margin: '5px'
                }}
              >
                🔄 Swap Player Positions
        </button>
            </div>
         </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={styles.messageDisplay}>
          {message}
        </div>
      )}

      {/* Add Player Form */}
      {showAddForm && renderModal(
        <DraggableModal
          open={showAddForm}
          onClose={() => setShowAddForm(false)}
          title="Add New Ladder Player"
          maxWidth="600px"
          maxHeight="90vh"
        >
          <form onSubmit={handleAddPlayer}>
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="fargoRate"
                placeholder="Fargo Rate"
                value={formData.fargoRate}
                onChange={handleInputChange}
                required
              />
              <select
                name="ladderName"
                value={formData.ladderName}
                onChange={handleInputChange}
                required
              >
                <option value="499-under">499 & Under</option>
                <option value="500-549">500-549</option>
                <option value="550-plus">550+</option>
              </select>
               <select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                 required
               >
                 <option value="">Select Preferred Location</option>
                 {availableLocations.length > 0 ? (
                   availableLocations.map(location => (
                     <option key={location._id} value={location.name}>
                       {location.name}
                     </option>
                   ))
                 ) : (
                   <option value="" disabled>Loading locations...</option>
                 )}
               </select>
              <div className={styles.checkboxes}>
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active on Ladder
                </label>
              </div>
              <div className={styles.formButtons}>
                <button type="submit">Add Player</button>
                <button type="button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
          </form>
        </DraggableModal>
      )}

               {/* Create Match Form */}
        {showCreateMatchForm && renderModal(
          <DraggableModal
            open={showCreateMatchForm}
            onClose={() => setShowCreateMatchForm(false)}
            title="Create New Match"
            maxWidth="700px"
            maxHeight="90vh"
          >
              <form onSubmit={createMatch}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Match Type:</label>
                                         <select
                       name="matchType"
                       value={createMatchFormData.matchType}
                       onChange={handleCreateMatchInputChange}
                       required
                     >
                                               <option value="challenge">Challenge Match</option>
                        <option value="smackdown">SmackDown</option>
                        <option value="smackback">SmackBack</option>
                     </select>
                  </div>
                  
                                     <div className={styles.formGroup}>
                     <label>Race to:</label>
                                           <select
                        name="matchFormat"
                        value={createMatchFormData.matchFormat}
                        onChange={handleCreateMatchInputChange}
                        required
                      >
                        <option value="race-to-5">Race to 5</option>
                        <option value="race-to-7">Race to 7</option>
                        <option value="race-to-9">Race to 9</option>
                        {showExtendedRaceOptions && (
                          <>
                            <option value="race-to-6">Race to 6</option>
                            <option value="race-to-8">Race to 8</option>
                            <option value="race-to-10">Race to 10</option>
                            <option value="race-to-11">Race to 11</option>
                            <option value="race-to-12">Race to 12</option>
                            <option value="race-to-13">Race to 13</option>
                            <option value="race-to-14">Race to 14</option>
                            <option value="race-to-15">Race to 15</option>
                            <option value="race-to-16">Race to 16</option>
                            <option value="race-to-17">Race to 17</option>
                            <option value="race-to-18">Race to 18</option>
                            <option value="race-to-19">Race to 19</option>
                            <option value="race-to-20">Race to 20</option>
                            <option value="race-to-21">Race to 21</option>
                          </>
                        )}
                      </select>
                      <button
                        type="button"
                        className={styles.moreOptionsButton}
                        onClick={() => setShowExtendedRaceOptions(!showExtendedRaceOptions)}
                      >
                        {showExtendedRaceOptions ? 'Hide Options' : 'More Options'}
                      </button>
                   </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Challenger :</label>
                    <select 
                      value={createMatchFormData.challengerId} 
                      onChange={handleCreateMatchChallengerSelect}
                      required
                    >
                      <option value="">Select Challenger</option>
                      {ladderPlayers
                        .filter(player => player.ladderName === selectedLadder)
                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                        .map(player => (
                        <option key={player._id} value={player._id}>
                          #{player.position} - {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Defender :</label>
                    <select 
                      value={createMatchFormData.defenderId} 
                      onChange={handleCreateMatchDefenderSelect}
                      required
                    >
                      <option value="">Select Defender</option>
                      {ladderPlayers
                        .filter(player => player.ladderName === selectedLadder)
                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                        .map(player => (
                        <option key={player._id} value={player._id}>
                          #{player.position} - {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                                                               <div className={styles.formRow}>
                                      <div className={styles.formGroup}>
                      <label>Match Date:</label>
                     <input
                       type="date"
                       name="proposedDate"
                       value={createMatchFormData.proposedDate}
                       onChange={handleCreateMatchInputChange}
                       required
                     />
                   </div>
                   
                   <div className={styles.formGroup}>
                     <label>Location:</label>
                     <select
                       name="location"
                       value={createMatchFormData.location}
                       onChange={handleCreateMatchInputChange}
                       required
                     >
                       <option value="">Select Location</option>
                       {availableLocations.length > 0 ? (
                         availableLocations.map(location => (
                           <option key={location._id} value={location.name}>
                             {location.name}
                           </option>
                         ))
                       ) : (
                         <option value="" disabled>Loading locations...</option>
                       )}
                     </select>
                   </div>
                   
                   <div className={styles.formGroup}>
                     <label>Notes:</label>
                     <input
                       type="text"
                       name="notes"
                       value={createMatchFormData.notes}
                       onChange={handleCreateMatchInputChange}
                       placeholder="Optional match notes"
                     />
                   </div>
                 </div>

               <div className={styles.formButtons}>
                 <button type="submit" disabled={loading}>
                   {loading ? 'Creating...' : 'Create Match'}
                 </button>
                 <button type="button" onClick={() => setShowCreateMatchForm(false)}>
                   Cancel
                 </button>
               </div>
             </form>
          </DraggableModal>
        )}

      {/* Edit Player Form */}
      {editingPlayer && renderModal(
        <div className={styles.formOverlay}>
          <div className={styles.form}>
            <h3>Edit Ladder Player: {editingPlayer.name}</h3>
            <form onSubmit={handleUpdatePlayer}>
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="fargoRate"
                placeholder="Fargo Rate"
                value={formData.fargoRate}
                onChange={handleInputChange}
                required
              />
              <select
                name="ladderName"
                value={formData.ladderName}
                onChange={handleInputChange}
                required
              >
                <option value="499-under">499 & Under</option>
                <option value="500-549">500-549</option>
                <option value="550-plus">550+</option>
              </select>
                             <select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
               >
                 <option value="">Select Preferred Location</option>
                 {availableLocations.length > 0 ? (
                   availableLocations.map(location => (
                     <option key={location._id} value={location.name}>
                       {location.name}
                     </option>
                   ))
                 ) : (
                   <option value="" disabled>Loading locations...</option>
                 )}
               </select>
              <div className={styles.checkboxes}>
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active on Ladder
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="sanctioned"
                    checked={formData.sanctioned}
                    onChange={handleInputChange}
                  />
                  BCA Sanctioned
                </label>
              </div>
              <input
                type="number"
                name="sanctionYear"
                placeholder="Sanction Year"
                value={formData.sanctionYear}
                onChange={handleInputChange}
                min="2020"
                max="2030"
              />
              <input
                type="text"
                name="lmsName"
                placeholder="LMS Name (for Fargo matching)"
                value={formData.lmsName}
                onChange={handleInputChange}
              />
              <div className={styles.formButtons}>
                <button type="submit">Update Player</button>
                <button type="button" onClick={() => setEditingPlayer(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swap Player Positions Modal */}
      {showSwapModal && renderModal(
        <DraggableModal
          open={showSwapModal}
          onClose={() => setShowSwapModal(false)}
          title="Swap Player Positions"
          maxWidth="500px"
        >
          <div style={{ padding: '20px' }}>
            <p>Select two players to swap their ladder positions:</p>
            
            <div style={{ marginBottom: '15px' }}>
              <label>Player 1:</label>
              <select
                value={swapFormData.player1Id}
                onChange={(e) => setSwapFormData({...swapFormData, player1Id: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="">Select first player</option>
                {ladderPlayers.filter(p => p.ladderName === selectedLadder).map(player => (
                  <option key={player._id} value={player._id}>
                    #{player.position} - {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label>Player 2:</label>
              <select
                value={swapFormData.player2Id}
                onChange={(e) => setSwapFormData({...swapFormData, player2Id: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="">Select second player</option>
                {ladderPlayers.filter(p => p.ladderName === selectedLadder).map(player => (
                  <option key={player._id} value={player._id}>
                    #{player.position} - {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={swapPlayerPositions}
                style={{
                  background: '#f39c12',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Swap Positions
              </button>
              <button 
                onClick={() => setShowSwapModal(false)}
                style={{
                  background: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Match Result Form */}
      {showMatchForm && renderModal(
        <DraggableModal
          open={showMatchForm}
          onClose={() => setShowMatchForm(false)}
          title="Report Match Result"
          maxWidth="700px"
          maxHeight="90vh"
        >
            <form onSubmit={submitMatchResult}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Player 1:</label>
                  <select 
                    value={matchFormData.player1Id} 
                    onChange={handlePlayer1Select}
                    required
                  >
                                         <option value="">Select Player 1</option>
                     {ladderPlayers
                       .filter(player => player.ladderName === selectedLadder)
                       .map(player => (
                       <option key={player._id} value={player._id}>
                         #{player.position} - {player.firstName} {player.lastName}
                       </option>
                     ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Player 2:</label>
                  <select 
                    value={matchFormData.player2Id} 
                    onChange={handlePlayer2Select}
                    required
                  >
                                         <option value="">Select Player 2</option>
                     {ladderPlayers
                       .filter(player => player.ladderName === selectedLadder)
                       .map(player => (
                       <option key={player._id} value={player._id}>
                         #{player.position} - {player.firstName} {player.lastName}
                       </option>
                     ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
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
                
                <div className={styles.formGroup}>
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

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Match Date:</label>
                  <input
                    type="date"
                    name="matchDate"
                    value={matchFormData.matchDate}
                    onChange={handleMatchInputChange}
                    required
                  />
                </div>
                
                                 <div className={styles.formGroup}>
                   <label>Race to:</label>
                                       <select
                      name="matchFormat"
                      value={matchFormData.matchFormat}
                      onChange={handleMatchInputChange}
                      required
                    >
                      <option value="race-to-5">Race to 5</option>
                      <option value="race-to-7">Race to 7</option>
                      <option value="race-to-9">Race to 9</option>
                      {showExtendedRaceOptions && (
                        <>
                          <option value="race-to-6">Race to 6</option>
                          <option value="race-to-8">Race to 8</option>
                          <option value="race-to-10">Race to 10</option>
                          <option value="race-to-11">Race to 11</option>
                          <option value="race-to-12">Race to 12</option>
                          <option value="race-to-13">Race to 13</option>
                          <option value="race-to-14">Race to 14</option>
                          <option value="race-to-15">Race to 15</option>
                          <option value="race-to-16">Race to 16</option>
                          <option value="race-to-17">Race to 17</option>
                          <option value="race-to-18">Race to 18</option>
                          <option value="race-to-19">Race to 19</option>
                          <option value="race-to-20">Race to 20</option>
                          <option value="race-to-21">Race to 21</option>
                        </>
                      )}
                    </select>
                    <button
                      type="button"
                      className={styles.moreOptionsButton}
                      onClick={() => setShowExtendedRaceOptions(!showExtendedRaceOptions)}
                    >
                      {showExtendedRaceOptions ? 'Hide Options' : 'More Options'}
                    </button>
                 </div>
              </div>

              <div className={styles.formRow}>
                                 <div className={styles.formGroup}>
                   <label>Location:</label>
                   <select
                     name="location"
                     value={matchFormData.location}
                     onChange={handleMatchInputChange}
                     required
                   >
                     <option value="">Select Location</option>
                     {availableLocations.length > 0 ? (
                       availableLocations.map(location => (
                         <option key={location._id} value={location.name}>
                           {location.name}
                         </option>
                       ))
                     ) : (
                       <option value="" disabled>Loading locations...</option>
                     )}
                   </select>
                 </div>
                
                <div className={styles.formGroup}>
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

              <div className={styles.formButtons}>
                <button type="submit" disabled={loading}>
                  {loading ? 'Recording...' : 'Record Match Result'}
                </button>
                <button type="button" onClick={() => setShowMatchForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
        </DraggableModal>
      )}

      {/* Pending Matches Modal */}
      {showPendingMatches && renderModal(
        <DraggableModal
          open={showPendingMatches}
          onClose={() => setShowPendingMatches(false)}
          title="Pending Matches"
          maxWidth="65vw"
        >
          <div className={styles.pendingMatchesModal}>
            {pendingMatches.length === 0 ? (
              <div className={styles.noData}>No pending matches for this ladder.</div>
            ) : (
              <div className={styles.pendingMatchesTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Challenger</th>
                      <th>Defender</th>
                      <th>Format</th>
                      <th>Location</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMatches.map((match, index) => (
                      <tr key={match._id || match.id || index}>
                        <td>{match.scheduledDate ? 
                             new Date(match.scheduledDate).toLocaleDateString() : 
                             match.proposedDate ? 
                             new Date(match.proposedDate).toLocaleDateString() : 
                             'TBD'}</td>
                        <td>
                          <span className={`${styles.matchType} ${styles[match.matchType || 'challenge']}`}>
                            {match.matchType === 'challenge' ? 'Challenge' :
                             match.matchType === 'smackdown' ? 'SmackDown' :
                             match.matchType === 'smackback' ? 'SmackBack' : 'Challenge'}
                          </span>
                        </td>
                        <td>
                          <strong>{match.challenger?.firstName || match.player1?.firstName} {match.challenger?.lastName || match.player1?.lastName}</strong>
                          {(match.challenger?.position || match.player1?.position) && ` (#${match.challenger?.position || match.player1?.position})`}
                          <br />
                          <small style={{color: '#06b6d4'}}>Challenger</small>
                        </td>
                        <td>
                          <strong>{match.defender?.firstName || match.player2?.firstName} {match.defender?.lastName || match.player2?.lastName}</strong>
                          {(match.defender?.position || match.player2?.position) && ` (#${match.defender?.position || match.player2?.position})`}
                          <br />
                          <small style={{color: '#f59e0b'}}>Defender</small>
                        </td>
                        <td>{match.matchFormat || match.raceLength || 'N/A'}</td>
                        <td>{match.location || match.venue || 'N/A'}</td>
                        <td>{match.notes || 'N/A'}</td>
                        <td>
                          <span className={`${styles.status} ${styles.pending}`}>
                            {match.type === 'scheduling_request' ? '📋 Request' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.matchActions}>
                            {match.type === 'scheduling_request' ? (
                              // Actions for match scheduling requests
                              <>
                                <button 
                                  className={styles.approveButton}
                                  onClick={() => handleApproveSchedulingRequest(match)}
                                  title="Approve Match Request"
                                >
                                  ✅
                                </button>
                                <button 
                                  className={styles.rejectButton}
                                  onClick={() => handleRejectSchedulingRequest(match)}
                                  title="Reject Match Request"
                                >
                                  ❌
                                </button>
                              </>
                            ) : (
                              // Actions for regular pending matches
                              <>
                                <button 
                                  className={styles.reportResultButton}
                                  onClick={() => {
                                    selectPendingMatch(match);
                                    setShowPendingMatches(false); // Close the pending matches modal
                                  }}
                                  title="Report Result"
                                >
                                  📊
                                </button>
                                <button 
                                  className={styles.editButton}
                                  onClick={() => handleEditPendingMatch(match)}
                                  title="Edit Match"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className={styles.deleteButton}
                                  onClick={() => handleDeletePendingMatch(match)}
                                  title="Delete Match"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DraggableModal>
      )}

      {/* Edit Pending Match Form */}
      {showEditPendingMatchForm && editingPendingMatch && renderModal(
        <DraggableModal
          open={showEditPendingMatchForm}
          onClose={() => {
            setShowEditPendingMatchForm(false);
            setEditingPendingMatch(null);
          }}
          title="Edit Pending Match"
          maxWidth="60vw"
        >
          <div className={styles.editPendingMatchForm}>
            <form onSubmit={handleEditPendingMatchSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Match Type:</label>
                  <select
                    name="matchType"
                    value={editPendingMatchFormData.matchType}
                    onChange={handleEditPendingFormChange}
                  >
                    <option value="challenge">Challenge</option>
                    <option value="smackdown">SmackDown</option>
                    <option value="smackback">SmackBack</option>
                    <option value="defense">Defense</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Match Format:</label>
                  <select
                    name="matchFormat"
                    value={editPendingMatchFormData.matchFormat}
                    onChange={handleEditPendingFormChange}
                  >
                    <option value="race-to-3">Race to 3</option>
                    <option value="race-to-5">Race to 5</option>
                    <option value="race-to-7">Race to 7</option>
                    <option value="race-to-9">Race to 9</option>
                    <option value="best-of-3">Best of 3</option>
                    <option value="best-of-5">Best of 5</option>
                    <option value="best-of-7">Best of 7</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Scheduled Date:</label>
                  <input
                    type="date"
                    name="scheduledDate"
                    value={editPendingMatchFormData.scheduledDate}
                    onChange={handleEditPendingFormChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Location:</label>
                  <select
                    name="location"
                    value={editPendingMatchFormData.location}
                    onChange={handleEditPendingFormChange}
                  >
                    <option value="">Select Location</option>
                    {availableLocations.map((location, index) => (
                      <option key={index} value={location.name}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Entry Fee:</label>
                  <input
                    type="number"
                    name="entryFee"
                    value={editPendingMatchFormData.entryFee}
                    onChange={handleEditPendingFormChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Table Size:</label>
                  <select
                    name="tableSize"
                    value={editPendingMatchFormData.tableSize}
                    onChange={handleEditPendingFormChange}
                  >
                    <option value="7-foot">7-foot</option>
                    <option value="9-foot">9-foot</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Game Type:</label>
                  <select
                    name="gameType"
                    value={editPendingMatchFormData.gameType}
                    onChange={handleEditPendingFormChange}
                  >
                    <option value="8-ball">8-ball</option>
                    <option value="9-ball">9-ball</option>
                    <option value="10-ball">10-ball</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Notes:</label>
                  <textarea
                    name="notes"
                    value={editPendingMatchFormData.notes}
                    onChange={handleEditPendingFormChange}
                    placeholder="Match notes"
                    rows="3"
                  />
                </div>
              </div>

              <div className={styles.formButtons}>
                <button 
                  type="submit" 
                  disabled={loading}
                  className={styles.submitButton}
                >
                  {loading ? 'Updating...' : 'Update Match'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditPendingMatchForm(false);
                    setEditingPendingMatch(null);
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </DraggableModal>
      )}

      {/* Delete Pending Match Confirmation */}
      {showDeletePendingConfirm && pendingMatchToDelete && renderModal(
        <DraggableModal
          open={showDeletePendingConfirm}
          onClose={() => {
            setShowDeletePendingConfirm(false);
            setPendingMatchToDelete(null);
          }}
          title="Confirm Delete Pending Match"
          maxWidth="40vw"
        >
          <div className={styles.deleteConfirmModal}>
            <p>Are you sure you want to delete this pending match?</p>
            <div className={styles.matchDetails}>
              <p><strong>Players:</strong> {pendingMatchToDelete.challenger?.firstName || pendingMatchToDelete.player1?.firstName} {pendingMatchToDelete.challenger?.lastName || pendingMatchToDelete.player1?.lastName} vs {pendingMatchToDelete.defender?.firstName || pendingMatchToDelete.player2?.firstName} {pendingMatchToDelete.defender?.lastName || pendingMatchToDelete.player2?.lastName}</p>
              <p><strong>Type:</strong> {pendingMatchToDelete.matchType || 'Challenge'}</p>
              <p><strong>Date:</strong> {pendingMatchToDelete.scheduledDate ? 
                  new Date(pendingMatchToDelete.scheduledDate).toLocaleDateString() : 
                  pendingMatchToDelete.proposedDate ? 
                  new Date(pendingMatchToDelete.proposedDate).toLocaleDateString() : 'TBD'}</p>
            </div>
            <p className={styles.warningText}>⚠️ This action cannot be undone.</p>
            <div className={styles.formButtons}>
              <button 
                onClick={confirmDeletePendingMatch}
                disabled={loading}
                className={styles.deleteButton}
              >
                {loading ? 'Deleting...' : 'Delete Match'}
              </button>
              <button 
                onClick={() => {
                  setShowDeletePendingConfirm(false);
                  setPendingMatchToDelete(null);
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

             {/* Players List - Single Ladder View */}
       <div className={styles.ladderSection}>
         <h3 className={styles.ladderTitle}>
           {selectedLadder === '499-under' ? '499 & Under' : 
            selectedLadder === '500-549' ? '500-549' : 
            selectedLadder === '550-plus' ? '550+' : selectedLadder} Ladder
         </h3>
    {currentView === 'matches' ? (
      <MatchManager userPin={userPin} />
    ) : currentView === 'emails' ? (
      <EmailManager userPin={userPin} />
    ) : (
        <div className={styles.playersList}>
           {ladderPlayers.filter(player => player.ladderName === selectedLadder).length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{width: '8%'}}>Position</th>
              <th style={{width: '18%'}}>Name</th>
              <th style={{width: '25%'}}>Email</th>
              <th style={{width: '12%'}}>Phone</th>
              <th style={{width: '10%'}}>Fargo Rate</th>
              <th style={{width: '12%'}}>Location</th>
              <th style={{width: '8%'}}>Status</th>
              <th style={{width: '7%'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
                 {ladderPlayers
                   .filter(player => player.ladderName === selectedLadder)
                   .sort((a, b) => (a.position || 0) - (b.position || 0))
                   .map((player, index) => (
              <tr key={player._id || player.email}>
                     <td>{player.position || index + 1}</td>
                <td>{player.firstName} {player.lastName}</td>
                <td style={{whiteSpace: 'normal', wordBreak: 'break-all'}}>
                  {player.unifiedAccount?.email ? (
                    <span style={{
                      color: /@(ladder\.local|ladder\.temp|test|temp|local|fake|example|dummy)/i.test(player.unifiedAccount.email) 
                        ? '#dc2626' 
                        : 'inherit'
                    }}>
                      {player.unifiedAccount.email}
                    </span>
                  ) : (
                    'No email'
                  )}
                </td>
                <td>{player.phone}</td>
                <td>{player.fargoRate}</td>
                <td>{player.location}</td>
                <td>
                  <span className={`${styles.status} ${player.isActive ? styles.active : styles.inactive}`}>
                    {player.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button 
                    className={styles.editButton}
                    onClick={() => handleEditPlayer(player)}
                  >
                    Edit
                  </button>
                  <button 
                    className={styles.deleteButton}
                    onClick={() => handleDeletePlayer(player.email)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
           ) : (
             <div className={styles.noPlayers}>No players in this ladder yet</div>
           )}
        </div>
      )}
       </div>


      {/* Match History Modal */}
      {showMatchHistory && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
            border: '2px solid #8B5CF6',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: '#ffffff'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #8B5CF6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ color: '#8B5CF6', margin: 0 }}>
                🏆 Match History - {selectedLadder === '499-under' ? '499 & Under' : 
                selectedLadder === '500-549' ? '500-549' : 
                selectedLadder === '550-plus' ? '550+' : selectedLadder} Ladder
              </h2>
              <button
                onClick={() => setShowMatchHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8B5CF6',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px'
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#ccc', padding: '40px', fontSize: '16px' }}>
                  Loading match history...
                </div>
              ) : matchHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#ccc', padding: '40px', fontSize: '16px' }}>
                  No matches recorded yet.
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)' }}>Winner</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)' }}>Loser</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)' }}>Score</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)' }}>Location</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchHistory.map((match, index) => (
                        <tr key={match.id || index} style={{ 
                          borderBottom: index < matchHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                        }}>
                          <td style={{ padding: '12px' }}>{new Date(match.completedDate || match.scheduledDate).toLocaleDateString()}</td>
                          <td style={{ padding: '12px' }}>
                            <strong style={{ color: '#22c55e' }}>
                              {match.winner ? `${match.winner.firstName} ${match.winner.lastName}` : 'N/A'}
                            </strong> 
                            {match.winner ? ` (#${match.winner.position})` : ''}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ color: '#ef4444' }}>
                              {match.loser ? `${match.loser.firstName} ${match.loser.lastName}` : 'N/A'}
                            </span>
                            {match.loser ? ` (#${match.loser.position})` : ''}
                          </td>
                          <td style={{ padding: '12px' }}>{match.score}</td>
                          <td style={{ padding: '12px' }}>{match.matchType || 'N/A'}</td>
                          <td style={{ padding: '12px' }}>{match.venue || 'N/A'}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              background: match.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 
                                         match.status === 'scheduled' ? 'rgba(59, 130, 246, 0.2)' : 
                                         'rgba(107, 114, 128, 0.2)',
                              color: match.status === 'completed' ? '#22c55e' : 
                                     match.status === 'scheduled' ? '#3b82f6' : 
                                     '#6b7280'
                            }}>
                              {match.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Ladder Applications Manager Modal */}
      {showApplicationsManager && renderModal(
        <DraggableModal
          open={showApplicationsManager}
          onClose={() => setShowApplicationsManager(false)}
          title="Pending Ladder Applications"
          maxWidth="90vw"
          maxHeight="90vh"
        >
          <LadderApplicationsManager onClose={() => setShowApplicationsManager(false)} />
        </DraggableModal>
      )}

      {/* LMS Tracking Modal */}
      {showLmsTracking && renderModal(
        <DraggableModal
          open={showLmsTracking}
          onClose={() => setShowLmsTracking(false)}
          title="LMS Tracking - Matches Status"
          maxWidth="90vw"
          maxHeight="90vh"
        >
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#6c5ce7', marginBottom: '10px' }}>
                📊 LMS Match Status Tracking
              </h3>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Track which completed matches need to be entered into LMS for FargoRate reporting.
              </p>
            </div>

            {lmsMatches.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#22c55e',
                fontSize: '16px'
              }}>
                ✅ All matches are up to date with LMS!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#6c5ce7', color: 'white' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Winner</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Loser</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Score</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Location</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>LMS Status</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lmsMatches.map((match, index) => (
                      <tr key={`${match._id || match.id}-${lmsRefreshKey}`} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white'
                      }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'blue' }}>
                            {match.completedDate ? 
                              new Date(match.completedDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              }) : 
                              new Date(match.scheduledDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            }
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {match.completedDate ? 'Played' : 'Scheduled'}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <strong style={{ color: '#22c55e' }}>
                            {match.winner ? 
                              (typeof match.winner === 'object' ? 
                                `${match.winner.firstName} ${match.winner.lastName}` : 
                                match.winner) : 
                              'N/A'}
                          </strong>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: '#ef4444' }}>
                            {match.loser ? 
                              (typeof match.loser === 'object' ? 
                                `${match.loser.firstName} ${match.loser.lastName}` : 
                                match.loser) : 
                              'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold',
                            color: match.score ? '#1f2937' : '#9ca3af'
                          }}>
                            {match.score || 'No Score'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            fontSize: '13px',
                            color: match.venue ? '#1f2937' : '#9ca3af'
                          }}>
                            {match.venue || 'No Location'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: match.lmsStatus === 'scheduled' ? '#dbeafe' : 
                                           match.lmsStatus === 'completed' ? '#dcfce7' : '#fef3c7',
                            color: match.lmsStatus === 'scheduled' ? '#1d4ed8' : 
                                   match.lmsStatus === 'completed' ? '#16a34a' : '#d97706'
                          }}>
                            {match.lmsStatus === 'scheduled' ? '📅 Scheduled in LMS' : 
                             match.lmsStatus === 'completed' ? '✅ Scored in LMS' : '⚠️ Not Entered'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {(!match.lmsStatus || match.lmsStatus === 'not_entered') && (
                              <button
                                onClick={() => markMatchAsLmsScheduled(match._id || match.id)}
                                style={{
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                📅 Mark as Scheduled
                              </button>
                            )}
                            {match.lmsStatus === 'scheduled' && (
                              <button
                                onClick={() => markMatchAsLmsCompleted(match._id || match.id)}
                                style={{
                                  background: '#22c55e',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                📊 Scored in LMS
                              </button>
                            )}
                            {match.lmsStatus === 'completed' && (
                              <span style={{ 
                                color: '#16a34a', 
                                fontSize: '12px', 
                                fontWeight: 'bold' 
                              }}>
                                ✅ Done
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #0ea5e9'
            }}>
              <h4 style={{ color: '#0ea5e9', marginBottom: '10px' }}>📋 LMS Entry Instructions:</h4>
              <ol style={{ color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>
                <li>Log into your LMS account</li>
                <li>Go to your division/league</li>
                <li>Add each match to the schedule</li>
                <li>After the match is played, enter the winner and score</li>
                <li>Click "Scheduled" when you've added it to LMS</li>
                <li>Click "Completed" when you've entered the result</li>
              </ol>
            </div>
          </div>
        </DraggableModal>
      )}

      
    </div>
  );
}
