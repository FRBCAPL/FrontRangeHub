import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import styles from './dashboard.module.css';
import tenBall from '@shared/assets/tenball.svg';
import PoolSimulation from "@shared/components/PoolSimulation.jsx";
import ResponsiveWrapper from "@shared/components/ResponsiveWrapper";
import StandingsModal from "./StandingsModal.jsx";
import DefenseChallengersModal from "./DefenseChallengersModal.jsx";
import MatchDetailsModal from "@shared/components/modal/modal/MatchDetailsModal.jsx";
import ProposalListModal from './ProposalListModal';
import ConfirmMatchDetails from "@shared/components/ConfirmMatchDetails";
import CounterProposalModal from "@shared/components/modal/modal/CounterProposalModal";
import logoImg from '@shared/assets/logo.png';
import OpponentsModal from "@shared/components/modal/modal/OpponentsModal";
import PlayerAvailabilityModal from "@shared/components/modal/modal/PlayerAvailabilityModal";
import MatchProposalModal from "@shared/components/modal/modal/MatchProposalModal";
import PlayerSearch from "@shared/components/modal/modal/PlayerSearch";
import ProposalDetailsModal from './ProposalDetailsModal';
import EditProposalModal from './EditProposalModal';
import LoadingSpinner, { LoadingButton, SkeletonLoader } from "@shared/components/common/LoadingSpinner";
import Modal from "@shared/components/modal/modal/DraggableModal.jsx";

import DirectMessagingModal from "@shared/components/DirectMessagingModal";
import MatchChat from '../chat/MatchChat';
import WinnerSelectModal from "@shared/components/modal/modal/WinnerSelectModal";
import Phase1Tracker from './Phase1Tracker.jsx';
import Phase2Tracker from './Phase2Tracker.jsx';
import CalendarModal from './CalendarModal';
import MatchValidationModal from './MatchValidationModal';
import ErrorBoundary from "@shared/components/common/ErrorBoundary";
import Phase1RulesModal from "@shared/components/modal/modal/Phase1RulesModal";
import Phase1OverviewModal from "@shared/components/modal/modal/Phase1OverviewModal";


import SmartMatchmakingModal from "@shared/components/modal/modal/SmartMatchmakingModal";
import PlayerRegistrationModal from "@shared/components/modal/modal/PlayerRegistrationModal";

// Import mobile optimization components
import MobileDashboard from './MobileDashboard';
import { useMobileOptimization } from '@shared/hooks/useMobileOptimization';

// Import new services and hooks
import { useProposals } from '@shared/hooks/useProposals';
import { useMatches } from '@shared/hooks/useMatches';
import { useSeasonData } from '@shared/hooks/useSeasonData';
import { useStandings } from '@shared/hooks/useStandings';
import { useNotes } from '@shared/hooks/useNotes';
import { useSchedule } from '@shared/hooks/useSchedule';
import { proposalService } from '@shared/services/services/proposalService';
import { userService } from '@shared/services/services/userService';
import { noteService } from '@shared/services/services/noteService';
import { seasonService } from '@shared/services/services/seasonService';
import { deadlineNotificationService } from '@shared/services/services/deadlineNotificationService';

import { format } from 'date-fns';
import { BACKEND_URL } from '@shared/config/config.js';
import { useNavigate } from 'react-router-dom';

// Import extracted utilities
import { normalizeDate, parseAvailability } from './utils/dateUtils.js';
import { STANDINGS_URLS } from './constants/dashboardConstants.js';

// Import professional league components
import { LeagueCard, PlayerCard, MatchCard } from '@shared/components/league';

// Import extracted components
import DashboardHeader from './components/DashboardHeader';
import DivisionSelector from './components/DivisionSelector';
import UpcomingMatchesSection from './components/UpcomingMatchesSection';
import NewsUpdatesSection from './components/NewsUpdatesSection';
import AdminButtonsSection from './components/AdminButtonsSection';
import PendingClaimsManager from '@shared/components/admin/admin/PendingClaimsManager';
import ModalContainer from './components/ModalContainer';
import SecondaryModalContainer from './components/SecondaryModalContainer';
import FinalModalContainer from './components/FinalModalContainer';

function AdminSyncButton({ backendUrl, onSyncComplete }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSync = async () => {
    setLoading(true);
    setResult("");
    try {
      await userService.syncUsers();
      setResult("✅ Users synced successfully!");
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setResult("❌ Sync failed.");
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className={styles.dashboardAdminBtn}
        onClick={handleSync}
        disabled={loading}
        type="button"
      >
        {loading ? "Syncing..." : "Sync Users from Database"}
      </button>
      {result && <div style={{ marginTop: 8 }}>{result}</div>}
    </div>
  );
}

function AdminUpdateStandingsButton({ backendUrl }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleUpdate = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch(`${BACKEND_URL}/admin/update-standings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setResult("✅ Standings updated successfully!");
      } else {
        setResult("❌ Update failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      setResult("❌ Update failed.");
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className={styles.dashboardAdminBtn}
        onClick={handleUpdate}
        disabled={loading}
        type="button"
      >
        {loading ? "Updating..." : "Update Standings"}
      </button>
      {result && <div style={{ marginTop: 8 }}>{result}</div>}
    </div>
  );
}

// Utility function to format date as MM-DD-YYYY
function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return 'N/A';
  
  // Handle YYYY-MM-DD format
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-');
    // Use the original date values without timezone conversion
    return `${month}-${day}-${year}`;
  }
  
  // Handle different date formats
  let date;
  if (dateStr.includes('-')) {
    // Already in YYYY-MM-DD format
    date = new Date(dateStr);
  } else if (dateStr.includes('/')) {
    // Handle M/D/YYYY or MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      date = new Date(year, month - 1, day);
    } else {
      return dateStr; // Return as-is if can't parse
    }
  } else {
    return dateStr; // Return as-is if unknown format
  }
  
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if invalid date
  }
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}-${day}-${year}`;
}

export default function Dashboard({
  playerName,
  playerLastName,
  onOpenChat,
  userPin,
  onGoToAdmin,
  onScheduleMatch,
  senderEmail,
  onGoToPlatformAdmin,
  isAdmin,
}) {
  // State for user data
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [showStandings, setShowStandings] = useState(false);
  const [showDefenseChallengers, setShowDefenseChallengers] = useState(false);
  const [showProposalListModal, setShowProposalListModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalNote, setProposalNote] = useState("");

  const [showSentProposalListModal, setShowSentProposalListModal] = useState(false);

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterProposal, setCounterProposal] = useState(null);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState("");

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [showAllMatches, setShowAllMatches] = useState(false);
  const [showAllMatchesModal, setShowAllMatchesModal] = useState(false);

  // Phase logic
  const [currentPhase, setCurrentPhase] = useState("scheduled");

  const [showOpponents, setShowOpponents] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);

  // Admin Player Search
  const [showAdminPlayerSearch, setShowAdminPlayerSearch] = useState(false);

  // Phase override for admin/testing
  const [phaseOverride, setPhaseOverride] = useState(null);

  const [showPlayerAvailability, setShowPlayerAvailability] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalData, setProposalData] = useState(null);

  const [players, setPlayers] = useState([]);
  
  // Chat modal state
  const [showChatModal, setShowChatModal] = useState(false);
  
  // State to track matches to schedule count
  const [numToSchedule, setNumToSchedule] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [currentPhaseTotal, setCurrentPhaseTotal] = useState(0);

  // Use custom hooks for proposals and matches with auto-updating
  const fullName = `${playerName} ${playerLastName}`.trim();
  const { 
    pendingProposals, 
    sentProposals, 
    loading: proposalsLoading, 
    lastUpdate: proposalsLastUpdate,
    refetch: refetchProposals,
    updateProposalLocally 
  } = useProposals(fullName, selectedDivision);
  
  const effectivePhase = phaseOverride || currentPhase;
  const { 
    matches: scheduledConfirmedMatches, 
    completedMatches, 
    scheduledConfirmedMatches: legacyScheduledConfirmedMatches, 
    loading: matchesLoading, 
    lastUpdate: matchesLastUpdate,
    refetch: refetchMatches, 
    updateMatchLocally,
    markMatchCompleted, 
    updateCompletedMatch 
  } = useMatches(fullName, selectedDivision, effectivePhase);

  // Check if user is super admin
  const isSuperAdmin = () => {
    const superAdminEmails = ['frbcapl@gmail.com', 'sslampro@gmail.com'];
    const superAdminPin = import.meta.env.VITE_SUPER_ADMIN_PIN || '777777';
    return superAdminEmails.includes(senderEmail.toLowerCase()) && userPin === superAdminPin;
  };

  // Auto-updating hooks for other data
  const {
    seasonData,
    currentPhaseInfo,
    loading: seasonLoading,
    error: seasonError,
    lastUpdate: seasonLastUpdate,
    refetch: refetchSeason
  } = useSeasonData(selectedDivision);

  const {
    standings,
    loading: standingsLoading,
    error: standingsError,
    lastUpdate: standingsLastUpdate,
    refetch: refetchStandings
  } = useStandings(selectedDivision);

  const {
    notes,
    loading: notesLoading,
    error: notesError,
    lastUpdate: notesLastUpdate,
    refetch: refetchNotes,
    updateNoteLocally
  } = useNotes();

  const {
    scheduledMatches,
    loading: scheduleLoading,
    error: scheduleError,
    lastUpdate: scheduleLastUpdate,
    refetch: refetchSchedule
  } = useSchedule(selectedDivision);

  // Proposal counts for instant UI update
  const [pendingCount, setPendingCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Add state for new modal
  const [showProposalDetailsModal, setShowProposalDetailsModal] = useState(false);
  const [showEditProposalModal, setShowEditProposalModal] = useState(false);

  // All Matches Modal state
  const [matchesSearchTerm, setMatchesSearchTerm] = useState('');
  const [matchesStatusFilter, setMatchesStatusFilter] = useState('all');
  const [matchesSortBy, setMatchesSortBy] = useState('date');

  // New state for loading state of Complete button
  const [completingMatchId, setCompletingMatchId] = useState(null);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  // Chat modal state
  const [chatType, setChatType] = useState('direct'); // 'direct' or 'league'
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Add state at the top of the Dashboard component
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerModalMatch, setWinnerModalMatch] = useState(null);
  const [winnerModalPlayers, setWinnerModalPlayers] = useState({ player1: '', player2: '' });

  // Season and deadline tracking state
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [matchToValidate, setMatchToValidate] = useState(null);
  

  


  // Registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showPendingRegistrationsModal, setShowPendingRegistrationsModal] = useState(false);
  const [showPendingClaimsModal, setShowPendingClaimsModal] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loadingPendingRegistrations, setLoadingPendingRegistrations] = useState(false);

  // User profile modal state
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  // Phase1 modal state
  const [showPhase1Rules, setShowPhase1Rules] = useState(false);
  const [showPhase1Overview, setShowPhase1Overview] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Phase1 data state (needed for modals)
  const [playerStats, setPlayerStats] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [deadlineStatus, setDeadlineStatus] = useState('normal');
  const [phase1EndDate, setPhase1EndDate] = useState(null);


  const simulationRef = useRef(null);

  const navigate = useNavigate();

  // Use the mobile optimization hook for better mobile detection and utilities
  const { isMobile, mobileUtils, swipeUtils, pullToRefreshUtils } = useMobileOptimization();

  // Test backend connection on component mount
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        // Log device info for debugging
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Device Info:', {
          userAgent: navigator.userAgent,
          isMobile: isMobile,
          backendUrl: BACKEND_URL,
          protocol: window.location.protocol,
          hostname: window.location.hostname
        });

        console.log('Testing backend connection...');
        const response = await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'include'
        });
        
        if (response.ok) {
          console.log('✅ Backend connection successful');
        } else {
          console.error('❌ Backend connection failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Backend connection error:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    };

    testBackendConnection();
  }, []);

  useEffect(() => {
    setPendingCount(pendingProposals.length);
  }, [pendingProposals]);
  
  useEffect(() => {
    setSentCount(sentProposals.length);
  }, [sentProposals]);

  // Auto-updating data is now handled by custom hooks



  // Fetch unread messages count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/messages/unread?user=${encodeURIComponent(senderEmail)}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setUnreadMessages(data.length);
        }
      } catch (err) {
        console.error('Failed to fetch unread messages:', err);
      }
    }
    
    if (senderEmail) {
      fetchUnreadCount();
      // Poll for new messages every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [senderEmail]);

  // Calculate persistent counters that don't reset on page reload
  useEffect(() => {
    if (!playerName || !playerLastName || !selectedDivision) return;
    
    // Wait for data to be loaded
    if (matchesLoading || proposalsLoading) {
      return;
    }
    
    // Calculate total required matches from schedule - filter by current phase
    const currentPhaseNumber = effectivePhase === "challenge" ? 2 : 1;
    const playerScheduleEffect = scheduledMatches.filter(
      m => m.division === selectedDivision &&
        m.phase === currentPhaseNumber &&
        ((m.player1 && m.player1.trim().toLowerCase() === fullName.toLowerCase()) ||
        (m.player2 && m.player2.trim().toLowerCase() === fullName.toLowerCase()))
    );
    
    // Count total matches (not unique opponents) - each match in schedule counts as 1
    const totalRequired = playerScheduleEffect.length;
    
    // Set total completed from backend data
    setTotalCompleted(completedMatches.length);
    
    // Calculate confirmed matches (not completed)
    const confirmedMatches = scheduledConfirmedMatches.filter(match => 
      match.status === "confirmed" && 
      (match.completed === false || match.completed === undefined)
    );
    
    // FIXED LOGIC: Scheduled counter = Total Required - (Confirmed Matches + Completed Matches)
    const totalScheduledOrCompleted = confirmedMatches.length + completedMatches.length;
    const scheduledCount = Math.max(0, totalRequired - totalScheduledOrCompleted);
    
    // Set the scheduled counter
    setNumToSchedule(scheduledCount);
    setCurrentPhaseTotal(totalRequired);
    

  }, [playerName, playerLastName, selectedDivision, scheduledMatches, completedMatches, scheduledConfirmedMatches, matchesLoading, proposalsLoading]);

  // Calculate total required matches for display
  const totalRequiredMatches = (() => {
    if (!playerName || !playerLastName || !selectedDivision) return 0;
    
    // Filter by current phase
    const currentPhaseNumber = effectivePhase === "challenge" ? 2 : 1;
          const playerScheduleTotalRequired = scheduledMatches.filter(
        m => m.division === selectedDivision &&
          ((m.player1 && m.player1.trim().toLowerCase() === fullName.toLowerCase()) ||
          (m.player2 && m.player2.trim().toLowerCase() === fullName.toLowerCase()))
      );
    
    // Count total matches (not unique opponents) - each match in schedule counts as 1
    const calculatedTotal = playerScheduleTotalRequired.length;
    
    // Fallback: If no matches found in schedule, use 6 for Phase 1 (per bylaws)
    if (calculatedTotal === 0 && effectivePhase === "scheduled") {
      console.log("No schedule matches found, using fallback of 6 matches for Phase 1");
      return 6;
    }
    
    return calculatedTotal;
  })();

  useEffect(() => {
    let isMounted = true;
    async function loadPlayers() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/users/search?approved=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch players from database');
        }
        
        const data = await response.json();
        if (!data.users || data.users.length === 0) {
          if (isMounted) setPlayers([]);
          return;
        }
        
        const playerList = data.users
          .map(user => ({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
            locations: user.locations || "",
            availability: user.availability || { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
            pin: user.pin || "",
            preferredContacts: user.preferredContacts || [],
            division: user.division || "",
            divisions: user.divisions || []
          }))
          .filter(
            p =>
              p.email &&
              p.firstName &&
              p.lastName
          );
        if (isMounted) {
          setPlayers(playerList);
          setAllPlayers(playerList);
          
          // Set current user for smart match functionality
          const currentUserData = playerList.find(p => 
            p.firstName === playerName && p.lastName === playerLastName
          );
          if (currentUserData) {
            setCurrentUser(currentUserData);
          }
        }
      } catch (err) {
        console.error('Error loading players:', err);
        if (isMounted) {
          setPlayers([]);
          setAllPlayers([]);
          setCurrentUser(null);
        }
      }
    }
    loadPlayers();
    return () => { isMounted = false; };
  }, []);

  // Schedule data is now handled by useSchedule hook


  // Division logic
  useEffect(() => {
    if (!senderEmail) return;
    userService.getUser(senderEmail)
      .then(user => {
        let divs = [];
        // Always expect user.divisions to be an array
        if (Array.isArray(user.divisions)) {
          divs = user.divisions.map(s => s.trim()).filter(Boolean);
        } else if (typeof user.divisions === "string") {
          divs = user.divisions.split(",").map(s => s.trim()).filter(Boolean);
        } else if (user.division && typeof user.division === "string") {
          // Fallback: backend may return division (singular)
          divs = user.division.split(",").map(s => s.trim()).filter(Boolean);
        }
        setDivisions(divs);
      })
      .catch(() => {
        setDivisions([]);
      });
  }, [senderEmail]);

  useEffect(() => {
    if (divisions.length > 0) {
      setSelectedDivision(divisions[0]);
    } else {
      setSelectedDivision("");
    }
  }, [divisions]);

  // Load profile data for current user from unified system
  useEffect(() => {
    if (!senderEmail) return;
    
    const loadProfileData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/unified-auth/profile-data?email=${encodeURIComponent(senderEmail)}&appType=league&t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded league profile data:', data);
          
          if (data.success && data.profile) {
            // Update current user with profile data
            setCurrentUser(prev => ({
              ...prev,
              locations: data.profile.locations || '',
              availability: data.profile.availability || {}
            }));
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };
    
    loadProfileData();
  }, [senderEmail]);

  // Auto-updating is now handled by the custom hooks
  // They poll automatically at appropriate intervals

  const handleAddNote = async () => {
    setNoteError("");
    try {
      const note = await noteService.createNote(newNote.trim());
      updateNoteLocally(note, 'add');
      setNewNote("");
      setShowNoteModal(false);
    } catch (err) {
      setNoteError("Failed to add note");
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await noteService.deleteNote(id);
      updateNoteLocally({ _id: id }, 'remove');
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleClearNotes = async () => {
    if (!window.confirm("Are you sure you want to clear all notes?")) return;
    try {
      for (const note of notes) {
        await noteService.deleteNote(note._id);
      }
      // Clear all notes locally
      setNotes([]);
      // Refetch to ensure consistency
      refetchNotes();
    } catch (err) {
      console.error('Failed to clear notes:', err);
    }
  };

  function handleProposalResponse(proposalId, status, note = "") {
    // Find the proposal to update locally
    const proposalToUpdate = pendingProposals.find(p => p._id === proposalId) || 
                            sentProposals.find(p => p._id === proposalId);
    
    if (proposalToUpdate) {
      // Immediately update local state for instant UI feedback
      const updatedProposal = { ...proposalToUpdate, status, note };
      updateProposalLocally(updatedProposal, 'update');
    }
    
    proposalService.updateProposalStatus(proposalId, status, note)
      .then(() => {
        setSelectedProposal(null);
        setProposalNote("");
        // Refetch to ensure data consistency
        refetchMatches();
        refetchProposals();
      })
      .catch((error) => {
        console.error('Error updating proposal:', error);
        // Revert local changes on error
        if (proposalToUpdate) {
          updateProposalLocally(proposalToUpdate, 'update');
        }
      });
  }

  async function handleCounterProposal(counterData) {
    if (!counterProposal) return;
    try {
      await proposalService.counterProposal(counterProposal._id, counterData);
      setShowCounterModal(false);
      setCounterProposal(null);
      refetchMatches();
      refetchProposals();
    } catch (err) {
      console.error('Failed to counter proposal:', err);
    }
  }

  // Helper functions
  function openModal(match) {
    setSelectedMatch(match);
    setModalOpen(true);
  }
  
  function closeModal() {
    setModalOpen(false);
    setSelectedMatch(null);
  }

  function getMatchDateTime(match) {
    if (match.date && match.time) {
      const parts = match.date.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        let timeStr = match.time.trim().toUpperCase();
        let timeParts = timeStr.split(' ');
        let timePart = timeParts[0];
        let ampm = timeParts[1];
        let hourMinute = timePart.split(':');
        let hour = parseInt(hourMinute[0], 10);
        let minute = parseInt(hourMinute[1], 10);
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = (minute || 0).toString().padStart(2, '0');
        const time24 = `${hourStr}:${minuteStr}`;
        return new Date(`${isoDate}T${time24}:00`);
      }
    }
    return new Date(0);
  }

  // --- SCHEDULED MATCHES LOGIC ---
  const currentPhaseNumber = effectivePhase === "challenge" ? 2 : 1;
  const playerSchedule = scheduledMatches.filter(
    m => m.division === selectedDivision &&
      // For JSON scheduled matches, don't filter by phase since they're all phase 1
      // Only filter by phase if the match has a phase field (backend matches)
      (!m.phase || m.phase === currentPhaseNumber) &&
      ((m.player1 && m.player1.trim().toLowerCase() === fullName.toLowerCase()) ||
      (m.player2 && m.player2.trim().toLowerCase() === fullName.toLowerCase()))
  );

  // Extract opponent emails from scheduled matches
  const opponentEmails = Array.from(new Set(
    playerSchedule.map(m => {
      if (m.player1 && m.player1.trim().toLowerCase() === fullName.toLowerCase()) {
        return m.player2Email || m.player2EmailAddress || m.player2Email || m.player2 || null;
      } else if (m.player2 && m.player2.trim().toLowerCase() === fullName.toLowerCase()) {
        return m.player1Email || m.player1EmailAddress || m.player1Email || m.player1 || null;
      }
      return null;
    }).filter(Boolean)
  ));

  // Greedy matching: each confirmed match is only matched to one scheduled match
  function getMatchesToSchedule() {
    const usedConfirmed = new Set();
    const matchesToSchedule = [];
    
    for (const schedMatch of playerSchedule) {
      // Skip if this scheduled match is already completed
      const schedOpponent = schedMatch.player1 && schedMatch.player1.trim().toLowerCase() === fullName.toLowerCase()
        ? schedMatch.player2 : schedMatch.player1;
             const isCompleted = completedMatches.some(cm => {
         const cmPlayers = [cm.player1Id?.trim().toLowerCase(), cm.player2Id?.trim().toLowerCase()];
         return (
           cm.division === selectedDivision &&
           cmPlayers.includes(fullName.toLowerCase()) &&
           cmPlayers.includes(schedOpponent?.trim().toLowerCase())
         );
       });
      if (isCompleted) {
        continue; // Don't count this match if completed
      }
      let found = false;
      for (let i = 0; i < scheduledConfirmedMatches.length; i++) {
        if (usedConfirmed.has(i)) continue;
        const backendMatch = scheduledConfirmedMatches[i];
                 const backendPlayers = [backendMatch.player1Id?.trim().toLowerCase(), backendMatch.player2Id?.trim().toLowerCase()];
         if (
           backendMatch.division === selectedDivision &&
           backendPlayers.includes(fullName.toLowerCase()) &&
           backendPlayers.includes(schedOpponent?.trim().toLowerCase())
         ) {
          usedConfirmed.add(i);
          found = true;
          break;
        }
      }
      if (!found) {
        matchesToSchedule.push(schedMatch);
      }
    }
    
    return matchesToSchedule;
  }

  const matchesToSchedule = getMatchesToSchedule();

  // Prepare the opponents list for the modal (one entry per unscheduled match, even if names repeat)
  const opponentsToSchedule = matchesToSchedule.map(m => {
    const name = m.player1 && m.player1.trim().toLowerCase() === fullName.toLowerCase()
      ? m.player2?.trim()
      : m.player1?.trim();
    if (!name) return null;
    // Find the player object by name (can be null if not found)
    const playerObj = players.find(
      p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === name.toLowerCase()
    );
    // Return an object with both the match and the player (for uniqueness)
    return { match: m, player: playerObj, opponentName: name };
  }).filter(Boolean);

  function handleOpponentClick(opponentName) {
    // Find the player object from the opponents list first
    const opponentData = opponentsToSchedule.find(opp => 
      opp.opponentName && opp.opponentName.trim().toLowerCase() === opponentName.trim().toLowerCase()
    );
    
    // If not found in opponents list, try to find in all players
    const playerObj = opponentData?.player || players.find(
      p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === opponentName.trim().toLowerCase()
    );
    
    if (!playerObj) {
      alert("Player data not found for: " + opponentName);
      return;
    }
    
    if (smartMatchMode) {
      // Smart match mode - go directly to smart matchmaking
      handleOpponentSelectedForSmartMatch(playerObj);
      return;
    }
    
    if (!playerObj.email) {
      alert("This opponent does not have an email on file and cannot be proposed a match.");
      return;
    }
    setSelectedOpponent(playerObj);
    setShowPlayerAvailability(true);
    setShowOpponents(false); // Close the Opponents modal
  }

  // Smart Match handlers
  function handleSmartMatchClick() {
    console.log('Smart match button clicked!');
    console.log('currentUser:', currentUser);
    console.log('allPlayers:', allPlayers);
    console.log('allPlayers length:', allPlayers?.length);
    
    if (!currentUser || !allPlayers || allPlayers.length === 0) {
      console.log('Player data not available, showing alert');
      alert("Player data not available for smart match. Please try again.");
      return;
    }
    
    // Use the existing opponents modal but with smart match mode
    setShowOpponents(true);
    setSmartMatchMode(true);
  }

  function handleOpponentSelectedForSmartMatch(opponent) {
    setSelectedOpponentForSmartMatch(opponent);
    setShowOpponents(false);
    setSmartMatchMode(false);
    setShowSmartMatchmakingModal(true);
  }

  function refreshSchedule() {
    fetch(`${BACKEND_URL}/static/schedule.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setScheduledMatches(data))
      .catch(() => setScheduledMatches([]));
  }

  function handleScheduleMatch() {
    console.log('Schedule Match button clicked');
    if (effectivePhase === "scheduled") {
      setShowOpponents(true);
    } else {
      setShowPlayerSearch(true);
    }
  }



  // Check and send automatic deadline reminders
  useEffect(() => {
    if (!senderEmail || !playerName || !selectedDivision || !seasonData || effectivePhase !== 'scheduled') {
      return;
    }

    const checkAndSendReminder = async () => {
      try {
        await deadlineNotificationService.checkAndSendDeadlineReminder(
          senderEmail, 
          `${playerName} ${playerLastName}`, 
          selectedDivision
        );
      } catch (error) {
        console.error('Error checking deadline reminders:', error);
      }
    };

    // Check once when component loads
    checkAndSendReminder();

    // Check every hour for new reminders
    const interval = setInterval(checkAndSendReminder, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [senderEmail, playerName, playerLastName, selectedDivision, seasonData, effectivePhase]);

  // Defensive filter: only show matches for the selected division (in case backend fails)
  const baseFilteredMatches = scheduledConfirmedMatches.filter(m =>
    m.division === selectedDivision
  );

  // Apply search and filters to matches
  const filteredUpcomingMatches = baseFilteredMatches
    .filter(match => {
      // Search filter
      if (matchesSearchTerm) {
        let opponent = '';
        if (match.player1Id && match.player2Id) {
          if (match.player1Id.trim().toLowerCase() === fullName.trim().toLowerCase()) {
            opponent = match.player2Id;
          } else {
            opponent = match.player1Id;
          }
        } else if (match.senderName && match.receiverName) {
          if (match.senderName.trim().toLowerCase() === fullName.trim().toLowerCase()) {
            opponent = match.receiverName;
          } else {
            opponent = match.senderName;
          }
        }
        
        if (!opponent.toLowerCase().includes(matchesSearchTerm.toLowerCase())) {
          return false;
        }
      }

      // Status filter
      if (matchesStatusFilter !== 'all') {
        if (matchesStatusFilter === 'completed' && match.status !== 'completed') {
          return false;
        }
        if (matchesStatusFilter === 'pending' && match.status !== 'pending') {
          return false;
        }
        if (matchesStatusFilter === 'upcoming' && match.status === 'completed') {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort matches
      switch (matchesSortBy) {
        case 'date':
          const dateA = a.scheduledDate ? new Date(a.scheduledDate) : new Date(a.date || 0);
          const dateB = b.scheduledDate ? new Date(b.scheduledDate) : new Date(b.date || 0);
          return dateA - dateB;
        case 'opponent':
          let opponentA = '';
          let opponentB = '';
          
          if (a.player1Id && a.player2Id) {
            opponentA = a.player1Id.trim().toLowerCase() === fullName.trim().toLowerCase() ? a.player2Id : a.player1Id;
          } else if (a.senderName && a.receiverName) {
            opponentA = a.senderName.trim().toLowerCase() === fullName.trim().toLowerCase() ? a.receiverName : a.senderName;
          }
          
          if (b.player1Id && b.player2Id) {
            opponentB = b.player1Id.trim().toLowerCase() === fullName.trim().toLowerCase() ? b.player2Id : b.player1Id;
          } else if (b.senderName && b.receiverName) {
            opponentB = b.senderName.trim().toLowerCase() === fullName.trim().toLowerCase() ? b.receiverName : b.senderName;
          }
          
          return opponentA.localeCompare(opponentB);
        case 'status':
          const statusOrder = { 'pending': 1, 'confirmed': 2, 'completed': 3 };
          const statusA = statusOrder[a.status] || 0;
          const statusB = statusOrder[b.status] || 0;
          return statusA - statusB;
        default:
          return 0;
      }
    });

  // Update the logic where a match/proposal is clicked:
  function handleProposalClick(match) {
    setSelectedMatch(match);
    setModalOpen(true);
  }

               // Define allMatchesModal before the return statement
   const allMatchesModal = showAllMatchesModal && (
     <Modal
       open={showAllMatchesModal}
       onClose={() => {
         setShowAllMatchesModal(false);
         // Reset filters when closing
         setMatchesSearchTerm('');
         setMatchesStatusFilter('all');
         setMatchesSortBy('date');
       }}
       title={`🎯 All Upcoming Matches (${filteredUpcomingMatches.length})`}
       maxWidth="900px"
       className="all-matches-modal"
     >
       {/* Search and Filter Bar */}
       <div style={{
         display: 'flex',
         gap: '8px',
         flexWrap: isMobile ? 'wrap' : 'nowrap',
         alignItems: 'center',
         marginBottom: '8px'
       }}>
         <div style={{
           flex: 1,
           minWidth: isMobile ? '100%' : '200px',
           position: 'relative'
         }}>
           <input
             type="text"
             placeholder="Search by opponent name..."
             value={matchesSearchTerm}
             onChange={(e) => setMatchesSearchTerm(e.target.value)}
             style={{
               width: '100%',
               padding: '8px 12px 8px 36px',
               background: 'rgba(0, 0, 0, 0.3)',
               border: '1px solid rgba(255, 255, 255, 0.2)',
               borderRadius: '8px',
               color: '#fff',
               fontSize: '0.9rem',
               outline: 'none',
               transition: 'all 0.2s ease'
             }}
             onFocus={(e) => {
               e.target.style.border = '1px solid rgba(255, 255, 255, 0.4)';
               e.target.style.background = 'rgba(0, 0, 0, 0.5)';
             }}
             onBlur={(e) => {
               e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';
               e.target.style.background = 'rgba(0, 0, 0, 0.3)';
             }}
           />
           <span style={{
             position: 'absolute',
             left: '12px',
             top: '50%',
             transform: 'translateY(-50%)',
             color: '#888',
             fontSize: '0.9rem'
           }}>
             🔍
           </span>
         </div>
         
         <select
           value={matchesStatusFilter}
           onChange={(e) => setMatchesStatusFilter(e.target.value)}
           style={{
             padding: '8px 12px',
             background: 'rgba(0, 0, 0, 0.3)',
             border: '1px solid rgba(255, 255, 255, 0.2)',
             borderRadius: '8px',
             color: '#fff',
             fontSize: '0.9rem',
             outline: 'none',
             cursor: 'pointer',
             minWidth: isMobile ? '100%' : '120px'
           }}
           onFocus={(e) => {
             e.target.style.border = '1px solid rgba(255, 255, 255, 0.4)';
           }}
           onBlur={(e) => {
             e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';
           }}
         >
           <option value="all">All Matches</option>
           <option value="upcoming">Upcoming</option>
           <option value="completed">Completed</option>
           <option value="pending">Pending</option>
         </select>
         
         <select
           value={matchesSortBy}
           onChange={(e) => setMatchesSortBy(e.target.value)}
           style={{
             padding: '8px 12px',
             background: 'rgba(0, 0, 0, 0.3)',
             border: '1px solid rgba(255, 255, 255, 0.2)',
             borderRadius: '8px',
             color: '#fff',
             fontSize: '0.9rem',
             outline: 'none',
             cursor: 'pointer',
             minWidth: isMobile ? '100%' : '100px'
           }}
           onFocus={(e) => {
             e.target.style.border = '1px solid rgba(255, 255, 255, 0.4)';
           }}
           onBlur={(e) => {
             e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';
           }}
         >
           <option value="date">Sort by Date</option>
           <option value="opponent">Sort by Opponent</option>
           <option value="status">Sort by Status</option>
         </select>
       </div>

       {/* Content */}
       <div style={{
         flex: 1,
         overflowY: 'auto',
         height: '450px',
         minHeight: '200px'
       }}>
         {filteredUpcomingMatches.length === 0 ? (
           <div style={{
             textAlign: 'center',
             padding: '40px 20px',
             color: '#888',
             fontSize: '1.1rem'
           }}>
             <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
             <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>No matches found</div>
             <div style={{ fontSize: '0.9rem' }}>You don't have any upcoming matches scheduled.</div>
           </div>
         ) : (
           <div style={{
             display: 'grid',
             gap: '12px',
             gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
             maxWidth: '100%'
           }}>
             {filteredUpcomingMatches.map((match, idx) => {
               let opponent = '';
               let formattedDate = '';
               let matchStatus = 'upcoming';
               
               // Handle new Match model structure
               if (match.player1Id && match.player2Id) {
                 if (match.player1Id.trim().toLowerCase() === fullName.trim().toLowerCase()) {
                   opponent = match.player2Id;
                 } else {
                   opponent = match.player1Id;
                 }
                 
                 // Use scheduledDate for new Match model
                 if (match.scheduledDate) {
                   const dateObj = new Date(match.scheduledDate);
                   if (!isNaN(dateObj.getTime())) {
                     formattedDate = formatDateMMDDYYYY(dateObj.toISOString().split('T')[0]);
                   } else {
                     formattedDate = '[Invalid Date]';
                   }
                 } else {
                   formattedDate = '[No Date]';
                 }
               } else {
                 // Fallback for old proposal structure
                 if (match.senderName && match.receiverName) {
                   if (match.senderName.trim().toLowerCase() === fullName.trim().toLowerCase()) {
                     opponent = match.receiverName;
                   } else {
                     opponent = match.senderName;
                   }
                 }
                 if (match.date) {
                   const parts = match.date.split('-');
                   if (parts.length === 3) {
                     const [year, month, day] = parts;
                     const dateObj = new Date(`${year}-${month}-${day}`);
                     if (!isNaN(dateObj.getTime())) {
                       formattedDate = formatDateMMDDYYYY(match.date);
                     } else {
                       formattedDate = '[Invalid Date]';
                     }
                   } else {
                     formattedDate = '[Invalid Date]';
                   }
                 } else {
                   formattedDate = '[No Date]';
                 }
               }
               
               const isCompleted = match.status === 'completed';
               const actuallyCompleted = match.status === 'completed';
               
               if (actuallyCompleted) matchStatus = 'completed';
               else if (match.status === 'pending') matchStatus = 'pending';
               
               const getStatusColor = (status) => {
                 switch (status) {
                   case 'completed': return '#10b981';
                   case 'pending': return '#f59e0b';
                   default: return 'var(--accent-red)';
                 }
               };
               
               const getStatusIcon = (status) => {
                 switch (status) {
                   case 'completed': return '✅';
                   case 'pending': return '⏳';
                   default: return '📅';
                 }
               };
               
                               return (
                 <div key={match._id || idx} style={{
                   background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                   borderRadius: '12px',
                   border: '1px solid rgba(255, 255, 255, 0.15)',
                   padding: '12px',
                   transition: 'all 0.3s ease',
                   position: 'relative',
                   overflow: 'hidden'
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)';
                   e.currentTarget.style.border = '1px solid rgba(229, 62, 62, 0.3)';
                   e.currentTarget.style.transform = 'translateY(-2px)';
                   e.currentTarget.style.boxShadow = '0 8px 24px rgba(229, 62, 62, 0.2)';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)';
                   e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                   e.currentTarget.style.transform = 'translateY(0)';
                   e.currentTarget.style.boxShadow = 'none';
                 }}
                 >
                   {/* Status Badge */}
                   <div style={{
                     position: 'absolute',
                     top: '16px',
                     right: '16px',
                     background: getStatusColor(matchStatus),
                     color: '#fff',
                     padding: '6px 12px',
                     borderRadius: '16px',
                     fontSize: '0.8rem',
                     fontWeight: '600',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '6px',
                     boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                   }}>
                     {getStatusIcon(matchStatus)} {matchStatus}
                   </div>
                   
                   {/* Match Header */}
                   <div style={{
                     textAlign: 'center',
                     marginBottom: '8px',
                     paddingRight: '100px' // Make room for status badge
                   }}>
                     <div style={{
                       fontSize: '1.2rem',
                       fontWeight: '700',
                       color: '#fff',
                       textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '12px',
                       flexWrap: 'wrap'
                     }}>
                       <span>{playerName} {playerLastName}</span>
                       <span style={{
                         color: 'var(--accent-red)',
                         fontSize: '1rem',
                         fontWeight: '600'
                       }}>
                         VS
                       </span>
                       <span>{opponent || '[Unknown Opponent]'}</span>
                     </div>
                   </div>
                   
                   {/* Match Details */}
                   <div style={{
                     display: 'flex',
                     justifyContent: 'center',
                     gap: '16px',
                     marginBottom: '12px',
                     fontSize: '0.9rem',
                     color: '#ccc'
                   }}>
                     <div style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '6px',
                       background: 'rgba(255, 255, 255, 0.1)',
                       padding: '8px 12px',
                       borderRadius: '8px'
                     }}>
                       📅 {formattedDate}
                     </div>
                     {match.location && (
                       <div style={{
                         display: 'flex',
                         alignItems: 'center',
                         gap: '6px',
                         background: 'rgba(255, 255, 255, 0.1)',
                         padding: '8px 12px',
                         borderRadius: '8px'
                       }}>
                         📍 {match.location}
                       </div>
                     )}
                   </div>
                   
                   {/* Action Buttons */}
                   <div style={{
                     display: 'flex',
                     gap: '8px',
                     justifyContent: 'center'
                   }}>
                     <button
                       onClick={() => handleProposalClick(match)}
                       style={{
                         padding: '8px 16px',
                         background: 'linear-gradient(135deg, var(--accent-red), var(--accent-red-dark))',
                         border: 'none',
                         borderRadius: '8px',
                         color: '#fff',
                         fontSize: '0.85rem',
                         fontWeight: '600',
                         cursor: 'pointer',
                         transition: 'all 0.2s ease',
                         boxShadow: '0 2px 8px rgba(229, 62, 62, 0.3)',
                         minWidth: '100px'
                       }}
                       onMouseEnter={(e) => {
                         e.target.style.transform = 'translateY(-1px)';
                         e.target.style.boxShadow = '0 4px 16px rgba(229, 62, 62, 0.5)';
                       }}
                       onMouseLeave={(e) => {
                         e.target.style.transform = 'translateY(0)';
                         e.target.style.boxShadow = '0 2px 8px rgba(229, 62, 62, 0.3)';
                       }}
                     >
                       📋 View Details
                     </button>
                     
                     {!actuallyCompleted && (
                       <LoadingButton
                         className={styles.dashboardBtn + ' ' + styles.matchCardDoneBtn}
                         loading={completingMatchId === match._id}
                         loadingText="Completing..."
                         style={{ 
                           padding: '8px 16px',
                           fontSize: '0.85rem',
                           fontWeight: '600',
                           background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                           border: 'none',
                           borderRadius: '8px',
                           color: '#fff',
                           cursor: 'pointer',
                           transition: 'all 0.2s ease',
                           minWidth: '100px',
                           boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)'
                         }}
                         onMouseEnter={(e) => {
                           if (completingMatchId !== match._id) {
                             e.target.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                             e.target.style.transform = 'translateY(-1px)';
                             e.target.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.5)';
                           }
                         }}
                         onMouseLeave={(e) => {
                           if (completingMatchId !== match._id) {
                             e.target.style.background = 'linear-gradient(135deg, #6c757d, #5a6268)';
                             e.target.style.transform = 'translateY(0)';
                             e.target.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.3)';
                           }
                         }}
                         onClick={() => {
                           let player1 = '';
                           let player2 = '';
                           
                           // Handle new Match model structure
                           if (match.player1Id && match.player2Id) {
                             player1 = match.player1Id;
                             player2 = match.player2Id;
                           } else {
                             // Fallback for old proposal structure
                             if (match.type === 'scheduled') {
                               player1 = match.player1;
                               player2 = match.player2;
                             } else {
                               player1 = match.senderName;
                               player2 = match.receiverName;
                             }
                           }
                           
                           setWinnerModalMatch(match);
                           setWinnerModalPlayers({ player1, player2 });
                           setWinnerModalOpen(true);
                         }}
                         type="button"
                                               >
                          ✅ Mark as Complete
                        </LoadingButton>
                     )}
                   </div>
                 </div>
               );
             })}
           </div>
         )}
       </div>
       
       {/* Footer */}
       <div style={{
         padding: '8px 0 0',
         borderTop: '1px solid rgba(255, 255, 255, 0.1)',
         marginTop: '8px',
         textAlign: 'center'
       }}>
         <div style={{
           fontSize: '0.9rem',
           color: '#888'
         }}>
           Showing {filteredUpcomingMatches.length} match{filteredUpcomingMatches.length !== 1 ? 'es' : ''}
         </div>
       </div>
     </Modal>
   );

   {/* Custom styles for all matches modal */}
   <style jsx>{`
     .all-matches-modal {
       max-height: 85vh !important;
       height: auto !important;
       margin: 10px auto !important;
     }
     
     .all-matches-modal .modal-content {
       max-height: 70vh !important;
       overflow-y: auto !important;
       padding: 1.2rem 1.5rem !important;
     }
     
     .all-matches-modal .modal-overlay {
       align-items: flex-start !important;
       padding-top: 10px !important;
       padding-bottom: 10px !important;
     }
     
     /* Custom scrollbar for match cards area */
     .all-matches-modal .modal-content > div:first-of-type {
       scrollbar-width: thin !important;
       scrollbar-color: #e53e3e #232323 !important;
     }
     
     .all-matches-modal .modal-content > div:first-of-type::-webkit-scrollbar {
       width: 8px !important;
     }
     
     .all-matches-modal .modal-content > div:first-of-type::-webkit-scrollbar-track {
       background: #232323 !important;
       border-radius: 4px !important;
     }
     
     .all-matches-modal .modal-content > div:first-of-type::-webkit-scrollbar-thumb {
       background: #e53e3e !important;
       border-radius: 4px !important;
     }
     
     .all-matches-modal .modal-content > div:first-of-type::-webkit-scrollbar-thumb:hover {
       background: #ff6b6b !important;
     }
     
     @media (max-width: 768px) {
       .all-matches-modal {
         max-height: 90vh !important;
         width: 95vw !important;
         max-width: 95vw !important;
         margin: 5px auto !important;
       }
       
       .all-matches-modal .modal-content {
         max-height: 75vh !important;
         padding: 1rem 1rem !important;
       }
       
       .all-matches-modal .modal-overlay {
         padding-top: 5px !important;
         padding-bottom: 5px !important;
       }
     }
   `}</style>

  // Determine required matches based on phase
  const requiredMatches = effectivePhase === "challenge" ? 4 : 6;

       // Count both confirmed and completed matches as 'scheduled'
     const scheduledOrCompletedMatches = [
       ...scheduledConfirmedMatches.filter(match =>
         match.division === selectedDivision &&
         ([match.player1Id?.trim().toLowerCase(), match.player2Id?.trim().toLowerCase()].includes(fullName.toLowerCase()))
       ),
       ...completedMatches.filter(match =>
         match.division === selectedDivision &&
         ([match.player1Id?.trim().toLowerCase(), match.player2Id?.trim().toLowerCase()].includes(fullName.toLowerCase()))
       )
     ];

  // Remove duplicates (in case a match is both confirmed and completed)
  const uniqueScheduledOrCompleted = Array.from(new Set(scheduledOrCompletedMatches.map(m => m._id))).map(id =>
    scheduledOrCompletedMatches.find(m => m._id === id)
  );

  const matchesScheduledCount = uniqueScheduledOrCompleted.length;
  const matchesToScheduleCount = Math.max(0, requiredMatches - matchesScheduledCount);

  const [showCompletedModal, setShowCompletedModal] = useState(false);
  
  // Smart Match state variables
  const [showSmartMatchmakingModal, setShowSmartMatchmakingModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedOpponentForSmartMatch, setSelectedOpponentForSmartMatch] = useState(null);
  const [smartMatchMode, setSmartMatchMode] = useState(false);

  // Logical proposal counters based on who needs to act
  const proposalsWaitingForYou = [
    ...pendingProposals.filter(p => p.status === 'pending' && p.receiverName === fullName),
    ...sentProposals.filter(p => p.status === 'countered' && p.senderName === fullName)
  ];
  const proposalsWaitingForOpponent = [
    ...sentProposals.filter(p => p.status === 'pending' && p.senderName === fullName),
    ...pendingProposals.filter(p => p.status === 'countered' && p.receiverName === fullName)
  ];

  // Portal overlay for OpponentsModal
  console.log('🎯 Dashboard: showOpponents state:', showOpponents);
  console.log('🎯 Dashboard: simulationRef.current:', !!simulationRef.current);
  const opponentsModalPortal = showOpponents && simulationRef.current
    ? ReactDOM.createPortal(
        <div
          style={{
            position: "absolute",
            top: simulationRef.current.getBoundingClientRect().top + window.scrollY,
            left: simulationRef.current.getBoundingClientRect().left + window.scrollX,
            width: simulationRef.current.offsetWidth,
            height: simulationRef.current.offsetHeight,
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            pointerEvents: "auto"
          }}
        >
                     <OpponentsModal
             open={showOpponents}
             onClose={() => setShowOpponents(false)}
             opponents={opponentsToSchedule}
             onOpponentClick={handleOpponentClick}
             phase={effectivePhase}
             selectedCalendarDate={selectedCalendarDate}
             smartMatchMode={smartMatchMode}
             allPlayers={allPlayers}
           />
        </div>,
        document.body
      )
    : null;

  // Check if we're in guest mode
  const isGuestMode = senderEmail === 'guest@frontrangepool.com';

  // Override loading states for guest mode to prevent "Updating..." status
  const guestProposalsLoading = isGuestMode ? false : proposalsLoading;
  const guestMatchesLoading = isGuestMode ? false : matchesLoading;
  const guestNotesLoading = isGuestMode ? false : notesLoading;
  const guestSeasonLoading = isGuestMode ? false : seasonLoading;
  const guestStandingsLoading = isGuestMode ? false : standingsLoading;
  const guestScheduleLoading = isGuestMode ? false : scheduleLoading;

  return (
    <div className={styles.dashboardBg} style={{ position: 'relative' }}>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
      
      {/* Render Mobile Dashboard if on mobile device */}
      {isMobile ? (
        <MobileDashboard
          playerName={playerName}
          playerLastName={playerLastName}
          pendingProposals={pendingProposals}
          sentProposals={sentProposals}
          matches={completedMatches}
          notes={notes}
          standings={standings}
          schedule={scheduledMatches}
          proposalsLoading={guestProposalsLoading}
          matchesLoading={guestMatchesLoading}
          notesLoading={guestNotesLoading}
          seasonLoading={guestSeasonLoading}
          standingsLoading={guestStandingsLoading}
          scheduleLoading={guestScheduleLoading}
          setShowMatchProposalModal={() => setShowMatchProposalModal(true)}
          setShowUserProfileModal={() => setShowUserProfileModal(true)}

          onViewMatch={handleProposalClick}
          onViewProposal={(proposal) => {
            setSelectedProposal(proposal);
            setShowProposalDetailsModal(true);
          }}
          onViewStandings={() => setShowStandings(true)}
          onViewSchedule={() => setShowCalendarModal(true)}
          onQuickAction={() => setShowMatchProposalModal(true)}
        />
      ) : (
        <div className={styles.dashboardFrame} style={{ position: 'relative', zIndex: 1 }}>
          {/* Main dashboard content starts here */}
          <div className={styles.dashboardCard} style={{ 
            position: 'relative', 
            zIndex: 1,
            padding: '20px',
            margin: '16px'
          }}>
          {/* Dashboard Header Component */}
                  <DashboardHeader
          playerName={playerName}
          playerLastName={playerLastName}
          isMobile={isMobile}
          userPin={userPin}
          playerEmail={senderEmail}
          proposalsLoading={guestProposalsLoading}
          matchesLoading={guestMatchesLoading}
          notesLoading={guestNotesLoading}
          seasonLoading={guestSeasonLoading}
          standingsLoading={guestStandingsLoading}
          scheduleLoading={guestScheduleLoading}
          onProfileClick={() => setShowUserProfileModal(true)}
          styles={styles}
        />
          

          
          {/* Division Selector Component */}
          <DivisionSelector
            divisions={divisions}
            selectedDivision={selectedDivision}
            onDivisionChange={e => setSelectedDivision(e.target.value)}
            isMobile={isMobile}
          />

             

             







          {/* --- Phase 2 Challenge Tracker --- */}
          {/* Phase 2 tracker will be positioned as overlay on pool table */}

          {/* Upcoming Matches Section Component */}
          <UpcomingMatchesSection
            isMobile={isMobile}
            styles={styles}
            effectivePhase={effectivePhase}
            seasonData={seasonData}
            completedMatches={completedMatches}
            totalRequiredMatches={totalRequiredMatches}
            playerName={playerName}
            playerLastName={playerLastName}
            selectedDivision={selectedDivision}
            pendingCount={pendingCount}
            sentCount={sentCount}
            filteredUpcomingMatches={filteredUpcomingMatches}
            currentUser={currentUser}
            allPlayers={allPlayers}
            showPhase1Rules={showPhase1Rules}
            setShowPhase1Rules={setShowPhase1Rules}
            setShowPhase1Overview={setShowPhase1Overview}
            setPlayerStats={setPlayerStats}
            setTimeLeft={setTimeLeft}
            setDeadlineStatus={setDeadlineStatus}
            setPhase1EndDate={setPhase1EndDate}
            // Event handlers
            onOpenOpponentsModal={(selectedDate) => {
              console.log('🎯 Dashboard: onOpenOpponentsModal called with date:', selectedDate);
              setSelectedCalendarDate(selectedDate);
              // If no date is provided (progress bar click), use smart match mode
              if (!selectedDate) {
                console.log('🎯 Dashboard: Setting smart match mode to true');
                setSmartMatchMode(true);
              } else {
                console.log('🎯 Dashboard: Setting smart match mode to false');
                setSmartMatchMode(false);
              }
              console.log('🎯 Dashboard: Setting showOpponents to true');
              setShowOpponents(true);
            }}
            onOpenCompletedMatchesModal={() => setShowCompletedModal(true)}
            onOpenStandingsModal={() => setShowStandings(true)}
            onOpenDefenseChallengersModal={() => setShowDefenseChallengers(true)}
            onOpenAllMatchesModal={() => setShowAllMatchesModal(true)}
            onOpenProposalListModal={() => setShowProposalListModal(true)}
            onOpenSentProposalListModal={() => setShowSentProposalListModal(true)}
            onOpenPlayerSearch={() => setShowPlayerSearch(true)}
            onMatchClick={handleProposalClick}
            onSmartMatchClick={handleSmartMatchClick}
            onOpenMessageCenter={(type) => {
              setChatType(type);
              setShowChatModal(true);
            }}
            onOpenCalendar={() => setShowCalendarModal(true)}
            // Refs
            simulationRef={simulationRef}
            opponentsModalPortal={opponentsModalPortal}
          />

          
        

        {/* News & Updates Section Component */}
        <NewsUpdatesSection
          notes={notes}
          notesLoading={notesLoading}
          noteError={noteError}
          userPin={userPin}
          onDeleteNote={handleDeleteNote}
          onClearNotes={handleClearNotes}
          styles={styles}
        />



        {/* Admin Buttons Section Component - Only show for admin users */}
        {!isGuestMode && isAdmin && (
          <AdminButtonsSection
          userPin={userPin}
          loadingPendingRegistrations={loadingPendingRegistrations}
          phaseOverride={phaseOverride}
          selectedDivision={selectedDivision}
          BACKEND_URL={BACKEND_URL}
          styles={styles}
          // Event handlers
          onShowRegistrationModal={() => setShowRegistrationModal(true)}
          onLoadPendingRegistrations={setLoadingPendingRegistrations}
          onSetPendingRegistrations={setPendingRegistrations}
          onShowPendingRegistrationsModal={() => setShowPendingRegistrationsModal(true)}
          onCreateTestRegistration={async () => {
            try {
              const testRegistration = {
                firstName: 'Test',
                lastName: 'Player',
                email: `testplayer${Date.now()}@example.com`,
                phone: '555-1234',
                textNumber: '555-5678',
                emergencyContactName: 'Emergency Contact',
                emergencyContactPhone: '555-9999',
                preferredContacts: ['email', 'text'],
                availability: {
                  Mon: ['6:00 PM - 8:00 PM'],
                  Tue: ['8:00 PM - 10:00 PM'],
                  Wed: [],
                  Thu: ['4:00 PM - 6:00 PM'],
                  Fri: [],
                  Sat: ['2:00 PM - 4:00 PM'],
                  Sun: ['10:00 AM - 12:00 PM']
                },
                locations: 'Test Pool Hall\nCommunity Center\nSports Bar',
                pin: '1234',
                division: 'FRBCAPL TEST',
                notes: 'Test registration created by admin'
              };

              const response = await fetch(`${BACKEND_URL}/api/users/register`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(testRegistration)
              });

              if (response.ok) {
                const result = await response.json();
                alert('✅ Test registration created successfully!\n\nPlayer: Test Player\nEmail: ' + testRegistration.email + '\n\nYou can now approve this registration.');
                // Refresh the pending registrations list
                const pendingResponse = await fetch(`${BACKEND_URL}/api/users/pending-registrations`);
                if (pendingResponse.ok) {
                  const pendingData = await pendingResponse.json();
                  setPendingRegistrations(pendingData);
                }
              } else {
                const errorData = await response.json();
                alert('Failed to create test registration: ' + errorData.error);
              }
            } catch (error) {
              console.error('Error creating test registration:', error);
              alert('Error creating test registration: ' + error.message);
            }
          }}
          onShowNoteModal={() => setShowNoteModal(true)}
          onShowPendingClaimsModal={() => setShowPendingClaimsModal(true)}
          onGoToAdmin={onGoToAdmin}
          onGoToPlatformAdmin={onGoToPlatformAdmin}
          isSuperAdmin={isSuperAdmin}
          onActivatePhase2={() => {}}
          onSetPhaseOverride={setPhaseOverride}
          onRefreshSeasonData={async () => {
            try {
              const [seasonResult, phaseResult] = await Promise.all([
                seasonService.getCurrentSeason(selectedDivision),
                seasonService.getCurrentPhaseAndWeek(selectedDivision)
              ]);
              setSeasonData(seasonResult?.season || null);
              setCurrentPhaseInfo(phaseResult);
            } catch (error) {
              console.error('Error refreshing season data:', error);
            }
          }}
        />
        )}
          </div>
        </div>
      )}
    {/* Modal Container Component */}
    <ModalContainer
      // Modal visibility states
      showPlayerSearch={showPlayerSearch}
      showAdminPlayerSearch={showAdminPlayerSearch}
      showPlayerAvailability={showPlayerAvailability}
      showProposalModal={showProposalModal}
      // Data
      selectedOpponent={selectedOpponent}
      proposalData={proposalData}
      fullName={fullName}
      senderEmail={senderEmail}
      selectedDivision={selectedDivision}
      effectivePhase={effectivePhase}
      playerName={playerName}
      playerLastName={playerLastName}
      // Event handlers
      onClosePlayerSearch={() => setShowPlayerSearch(false)}
      onCloseAdminPlayerSearch={() => setShowAdminPlayerSearch(false)}
      onClosePlayerAvailability={() => {
        setShowPlayerAvailability(false);
        setSelectedOpponent(null);
      }}
      onCloseProposalModal={() => setShowProposalModal(false)}
      onProposeMatch={(day, slot) => {
        setProposalData({
          player: selectedOpponent,
          day,
          slot,
          selectedDivision, 
          phase: effectivePhase
        });
        setShowProposalModal(true);
        setShowPlayerAvailability(false);
        setSelectedOpponent(null);
      }}
      onProposalComplete={() => {}}
      onUpdateProposalLocally={updateProposalLocally}
      onRefetchMatches={refetchMatches}
      onRefetchProposals={refetchProposals}
    />

    {/* Secondary Modal Container Component */}
    <SecondaryModalContainer
      // Modal visibility states
      showStandings={showStandings}
      showDefenseChallengers={showDefenseChallengers}
      modalOpen={modalOpen}
      showNoteModal={showNoteModal}
      showProposalListModal={showProposalListModal}
      showSentProposalListModal={showSentProposalListModal}
      showCounterModal={showCounterModal}
      showProposalDetailsModal={showProposalDetailsModal}
      // Data
      selectedMatch={selectedMatch}
      selectedProposal={selectedProposal}
      counterProposal={counterProposal}
      newNote={newNote}
      noteError={noteError}
      proposalNote={proposalNote}
      pendingProposals={pendingProposals}
      sentProposals={sentProposals}
      players={players}
      // Constants
      STANDINGS_URLS={STANDINGS_URLS}
      // Event handlers
      onCloseStandings={() => setShowStandings(false)}
      onCloseDefenseChallengers={() => setShowDefenseChallengers(false)}
      onCloseModal={closeModal}
      onCloseNoteModal={() => setShowNoteModal(false)}
      onCloseProposalListModal={() => setShowProposalListModal(false)}
      onCloseSentProposalListModal={() => setShowSentProposalListModal(false)}
      onCloseCounterModal={() => {
        setShowCounterModal(false);
        setCounterProposal(null);
      }}
      onCloseProposalDetailsModal={() => {
        setShowProposalDetailsModal(false);
        setSelectedProposal(null);
      }}
      onAddNote={handleAddNote}
      onUpdateNewNote={e => setNewNote(e.target.value)}
      onSelectProposal={proposal => {
        // Determine if current user is proposer
        const isProposer = (
          (senderEmail && proposal.senderEmail && senderEmail.toLowerCase() === proposal.senderEmail.toLowerCase()) ||
          (`${playerName} ${playerLastName}`.toLowerCase() === (proposal.senderName || '').toLowerCase())
        );
        setSelectedProposal(proposal);
        setProposalNote("");
        setShowProposalListModal(false);
        setShowProposalDetailsModal(isProposer);
      }}
      onSelectSentProposal={proposal => {
        // Determine if current user is proposer
        const isProposer = (
          (senderEmail && proposal.senderEmail && senderEmail.toLowerCase() === proposal.senderEmail.toLowerCase()) ||
          (`${playerName} ${playerLastName}`.toLowerCase() === (proposal.senderName || '').toLowerCase())
        );
        setSelectedProposal(proposal);
        setProposalNote("");
        setShowSentProposalListModal(false);
        setShowProposalDetailsModal(isProposer);
      }}
      onConfirmProposal={async () => {
        await proposalService.updateProposalStatus(selectedProposal._id, "confirmed", proposalNote);
        setSelectedProposal(null);
        setProposalNote("");
        refetchMatches();
        refetchProposals();
      }}
      onCounterPropose={() => {
        setCounterProposal(selectedProposal);
        setShowCounterModal(true);
        setSelectedProposal(null);
      }}
      onSubmitCounterProposal={handleCounterProposal}
             onEditProposal={() => {
         if (selectedProposal.isCounter) {
           setShowProposalDetailsModal(false);
           setTimeout(() => {
             setSelectedProposal(null);
             setCounterProposal(selectedProposal);
             setShowCounterModal(true);
           }, 100);
         } else {
           setShowProposalDetailsModal(false);
           setTimeout(() => {
             setSelectedProposal(null);
             setShowEditProposalModal(true);
           }, 100);
         }
       }}
       onDeleteProposal={async () => {
         if (window.confirm('Are you sure you want to delete this proposal?')) {
           try {
             await proposalService.deleteProposal(selectedProposal._id);
             setShowProposalDetailsModal(false);
             setSelectedProposal(null);
             refetchProposals();
           } catch (error) {
             console.error('Error deleting proposal:', error);
             alert('Failed to delete proposal');
           }
         }
       }}
       onUpdateProposalLocally={updateProposalLocally}
       onRefetchMatches={refetchMatches}
       onRefetchProposals={refetchProposals}
       // Props
       selectedDivision={selectedDivision}
       effectivePhase={effectivePhase}
       userPin={userPin}
       playerName={playerName}
       playerLastName={playerLastName}
       senderEmail={senderEmail}
       styles={styles}
       proposalService={proposalService}
     />

    {/* Final Modal Container Component */}
    <FinalModalContainer
      // Modal visibility states
      showEditProposalModal={showEditProposalModal}
      showChatModal={showChatModal}
      showCompletedModal={showCompletedModal}
      winnerModalOpen={winnerModalOpen}
      validationModalOpen={validationModalOpen}
      showSmartMatchmakingModal={showSmartMatchmakingModal}
      showUserProfileModal={showUserProfileModal}
      onCloseUserProfileModal={() => setShowUserProfileModal(false)}
      showPhase1Rules={showPhase1Rules}
      showPhase1Overview={showPhase1Overview}
      showRegistrationModal={showRegistrationModal}
      showPendingRegistrationsModal={showPendingRegistrationsModal}
      showCalendarModal={showCalendarModal}
      // Data
      selectedProposal={selectedProposal}
      chatType={chatType}
      opponentEmails={opponentEmails}
      completedMatches={completedMatches}
      winnerModalPlayers={winnerModalPlayers}
      winnerModalMatch={winnerModalMatch}
      matchToValidate={matchToValidate}
      selectedOpponentForSmartMatch={selectedOpponentForSmartMatch}
      pendingRegistrations={pendingRegistrations}
      // Event handlers
      onCloseEditProposalModal={() => setShowEditProposalModal(false)}
      onCloseChatModal={() => setShowChatModal(false)}
      onCloseCompletedModal={() => setShowCompletedModal(false)}
      onCloseWinnerModal={() => setWinnerModalOpen(false)}
      onCloseValidationModal={() => {
        setValidationModalOpen(false);
        setMatchToValidate(null);
      }}
      onCloseSmartMatchmakingModal={() => setShowSmartMatchmakingModal(false)}
      
      onClosePhase1Rules={() => setShowPhase1Rules(false)}
      onClosePhase1Overview={() => setShowPhase1Overview(false)}
      onCloseRegistrationModal={() => setShowRegistrationModal(false)}
      onClosePendingRegistrationsModal={() => setShowPendingRegistrationsModal(false)}
      onCloseCalendarModal={() => setShowCalendarModal(false)}
      onSaveEditProposal={(updatedProposal) => {
        setSelectedProposal(updatedProposal);
        refetchProposals();
        setShowEditProposalModal(false);
      }}
      onProposalUpdated={(updatedProposal) => {
        updateCompletedMatch(updatedProposal);
        refetchProposals();
      }}
      onSelectWinner={async (winner) => {
        if (!winnerModalMatch) return;
        
        if (currentPhaseInfo?.phase === 'scheduled' && seasonData) {
          const deadlinePassed = seasonService.hasPhase1DeadlinePassed(seasonData);
          if (deadlinePassed) {
            const confirmed = window.confirm(
              '⚠️ PHASE 1 DEADLINE HAS PASSED!\n\n' +
              'You are attempting to complete a match after the Phase 1 deadline. ' +
              'This may affect your standings or eligibility for Phase 2.\n\n' +
              'Do you want to continue marking this match as completed?'
            );
            if (!confirmed) {
              setWinnerModalOpen(false);
              return;
            }
          }
        }
        
        setWinnerModalOpen(false);
        setCompletingMatchId(winnerModalMatch._id);
        try {
          const matches = await fetch(`${BACKEND_URL}/api/matches?proposalId=${winnerModalMatch._id}`);
          const matchesData = await matches.json();
          
          if (matchesData.length > 0) {
            const matchId = matchesData[0]._id;
            await fetch(`${BACKEND_URL}/api/matches/${matchId}/complete`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                winner, 
                score: 'TBD',
                notes: `Completed by ${playerName} ${playerLastName}` 
              })
            });
          } else {
            await proposalService.markCompleted(winnerModalMatch._id, winner);
          }
          
          markMatchCompleted({ ...winnerModalMatch, winner });
          refetchMatches();
          refetchProposals();
        } catch (err) {
          console.error('Error completing match:', err);
          alert('Failed to mark as completed.');
        }
        setCompletingMatchId(null);
      }}
      onValidateMatch={async (validationData) => {
        console.log('Validating match:', validationData);
        refetchMatches();
      }}
      onRejectMatch={async (matchId) => {
        console.log('Rejecting match:', matchId);
        refetchMatches();
      }}
      onSmartMatchProposalComplete={() => {
        refetchMatches();
        refetchProposals();
      }}
      onUserUpdate={(updatedUser) => {
        setCurrentUser(updatedUser);
      }}
      onRegistrationSuccess={(userData) => {
        console.log('New player registered by admin:', userData);
        setShowRegistrationModal(false);
        window.location.reload();
      }}
      onApproveRegistration={async (registration) => {
        const divisionSelect = document.getElementById(`division-${registration._id}`);
        const selectedDivision = divisionSelect.value;
        
        if (!selectedDivision) {
          alert('Please select a division before approving.');
          return;
        }
        
        const paymentInfo = {
          hasPaid: true,
          paymentDate: new Date(),
          paymentMethod: 'Cash',
          paymentNotes: 'Approved by admin'
        };
        
        try {
          const response = await fetch(`${BACKEND_URL}/api/users/admin/approve-registration/${registration._id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              approvedBy: `${playerName} ${playerLastName}`,
              paymentInfo,
              division: selectedDivision
            })
          });
          
          if (response.ok) {
            alert(`Registration approved successfully!\n\nPlayer: ${registration.firstName} ${registration.lastName}\nDivision: ${selectedDivision}`);
            setPendingRegistrations(prev => prev.filter(r => r._id !== registration._id));
          } else {
            const error = await response.json();
            alert('Failed to approve: ' + error.error);
          }
        } catch (error) {
          console.error('Error approving registration:', error);
          alert('Error approving registration');
        }
      }}
      onRejectRegistration={async (registration) => {
        const notes = prompt('Enter rejection reason (optional):');
        if (notes !== null) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/users/admin/reject-registration/${registration._id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                rejectedBy: `${playerName} ${playerLastName}`,
                notes
              })
            });
            
            if (response.ok) {
              alert('Registration rejected successfully!');
              setPendingRegistrations(prev => prev.filter(r => r._id !== registration._id));
            } else {
              const error = await response.json();
              alert('Failed to reject: ' + error.error);
            }
          } catch (error) {
            console.error('Error rejecting registration:', error);
            alert('Error rejecting registration');
          }
        }
      }}
      onOpenOpponentsModal={(selectedDate) => {
        console.log('🎯 Dashboard: Calendar modal calling onOpenOpponentsModal with date:', selectedDate);
        setSelectedCalendarDate(selectedDate);
        if (!selectedDate) {
          console.log('🎯 Dashboard: Setting smart match mode to true');
          setSmartMatchMode(true);
        } else {
          console.log('🎯 Dashboard: Setting smart match mode to false');
          setSmartMatchMode(false);
        }
        console.log('🎯 Dashboard: Setting showOpponents to true');
        setShowOpponents(true);
        setShowCalendarModal(false);
      }}
      onMatchClick={handleProposalClick}
      onSmartMatchClick={handleSmartMatchClick}
      // Props
      selectedDivision={selectedDivision}
      effectivePhase={effectivePhase}
      userPin={userPin}
      playerName={playerName}
      playerLastName={playerLastName}
      senderEmail={senderEmail}
      isMobile={isMobile}
      currentUser={currentUser}
      players={players}
      filteredUpcomingMatches={filteredUpcomingMatches}
      phase1EndDate={phase1EndDate}
      playerStats={playerStats}
      standings={standings}
      timeLeft={timeLeft}
      deadlineStatus={deadlineStatus}
      allPlayers={allPlayers}
      styles={styles}
      proposalService={proposalService}
      seasonService={seasonService}
      seasonData={seasonData}
      currentPhaseInfo={currentPhaseInfo}
      BACKEND_URL={BACKEND_URL}
      markMatchCompleted={markMatchCompleted}
      setCompletingMatchId={setCompletingMatchId}
      updateCompletedMatch={updateCompletedMatch}
      refetchMatches={refetchMatches}
      refetchProposals={refetchProposals}
      setPendingRegistrations={setPendingRegistrations}
    />

    {/* All Matches Modal */}
    {allMatchesModal}

    {/* Pending Claims Modal */}
    {showPendingClaimsModal && (
      <PendingClaimsManager onClose={() => setShowPendingClaimsModal(false)} />
    )}

    {/* Phase 1 Tracker Overlay - Show ONLY for guest mode */}
    {senderEmail === 'guest@frontrangepool.com' && (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '85%',
        maxWidth: '1000px',
        height: '500px',
        pointerEvents: 'auto'
      }}>
        <div style={{
          background: 'transparent',
          borderRadius: '12px',
          padding: '20px',
          width: '100%',
          height: '100%',
          overflow: 'auto'
        }}>
          <Phase1Tracker
            currentPhase="scheduled"
            seasonData={{
              _id: 'guest-season-1',
              name: 'BCAPL Singles Division - Guest Preview',
              division: 'FRBCAPL TEST',
              startDate: new Date(),
              endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              phase1EndDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
              totalWeeks: 10,
              currentWeek: 3,
              isActive: true
            }}
            completedMatches={[
              {
                _id: 'guest-match-1',
                player1Id: 'Guest User',
                player2Id: 'John Smith',
                winner: 'Guest User',
                score: '5-3',
                matchDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                status: 'completed'
              },
              {
                _id: 'guest-match-2',
                player1Id: 'Guest User',
                player2Id: 'Jane Doe',
                winner: 'Jane Doe',
                score: '3-5',
                matchDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                status: 'completed'
              }
            ]}
            totalRequiredMatches={6}
            playerName={playerName}
            playerLastName={playerLastName}
            selectedDivision="FRBCAPL TEST"
            onOpenOpponentsModal={() => alert('👥 Opponents Modal - Members only!')}
            onOpenCompletedMatchesModal={() => alert('✅ Completed Matches - Members only!')}
            onOpenStandingsModal={() => alert('📊 Standings - Members only!')}
            onOpenAllMatchesModal={() => alert('📋 All Matches - Members only!')}
            pendingCount={2}
            sentCount={1}
            onOpenProposalListModal={() => alert('📝 Proposals - Members only!')}
            onOpenSentProposalListModal={() => alert('📤 Sent Proposals - Members only!')}
            upcomingMatches={[
              {
                _id: 'guest-upcoming-1',
                player1Id: 'Guest User',
                player2Id: 'Mike Johnson',
                proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending'
              }
            ]}
            onMatchClick={() => alert('🎯 Match Details - Members only!')}
            isMobile={isMobile}
            onOpenMessageCenter={() => alert('💬 Message Center - Members only!')}
            currentUser={currentUser}
            allPlayers={[
              { firstName: 'Guest', lastName: 'User', email: 'guest@frontrangepool.com' },
              { firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
              { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
              { firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com' }
            ]}
            onSmartMatchClick={() => alert('🧠 Smart Match - Members only!')}
            showPhase1Rules={showPhase1Rules}
            setShowPhase1Rules={setShowPhase1Rules}
            showPhase1Overview={showPhase1Overview}
            setShowPhase1Overview={setShowPhase1Overview}
            setPlayerStats={setPlayerStats}
            setTimeLeft={setTimeLeft}
            setDeadlineStatus={setDeadlineStatus}
            setPhase1EndDate={setPhase1EndDate}
            onOpenCalendar={() => alert('📅 Calendar - Members only!')}
          />
        </div>
      </div>
    )}
   </div>
 );
}
