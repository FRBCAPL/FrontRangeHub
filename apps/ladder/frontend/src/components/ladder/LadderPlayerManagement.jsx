import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL } from '@shared/config/config.js';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import { supabase } from '@shared/config/supabase.js';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import LadderApplicationsManager from '@shared/components/admin/admin/LadderApplicationsManager';
import MatchManager from '@shared/components/admin/admin/MatchManager';
import EmailManager from '@shared/components/admin/admin/EmailManager';
import ForfeitRequestsManager from '@shared/components/admin/admin/ForfeitRequestsManager';
import OverdueMatchesManager from '@shared/components/admin/admin/OverdueMatchesManager';
import ComprehensiveTestSection from '@shared/components/admin/admin/ComprehensiveTestSection';
import TestEnvironmentAdmin from '@shared/components/admin/admin/TestEnvironmentAdmin';
import TournamentAdminDashboard from '@shared/components/tournament/TournamentAdminDashboard';
import PaymentApprovalsManager from '@shared/components/admin/admin/PaymentApprovalsManager';
import { getCurrentDateString, dateStringToDate, dateToDateString } from '@shared/utils/utils/dateUtils';
import styles from './LadderPlayerManagement.module.css';

export default function LadderPlayerManagement({ userToken }) {
  // Configure your league ID here - this should match your backend configuration
  const LEAGUE_ID = 'front-range-pool-hub';
  
  // State for available locations
  const [availableLocations, setAvailableLocations] = useState([]);
  
  // View state
  const [currentView, setCurrentView] = useState('players'); // 'players', 'matches', 'emails', 'payments', 'forfeits', 'overdue', 'tournaments', 'test-environment', or 'comprehensive-test'
  
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
    position: 1,
    sanctioned: false,
    sanctionYear: new Date().getFullYear(),
    lmsName: ''
  });
  
  // Ladder selection state
  const [selectedLadder, setSelectedLadder] = useState('499-under');
  
  // Quick add player states
  const [showQuickAddForm, setShowQuickAddForm] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    firstName: '',
    lastName: '',
    ladderName: '499-under',
    position: '',
    email: '',
    phone: '',
    fargoRate: '',
    location: '',
    notes: ''
  });
  
  // Match result states
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [showScorePendingMatchModal, setShowScorePendingMatchModal] = useState(false);
  const [matchToScore, setMatchToScore] = useState(null);
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
    matchType: 'challenge', // Type of match
    location: '',
    notes: ''
  });
  const [matchHistory, setMatchHistory] = useState([]);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  
        // Payment approval states
        const [pendingPayments, setPendingPayments] = useState([]);
        const [paymentLoading, setPaymentLoading] = useState(false);
        const [selectedPaymentType, setSelectedPaymentType] = useState('all');
  
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
  
  // Applications manager state
  const [showApplicationsManager, setShowApplicationsManager] = useState(false);
  
  // Pending match editing states
  const [editingPendingMatch, setEditingPendingMatch] = useState(null);
  const [showEditPendingMatchForm, setShowEditPendingMatchForm] = useState(false);
  const [editPendingMatchFormData, setEditPendingMatchFormData] = useState({});
  const [editingIsSchedulingRequest, setEditingIsSchedulingRequest] = useState(false);
  const [showDeletePendingConfirm, setShowDeletePendingConfirm] = useState(false);
  const [pendingMatchToDelete, setPendingMatchToDelete] = useState(null);
  const matchManagerRef = useRef(null);

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
  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [backups, setBackups] = useState([]);
  const [showRestorePreview, setShowRestorePreview] = useState(false);
  const [restorePreviewData, setRestorePreviewData] = useState(null);
  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [autoBackupStatus, setAutoBackupStatus] = useState(null);
  const [showFindUserModal, setShowFindUserModal] = useState(false);
  const [findUserSearch, setFindUserSearch] = useState('');
  const [findUserResults, setFindUserResults] = useState([]);
  const [findUserLoading, setFindUserLoading] = useState(false);
  const [linkToPositionUser, setLinkToPositionUser] = useState(null);
  const [linkToPositionNum, setLinkToPositionNum] = useState('');
  
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
      const result = await supabaseDataService.getLocations();
      
      if (result.success && Array.isArray(result.data)) {
        setAvailableLocations(result.data);
        console.log(`Loaded ${result.data.length} locations from Supabase`);
      } else {
        console.error('Invalid locations response format:', result);
        setAvailableLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setAvailableLocations([]);
    }
  };

  // Fetch all ladder players (including inactive so admin can edit vacationing/inactive players)
  const fetchLadderPlayers = async () => {
    try {
      const result = await supabaseDataService.getLadderPlayersByNameIncludingInactive(selectedLadder);
      
      if (result.success && Array.isArray(result.data)) {
        // Transform Supabase data to match expected format
        const transformedPlayers = result.data.map(player => {
          const email = player.users?.email || player.email || '';
          return {
          _id: player.user_id,
          firstName: player.users?.first_name || 'Unknown',
          lastName: player.users?.last_name || 'Unknown',
          email: email || 'unknown@email.com',
          unifiedAccount: { email, id: player.user_id },
          position: player.position,
          fargoRate: player.fargo_rate ?? 0,
          phone: player.users?.phone || player.phone || '',
          location: player.location || player.users?.location || '',
          totalMatches: player.total_matches || 0,
          wins: player.wins || 0,
          losses: player.losses || 0,
          isActive: player.is_active,
          ladderName: player.ladder_name,
          immunityUntil: player.immunity_until,
          vacationMode: player.vacation_mode,
          vacationUntil: player.vacation_until,
          isAdmin: player.is_admin || false,
          isSuspended: player.is_suspended || false,
          suspensionReason: player.suspension_reason,
          suspensionUntil: player.suspension_until,
          createdAt: player.created_at,
          updatedAt: player.updated_at
        };
        });
        
        setLadderPlayers(transformedPlayers);
        console.log(`Loaded ${transformedPlayers.length} ladder players from Supabase`);
      } else {
        console.error('Error fetching ladder players from Supabase:', result.error);
        setLadderPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching ladder players:', error);
      setLadderPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkToPosition = async () => {
    if (!linkToPositionUser || !linkToPositionNum) return;
    const pos = parseInt(linkToPositionNum, 10);
    if (isNaN(pos) || pos < 1) {
      alert('Please enter a valid position number');
      return;
    }
    try {
      const result = await supabaseDataService.linkUserToLadderPosition(linkToPositionUser.id, selectedLadder, pos);
      if (result.success) {
        alert('✅ ' + result.message);
        setLinkToPositionUser(null);
        setLinkToPositionNum('');
        fetchLadderPlayers();
        searchForUser();
      } else {
        alert('❌ ' + (result.message || result.error));
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error linking to position');
    }
  };

  const searchForUser = async () => {
    if (!findUserSearch.trim()) return;
    setFindUserLoading(true);
    setFindUserResults([]);
    try {
      const result = await supabaseDataService.searchUsersForAdmin(findUserSearch.trim());
      if (result.success && result.users) {
        setFindUserResults(result.users.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          phone: u.phone,
          ladderProfiles: u.ladder_profiles || [],
          isApproved: u.is_approved,
          isActive: u.is_active
        })));
      } else {
        setFindUserResults([]);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setFindUserResults([]);
    } finally {
      setFindUserLoading(false);
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

  // Add realtime listener for ladder updates
  useEffect(() => {
    let refreshTimeout = null;
    
    const channel = supabase
      .channel('admin-ladder-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ladder_profiles'
      }, async (payload) => {
        // Only process updates for the currently selected ladder in admin
        if (payload.new && payload.new.ladder_name === selectedLadder) {
          // Debounce the refresh - wait for all updates to complete
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }
          
          refreshTimeout = setTimeout(async () => {
            await fetchLadderPlayers();
          }, 500); // Wait 500ms after the last update before refreshing
        }
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [selectedLadder]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleQuickAddInputChange = (e) => {
    const { name, value } = e.target;
    setQuickAddData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new ladder player
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      const result = await supabaseDataService.registerPlayer(formData);

      if (result.success) {
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
        alert('Error adding ladder player: ' + (result.error || result.message));
      }
    } catch (error) {
      console.error('Error adding ladder player:', error);
      alert('Error adding ladder player');
    }
  };

  // Quick add player to ladder (admin function)
  const handleQuickAddPlayer = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('🔄 Adding player to ladder...');

      const result = await supabaseDataService.quickAddPlayerToLadder(quickAddData);
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        // Clear form data
        setQuickAddData({
          firstName: '',
          lastName: '',
          ladderName: selectedLadder,
          position: '',
          email: '',
          phone: '',
          fargoRate: '',
          location: '',
          notes: ''
        });
        // Refresh ladder data
        await fetchLadderPlayers();
        // Close modal after a short delay to show success message
        setTimeout(() => {
          setShowQuickAddForm(false);
          clearMessage();
        }, 2000);
      } else {
        setMessage(`❌ Error: ${result.error || result.message || 'Unknown error'}`);
        // Don't clear message immediately - let user see the error
        setTimeout(() => clearMessage(), 5000);
      }
    } catch (error) {
      console.error('Error adding player to ladder:', error);
      setMessage(`❌ Error adding player to ladder: ${error.message}`);
      // Don't clear message immediately - let user see the error
      setTimeout(() => clearMessage(), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Update existing ladder player
  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    try {
      console.log(`🔍 Frontend Debug: formData.ladderName=${formData.ladderName}, editingPlayer.ladderName=${editingPlayer.ladderName}`);
      const result = await supabaseDataService.updatePlayer(editingPlayer._id, {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        isActive: formData.isActive,
        fargoRate: formData.fargoRate,
        position: formData.position,
        ladderName: formData.ladderName,
        currentLadderName: editingPlayer.ladderName, // Current ladder before update
        sanctioned: formData.sanctioned,
        sanctionYear: formData.sanctionYear,
        lmsName: formData.lmsName
      });

      if (result.success) {
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
        alert('Error updating ladder player: ' + result.message);
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
      email: player.unifiedAccount?.email || player.email || '',
      phone: player.phone || '',
      fargoRate: player.fargoRate || '',
      location: player.location || '',
      isActive: player.isActive !== false,
      ladderName: player.ladderName || '499-under',
      position: player.position || 1,
      sanctioned: player.sanctioned || false,
      sanctionYear: player.sanctionYear || new Date().getFullYear(),
      lmsName: player.lmsName || ''
    });
  };

  // Delete ladder player
  const handleDeletePlayer = async (playerEmail) => {
    if (!confirm('Are you sure you want to remove this player from the ladder?')) return;

    try {
      const result = await supabaseDataService.removePlayerFromLadder(playerEmail, selectedLadder);

      if (result.success) {
        fetchLadderPlayers();
        alert('Player removed from ladder successfully!');
      } else {
        alert('Error removing player: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting ladder player:', error);
      alert('Error removing player from ladder');
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

  // Select an existing pending match to score
  const selectPendingMatch = (match) => {
    setMatchToScore(match);
    setShowScorePendingMatchModal(true);
  };

  // Submit score for a specific pending match
  const submitPendingMatchScore = async (e) => {
    e.preventDefault();
    
    if (!matchToScore) return;
    
    const form = e.target;
    const winnerId = form.winnerId.value;
    const score = form.score.value;
    const notes = form.notes.value;
    const matchDate = form.matchDate.value;
    
    if (!winnerId || !score) {
      alert('Please select a winner and enter a score');
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await supabaseDataService.updateMatchStatus(
        matchToScore.id,
        'completed',
        { winnerId: winnerId },
        score,
        notes,
        matchDate
      );
      
      if (result.success) {
        alert('Match scored successfully!');
        setShowScorePendingMatchModal(false);
        setMatchToScore(null);
        
        // Reload data
        await fetchLadderPlayers();
        await loadPendingMatches();
        window.dispatchEvent(new CustomEvent('matchesUpdated', { detail: { action: 'update' } }));
      } else {
        alert(`Failed to score match: ${result.error}`);
      }
    } catch (error) {
      console.error('Error scoring match:', error);
      alert('Error scoring match');
    } finally {
      setLoading(false);
    }
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
      
      if (isUpdating) {
        // Update existing match in Supabase
        // Pass the selected winner ID so the service can swap IDs if needed
        
        console.log('🔍 Completing match in Supabase:', {
          matchId: matchFormData.matchId,
          winnerId: matchFormData.winnerId,
          player1Id: matchFormData.player1Id,
          player2Id: matchFormData.player2Id,
          score: matchFormData.score
        });

        const result = await supabaseDataService.updateMatchStatus(
          matchFormData.matchId,
          'completed',
          { winnerId: matchFormData.winnerId }, // Pass the selected winner ID
          matchFormData.score,
          matchFormData.notes
        );

        if (result.success) {
          alert('Match result recorded successfully!');
          setShowMatchForm(false);
          setMatchFormData({
            matchId: '',
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
            matchType: 'challenge',
            location: '',
            notes: ''
          });
          
          // Reload data
          fetchLadderPlayers();
          loadPendingMatches();
        } else {
          alert(`Match recording failed: ${result.error}`);
        }
      } else {
        // Create new match in Supabase
        const result = await supabaseDataService.createMatch({
          player1Id: matchFormData.player1Id,
          player2Id: matchFormData.player2Id,
          ladderName: selectedLadder,
          matchType: matchFormData.matchType || 'challenge',
          matchDate: new Date(matchFormData.matchDate).toISOString(),
          raceLength: parseInt(matchFormData.matchFormat.replace(/\D/g, '')) || 5,
          gameType: '9-ball',
          location: matchFormData.location,
          notes: matchFormData.notes
        });
        
        if (result.success) {
          alert('Match created successfully!');
          setShowMatchForm(false);
          setMatchFormData({
            matchId: '',
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
            matchType: 'challenge',
            location: '',
            notes: ''
          });
          fetchLadderPlayers();
          loadPendingMatches(); // Refresh pending matches list
        } else {
          alert(`Match creation failed: ${result.error}`);
        }
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
      
      // Use Supabase instead of MongoDB backend
      const result = await supabaseDataService.getAllMatchesForLadder(selectedLadder);
      
      if (result.success) {
        console.log('🔍 Match history data from Supabase:', result.matches);
        
        // Transform Supabase data to match expected format
        const transformedMatches = result.matches.map(match => {
          // Parse winner and loser names
          const winnerName = match.winner_name || 'N/A';
          const loserName = match.loser_name || 'N/A';
          const [winnerFirstName, ...winnerLastNameParts] = winnerName.split(' ');
          const [loserFirstName, ...loserLastNameParts] = loserName.split(' ');
          
          return {
            _id: match.id,
            id: match.id, // Add id field for React key
            challengerId: match.challenger_id,
            defenderId: match.defender_id,
            winnerId: match.winner_id,
            loserId: match.loser_id,
            challengerName: match.challenger_name,
            defenderName: match.defender_name,
            winnerName: winnerName,
            loserName: loserName,
            winner: winnerName !== 'N/A' ? {
              firstName: winnerFirstName,
              lastName: winnerLastNameParts.join(' '),
              position: match.winner_position || 'removed'
            } : null,
            loser: loserName !== 'N/A' ? {
              firstName: loserFirstName,
              lastName: loserLastNameParts.join(' '),
              position: match.loser_position || 'removed'
            } : null,
            status: match.status,
            matchType: match.match_type,
            matchDate: match.match_date,
            scheduledDate: match.scheduled_date,
            completedDate: match.match_date, // Use match_date for completed matches
            location: match.location,
            venue: match.location, // Some parts of UI use 'venue' instead of 'location'
            notes: match.notes,
            score: match.score,
            createdAt: match.created_at,
            updatedAt: match.updated_at
          };
        });
        
        setMatchHistory(transformedMatches);
      } else {
        console.error('🔍 Supabase Error:', result.error);
        alert(`Failed to load match history: ${result.error}`);
      }
    } catch (error) {
      console.error('Error loading match history:', error);
      alert(`Error loading match history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load pending matches for the selected ladder (ONLY scheduling requests awaiting approval; approved matches show in Match Manager)
  const loadPendingMatches = async () => {
    try {
      setLoading(true);
      
      // Fetch ONLY pending match scheduling requests (awaiting admin approval)
      // Approved matches are created in matches table and appear in Match Manager
      const requestsResult = await supabaseDataService.getPendingMatchSchedulingRequests();
      const schedulingRequests = (requestsResult.success && requestsResult.requests) ? requestsResult.requests : [];
      
      // Filter requests for this ladder (if ladder_name exists) or show all
      const ladderRequests = schedulingRequests.filter(req => 
        !req.ladder_name || req.ladder_name === selectedLadder
      );
      
      // Transform requests to match display format
      const transformedRequests = ladderRequests.map(req => {
        const [challengerFirst, ...challengerLast] = (req.challenger_name || '').split(' ');
        const [defenderFirst, ...defenderLast] = (req.defender_name || '').split(' ');
        return {
          ...req,
          _id: req.id,
          type: 'scheduling_request',
          source: 'supabase',
          matchType: req.match_type || 'challenge',
          challenger: { 
            _id: req.id, 
            firstName: challengerFirst || '', 
            lastName: (challengerLast || []).join(' ') || '',
            position: null
          },
          defender: { 
            _id: req.id, 
            firstName: defenderFirst || '', 
            lastName: (defenderLast || []).join(' ') || '',
            position: null
          },
          player1: { firstName: challengerFirst || '', lastName: (challengerLast || []).join(' ') || '' },
          player2: { firstName: defenderFirst || '', lastName: (defenderLast || []).join(' ') || '' },
          scheduledDate: req.preferred_date,
          preferredTime: req.preferred_time,
          submittedAt: req.submitted_at,
          matchFormat: req.race_length ? `race-to-${req.race_length}` : 'best-of-5',
          raceLength: req.race_length,
          location: req.location || '',
          venue: req.location || '',
          notes: req.notes || '',
          challengerEmail: req.challenger_email,
          defenderEmail: req.defender_email,
          ladderName: req.ladder_name || selectedLadder
        };
      });
      
      // Sort by date submitted (most recent first)
      transformedRequests.sort((a, b) => {
        const dateA = new Date(a.submittedAt || a.scheduledDate || a.preferred_date || 0);
        const dateB = new Date(b.submittedAt || b.scheduledDate || b.preferred_date || 0);
        return dateB - dateA;
      });
      
      console.log('Loaded pending match requests:', transformedRequests);
      setPendingMatches(transformedRequests);
      
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
      // Use Supabase instead of MongoDB backend
      const result = await supabaseDataService.getRecentMatchesForPlayer(challengerId, 5);
      
      if (result.success) {
        const recentMatches = result.matches || [];
        
        // Look for the most recent completed SmackDown match where this player was the defender and won
        const recentSmackDownWin = recentMatches.find(match => 
          match.status === 'completed' &&
          match.match_type === 'smackdown' &&
          match.loser_id === challengerId && // Player was the defender (loser_id in Supabase)
          match.winner_id === challengerId && // But they won
          new Date(match.match_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within last 7 days
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
      
      // Get player emails for Supabase lookup
      const challenger = ladderPlayers.find(p => p._id === createMatchFormData.challengerId);
      const defender = ladderPlayers.find(p => p._id === createMatchFormData.defenderId);
      
      if (!challenger || !defender) {
        alert('Could not find challenger or defender data');
        return;
      }

      const result = await supabaseDataService.createScheduledMatch({
        challengerEmail: challenger.email,
        challengerName: `${challenger.firstName} ${challenger.lastName}`,
        challengerPosition: challenger.position,
        defenderEmail: defender.email,
        defenderName: `${defender.firstName} ${defender.lastName}`,
        defenderPosition: defender.position,
        preferredDate: dateStringToDate(createMatchFormData.proposedDate),
        location: createMatchFormData.location,
        matchType: createMatchFormData.matchType,
        gameType: createMatchFormData.gameType || '9-ball',
        raceLength: createMatchFormData.raceLength || '7',
        notes: createMatchFormData.notes,
        ladderName: selectedLadder
      });
      
      if (result.success) {
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
        alert(`Match creation failed: ${result.error}`);
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

  // Handle editing a pending match (already approved)
  const handleEditPendingMatch = (match) => {
    setEditingIsSchedulingRequest(false);
    setEditingPendingMatch(match);
    const challengerId = match.challenger?._id || match.winner_id;
    const defenderId = match.defender?._id || match.loser_id;
    const chall = ladderPlayers.find(p => p._id === challengerId);
    const def = ladderPlayers.find(p => p._id === defenderId);
    const dateVal = match.scheduledDate || match.match_date || match.proposedDate;
    let scheduledTime = match.preferredTime || match.preferred_time || '';
    if (!scheduledTime && dateVal) {
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) scheduledTime = d.toTimeString().slice(0, 5); // "HH:mm"
      } catch (_) {}
    }
    setEditPendingMatchFormData({
      challengerId: challengerId || '',
      defenderId: defenderId || '',
      challengerName: chall ? `${chall.firstName} ${chall.lastName}`.trim() : (match.challenger ? `${match.challenger.firstName || ''} ${match.challenger.lastName || ''}`.trim() : match.winner_name || ''),
      defenderName: def ? `${def.firstName} ${def.lastName}`.trim() : (match.defender ? `${match.defender.firstName || ''} ${match.defender.lastName || ''}`.trim() : match.loser_name || ''),
      challengerEmail: chall?.email || match.challengerEmail || match.challenger_email || '',
      defenderEmail: def?.email || match.defenderEmail || match.defender_email || '',
      matchType: match.matchType || 'challenge',
      raceLength: match.raceLength ?? match.race_length ?? 5,
      scheduledDate: match.scheduledDate ? 
        dateToDateString(new Date(match.scheduledDate)) : 
        match.match_date ? dateToDateString(new Date(match.match_date)) :
        match.proposedDate ? dateToDateString(new Date(match.proposedDate)) : '',
      scheduledTime,
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
      console.log('Deleting match ID from Supabase:', matchId);
      
      // Delete from Supabase
      const result = await supabaseDataService.deleteMatch(matchId);
      
      if (result.success) {
        // Reload pending matches
        await loadPendingMatches();
        setMessage('Pending match deleted successfully');
      } else {
        setMessage(`Failed to delete pending match: ${result.error}`);
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

  // Handle editing a scheduling request (before approval)
  const handleEditSchedulingRequest = (match) => {
    const raceLen = typeof (match.raceLength ?? match.race_length) === 'number' 
      ? (match.raceLength ?? match.race_length) 
      : parseInt(String(match.raceLength || match.race_length || 5).replace(/\D/g, '')) || 5;
    const ladder = match.ladderName || match.ladder_name || selectedLadder;
    const chall = ladderPlayers.find(p => 
      p.ladderName === ladder && 
      p.email === (match.challengerEmail || match.challenger_email)
    );
    const def = ladderPlayers.find(p => 
      p.ladderName === ladder && 
      p.email === (match.defenderEmail || match.defender_email)
    );
    setEditingPendingMatch(match);
    // Extract time from preferred_time or from match_date/scheduledDate
    const dateVal = match.scheduledDate || match.preferred_date || match.match_date;
    let scheduledTime = match.preferredTime || match.preferred_time || '';
    if (!scheduledTime && dateVal) {
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) scheduledTime = d.toTimeString().slice(0, 5); // "HH:mm"
      } catch (_) {}
    }
    setEditPendingMatchFormData({
      challengerId: chall?._id || '',
      defenderId: def?._id || '',
      challengerName: chall ? `${chall.firstName} ${chall.lastName}`.trim() : (match.challenger_name || `${match.challenger?.firstName || ''} ${match.challenger?.lastName || ''}`.trim()),
      defenderName: def ? `${def.firstName} ${def.lastName}`.trim() : (match.defender_name || `${match.defender?.firstName || ''} ${match.defender?.lastName || ''}`.trim()),
      challengerEmail: chall?.email || match.challenger_email || match.challengerEmail || '',
      defenderEmail: def?.email || match.defender_email || match.defenderEmail || '',
      matchType: match.matchType || match.match_type || 'challenge',
      raceLength: raceLen,
      scheduledDate: match.scheduledDate || match.preferred_date ? 
        dateToDateString(new Date(match.scheduledDate || match.preferred_date)) : 
        (match.match_date ? dateToDateString(new Date(match.match_date)) : ''),
      scheduledTime,
      location: match.location || match.venue || '',
      notes: match.notes || '',
      entryFee: 0,
      gameType: match.gameType || match.game_type || '8-ball',
      tableSize: '7-foot'
    });
    setShowEditPendingMatchForm(true);
    setEditingIsSchedulingRequest(true);
  };

  // Handle approving a match scheduling request
  const handleApproveSchedulingRequest = async (match) => {
    if (!confirm(`Approve match request: ${match.challenger?.firstName} ${match.challenger?.lastName} vs ${match.defender?.firstName} ${match.defender?.lastName}?\n\nThis will add the match to the calendar.`)) {
      return;
    }

    try {
      setLoading(true);

      // Supabase flow: player-submitted requests from match_scheduling_requests
      if (match.source === 'supabase' && match.type === 'scheduling_request') {
        const createResult = await supabaseDataService.createScheduledMatch({
          challengerEmail: match.challengerEmail || match.challenger_email,
          challengerName: `${match.challenger?.firstName || ''} ${match.challenger?.lastName || ''}`.trim() || match.challenger_name,
          challengerPosition: match.challenger?.position ?? 0,
          defenderEmail: match.defenderEmail || match.defender_email,
          defenderName: `${match.defender?.firstName || ''} ${match.defender?.lastName || ''}`.trim() || match.defender_name,
          defenderPosition: match.defender?.position ?? 0,
          preferredDate: match.scheduledDate || match.preferred_date,
          preferredTime: match.preferredTime || match.preferred_time || '',
          location: match.location || match.venue || '',
          matchType: match.matchType || match.match_type || 'challenge',
          gameType: match.gameType || match.game_type || '9-ball',
          raceLength: String(match.raceLength || match.race_length || 7),
          notes: match.notes || '',
          ladderName: match.ladderName || match.ladder_name || selectedLadder
        });

        if (createResult.success) {
          await supabaseDataService.updateMatchSchedulingRequestStatus(match._id, 'approved');
          setMessage('✅ Match request approved! The match is now in Match Manager.');
          await loadPendingMatches();
        } else {
          setMessage(`❌ Failed to create match: ${createResult.error}`);
        }
        setLoading(false);
        return;
      }
      
      // Atlas/MongoDB flow (legacy)
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

          // 2. Create ladder match record for main public calendar (only if we have valid player IDs)
          let ladderMatchResponse = null;
          if (match.challengerId && match.defenderId && match.challengerId !== 'unknown' && match.defenderId !== 'unknown') {
            // Use Supabase instead of MongoDB backend
            const matchData = {
              challenger_id: match.challengerId,
              defender_id: match.defenderId,
              challenger_name: `${match.challenger?.firstName} ${match.challenger?.lastName}`,
              defender_name: `${match.defender?.firstName} ${match.defender?.lastName}`,
              match_type: match.matchType || 'challenge',
              scheduled_date: match.scheduledDate,
              location: match.location,
              notes: match.notes || '',
              status: 'scheduled'
            };
            
            ladderMatchResponse = await supabaseDataService.createMatch(matchData);
          } else {
            console.warn('⚠️ Skipping ladder match creation - missing or invalid player IDs:', {
              challengerId: match.challengerId,
              defenderId: match.defenderId
            });
          }

          if (calendarResponse.ok && (ladderMatchResponse === null || ladderMatchResponse.success)) {
            if (ladderMatchResponse === null) {
              setMessage('✅ Match approved and added to individual calendars! (Skipped main ladder calendar due to missing player IDs)');
            } else {
              setMessage('✅ Match approved and added to both individual calendars and main ladder calendar!');
            }
            // Refresh the pending matches list
            loadPendingMatches();
          } else if (calendarResponse.ok) {
            setMessage('✅ Match approved and added to individual calendars, but failed to add to main ladder calendar.');
            loadPendingMatches();
          } else if (ladderMatchResponse && ladderMatchResponse.success) {
            setMessage('✅ Match approved and added to main ladder calendar, but failed to add to individual calendars.');
            loadPendingMatches();
          } else {
            setMessage('✅ Match approved, but failed to add to calendars. Please add manually.');
            loadPendingMatches();
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
    
    if (reason == null) return; // User cancelled prompt

    try {
      setLoading(true);

      // Supabase flow
      if (match.source === 'supabase' && match.type === 'scheduling_request') {
        const result = await supabaseDataService.updateMatchSchedulingRequestStatus(match._id, 'rejected');
        if (result.success) {
          setMessage('Match request rejected.');
          await loadPendingMatches();
        } else {
          setMessage(`Failed to reject: ${result.error}`);
        }
        setLoading(false);
        return;
      }

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

    if (editPendingMatchFormData.challengerId && editPendingMatchFormData.defenderId && 
        editPendingMatchFormData.challengerId === editPendingMatchFormData.defenderId) {
      setMessage('❌ Challenger and Defender must be different players');
      clearMessage();
      return;
    }
    
    try {
      setLoading(true);
      const matchId = editingPendingMatch._id || editingPendingMatch.id;

      if (editingIsSchedulingRequest) {
        // Update match_scheduling_requests table
        const raceLen = parseInt(editPendingMatchFormData.raceLength) || 5;
        const chall = ladderPlayers.find(p => p._id === editPendingMatchFormData.challengerId);
        const def = ladderPlayers.find(p => p._id === editPendingMatchFormData.defenderId);
        const preferredDateVal = editPendingMatchFormData.scheduledDate ? 
          new Date(editPendingMatchFormData.scheduledDate + 'T12:00:00').toISOString() : null;
        const updatePayload = {
          match_type: editPendingMatchFormData.matchType || 'challenge',
          game_type: editPendingMatchFormData.gameType || '8-ball',
          race_length: raceLen,
          location: editPendingMatchFormData.location || null,
          notes: editPendingMatchFormData.notes || null,
          preferred_date: preferredDateVal,
          preferred_time: editPendingMatchFormData.scheduledTime || null
        };
        if (chall) {
          updatePayload.challenger_name = `${chall.firstName} ${chall.lastName}`.trim();
          updatePayload.challenger_email = chall.email;
        }
        if (def) {
          updatePayload.defender_name = `${def.firstName} ${def.lastName}`.trim();
          updatePayload.defender_email = def.email;
        }
        const result = await supabaseDataService.updateMatchSchedulingRequest(matchId, updatePayload);
        if (result.success) {
          setMessage('✅ Request updated. You can now approve it.');
          clearMessage();
          setShowEditPendingMatchForm(false);
          setEditingPendingMatch(null);
          setEditingIsSchedulingRequest(false);
          await loadPendingMatches();
        } else {
          setMessage(`❌ Failed to update request: ${result.error}`);
          clearMessage();
        }
      } else {
        // Update matches table (already-approved matches)
        const chall = ladderPlayers.find(p => p._id === editPendingMatchFormData.challengerId);
        const def = ladderPlayers.find(p => p._id === editPendingMatchFormData.defenderId);
        const timeStr = editPendingMatchFormData.scheduledTime || '12:00';
        const matchDateVal = editPendingMatchFormData.scheduledDate ? 
          new Date(editPendingMatchFormData.scheduledDate + 'T' + timeStr + ':00').toISOString() : null;
        const updateData = {
          match_type: editPendingMatchFormData.matchType || 'challenge',
          match_date: matchDateVal,
          location: editPendingMatchFormData.location || null,
          notes: editPendingMatchFormData.notes || null,
          game_type: editPendingMatchFormData.gameType || '8-ball',
          race_length: parseInt(editPendingMatchFormData.raceLength) || 5
        };
        if (chall) {
          updateData.winner_id = chall._id;
          updateData.winner_name = `${chall.firstName} ${chall.lastName}`.trim();
          updateData.winner_position = chall.position ?? 0;
        }
        if (def) {
          updateData.loser_id = def._id;
          updateData.loser_name = `${def.firstName} ${def.lastName}`.trim();
          updateData.loser_position = def.position ?? 0;
        }
        const result = await supabaseDataService.updateMatch(matchId, updateData);
        if (result.success) {
          setMessage('✅ Pending match updated successfully');
          clearMessage();
          setShowEditPendingMatchForm(false);
          setEditingPendingMatch(null);
          await loadPendingMatches();
          matchManagerRef.current?.refresh?.();
          window.dispatchEvent(new CustomEvent('matchesUpdated', { detail: { action: 'update' } }));
        } else {
          const errMsg = result.error || 'Unknown error';
          setMessage(`❌ Failed to update match: ${errMsg}`);
          console.error('Match update failed:', errMsg);
          alert(`Match update failed: ${errMsg}`);
          clearMessage();
        }
      }
    } catch (error) {
      console.error('Error updating:', error);
      setMessage('❌ Error updating');
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

  // Handle challenger/defender player selection in edit form
  const handleEditChallengerSelect = (e) => {
    const id = e.target.value;
    const player = ladderPlayers.find(p => p._id === id);
    setEditPendingMatchFormData(prev => ({
      ...prev,
      challengerId: id,
      challengerName: player ? `${player.firstName} ${player.lastName}`.trim() : '',
      challengerEmail: player?.email || ''
    }));
  };

  const handleEditDefenderSelect = (e) => {
    const id = e.target.value;
    const player = ladderPlayers.find(p => p._id === id);
    setEditPendingMatchFormData(prev => ({
      ...prev,
      defenderId: id,
      defenderName: player ? `${player.firstName} ${player.lastName}`.trim() : '',
      defenderEmail: player?.email || ''
    }));
  };

  // Swap challenger and defender in edit form
  const handleSwapChallengerDefender = () => {
    setEditPendingMatchFormData(prev => ({
      ...prev,
      challengerId: prev.defenderId,
      defenderId: prev.challengerId,
      challengerName: prev.defenderName,
      defenderName: prev.challengerName,
      challengerEmail: prev.defenderEmail,
      defenderEmail: prev.challengerEmail
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
        
        // Sort LMS matches by date (most recent first)
        completedMatches.sort((a, b) => {
          const dateA = new Date(a.completedDate || a.scheduledDate);
          const dateB = new Date(b.completedDate || b.scheduledDate);
          return dateB - dateA; // Most recent first
        });
        
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

  // Fix all positions - renumber active players 1,2,3,... and clear position for inactive (Supabase)
  const fixAllPositions = async () => {
    if (!confirm('This will renumber active ladder positions sequentially from 1 and clear positions for inactive players. Continue?')) {
      return;
    }

    try {
      setMessage('🔄 Fixing all positions...');
      setLoading(true);

      const result = await supabaseDataService.fixLadderPositions(selectedLadder);

      if (result.success) {
        setMessage(`✅ ${result.message || 'Positions fixed!'}`);
        clearMessage();
        await fetchLadderPlayers();
      } else {
        setMessage(`❌ Error: ${result.error || 'Failed to fix positions'}`);
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

  // Create backup of ladder data
  const createBackup = async () => {
    if (!confirm('This will create a backup of the current ladder data. Continue?')) {
      return;
    }

    try {
      setMessage('💾 Creating backup...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/ladders/${selectedLadder}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('userToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Backup created successfully! ${data.message}`);
        clearMessage();
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to create backup'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setMessage('❌ Error creating backup');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  // View ladder backups
  const viewBackups = async () => {
    try {
      setMessage('📋 Loading backups...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/ladders/${selectedLadder}/backups`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('userToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setBackups(data.backups);
        setShowBackupsModal(true);
        setMessage('✅ Backups loaded successfully');
        clearMessage();
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to load backups'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      setMessage('❌ Error loading backups');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  // Preview backup restore
  const previewRestore = async (backupId) => {
    try {
      setMessage('🔍 Loading backup preview...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/ladders/${selectedLadder}/restore-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({ backupId: backupId })
      });

      const data = await response.json();

      if (data.success) {
        setRestorePreviewData(data);
        setShowRestorePreview(true);
        setMessage('✅ Preview loaded successfully');
        clearMessage();
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to load preview'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      setMessage('❌ Error loading preview');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  // Restore from backup
  const restoreBackup = async (backupId) => {
    if (!confirm('⚠️ WARNING: This will restore the ladder to the state it was in when this backup was created. This will overwrite all current ladder data. Are you absolutely sure you want to continue?')) {
      return;
    }

    if (!confirm('🚨 FINAL WARNING: This action cannot be undone. All current ladder data will be lost and replaced with the backup data. Continue?')) {
      return;
    }

    try {
      setMessage('🔄 Restoring backup...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/ladders/${selectedLadder}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({ backupId: backupId })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Backup restored successfully! Refreshing ladder data...');
        clearMessage();
        
        // Refresh the ladder data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to restore backup'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setMessage('❌ Error restoring backup');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  // Resend welcome email to a player
  const resendWelcomeEmail = async (player) => {
    const playerEmail = player.unifiedAccount?.email || player.email;
    console.log('📧 Starting email resend for:', player.firstName, player.lastName, playerEmail);
    
    if (!confirm(`Resend welcome email to ${player.firstName} ${player.lastName} (${playerEmail})?`)) {
      return;
    }

    try {
      setMessage('📧 Sending welcome email...');
      
      // Check if user is OAuth user
      const userId = player.unifiedAccount?.id || player.userId;
      let isOAuthUser = false;
      let authProvider = null;
      
      if (userId) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('auth_provider')
            .eq('id', userId)
            .single();
          
          if (userData?.auth_provider && userData.auth_provider !== 'email') {
            isOAuthUser = true;
            authProvider = userData.auth_provider;
          }
        } catch (checkError) {
          console.log('Could not check OAuth status:', checkError);
        }
      }
      
      // Only send password reset for non-OAuth users
      if (!isOAuthUser) {
        console.log('📧 Sending password reset email to:', playerEmail);
        
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          playerEmail,
          {
            redirectTo: `${window.location.origin}/#/reset-password`
          }
        );
        
        if (resetError) {
          console.error('❌ Failed to send password reset:', resetError);
          setMessage('⚠️ Failed to send password reset email');
          clearMessage();
          return;
        }
        
        console.log('✅ Password reset email sent successfully');
      } else {
        console.log('✅ OAuth user detected - skipping password reset email');
      }
      
      // Send welcome/approval email via backend
      try {
        const emailData = {
          to_email: playerEmail,
          to_name: `${player.firstName} ${player.lastName}`,
          ladder_name: player.ladderName || selectedLadder,
          position: player.position || 'TBD',
          app_url: window.location.origin,
          isOAuthUser: isOAuthUser,
          authProvider: authProvider
        };

        console.log('📧 Sending approval email with data:', emailData);
        console.log('📧 Backend URL:', BACKEND_URL);

        const emailResponse = await fetch(`${BACKEND_URL}/api/email/send-ladder-approval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData)
        });

        console.log('📧 Email response status:', emailResponse.status);
        console.log('📧 Email response ok:', emailResponse.ok);

        if (emailResponse.ok) {
          const responseData = await emailResponse.json();
          console.log('✅ Welcome email sent successfully:', responseData);
          setMessage('✅ Welcome emails sent successfully!');
        } else {
          const errorData = await emailResponse.json();
          console.error('❌ Email sending failed:', errorData);
          setMessage(`⚠️ Password reset sent, but approval email failed: ${errorData.error || 'Unknown error'}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send approval email:', emailError);
        setMessage('⚠️ Password reset sent, but approval email failed');
      }
      
      clearMessage();
    } catch (error) {
      console.error('Error sending welcome email:', error);
      setMessage('❌ Error sending welcome email');
      clearMessage();
    }
  };

  // Check auto backup status
  const checkAutoBackupStatus = async () => {
    try {
      setMessage('🤖 Checking auto backup status...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/auto-backup/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('userToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setAutoBackupStatus(data.status);
        setShowAutoBackupModal(true);
        setMessage('✅ Auto backup status loaded');
        clearMessage();
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to load auto backup status'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error checking auto backup status:', error);
      setMessage('❌ Error checking auto backup status');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual auto backup
  const triggerAutoBackup = async () => {
    if (!confirm('This will create automatic backups for all ladders. Continue?')) {
      return;
    }

    try {
      setMessage('🤖 Triggering auto backup for all ladders...');
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/auto-backup/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('userToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Auto backup completed! ${data.result.successful} ladders backed up successfully`);
        clearMessage();
        
        // Refresh the status
        setTimeout(() => {
          checkAutoBackupStatus();
        }, 1000);
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to trigger auto backup'}`);
        clearMessage();
      }
    } catch (error) {
      console.error('Error triggering auto backup:', error);
      setMessage('❌ Error triggering auto backup');
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

  // Payment approval functions
  const loadPendingPayments = async () => {
    setPaymentLoading(true);
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`${BACKEND_URL}/api/monetization/pending-payments?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Pending payments response:', data);
        setPendingPayments(data.pendingPayments || []);
      } else {
        setMessage('Failed to load pending payments');
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
      setMessage('Error loading pending payments');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId, approved) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/verify-payment/${paymentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verified: approved,
          adminNotes: approved ? 'Approved by ladder admin' : 'Rejected by ladder admin'
        })
      });

      if (response.ok) {
        setMessage(`✅ Payment ${approved ? 'approved' : 'rejected'} successfully!`);
        clearMessage();
        await loadPendingPayments(); // Reload the list
      } else {
        setMessage('❌ Failed to update payment status');
        clearMessage();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      setMessage('❌ Error updating payment status');
      clearMessage();
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading ladder players...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
    {currentView === 'players' ? 'Ladder Player Management' : 
     currentView === 'matches' ? 'Ladder Match Manager' :
     currentView === 'emails' ? 'Email Manager' :
     currentView === 'payments' ? 'Payment Approvals' :
     currentView === 'forfeits' ? 'Forfeit Requests' :
     currentView === 'overdue' ? 'Overdue Matches' :
     currentView === 'tournaments' ? 'Tournament Management' :
     currentView === 'test-environment' ? 'Test Environment' :
     currentView === 'comprehensive-test' ? 'Comprehensive Test Suite' : 'Ladder Admin'}
        </h2>
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
               <option value="test-ladder">🧪 Test Ladder</option>
             </select>
           </div>
                       <div className={styles.headerButtons} style={{ 
                         display: 'flex', 
                         flexWrap: 'wrap', 
                         gap: '10px', 
                         justifyContent: 'center',
                         marginBottom: '15px'
                       }}>
        {currentView !== 'players' && (
          <button
            onClick={() => setCurrentView('players')}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ← Return to Admin
          </button>
        )}
        <button 
          className={styles.addButton}
          onClick={() => {
            window.scrollTo(0, 0);
            setShowAddForm(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #28a745, #20c997)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ➕ Add Player
        </button>
        <button 
          onClick={() => {
            alert('Button clicked!');
            console.log('🧪 Setting message state...');
            setShowQuickAddForm(true);
            setMessage('🧪 Test message - Quick Add form opened');
            console.log('🧪 Message state should be set now');
            setTimeout(() => {
              console.log('🧪 Clearing message...');
              clearMessage();
            }, 3000);
          }}
          style={{
            background: 'linear-gradient(135deg, #28a745, #20c997)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ⚡ Quick Add Player
        </button>
        <button 
          className={styles.createMatchButton}
          onClick={() => {
            window.scrollTo(0, 0);
            setShowCreateMatchForm(true);
          }}
          disabled={ladderPlayers.filter(p => p.ladderName === selectedLadder).length < 2}
          style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🎱 Create Match
        </button>
        <button 
          className={styles.pendingMatchesButton}
          onClick={() => {
            setShowPendingMatches(true);
            loadPendingMatches();
          }}
          style={{
            background: 'linear-gradient(135deg, #f093fb, #f5576c)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ⏳ Pending Matches
        </button>
      </div>
         </div>
      </div>
    {currentView === 'players' ? (
      <>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px', 
        justifyContent: 'center',
        marginTop: '10px',
        padding: '15px',
        background: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h5 style={{ 
          width: '100%', 
          textAlign: 'center', 
          color: '#fff', 
          margin: '0 0 10px 0', 
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          🔧 Management Views
        </h5>
        <button 
          className={styles.matchManagerButton}
          onClick={() => setCurrentView('matches')}
          style={{ 
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)', 
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
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
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          📧 Email Manager
        </button>
        <button 
          className={styles.paymentManagerButton}
          onClick={() => setCurrentView('payments')}
          style={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          💰 Payment Approvals
        </button>
        <button 
          className={styles.forfeitManagerButton}
          onClick={() => setCurrentView('forfeits')}
          style={{ 
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', 
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          📝 Forfeit Requests
        </button>
        <button 
          className={styles.overdueManagerButton}
          onClick={() => setCurrentView('overdue')}
          style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          ⚠️ Overdue Matches
        </button>
        <button 
          className={styles.tournamentManagerButton}
          onClick={() => {
            console.log('🏆 Tournaments button clicked');
            console.log('🏆 Current view before:', currentView);
            setCurrentView('tournaments');
            console.log('🏆 Setting view to tournaments');
          }}
          style={{ 
            background: 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)', 
            color: 'black',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          🏆 Tournaments
        </button>
      </div>

      {/* Organized Admin Controls */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '15px', 
              marginTop: '20px',
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {/* Player Management Section */}
              <div style={{ marginBottom: '10px' }}>
                <h4 style={{ 
                  color: '#fff', 
                  margin: '0 0 10px 0', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '8px',
                  borderRadius: '5px'
                }}>
                  👥 Player Management
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  <button 
                    className={styles.addButton}
                    onClick={() => setShowAddForm(true)}
                    style={{
                      background: 'linear-gradient(135deg, #28a745, #20c997)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ➕ Add Player
                  </button>
                  <button 
                    className={styles.applicationsButton}
                    onClick={() => setShowApplicationsManager(true)}
                    style={{
                      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🏆 View Applications
                  </button>
                  <button 
                    onClick={openLadderPromotion}
                    style={{
                      background: 'linear-gradient(135deg, #28a745, #20c997)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ⬆️ Promote Players
                  </button>
                </div>
              </div>

              {/* Match Management Section */}
              <div style={{ marginBottom: '10px' }}>
                <h4 style={{ 
                  color: '#fff', 
                  margin: '0 0 10px 0', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  padding: '8px',
                  borderRadius: '5px'
                }}>
                  🎱 Match Management
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  <button 
                    className={styles.matchButton}
                    onClick={() => {
                      window.scrollTo(0, 0);
                      setShowMatchForm(true);
                    }}
                    disabled={ladderPlayers.filter(p => p.ladderName === selectedLadder).length < 2}
                    style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📝 Score Match
                  </button>
                  <button 
                    onClick={async () => {
                      const player1Id = prompt('Enter Player 1 ID (from Supabase users table) to check SmackBack eligibility:');
                      if (player1Id) {
                        const result = await supabaseDataService.checkSmackBackEligibility(player1Id);
                        if (result.eligible) {
                          alert(`✅ SmackBack ELIGIBLE!\n\nExpires: ${result.eligibleUntil.toLocaleString()}\nDays remaining: ${result.daysRemaining}`);
                        } else {
                          alert(`❌ NOT Eligible for SmackBack\n\nReason: ${result.reason}`);
                        }
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🔄 Check SmackBack Eligibility
                  </button>
                  <button 
                    className={styles.historyButton}
                    onClick={() => {
                      setShowMatchHistory(!showMatchHistory);
                      if (!showMatchHistory) {
                        loadMatchHistory();
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📊 {showMatchHistory ? 'Hide History' : 'View History'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowLmsTracking(true);
                      setLmsMatches([]);
                      setTimeout(() => {
                        loadLmsMatches();
                      }, 100);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📈 LMS Tracking
                  </button>
                </div>
              </div>

              {/* System Tools Section */}
              <div style={{ marginBottom: '10px' }}>
                <h4 style={{ 
                  color: '#fff', 
                  margin: '0 0 10px 0', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  padding: '8px',
                  borderRadius: '5px'
                }}>
                  ⚙️ System Tools
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => {
                      const bulkFargoUpdaterUrl = `${BACKEND_URL.replace('/api', '')}/static/fargo-copy-paste-admin.html`;
                      const isProduction = /onrender\.com|\.com\/api/i.test(BACKEND_URL);
                      if (isProduction) {
                        window.location.href = bulkFargoUpdaterUrl;
                      } else {
                        window.open(bulkFargoUpdaterUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📋 Bulk Fargo Update
                  </button>
                  <button 
                    onClick={openFargoUpdater}
                    style={{
                      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🎯 Individual Fargo Update
                  </button>
                  <button 
                    onClick={fixAllPositions}
                    style={{
                      background: 'linear-gradient(135deg, #00b894, #00cec9)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🔢 Fix Positions
                  </button>
                  <button 
                    onClick={createBackup}
                    style={{
                      background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    💾 Backup Ladder
                  </button>
                  <button 
                    onClick={viewBackups}
                    style={{
                      background: 'linear-gradient(135deg, #fd79a8, #fdcb6e)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📋 View Backups
                  </button>
                  <button 
                    onClick={() => setCurrentView('comprehensive-test')}
                    style={{
                      background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🧪 Run Comprehensive Test
                  </button>
                  <button 
                    onClick={() => setCurrentView('test-environment')}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🎯 Test Environment
                  </button>
                  <button 
                    onClick={checkAutoBackupStatus}
                    style={{
                      background: 'linear-gradient(135deg, #00b894, #00a085)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🤖 Auto Backup Status
                  </button>
                  <button 
                    onClick={() => setShowSwapModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🔄 Swap Positions
                  </button>
                  <button 
                    onClick={() => { setShowFindUserModal(true); setFindUserSearch(''); setFindUserResults([]); setLinkToPositionUser(null); setLinkToPositionNum(''); }}
                    style={{
                      background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                    title="Find user by name or email (e.g. to recover details of a removed player)"
                  >
                    🔍 Find User
                  </button>
                </div>
              </div>
            </div>

      {/* Message Display */}
      {message && (
        <div style={{
          background: '#4CAF50',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
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
                <option value="test-ladder">🧪 Test Ladder</option>
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

      {/* Quick Add Player Form */}
      {showQuickAddForm && renderModal(
        <DraggableModal
          open={showQuickAddForm}
          onClose={() => setShowQuickAddForm(false)}
          title="⚡ Quick Add Player to Ladder"
          maxWidth="500px"
        >
          <div className={styles.formContainer}>
            <form onSubmit={handleQuickAddPlayer}>
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '5px', fontSize: '14px', color: '#333' }}>
                <strong>💡 Quick Add:</strong> This adds a player directly to the selected ladder at a specific position. 
                The system will automatically shift other players' positions to make room.
              </div>
              
              <input
                type="text"
                name="firstName"
                placeholder="First Name *"
                value={quickAddData.firstName}
                onChange={handleQuickAddInputChange}
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name *"
                value={quickAddData.lastName}
                onChange={handleQuickAddInputChange}
                required
              />
              <select
                name="ladderName"
                value={quickAddData.ladderName}
                onChange={handleQuickAddInputChange}
                required
              >
                <option value="499-under">499 & Under</option>
                <option value="500-549">500-549</option>
                <option value="550-plus">550+</option>
                <option value="test-ladder">🧪 Test Ladder</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="number"
                  name="position"
                  placeholder="Position on Ladder *"
                  value={quickAddData.position}
                  onChange={handleQuickAddInputChange}
                  required
                  min="1"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const currentLadderPlayers = ladderPlayers.filter(p => p.ladderName === quickAddData.ladderName);
                    const lastPosition = currentLadderPlayers.length + 1;
                    setQuickAddData(prev => ({ ...prev, position: lastPosition.toString() }));
                  }}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Last Position
                </button>
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email (optional - will auto-find from unified account)"
                value={quickAddData.email}
                onChange={handleQuickAddInputChange}
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone (optional - will auto-find from unified account)"
                value={quickAddData.phone}
                onChange={handleQuickAddInputChange}
              />
              <input
                type="number"
                name="fargoRate"
                placeholder="Fargo Rate (optional)"
                value={quickAddData.fargoRate}
                onChange={handleQuickAddInputChange}
                min="0"
                max="850"
              />
              <select
                name="location"
                value={quickAddData.location}
                onChange={handleQuickAddInputChange}
              >
                <option value="">Select Preferred Location (optional)</option>
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
              <textarea
                name="notes"
                placeholder="Notes (optional)"
                value={quickAddData.notes}
                onChange={handleQuickAddInputChange}
                rows="3"
              />
              
              <div className={styles.formButtons}>
                <button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : '⚡ Add Player'}
                </button>
                <button type="button" onClick={() => setShowQuickAddForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
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
                        .filter(player => player.ladderName === selectedLadder && player.isActive !== false)
                        .sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))
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
                        .filter(player => player.ladderName === selectedLadder && player.isActive !== false)
                        .sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))
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
      {editingPlayer && createPortal(
        <DraggableModal
          open={true}
          onClose={() => setEditingPlayer(null)}
          title={`Edit Player: ${editingPlayer.firstName} ${editingPlayer.lastName}`}
          maxWidth="600px"
          maxHeight="90vh"
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '15px',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '10px'
          }}>
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                Email *
              </label>
              <input
                type="text"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                Phone
              </label>
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                Fargo Rate *
              </label>
              <input
                type="number"
                name="fargoRate"
                placeholder="Fargo Rate"
                value={formData.fargoRate}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold', backgroundColor: '#8b5cf6', padding: '5px 10px', borderRadius: '4px' }}>
                🎯 Ladder Position *
              </label>
              <input
                type="number"
                name="position"
                placeholder="Ladder Position"
                value={formData.position}
                onChange={handleInputChange}
                required
                min="1"
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#000',
                  border: '2px solid #8b5cf6',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                Ladder *
              </label>
              <select
                name="ladderName"
                value={formData.ladderName}
                onChange={handleInputChange}
                required
              >
                <option value="499-under">499 & Under</option>
                <option value="500-549">500-549</option>
                <option value="550-plus">550+</option>
                <option value="test-ladder">🧪 Test Ladder</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                Preferred Location
              </label>
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
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                Sanction Year
              </label>
              <input
                type="number"
                name="sanctionYear"
                placeholder="Sanction Year"
                value={formData.sanctionYear}
                onChange={handleInputChange}
                min="2020"
                max="2030"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
                LMS Name
              </label>
              <input
                type="text"
                name="lmsName"
                placeholder="LMS Name (for Fargo matching)"
                value={formData.lmsName}
                onChange={handleInputChange}
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <label style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active on Ladder
                </label>
                <label style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    name="sanctioned"
                    checked={formData.sanctioned}
                    onChange={handleInputChange}
                  />
                  BCA Sanctioned
                </label>
              </div>
            </div>
            
            <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  onClick={handleUpdatePlayer}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Update Player
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingPlayer(null)}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </DraggableModal>,
        document.body
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
                {ladderPlayers.filter(p => p.ladderName === selectedLadder && p.isActive !== false).sort((a,b) => (a.position ?? 9999) - (b.position ?? 9999)).map(player => (
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
                {ladderPlayers.filter(p => p.ladderName === selectedLadder && p.isActive !== false).sort((a,b) => (a.position ?? 9999) - (b.position ?? 9999)).map(player => (
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

      {/* Find User / Recover Details Modal */}
      {showFindUserModal && renderModal(
        <DraggableModal
          open={showFindUserModal}
          onClose={() => { setShowFindUserModal(false); setFindUserSearch(''); setFindUserResults([]); setLinkToPositionUser(null); setLinkToPositionNum(''); }}
          title="🔍 Find User / Recover Details"
          maxWidth="600px"
          maxHeight="85vh"
        >
          <div style={{ padding: '20px' }}>
            <p style={{ color: '#ccc', marginBottom: '15px', fontSize: '14px' }}>
              Search by name or email to find a user. Useful when a player was removed from the ladder — their account and details (email, etc.) are still in the system.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Enter name or email..."
                value={findUserSearch}
                onChange={(e) => setFindUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchForUser())}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <button
                onClick={searchForUser}
                disabled={findUserLoading || !findUserSearch.trim()}
                style={{
                  background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: findUserLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {findUserLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {findUserResults.length > 0 ? (
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {findUserResults.map(user => {
                  const onLadder = (user.ladderProfiles || []).filter(p => p.ladder_name === selectedLadder && p.is_active);
                  const otherLadders = (user.ladderProfiles || []).filter(p => p.ladder_name !== selectedLadder);
                  return (
                    <div key={user.id} style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '4px' }}>
                        📧 {user.email || 'No email'}
                      </div>
                      {user.phone && <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '4px' }}>📱 {user.phone}</div>}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                        {onLadder.length > 0 ? (
                          <span style={{ color: '#4ade80' }}>On {selectedLadder}: Position #{onLadder[0].position}</span>
                        ) : otherLadders.length > 0 ? (
                          <span>On: {otherLadders.map(p => `${p.ladder_name} (#${p.position})`).join(', ')}</span>
                        ) : (
                          <span style={{ color: '#fbbf24' }}>Not on any ladder (e.g. removed or pending)</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => { navigator.clipboard?.writeText(user.email || ''); alert(`Email copied: ${user.email}`); }}
                          style={{ padding: '6px 12px', background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          📋 Copy Email
                        </button>
                        {onLadder.length === 0 && (
                          linkToPositionUser?.id === user.id ? (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                type="number"
                                min="1"
                                placeholder="Position #"
                                value={linkToPositionNum}
                                onChange={(e) => setLinkToPositionNum(e.target.value)}
                                style={{ width: '80px', padding: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                              />
                              <button onClick={handleLinkToPosition} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Link</button>
                              <button onClick={() => { setLinkToPositionUser(null); setLinkToPositionNum(''); }} style={{ padding: '6px 10px', background: '#666', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setLinkToPositionUser(user)}
                              style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              title="Link this user's account to an existing ladder position (e.g. they were removed but belong at a higher position)"
                            >
                              🔗 Link to position
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : findUserSearch.trim() && !findUserLoading && (
              <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No users found. Try a different search.</p>
            )}
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
              {/* Match Type Selection - Only show when creating new match */}
              {!matchFormData.matchId && (
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Match Type:</label>
                    <select 
                      name="matchType"
                      value={matchFormData.matchType}
                      onChange={handleMatchInputChange}
                      required
                    >
                      <option value="challenge">⚔️ Challenge Match</option>
                      <option value="smackdown">💥 SmackDown Match</option>
                      <option value="smackback">🔄 SmackBack Match</option>
                      <option value="fast-track">🚀 Fast Track Challenge</option>
                      <option value="reverse-fast-track">🔄 Reverse Fast Track</option>
                    </select>
                  </div>
                </div>
              )}
              
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
                       .filter(player => player.ladderName === selectedLadder && player.isActive !== false)
                       .sort((a,b) => (a.position ?? 9999) - (b.position ?? 9999))
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
                       .filter(player => player.ladderName === selectedLadder && player.isActive !== false)
                       .sort((a,b) => (a.position ?? 9999) - (b.position ?? 9999))
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
          maxWidth="95vw"
          width="95vw"
          height="85vh"
        >
          <div className={styles.pendingMatchesModal}>
            {pendingMatches.length === 0 ? (
              <div className={styles.noData}>No pending matches for this ladder.</div>
            ) : (
              <div className={styles.pendingMatchesTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Submitted</th>
                      <th>Match Date</th>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Challenger</th>
                      <th>Defender</th>
                      <th>Format</th>
                      <th>Location</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMatches.map((match, index) => (
                      <tr key={match._id || match.id || index}>
                        <td>{match.submittedAt ? 
                             new Date(match.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 
                             '—'}</td>
                        <td>{match.scheduledDate ? 
                             new Date(match.scheduledDate).toLocaleDateString() : 
                             match.proposedDate ? 
                             new Date(match.proposedDate).toLocaleDateString() : 
                             match.preferred_date ? 
                             new Date(match.preferred_date).toLocaleDateString() : 
                             'TBD'}</td>
                        <td>{(() => {
                             const timeVal = match.preferredTime || match.preferred_time;
                             if (timeVal) {
                               const parts = String(timeVal).trim().split(':');
                               if (parts.length >= 2) {
                                 const h = parseInt(parts[0], 10);
                                 const m = parts[1].padStart(2, '0');
                                 if (!isNaN(h) && h >= 0 && h <= 23) {
                                   return h === 0 ? `12:${m} AM` : h === 12 ? `12:${m} PM` : h < 12 ? `${h}:${m} AM` : `${h - 12}:${m} PM`;
                                 }
                               }
                               return timeVal;
                             }
                             const dateVal = match.scheduledDate || match.proposedDate || match.match_date || match.preferred_date;
                             if (dateVal) {
                               try {
                                 const d = new Date(dateVal);
                                 if (!isNaN(d.getTime())) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                               } catch (_) {}
                             }
                             return '—';
                           })()}</td>
                        <td>
                          <span className={`${styles.matchType} ${styles[(match.match_type || match.matchType) || 'challenge']}`}>
                            {(match.match_type || match.matchType) === 'challenge' ? '⚔️ Challenge' :
                             (match.match_type || match.matchType) === 'smackdown' ? '💥 SmackDown' :
                             (match.match_type || match.matchType) === 'smackback' ? '🔄 SmackBack' :
                             (match.match_type || match.matchType) === 'fast-track' ? '🚀 Fast Track' :
                             (match.match_type || match.matchType) === 'reverse-fast-track' ? '🔄 Rev Fast Track' : '⚔️ Challenge'}
                          </span>
                        </td>
                        <td>
                          <span className={styles.playerName}>
                            {match.challenger?.firstName || match.player1?.firstName} {match.challenger?.lastName || match.player1?.lastName}
                            {(match.challenger?.position || match.player1?.position) && ` (#${match.challenger?.position || match.player1?.position})`}
                          </span>
                          <span className={styles.playerRole} style={{color: '#06b6d4'}}>Challenger</span>
                        </td>
                        <td>
                          <span className={styles.playerName}>
                            {match.defender?.firstName || match.player2?.firstName} {match.defender?.lastName || match.player2?.lastName}
                            {(match.defender?.position || match.player2?.position) && ` (#${match.defender?.position || match.player2?.position})`}
                          </span>
                          <span className={styles.playerRole} style={{color: '#f59e0b'}}>Defender</span>
                        </td>
                        <td>{match.matchFormat || match.raceLength || 'N/A'}</td>
                        <td>{match.location || match.venue || 'N/A'}</td>
                        <td>{match.notes || 'N/A'}</td>
                        <td>
                          <div className={styles.matchActions}>
                            <button 
                              className={styles.editButton}
                              onClick={() => handleEditSchedulingRequest(match)}
                              title="Edit Request"
                            >
                              ✏️
                            </button>
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

      <div>
             {/* Players List - Single Ladder View */}
       <div className={styles.ladderSection}>
         <h3 className={styles.ladderTitle}>
           {selectedLadder === '499-under' ? '499 & Under' : 
            selectedLadder === '500-549' ? '500-549' : 
            selectedLadder === '550-plus' ? '550+' : selectedLadder} Ladder
         </h3>
        
        {/* Payment Type Filter */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#fff', marginRight: '10px', fontSize: '14px' }}>
            Filter by Payment Type:
          </label>
          <select
            value={selectedPaymentType}
            onChange={(e) => setSelectedPaymentType(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            <option value="all">All Payment Types</option>
            <option value="credits_purchase">💰 Credits Purchase</option>
            <option value="membership">👤 Membership</option>
            <option value="match_reporting">🏆 Match Reporting</option>
            <option value="sanction">📋 Sanction</option>
          </select>
        </div>
        
        {(() => {
          // Calculate summary counts based on current filter
          const summary = pendingPayments.reduce((acc, payment) => {
            // Apply payment type filter
            if (selectedPaymentType !== 'all' && payment.type !== selectedPaymentType) {
              return acc;
            }
            
            // Apply ladder filter for match reporting
            if (payment.type === 'match_reporting' && payment.ladderName !== selectedLadder) {
              return acc;
            }
            
            if (['credits_purchase', 'membership', 'sanction'].includes(payment.type)) {
              acc[payment.type] = (acc[payment.type] || 0) + 1;
            } else if (payment.type === 'match_reporting') {
              acc['match_reporting'] = (acc['match_reporting'] || 0) + 1;
            }
            return acc;
          }, {});
          
          const totalCount = Object.values(summary).reduce((sum, count) => sum + count, 0);
          
          if (totalCount > 0) {
            return (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>
                  📊 Payment Summary ({totalCount} total)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  {Object.entries(summary).map(([type, count]) => {
                    const typeConfig = {
                      'credits_purchase': { label: 'Credits', color: '#10b981', icon: '💰' },
                      'membership': { label: 'Membership', color: '#3b82f6', icon: '👤' },
                      'match_reporting': { label: 'Match Reporting', color: '#f59e0b', icon: '🏆' },
                      'sanction': { label: 'Sanction', color: '#8b5cf6', icon: '📋' }
                    };
                    const config = typeConfig[type];
                    return (
                      <div key={type} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: config?.color || '#fff',
                        fontSize: '14px'
                      }}>
                        {config?.icon} {config?.label}: {count}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return null;
        })()}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            onClick={loadPendingPayments}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Pending Payments
          </button>
          
          <button 
            onClick={async () => {
              if (window.confirm('This will remove duplicate membership payments for the same player, keeping only the latest one. Continue?')) {
                try {
                  const response = await fetch(`${BACKEND_URL}/api/monetization/cleanup-duplicates`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    alert(`✅ ${result.message}`);
                    await loadPendingPayments(); // Refresh the list
                  } else {
                    alert('❌ Failed to cleanup duplicates');
                  }
                } catch (error) {
                  console.error('Error cleaning up duplicates:', error);
                  alert('❌ Error cleaning up duplicates');
                }
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🧹 Cleanup Duplicates
          </button>
        </div>
        
        {paymentLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
            Loading pending payments...
          </div>
        ) : (() => {
          // Check if there are any payments after filtering
          const filteredPayments = pendingPayments.filter(payment => {
            // Apply payment type filter
            if (selectedPaymentType !== 'all' && payment.type !== selectedPaymentType) {
              return false;
            }
            
            // Apply ladder filter for match reporting
            if (payment.type === 'match_reporting' && payment.ladderName !== selectedLadder) {
              return false;
            }
            
            return true;
          });
          
          return filteredPayments.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              background: 'rgba(76, 175, 80, 0.1)', 
              borderRadius: '8px',
              color: '#4caf50',
              textAlign: 'center'
            }}>
              ✅ No pending payments requiring approval
              {selectedPaymentType !== 'all' && ` for ${selectedPaymentType.replace('_', ' ')}`}
              {selectedPaymentType === 'match_reporting' && ` in ${selectedLadder}`}
            </div>
          ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {(() => {
              // Filter payments based on type and ladder
              const filteredPayments = pendingPayments.filter(payment => {
                // Apply payment type filter
                if (selectedPaymentType !== 'all' && payment.type !== selectedPaymentType) {
                  return false;
                }
                
                // Apply ladder filter for match reporting
                if (payment.type === 'match_reporting' && payment.ladderName !== selectedLadder) {
                  return false;
                }
                
                return true;
              });

              // Group filtered payments by type
              const groupedPayments = filteredPayments.reduce((groups, payment) => {
                const type = payment.type;
                if (!groups[type]) {
                  groups[type] = [];
                }
                groups[type].push(payment);
                return groups;
              }, {});

              // Define type colors and labels
              const typeConfig = {
                'credits_purchase': { label: 'Credits Purchase', color: '#10b981', icon: '💰' },
                'membership': { label: 'Membership', color: '#3b82f6', icon: '👤' },
                'match_reporting': { label: 'Match Reporting', color: '#f59e0b', icon: '🏆' },
                'sanction': { label: 'Sanction', color: '#8b5cf6', icon: '📋' }
              };

              return Object.entries(groupedPayments).map(([type, payments]) => (
                <div key={type} style={{ marginBottom: '20px' }}>
                  <div style={{
                    background: `linear-gradient(135deg, ${typeConfig[type]?.color || '#6b7280'}20, ${typeConfig[type]?.color || '#6b7280'}10)`,
                    border: `1px solid ${typeConfig[type]?.color || '#6b7280'}40`,
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '10px'
                  }}>
                    <h4 style={{ 
                      color: typeConfig[type]?.color || '#fff', 
                      margin: '0 0 10px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {typeConfig[type]?.icon || '📄'} {typeConfig[type]?.label || type.replace('_', ' ').toUpperCase()} ({payments.length})
                    </h4>
                  </div>
                  
                  {payments.map((payment) => (
                    <div key={payment._id} style={{
                      padding: '15px',
                      marginBottom: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: `1px solid ${typeConfig[type]?.color || 'rgba(255, 255, 255, 0.1)'}40`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
                            ${payment.amount} - {typeConfig[type]?.label || payment.type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div style={{ color: '#ccc', fontSize: '14px' }}>
                            Player: {payment.playerEmail}
                          </div>
                          <div style={{ color: '#ccc', fontSize: '14px' }}>
                            Method: {payment.paymentMethod} • Date: {new Date(payment.createdAt).toLocaleDateString()}
                          </div>
                          {payment.ladderName && (
                            <div style={{ color: '#ccc', fontSize: '14px' }}>
                              Ladder: {payment.ladderName}
                            </div>
                          )}
                          {payment.description && (
                            <div style={{ color: '#ccc', fontSize: '14px' }}>
                              Description: {payment.description}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleApprovePayment(payment._id, true)}
                            style={{
                              background: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleApprovePayment(payment._id, false)}
                            style={{
                              background: '#f44336',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
          )
        })()}
      </div>

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
              <th style={{width: '12%'}}>Account</th>
              <th style={{width: '8%'}}>Status</th>
              <th style={{width: '9%'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
                 {ladderPlayers
                   .filter(player => player.ladderName === selectedLadder)
                   .sort((a, b) => {
                     const aActive = a.isActive !== false ? 1 : 0;
                     const bActive = b.isActive !== false ? 1 : 0;
                     if (aActive !== bActive) return bActive - aActive;
                     return (a.position ?? 9999) - (b.position ?? 9999);
                   })
                   .map((player, index) => (
              <tr key={player._id || player.email} style={player.isActive === false ? { opacity: 0.85, background: 'rgba(0,0,0,0.15)' } : undefined}>
                     <td>{player.position != null ? player.position : (player.isActive === false ? '—' : index + 1)}</td>
                <td>{player.firstName} {player.lastName}</td>
                <td style={{whiteSpace: 'normal', wordBreak: 'break-all'}}>
                  {(player.unifiedAccount?.email || player.email) && (player.unifiedAccount?.email || player.email) !== 'unknown@email.com' ? (
                    <span style={{
                      color: /@(ladder\.local|ladder\.temp|test|temp|local|fake|example|dummy)/i.test(player.unifiedAccount?.email || player.email || '') 
                        ? '#dc2626' 
                        : 'inherit'
                    }}>
                      {player.unifiedAccount?.email || player.email}
                    </span>
                  ) : (
                    'No email'
                  )}
                </td>
                <td>{player.phone}</td>
                <td>{player.fargoRate}</td>
                <td>
                  {(() => {
                    const email = player.unifiedAccount?.email || player.email || '';
                    const isPlaceholder = /@(ladder\.local|ladder\.generated|ladder\.temp|test|temp|local|fake|example|dummy)/i.test(email);
                    const hasPhone = !!(player.phone && String(player.phone).trim());
                    const hasRealEmail = !!email && email !== 'unknown@email.com' && !isPlaceholder;
                    if (hasRealEmail && hasPhone) return <span className={styles.status} style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>✓ Claimed · Profile</span>;
                    if (hasRealEmail) return <span className={styles.status} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>✓ Claimed</span>;
                    return <span className={styles.status} style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Pending claim</span>;
                  })()}
                </td>
                <td>
                  <span className={`${styles.status} ${player.isActive ? styles.active : styles.inactive}`}>
                    {player.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.playerActionButtons}>
                    <button 
                      className={styles.editButton}
                      onClick={() => handleEditPlayer(player)}
                    >
                      Edit
                    </button>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeletePlayer(player.unifiedAccount?.email || player.email)}
                    >
                      Remove
                    </button>
                    <button 
                      className={styles.emailButton}
                      onClick={() => resendWelcomeEmail(player)}
                      title="Resend welcome and password reset emails"
                    >
                      📧 Email
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
           ) : (
             <div className={styles.noPlayers}>No players in this ladder yet</div>
           )}
        </div>
      </div>
      </>
    ) : currentView === 'matches' ? (
      <MatchManager
        ref={matchManagerRef}
        selectedLadder={selectedLadder}
        userToken={userToken}
        onReportMatch={(match) => {
          const pendingFormat = {
            id: match._id || match.id,
            _id: match._id || match.id,
            challenger: match.player1,
            defender: match.player2,
            player1: match.player1,
            player2: match.player2,
            scheduledDate: match.scheduledDate,
            location: match.location,
            proposedDate: match.scheduledDate,
            match_type: match.match_type,
            winner_id: match.winner_id,
            loser_id: match.loser_id
          };
          selectPendingMatch(pendingFormat);
        }}
        onEditMatch={(match) => {
          const pendingFormat = {
            id: match._id || match.id,
            _id: match._id || match.id,
            challenger: match.player1,
            defender: match.player2,
            player1: match.player1,
            player2: match.player2,
            winner_id: match.winner_id,
            loser_id: match.loser_id,
            scheduledDate: match.scheduledDate,
            location: match.location,
            notes: match.notes,
            matchType: match.match_type,
            match_type: match.match_type,
            raceLength: match.raceLength,
            race_length: match.raceLength,
            ladderName: selectedLadder,
            ladder_name: selectedLadder
          };
          handleEditPendingMatch(pendingFormat);
        }}
      />
    ) : currentView === 'emails' ? (
      <EmailManager userToken={userToken} />
    ) : currentView === 'comprehensive-test' ? (
      <ComprehensiveTestSection backendUrl={BACKEND_URL} />
    ) : currentView === 'test-environment' ? (
      <TestEnvironmentSection backendUrl={BACKEND_URL} />
    ) : currentView === 'payments' ? (
      <PaymentApprovalsManager userToken={userToken} selectedLadder={selectedLadder} />
    ) : currentView === 'forfeits' ? (
      <ForfeitRequestsManager userToken={userToken} />
    ) : currentView === 'overdue' ? (
      <OverdueMatchesManager selectedLadder={selectedLadder} userToken={userToken} />
    ) : currentView === 'tournaments' ? (
      <TournamentAdminDashboard />
    ) : null}

      {/* Score Pending Match Modal - outside view switch so it works from Match Manager */}
      {showScorePendingMatchModal && matchToScore && renderModal(
        <DraggableModal
          open={showScorePendingMatchModal}
          onClose={() => {
            setShowScorePendingMatchModal(false);
            setMatchToScore(null);
          }}
          title={`Score ${(matchToScore.match_type || matchToScore.matchType) === 'smackdown' ? '💥 SmackDown' : 
                          (matchToScore.match_type || matchToScore.matchType) === 'smackback' ? '🔄 SmackBack' :
                          (matchToScore.match_type || matchToScore.matchType) === 'fast-track' ? '🚀 Fast Track' :
                          (matchToScore.match_type || matchToScore.matchType) === 'reverse-fast-track' ? '🔄 Reverse Fast Track' : '⚔️ Challenge'} Match`}
          maxWidth="600px"
          maxHeight="90vh"
        >
          <form onSubmit={submitPendingMatchScore}>
            <div style={{ 
              background: 'rgba(139, 92, 246, 0.1)', 
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: '#8b5cf6', marginTop: 0, marginBottom: '10px' }}>Match Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', color: '#e0e0e0' }}>
                <div>
                  <strong>Challenger:</strong> {matchToScore.challenger?.firstName || matchToScore.player1?.firstName} {matchToScore.challenger?.lastName || matchToScore.player1?.lastName}
                  {(matchToScore.challenger?.position || matchToScore.player1?.position) && ` (#${matchToScore.challenger?.position || matchToScore.player1?.position})`}
                </div>
                <div>
                  <strong>Defender:</strong> {matchToScore.defender?.firstName || matchToScore.player2?.firstName} {matchToScore.defender?.lastName || matchToScore.player2?.lastName}
                  {(matchToScore.defender?.position || matchToScore.player2?.position) && ` (#${matchToScore.defender?.position || matchToScore.player2?.position})`}
                </div>
                <div>
                  <strong>Date:</strong> {matchToScore.scheduledDate ? new Date(matchToScore.scheduledDate).toLocaleDateString() : 'TBD'}
                </div>
                <div>
                  <strong>Location:</strong> {matchToScore.location || matchToScore.venue || 'TBD'}
                </div>
              </div>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Match Date:</label>
              <input
                type="date"
                name="matchDate"
                defaultValue={matchToScore.scheduledDate ? new Date(matchToScore.scheduledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
              />
              <small style={{ color: '#aaa', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                💡 Adjust if the match was played on a different date than scheduled
              </small>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Winner:</label>
              <select name="winnerId" required style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                <option value="">Select Winner</option>
                <option value={matchToScore.challenger?._id || matchToScore.player1?._id}>
                  {matchToScore.challenger?.firstName || matchToScore.player1?.firstName} {matchToScore.challenger?.lastName || matchToScore.player1?.lastName}
                  {(matchToScore.challenger?.position || matchToScore.player1?.position) && ` (#${matchToScore.challenger?.position || matchToScore.player1?.position})`}
                </option>
                <option value={matchToScore.defender?._id || matchToScore.player2?._id}>
                  {matchToScore.defender?.firstName || matchToScore.player2?.firstName} {matchToScore.defender?.lastName || matchToScore.player2?.lastName}
                  {(matchToScore.defender?.position || matchToScore.player2?.position) && ` (#${matchToScore.defender?.position || matchToScore.player2?.position})`}
                </option>
              </select>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Score:</label>
              <input
                type="text"
                name="score"
                placeholder="e.g., 7-5, 9-3"
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
              />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes (optional):</label>
              <textarea name="notes" rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowScorePendingMatchModal(false); setMatchToScore(null); }} style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Submit Score</button>
            </div>
          </form>
        </DraggableModal>
      )}

      {/* Edit Pending Match Form - outside view switch so it works from Match Manager */}
      {showEditPendingMatchForm && editingPendingMatch && renderModal(
        <DraggableModal
          open={showEditPendingMatchForm}
          onClose={() => {
            setShowEditPendingMatchForm(false);
            setEditingPendingMatch(null);
            setEditingIsSchedulingRequest(false);
          }}
          title="Edit Pending Match"
          maxWidth="60vw"
        >
          <div className={styles.editPendingMatchForm}>
            <form onSubmit={handleEditPendingMatchSubmit}>
              <div className={styles.formRow} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                  <label>Challenger:</label>
                  <select
                    name="challengerId"
                    value={editPendingMatchFormData.challengerId}
                    onChange={handleEditChallengerSelect}
                  >
                    <option value="">Select Challenger</option>
                    {ladderPlayers
                      .filter(p => p.ladderName === (editingPendingMatch?.ladderName || editingPendingMatch?.ladder_name || selectedLadder) && p.isActive !== false)
                      .sort((a,b) => (a.position ?? 9999) - (b.position ?? 9999))
                      .map(player => (
                        <option key={player._id} value={player._id}>
                          #{player.position} - {player.firstName} {player.lastName}
                        </option>
                      ))}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ flex: '0 0 auto' }}>
                  <button
                    type="button"
                    onClick={handleSwapChallengerDefender}
                    className={styles.swapButton}
                    title="Swap Challenger and Defender"
                  >
                    ⇄ Swap
                  </button>
                </div>
                <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                  <label>Defender:</label>
                  <select
                    name="defenderId"
                    value={editPendingMatchFormData.defenderId}
                    onChange={handleEditDefenderSelect}
                  >
                    <option value="">Select Defender</option>
                    {ladderPlayers
                      .filter(p => p.ladderName === (editingPendingMatch?.ladderName || editingPendingMatch?.ladder_name || selectedLadder) && p.isActive !== false)
                      .sort((a,b) => (a.position ?? 9999) - (b.position ?? 9999))
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
                  <label>Race Length:</label>
                  <select
                    name="raceLength"
                    value={editPendingMatchFormData.raceLength}
                    onChange={handleEditPendingFormChange}
                  >
                    <option value="3">Race to 3</option>
                    <option value="5">Race to 5</option>
                    <option value="7">Race to 7</option>
                    <option value="9">Race to 9</option>
                    <option value="11">Race to 11</option>
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
                  <label>Time:</label>
                  <input
                    type="time"
                    name="scheduledTime"
                    value={editPendingMatchFormData.scheduledTime || ''}
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
              <div className={styles.formGroup}>
                <label>Notes:</label>
                <textarea name="notes" value={editPendingMatchFormData.notes} onChange={handleEditPendingFormChange} rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button type="button" onClick={() => { setShowEditPendingMatchForm(false); setEditingPendingMatch(null); setEditingIsSchedulingRequest(false); }} style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </DraggableModal>
      )}

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
          padding: '56px 20px 20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
            border: '2px solid #8B5CF6',
            borderRadius: '12px',
            width: '95vw',
            maxWidth: '1400px',
            minWidth: '800px',
            height: '85vh',
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
              padding: '20px',
              minHeight: 0, // Important for flex scrolling
              // Custom scrollbar styling
              scrollbarWidth: 'thin',
              scrollbarColor: '#8B5CF6 rgba(255, 255, 255, 0.1)'
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
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      width: 8px;
                    }
                    div::-webkit-scrollbar-track {
                      background: rgba(255, 255, 255, 0.1);
                      border-radius: 4px;
                    }
                    div::-webkit-scrollbar-thumb {
                      background: #8B5CF6;
                      border-radius: 4px;
                    }
                    div::-webkit-scrollbar-thumb:hover {
                      background: #7C3AED;
                    }
                  `}</style>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '14px', fontWeight: 'bold' }}>Date</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '14px', fontWeight: 'bold' }}>Winner</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '14px', fontWeight: 'bold' }}>Loser</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '14px', fontWeight: 'bold' }}>Score</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '14px', fontWeight: 'bold' }}>Type</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '14px', fontWeight: 'bold' }}>Location</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '14px', fontWeight: 'bold' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchHistory.map((match, index) => (
                        <tr key={match.id || index} style={{ 
                          borderBottom: index < matchHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          minHeight: '50px'
                        }}>
                          <td style={{ padding: '8px', fontSize: '13px' }}>{new Date(match.completedDate || match.scheduledDate).toLocaleDateString()}</td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>
                            <strong style={{ color: '#22c55e' }}>
                              {match.winner ? `${match.winner.firstName} ${match.winner.lastName}` : 'N/A'}
                            </strong> 
                            {match.winner && match.winner.position !== 'removed' ? ` (#${match.winner.position})` : ''}
                          </td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>
                            <span style={{ color: '#ef4444' }}>
                              {match.loser ? `${match.loser.firstName} ${match.loser.lastName}` : 'N/A'}
                            </span>
                            {match.loser && match.loser.position !== 'removed' ? ` (#${match.loser.position})` : ''}
                          </td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>{match.score}</td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>{match.matchType || 'N/A'}</td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>{match.venue || 'N/A'}</td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>
                            <span style={{
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
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
      {showApplicationsManager && (
        <LadderApplicationsManager onClose={() => setShowApplicationsManager(false)} userToken={userToken} />
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

    {/* View Backups Modal */}
    {showBackupsModal && renderModal(
      <DraggableModal
        open={showBackupsModal}
        onClose={() => setShowBackupsModal(false)}
        title="Ladder Backups"
        maxWidth="800px"
        maxHeight="80vh"
      >
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', margin: 0 }}>
              📋 Backups for {selectedLadder} Ladder
            </h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ color: '#ccc', fontSize: '14px' }}>
                {backups.length} backup{backups.length !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={viewBackups}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          
          {backups.length === 0 ? (
            <p style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
              No backups found for this ladder.
            </p>
          ) : (
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto',
              paddingRight: '10px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#8B5CF6 rgba(255, 255, 255, 0.1)'
            }}>
              <style>
                {`
                  .backup-list::-webkit-scrollbar {
                    width: 8px;
                  }
                  .backup-list::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                  }
                  .backup-list::-webkit-scrollbar-thumb {
                    background: #8B5CF6;
                    border-radius: 4px;
                  }
                  .backup-list::-webkit-scrollbar-thumb:hover {
                    background: #7C3AED;
                  }
                `}
              </style>
              <div className="backup-list">
              {backups.map((backup, index) => (
                <div key={backup.id} style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ color: '#fff', margin: '0 0 5px 0' }}>
                        Backup #{backups.length - index}
                      </h4>
                      <p style={{ color: '#ccc', margin: '0', fontSize: '14px' }}>
                        Created: {new Date(backup.backupDate).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#4ade80', fontSize: '12px', marginBottom: '5px' }}>
                        ✅ {backup.summary.totalPlayers} players
                      </div>
                      <div style={{ color: '#60a5fa', fontSize: '12px' }}>
                        🎯 {backup.summary.totalMatches} matches
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#ccc' }}>
                    <div>Active Players: {backup.summary.activePlayers}</div>
                    <div>Completed Matches: {backup.summary.completedMatches}</div>
                  </div>
                  
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <button
                      onClick={() => previewRestore(backup.id)}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginRight: '8px'
                      }}
                    >
                      👁️ Preview Changes
                    </button>
                    <button
                      onClick={() => restoreBackup(backup.id)}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      🔄 Restore
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setShowBackupsModal(false)}
              style={{
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </DraggableModal>
    )}

    {/* Restore Preview Modal */}
    {showRestorePreview && restorePreviewData && renderModal(
      <DraggableModal
        open={showRestorePreview}
        onClose={() => setShowRestorePreview(false)}
        title="Restore Preview"
        maxWidth="900px"
        maxHeight="90vh"
      >
        <div style={{ padding: '20px' }}>
          <h3 style={{ color: '#fff', marginBottom: '20px' }}>
            🔍 Preview: Restoring from {new Date(restorePreviewData.backupDate).toLocaleString()}
          </h3>
          
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px', 
            padding: '15px', 
            marginBottom: '20px' 
          }}>
            <h4 style={{ color: '#60a5fa', margin: '0 0 10px 0' }}>📊 Summary</h4>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              <div>Backup Date: {new Date(restorePreviewData.backupDate).toLocaleString()}</div>
              <div>Players in Backup: {restorePreviewData.backupPlayers.length}</div>
              <div>Current Players: {restorePreviewData.currentPlayers.length}</div>
              <div>Changes: {restorePreviewData.changes.length}</div>
            </div>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <h4 style={{ color: '#fff', marginBottom: '15px' }}>🔄 Position Changes</h4>
            
            {restorePreviewData.changes.length === 0 ? (
              <p style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
                No changes detected - backup matches current state
              </p>
            ) : (
              <div>
                {restorePreviewData.changes.map((change, index) => (
                  <div key={index} style={{
                    background: change.positionChange === 0 ? 'rgba(34, 197, 94, 0.1)' : 
                               change.positionChange > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    border: change.positionChange === 0 ? '1px solid rgba(34, 197, 94, 0.3)' :
                           change.positionChange > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#fff' }}>
                          {change.name}
                        </strong>
                        <div style={{ color: '#ccc', fontSize: '12px', marginTop: '2px' }}>
                          {change.email}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          color: change.positionChange === 0 ? '#22c55e' : 
                                 change.positionChange > 0 ? '#ef4444' : '#22c55e',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {change.positionChange === 0 ? 'No Change' :
                           change.positionChange > 0 ? `↓ ${change.positionChange} spots` : 
                           `↑ ${Math.abs(change.positionChange)} spots`}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '12px' }}>
                          {change.currentPosition} → {change.backupPosition}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setShowRestorePreview(false)}
              style={{
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowRestorePreview(false);
                restoreBackup(restorePreviewData.backupId);
              }}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🔄 Confirm Restore
            </button>
          </div>
        </div>
      </DraggableModal>
    )}

    {/* Auto Backup Status Modal */}
    {showAutoBackupModal && autoBackupStatus && renderModal(
      <DraggableModal
        open={showAutoBackupModal}
        onClose={() => setShowAutoBackupModal(false)}
        title="Auto Backup Service Status"
        maxWidth="600px"
      >
        <div style={{ padding: '20px' }}>
          <h3 style={{ color: '#fff', marginBottom: '20px' }}>
            🤖 Automatic Backup Service
          </h3>
          
          <div style={{ 
            background: 'rgba(0, 184, 148, 0.1)', 
            border: '1px solid rgba(0, 184, 148, 0.3)',
            borderRadius: '8px', 
            padding: '15px', 
            marginBottom: '20px' 
          }}>
            <h4 style={{ color: '#00b894', margin: '0 0 10px 0' }}>📊 Service Status</h4>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Status:</strong> 
                <span style={{ 
                  color: autoBackupStatus.isRunning ? '#00b894' : '#ef4444',
                  marginLeft: '8px'
                }}>
                  {autoBackupStatus.isRunning ? '✅ Running' : '❌ Stopped'}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Schedule:</strong> 
                <span style={{ color: '#60a5fa', marginLeft: '8px' }}>
                  {autoBackupStatus.nextScheduledBackup}
                </span>
              </div>
              <div>
                <strong>Last Backup:</strong> 
                <span style={{ color: '#fbbf24', marginLeft: '8px' }}>
                  {autoBackupStatus.lastBackupTime ? 
                    new Date(autoBackupStatus.lastBackupTime).toLocaleString() : 
                    'Never'
                  }
                </span>
              </div>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px', 
            padding: '15px', 
            marginBottom: '20px' 
          }}>
            <h4 style={{ color: '#60a5fa', margin: '0 0 10px 0' }}>ℹ️ How It Works</h4>
            <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '8px' }}>
                • <strong>Automatic:</strong> Backs up all ladders daily at 2:00 AM Mountain Time
              </div>
              <div style={{ marginBottom: '8px' }}>
                • <strong>Complete:</strong> Captures all player positions, stats, and match data
              </div>
              <div style={{ marginBottom: '8px' }}>
                • <strong>Safe:</strong> Creates timestamped backups without affecting current data
              </div>
              <div>
                • <strong>Recovery:</strong> Use "View Backups" to restore from any backup
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setShowAutoBackupModal(false)}
              style={{
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              Close
            </button>
            <button
              onClick={triggerAutoBackup}
              style={{
                background: 'linear-gradient(135deg, #00b894, #00a085)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🤖 Backup All Ladders Now
            </button>
          </div>
        </div>
      </DraggableModal>
    )}

    </div>
  );
}
