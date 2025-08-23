import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import styles from './dashboard.module.css';
import tenBall from '../../assets/tenball.svg';
import PoolSimulation from "../PoolSimulation.jsx";
import ResponsiveWrapper from "../ResponsiveWrapper";
import StandingsModal from "./StandingsModal.jsx";
import DefenseChallengersModal from "./DefenseChallengersModal.jsx";
import MatchDetailsModal from "../modal/MatchDetailsModal.jsx";
import ProposalListModal from './ProposalListModal';
import ConfirmMatchDetails from '../ConfirmMatchDetails';
import CounterProposalModal from '../modal/CounterProposalModal';
import logoImg from '../../assets/logo.png';
import OpponentsModal from "../modal/OpponentsModal";
import PlayerAvailabilityModal from "../modal/PlayerAvailabilityModal";
import MatchProposalModal from "../modal/MatchProposalModal";
import PlayerSearch from "../modal/PlayerSearch";
import ProposalDetailsModal from './ProposalDetailsModal';
import EditProposalModal from './EditProposalModal';
import LoadingSpinner, { LoadingButton, SkeletonLoader } from "../LoadingSpinner";
import Modal from '../modal/DraggableModal.jsx';

import DirectMessagingModal from '../DirectMessagingModal';
import MatchChat from '../chat/MatchChat';
import WinnerSelectModal from '../modal/WinnerSelectModal';
import Phase1Tracker from './Phase1Tracker.jsx';
import Phase2Tracker from './Phase2Tracker.jsx';
import MatchValidationModal from './MatchValidationModal';
import ErrorBoundary from '../ErrorBoundary';
import Phase1RulesModal from '../modal/Phase1RulesModal';
import Phase1OverviewModal from '../modal/Phase1OverviewModal';

import SmartMatchmakingModal from '../modal/SmartMatchmakingModal';
import PlayerRegistrationModal from '../modal/PlayerRegistrationModal';



// Import new services and hooks
import { useProposals } from '../../hooks/useProposals';
import { useMatches } from '../../hooks/useMatches';
import { useSeasonData } from '../../hooks/useSeasonData';
import { useStandings } from '../../hooks/useStandings';
import { useNotes } from '../../hooks/useNotes';
import { useSchedule } from '../../hooks/useSchedule';
import { proposalService } from '../../services/proposalService';
import { userService } from '../../services/userService';
import { noteService } from '../../services/noteService';
import { seasonService } from '../../services/seasonService';
import { deadlineNotificationService } from '../../services/deadlineNotificationService';

import { format } from 'date-fns';
import { BACKEND_URL } from '../../config.js';
import { useNavigate } from 'react-router-dom';


const STANDINGS_URLS = {
  "FRBCAPL TEST": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=b345a437-3415-4765-b19a-b2f7014f2cfa",
  "Singles Test": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=9058a0cc-3231-4118-bd91-b305006fe578"
  // Add more divisions as needed
};


// --- Robust date normalization ---
function normalizeDate(dateStr) {
  if (!dateStr) return "";
  if (dateStr.includes("-")) return dateStr.trim(); // already "YYYY-MM-DD"
  // Try to handle "M/D/YYYY" or "MM/DD/YYYY"
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return [
      year.padStart(4, "20"),
      month.padStart(2, "0"),
      day.padStart(2, "0")
    ].join("-");
  }
  return dateStr.trim();
}

function parseAvailability(str) {
  const dayMap = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };
  const result = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
  if (!str) return result;
  str.split(/\r?\n/).forEach(line => {
    const match = line.match(/Day:\s*(\w+),\s*Available From:\s*([\w:]+),\s*Available Until:\s*([\w: ]+)/i);
    if (match) {
      const [_, dayFull, from, until] = match;
      const dayShort = dayMap[dayFull];
      if (dayShort) {
        result[dayShort].push(`${from} - ${until}`);
      }
    }
  });
  return result;
}

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
  onLogout,
  onScheduleMatch,
  senderEmail,
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
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatType, setChatType] = useState('direct'); // 'direct' or 'league'
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Add state at the top of the Dashboard component
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerModalMatch, setWinnerModalMatch] = useState(null);
  const [winnerModalPlayers, setWinnerModalPlayers] = useState({ player1: '', player2: '' });

  // Season and deadline tracking state
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [matchToValidate, setMatchToValidate] = useState(null);
  

  
  // User profile modal state
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [profileModalDrag, setProfileModalDrag] = useState({ x: 0, y: 0 });
  const [profileModalDragging, setProfileModalDragging] = useState(false);
  const profileModalDragStart = useRef({ x: 0, y: 0 });

  // Registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showPendingRegistrationsModal, setShowPendingRegistrationsModal] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loadingPendingRegistrations, setLoadingPendingRegistrations] = useState(false);

  // Phase1 modal state
  const [showPhase1Rules, setShowPhase1Rules] = useState(false);
  const [showPhase1Overview, setShowPhase1Overview] = useState(false);

  // Phase1 data state (needed for modals)
  const [playerStats, setPlayerStats] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [deadlineStatus, setDeadlineStatus] = useState('normal');
  const [phase1EndDate, setPhase1EndDate] = useState(null);


  const simulationRef = useRef(null);

  const navigate = useNavigate();

  // Check if we're on a mobile device - improved for iframe compatibility
  const isMobile = (() => {
    // First try viewport width (works better in iframes)
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return true;
    }
    // Fallback to user agent detection
    if (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      return true;
    }
    // Additional check for iframe context
    if (typeof window !== 'undefined' && window.self !== window.top) {
      // We're in an iframe, be more conservative with mobile detection
      return window.innerWidth <= 768 || window.innerHeight <= 600;
    }
    return false;
  })();

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

  // Profile modal drag handlers
  const onProfileModalMouseDown = (e) => {
    setProfileModalDragging(true);
    profileModalDragStart.current = {
      x: e.clientX - profileModalDrag.x,
      y: e.clientY - profileModalDrag.y,
    };
    document.body.style.userSelect = "none";
  };

  const onProfileModalMouseMove = (e) => {
    if (!profileModalDragging) return;
    setProfileModalDrag({
      x: e.clientX - profileModalDragStart.current.x,
      y: e.clientY - profileModalDragStart.current.y,
    });
  };

  const onProfileModalMouseUp = () => {
    setProfileModalDragging(false);
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    if (profileModalDragging) {
      window.addEventListener("mousemove", onProfileModalMouseMove);
      window.addEventListener("mouseup", onProfileModalMouseUp);
    } else {
      window.removeEventListener("mousemove", onProfileModalMouseMove);
      window.removeEventListener("mouseup", onProfileModalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onProfileModalMouseMove);
      window.removeEventListener("mouseup", onProfileModalMouseUp);
    };
  }, [profileModalDragging]);

  // Reset profile modal position when it opens
  useEffect(() => {
    if (showUserProfileModal) {
      setProfileModalDrag({ x: 0, y: 0 });
    }
  }, [showUserProfileModal]);

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
        } else {
          divs = [];
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
       maxWidth="600px"
       maxHeight="70vh"
     >
       {/* Search and Filter Bar */}
       <div style={{
         display: 'flex',
         gap: '12px',
         flexWrap: isMobile ? 'wrap' : 'nowrap',
         alignItems: 'center',
         marginBottom: '16px'
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
         maxHeight: '50vh'
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
             gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))'
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
                   padding: '20px',
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
                     marginBottom: '16px',
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
                     gap: '24px',
                     marginBottom: '20px',
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
                     gap: '12px',
                     justifyContent: 'center'
                   }}>
                     <button
                       onClick={() => handleProposalClick(match)}
                       style={{
                         padding: '12px 24px',
                         background: 'linear-gradient(135deg, var(--accent-red), var(--accent-red-dark))',
                         border: 'none',
                         borderRadius: '8px',
                         color: '#fff',
                         fontSize: '0.9rem',
                         fontWeight: '600',
                         cursor: 'pointer',
                         transition: 'all 0.2s ease',
                         boxShadow: '0 2px 8px rgba(229, 62, 62, 0.3)',
                         minWidth: '120px'
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
                           padding: '12px 24px',
                           fontSize: '0.9rem',
                           fontWeight: '600',
                           background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                           border: 'none',
                           borderRadius: '8px',
                           color: '#fff',
                           cursor: 'pointer',
                           transition: 'all 0.2s ease',
                           minWidth: '120px',
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
         padding: '16px 0 0',
         borderTop: '1px solid rgba(255, 255, 255, 0.1)',
         marginTop: '16px',
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
      <div className={styles.dashboardFrame} style={{ position: 'relative', zIndex: 1 }}>
        {/* Main dashboard content starts here */}
        <div className={styles.dashboardCard} style={{ 
          position: 'relative', 
          zIndex: 1,
          padding: isMobile ? '12px' : '20px',
          margin: isMobile ? '6px' : '16px'
        }}>
                     <div style={{ textAlign: 'center', marginBottom: isMobile ? '8px' : '16px' }}>
             <h1 
               className={styles.dashboardTitle} 
               style={{ 
                 fontSize: isMobile ? '1.6rem' : '2rem',
                 textAlign: 'center',
                 margin: 0,
                 cursor: 'pointer',
                 transition: 'all 0.2s ease'
               }}
               onClick={() => setShowUserProfileModal(true)}
               onMouseEnter={(e) => {
                 e.target.style.color = '#e53e3e';
                 e.target.style.textShadow = '0 0 8px rgba(229, 62, 62, 0.5)';
               }}
               onMouseLeave={(e) => {
                 e.target.style.color = '';
                 e.target.style.textShadow = '';
               }}
             >
               Welcome,
               <span className={styles.dashboardUserName} style={{ fontSize: isMobile ? '1.4rem' : '1.8rem' }}>
                 {playerName} {playerLastName}
               </span>
             </h1>
             
             {/* Auto-update Status Indicator */}
             <div style={{
               display: 'flex',
               justifyContent: 'center',
               alignItems: 'center',
               gap: '8px',
               marginTop: isMobile ? '4px' : '8px',
               fontSize: isMobile ? '0.7rem' : '0.8rem',
               color: '#888'
             }}>
               <div style={{
                 width: '8px',
                 height: '8px',
                 borderRadius: '50%',
                 background: (proposalsLoading || matchesLoading || notesLoading || seasonLoading || standingsLoading || scheduleLoading) ? '#f59e0b' : '#10b981',
                 animation: (proposalsLoading || matchesLoading || notesLoading || seasonLoading || standingsLoading || scheduleLoading) ? 'pulse 2s infinite' : 'none'
               }} />
               <span>
                 {proposalsLoading || matchesLoading || notesLoading || seasonLoading || standingsLoading || scheduleLoading ? 'Updating...' : 'Live'}
               </span>
             </div>
             
             {/* Profile Button */}
             <button
               onClick={() => setShowUserProfileModal(true)}
               style={{
                 background: 'linear-gradient(135deg, #e53e3e, #c53030)',
                 color: '#fff',
                 border: 'none',
                 borderRadius: '8px',
                 padding: isMobile ? '8px 16px' : '10px 20px',
                 fontSize: isMobile ? '0.8rem' : '0.9rem',
                 fontWeight: '600',
                 cursor: 'pointer',
                 transition: 'all 0.2s ease',
                 boxShadow: '0 2px 8px rgba(229, 62, 62, 0.3)',
                 marginTop: isMobile ? '6px' : '10px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px'
               }}
               onMouseEnter={(e) => {
                 e.target.style.background = 'linear-gradient(135deg, #c53030, #a52a2a)';
                 e.target.style.transform = 'translateY(-1px)';
                 e.target.style.boxShadow = '0 4px 12px rgba(229, 62, 62, 0.4)';
               }}
               onMouseLeave={(e) => {
                 e.target.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';
                 e.target.style.transform = 'translateY(0)';
                 e.target.style.boxShadow = '0 2px 8px rgba(229, 62, 62, 0.3)';
               }}
             >
               👤 Profile
             </button>
           </div>
          <div className={styles.announcement} style={{ fontSize: isMobile ? '0.75rem' : '1rem', marginBottom: isMobile ? '8px' : '16px' }}>
            <p>This is the BETA version. </p>Matches that are created, scheduled, and confirmed will NOT be played.<br />
            This is for testing purposes only.
          </div>
          

          
                      {/* 10-Ball Tutorial Link - Admin Only */}
            {userPin === "777777" && (
              <div style={{ 
                marginBottom: isMobile ? 12 : 16,
                textAlign: 'center'
              }}>
                <button
                  onClick={() => window.location.hash = '#/tenball-tutorial'}
                  style={{
                    background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                    border: 'none',
                    color: 'white',
                    padding: isMobile ? '10px 16px' : '12px 20px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                  }}
                >
                  <img src={tenBall} alt="10-Ball" style={{ width: '20px', height: '20px', marginRight: '8px', display: 'inline-block', verticalAlign: 'text-bottom' }} />
                  Play 10-Ball Tutorial & Learn Official CSI Rules
                </button>
              </div>
            )}
          

          
          {!isMobile && <br />}
          

          
          {/* --- Division Selector --- */}
           {divisions.length > 0 && (
             <div style={{ 
               marginBottom: isMobile ? 8 : 16,
               display: 'flex',
               flexDirection: 'column',
               alignItems: isMobile ? 'flex-start' : 'center',
               gap: isMobile ? '8px' : '12px'
             }}>
               <div style={{
                 display: 'flex',
                 flexDirection: isMobile ? 'column' : 'row',
                 alignItems: isMobile ? 'flex-start' : 'center',
                 gap: isMobile ? '4px' : '12px',
                 width: '100%'
               }}>
                 <label style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                   Division:&nbsp;
                   {divisions.length > 1 ? (
                     <select
                       value={selectedDivision}
                       onChange={e => setSelectedDivision(e.target.value)}
                       style={{ 
                         fontSize: isMobile ? "0.9em" : "1em", 
                         padding: isMobile ? 6 : 4, 
                         borderRadius: 4 
                       }}
                     >
                       {divisions.map(div =>
                         <option key={div} value={div}>{div}</option>
                       )}
                     </select>
                   ) : (
                     <span style={{ fontWeight: 600 }}>{divisions[0]}</span>
                   )}
                 </label>
               </div>
             </div>
                        )}

             

             





          {/* --- Phase 2 Challenge Tracker --- */}
          {/* Phase 2 tracker will be positioned as overlay on pool table */}

                     {/* --- Upcoming Matches Section --- */}
           <section className={`${styles.dashboardSection} ${styles.dashboardSectionBox} ${styles.matchesSection}`}
             style={{
               position: "relative",
               overflow: "visible",
               backgroundColor: "rgba(0, 0, 0, .5)",
               minHeight: isMobile ? "650px" : "570px",
               marginBottom: isMobile ? '16px' : '36px',
               paddingBottom: isMobile ? '20px' : '20px',
             }}
           >
             
             {/* PoolSimulation as background and matches list overlayed on table */}
             <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                               <div className={styles.poolTableContainer} style={{ 
                   marginBottom: isMobile ? '12px' : '24px', 
                   position: 'relative',
                   width: '100%',
                   maxWidth: isMobile ? '98%' : '600px',
                   height: isMobile ? '400px' : 'auto',
                   display: 'flex',
                   justifyContent: 'center',
                   alignItems: 'center'
                 }}>
                
                                 {/* Phase 1 Tracker positioned over the simulation */}
                                   {effectivePhase === 'scheduled' && seasonData && (
                    <div style={{
                      position: 'absolute',
                      top: isMobile ? '50px' : '35px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                      width: isMobile ? '95%' : '90%',
                      maxWidth: isMobile ? '500px' : '1200px',
                      height: isMobile ? '150px' : '200px'
                    }}>
                    <ErrorBoundary>
                      <Phase1Tracker
                        currentPhase={effectivePhase}
                        seasonData={seasonData}
                        completedMatches={completedMatches}
                        totalRequiredMatches={totalRequiredMatches}
                        playerName={playerName}
                        playerLastName={playerLastName}
                        selectedDivision={selectedDivision}
                        onOpenOpponentsModal={(selectedDate) => {
                          setSelectedCalendarDate(selectedDate);
                          // If no date is provided (progress bar click), use smart match mode
                          if (!selectedDate) {
                            setSmartMatchMode(true);
                          } else {
                            setSmartMatchMode(false);
                          }
                          setShowOpponents(true);
                        }}
                        onOpenCompletedMatchesModal={() => setShowCompletedModal(true)}
                        onOpenStandingsModal={() => setShowStandings(true)}
                        onOpenAllMatchesModal={() => setShowAllMatchesModal(true)}
                        pendingCount={pendingCount}
                        sentCount={sentCount}
                        onOpenProposalListModal={() => setShowProposalListModal(true)}
                        onOpenSentProposalListModal={() => setShowSentProposalListModal(true)}
                        upcomingMatches={filteredUpcomingMatches}
                        onMatchClick={handleProposalClick}
                        isMobile={isMobile}
                        onOpenMessageCenter={(type) => {
                          setChatType(type);
                          setShowChatModal(true);
                        }}
                        currentUser={currentUser}
                        allPlayers={allPlayers}
                        onSmartMatchClick={handleSmartMatchClick}
                        // Phase1 modal state and handlers
                        showPhase1Rules={showPhase1Rules}
                        setShowPhase1Rules={setShowPhase1Rules}
                        showPhase1Overview={showPhase1Overview}
                        setShowPhase1Overview={setShowPhase1Overview}
                        // Phase1 data state setters
                        setPlayerStats={setPlayerStats}
                        setTimeLeft={setTimeLeft}
                        setDeadlineStatus={setDeadlineStatus}
                        setPhase1EndDate={setPhase1EndDate}
                      />
                    </ErrorBoundary>
                  </div>
                )}

                                 {/* Phase 2 Tracker positioned over the simulation */}
                                   {effectivePhase === 'challenge' && (
                    <div style={{
                      position: 'absolute',
                      top: isMobile ? '50px' : '35px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                      width: isMobile ? '95%' : '90%',
                      maxWidth: isMobile ? '500px' : '1200px',
                      height: isMobile ? '150px' : '200px'
                    }}>
                                         <Phase2Tracker
                       playerName={playerName}
                       playerLastName={playerLastName}
                       selectedDivision={selectedDivision}
                       phase={effectivePhase}
                       isMobile={isMobile}
                       onOpenOpponentsModal={(selectedDate) => {
                         setSelectedCalendarDate(selectedDate);
                         setShowOpponents(true);
                       }}
                       onOpenCompletedMatchesModal={() => setShowCompletedModal(true)}
                                        onOpenStandingsModal={() => setShowStandings(true)}
                 onOpenDefenseChallengersModal={() => setShowDefenseChallengers(true)}
                 onOpenAllMatchesModal={() => setShowAllMatchesModal(true)}
                 pendingCount={pendingCount}
                 sentCount={sentCount}
                 onOpenProposalListModal={() => setShowProposalListModal(true)}
                 onOpenSentProposalListModal={() => setShowSentProposalListModal(true)}
                 onOpenPlayerSearch={() => setShowPlayerSearch(true)}
                 upcomingMatches={filteredUpcomingMatches}
                 onMatchClick={handleProposalClick}
                 seasonData={seasonData}
                 completedMatches={completedMatches}
                 standings={standings}
                     />
                  </div>
                 )}
                                                  {isMobile ? (
                   <div
                     className={styles.simulationContainer}
                     ref={simulationRef}
                     style={{
                       width: '100% !important',
                       height: '400px !important',
                       position: 'relative',
                       minWidth: '0 !important',
                       maxWidth: '100% !important',
                       minHeight: '400px !important',
                       maxHeight: '400px !important'
                     }}
                   >
                     <PoolSimulation isRotated={true} />
                   </div>
                 ) : (
                                     <ResponsiveWrapper aspectWidth={600} aspectHeight={300}>
                     <div
                       className={styles.simulationContainer}
                       ref={simulationRef}
                       style={{
                         width: '100%',
                         height: '100%',
                         position: 'relative'
                       }}
                     >
                       <PoolSimulation />
                     </div>
                   </ResponsiveWrapper>
                )}
                {/* OpponentsModal portal overlay (not inside simulationContainer) */}
                {opponentsModalPortal}
                
                
              </div>
            </div>
          </section>

          
        

        {/* News & Updates Section */}
        <section className={`${styles.dashboardSection} ${styles.dashboardSectionBox} ${styles.newsUpdatesSection}`}>
          <h2 className={styles.dashboardSectionTitle}>
            News & Updates
          </h2>
          {notesLoading ? (
            <SkeletonLoader lines={3} height="16px" />
          ) : (
            <ul className={styles.dashboardList}>
              {notes.length === 0 ? (
                <li className={styles.dashboardNoteItem}>No news yet.</li>
              ) : (
                notes.map((note, idx) => (
                  <li
                    key={note._id || idx}
                    className={styles.dashboardNoteItem}
                  >
                    <span style={{ flex: 1 }}>{note.text}</span>
                    {userPin === "777777" && (
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        style={{
                          background: "#e53935",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "2px 8px",
                          cursor: "pointer",
                          fontSize: "0.95em"
                        }}
                        aria-label="Delete note"
                        title="Delete note"
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
          {userPin === "777777" && notes.length > 0 && (
            <button
              style={{
                marginTop: 10,
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "4px 14px",
                cursor: "pointer",
                fontSize: "0.98em"
              }}
              onClick={handleClearNotes}
              type="button"
            >
              Clear All Notes
            </button>
          )}
          
          {noteError && (
            <div style={{
              marginTop: 10,
              padding: '10px',
              background: '#ffebee',
              color: '#c62828',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              fontSize: '0.9em'
            }}>
              Error: {noteError}
            </div>
          )}
        </section>

        <button
          className={styles.dashboardLogoutBtn}
          onClick={onLogout}
          type="button"
        >
          Logout
        </button>

        {userPin === "777777" && (
          <>
            <button
              className={styles.dashboardAdminBtn}
              onClick={() => setShowRegistrationModal(true)}
              type="button"
              style={{ background: '#4CAF50' }}
            >
              Register Player
            </button>
            <button
              className={styles.dashboardAdminBtn}
              onClick={async () => {
                setLoadingPendingRegistrations(true);
                try {
                  const response = await fetch(`${BACKEND_URL}/api/users/pending-registrations`);
                  if (response.ok) {
                    const data = await response.json();
                    setPendingRegistrations(data);
                    setShowPendingRegistrationsModal(true);
                  } else {
                    alert('Failed to load pending registrations');
                  }
                } catch (error) {
                  console.error('Error loading pending registrations:', error);
                  alert('Error loading pending registrations');
                } finally {
                  setLoadingPendingRegistrations(false);
                }
              }}
              type="button"
              style={{ background: '#FF9800' }}
              disabled={loadingPendingRegistrations}
            >
              {loadingPendingRegistrations ? 'Loading...' : 'Pending Registrations'}
            </button>
            <button
              className={styles.dashboardAdminBtn}
              onClick={async () => {
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
              type="button"
              style={{ background: '#9C27B0' }}
            >
              Create Test Registration
            </button>
            <button
              className={styles.dashboardAdminBtn}
              onClick={() => setShowNoteModal(true)}
              type="button"
            >
              Add Note
            </button>
            <button
              className={styles.dashboardAdminBtn}
              onClick={onGoToAdmin}
              type="button"
            >
              Admin
            </button>
           
            <button
              className={styles.dashboardAdminBtn}
              onClick={async () => {
                if (phaseOverride === "challenge") {
                  // Switching back to Phase 1 - just update UI
                  setPhaseOverride("scheduled");
                } else {
                  // Switching to Phase 2 - activate it in the backend
                  try {
                    const response = await fetch(`${BACKEND_URL}/api/seasons/activate-phase2/${encodeURIComponent(selectedDivision)}`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                      console.log('✅ Phase 2 activated successfully:', data.message);
                      setPhaseOverride("challenge");
                      // Show success message and refresh season data
                      alert('✅ Phase 2 activated successfully! The system will now allow Phase 2 challenges.');
                      // Refresh season data without reloading the page
                      if (selectedDivision) {
                        // Trigger a re-fetch of season data
                        const refreshSeasonData = async () => {
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
                        };
                        refreshSeasonData();
                      }
                    } else {
                      console.error('❌ Failed to activate Phase 2:', data.error);
                      alert('Failed to activate Phase 2: ' + data.error);
                    }
                  } catch (error) {
                    console.error('❌ Error activating Phase 2:', error);
                    alert('Error activating Phase 2: ' + error.message);
                  }
                }
              }}
              type="button"
            >
              {phaseOverride === "challenge" ? "Switch to Phase 1 (Scheduled)" : "Activate Phase 2 (Challenge)"}
            </button>
            {phaseOverride && (
              <button
                className={styles.dashboardAdminBtn}
                onClick={() => setPhaseOverride(null)}
                type="button"
                style={{ background: "#888" }}
              >
                Clear Phase Override
              </button>
            )}
           
          </>
        )}
      </div>
    </div>
    {/* Player Search Modal (Phase 2) */}
  {showPlayerSearch && (
    <>
      <PlayerSearch
        onClose={() => setShowPlayerSearch(false)}
        excludeName={fullName}
        senderName={fullName}
        senderEmail={senderEmail}
        selectedDivision={selectedDivision}
        phase={effectivePhase}
        onProposalComplete={() => setShowPlayerSearch(false)}
      />
    </>
  )}

{showAdminPlayerSearch && (
  <PlayerSearch
    onClose={() => setShowAdminPlayerSearch(false)}
    excludeName={null}
    senderName={fullName}
    senderEmail={senderEmail}
    phase={effectivePhase}
    onProposalComplete={() => setShowAdminPlayerSearch(false)}
  />
)}


    {/* Player Availability Modal */}
    {showPlayerAvailability && selectedOpponent && (
      <PlayerAvailabilityModal
        onClose={() => {
          setShowPlayerAvailability(false);
          setSelectedOpponent(null);
        }}
        player={selectedOpponent}
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
        selectedDivision={selectedDivision}
        phase={effectivePhase}
      />
    )}

    {/* Proposal Modal */}
  {showProposalModal && proposalData && (
  <MatchProposalModal
    player={proposalData.player}
    day={proposalData.day}
    slot={proposalData.slot}
    selectedDivision={proposalData.selectedDivision} 
    phase={proposalData.phase || effectivePhase}
    onClose={() => setShowProposalModal(false)}
    senderName={`${playerName} ${playerLastName}`}
    senderEmail={senderEmail}
    onProposalComplete={(newProposal) => {
      setShowProposalModal(false);
      setProposalData(null);
      
      // Immediately add the new proposal to local state for instant UI feedback
      if (newProposal) {
        updateProposalLocally(newProposal, 'add');
      }
      
      // Refetch to ensure data consistency
      refetchMatches();
      refetchProposals();
    }}
  />
)}

    {/* Standings Modal */}
    <StandingsModal
      open={showStandings}
      onClose={() => setShowStandings(false)}
      standingsUrl={STANDINGS_URLS[selectedDivision]}
    />

               {/* Defense Challengers Modal */}
           <DefenseChallengersModal
             open={showDefenseChallengers}
             onClose={() => setShowDefenseChallengers(false)}
             playerName={playerName}
             playerLastName={playerLastName}
             selectedDivision={selectedDivision}
           />

    {/* Match Details Modal */}
    <MatchDetailsModal
      open={modalOpen}
      onClose={closeModal}
      match={selectedMatch}
      onCompleted={matchId => setUpcomingMatches(prev => prev.filter(m => m._id !== matchId))}
      userPin={userPin}
      onMatchUpdated={updatedMatch => setSelectedMatch(updatedMatch)}
      senderName={`${playerName} ${playerLastName}`}
      senderEmail={senderEmail}
    />

    {/* Note Modal */}
    {showNoteModal && (
      <div className={styles.modalOverlay} style={{zIndex: 99999}}>
        <div className={styles.modalContent} style={{maxWidth: 400, margin: "auto"}}>
          <h2>Add News/Note</h2>
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={4}
            style={{width: "100%", marginBottom: 12, borderRadius: 6, padding: 8}}
            placeholder="Enter your note..."
          />
          {noteError && <div style={{color: "red", marginBottom: 8}}>{noteError}</div>}
          <div style={{display: "flex", justifyContent: "flex-end", gap: 8}}>
            <button
              className={styles.dashboardBtn}
              onClick={() => setShowNoteModal(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.dashboardBtn}
              disabled={!newNote.trim()}
              onClick={handleAddNote}
              type="button"
            >
              Add Note
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Proposal List Modals */}
    {showProposalListModal && (
      <ProposalListModal
        proposals={pendingProposals}
        onSelect={proposal => {
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
        onClose={() => setShowProposalListModal(false)}
        type="received"
      />
    )}

    {showSentProposalListModal && (
      <ProposalListModal
        proposals={sentProposals}
        onSelect={proposal => {
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
        onClose={() => setShowSentProposalListModal(false)}
        type="sent"
      />
    )}

    {/* Confirm Match Details Modal */}
   {selectedProposal && !showProposalDetailsModal && (
  <div className={styles.modalOverlay}>
    <div className={styles.modalContent} style={{maxWidth: 420, margin: "auto"}}>
      <ConfirmMatchDetails
        proposal={selectedProposal}
        userNote={proposalNote}
        setUserNote={setProposalNote}
        onConfirm={async () => {
          await proposalService.updateProposalStatus(selectedProposal._id, "confirmed", proposalNote);
          setSelectedProposal(null);
          setProposalNote("");
          refetchMatches();
          refetchProposals();
        }}
        onClose={() => {
          setSelectedProposal(null);
          setProposalNote("");
        }}
        onCounterPropose={() => {
          setCounterProposal(selectedProposal);
          setShowCounterModal(true);
          setSelectedProposal(null);
        }}
        phase={effectivePhase}
        currentUserName={`${playerName} ${playerLastName}`}
        currentUserEmail={senderEmail}
      />
    </div>
  </div>
)}


    {/* Counter Proposal Modal */}
    <CounterProposalModal
      proposal={counterProposal}
      open={showCounterModal}
      onClose={() => {
        setShowCounterModal(false);
        setCounterProposal(null);
      }}
      onSubmit={handleCounterProposal}
      senderPlayer={players.find(
        p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === (counterProposal?.senderName || '').trim().toLowerCase() ||
             p.email?.toLowerCase() === counterProposal?.senderEmail?.toLowerCase()
      )}
      phase={effectivePhase}
      selectedDivision={selectedDivision}
    />

    {/* Proposal Details Modal */}
    {(() => {
      return selectedProposal && showProposalDetailsModal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          open={showProposalDetailsModal}
          onClose={() => {
            setShowProposalDetailsModal(false);
            setSelectedProposal(null);
          }}
          onEdit={() => {
            if (selectedProposal.isCounter) {
              setShowProposalDetailsModal(false);
              setTimeout(() => {
                setSelectedProposal(null);
                setCounterProposal(selectedProposal);
                setShowCounterModal(true);
              }, 0);
            } else {
              setShowEditProposalModal(true);
            }
          }}
          onMessage={() => {
            // Optionally open a chat or message modal here
            alert('Message opponent coming soon!');
          }}
        />
      );
    })()}

    {/* Edit Proposal Modal */}
    {selectedProposal && showEditProposalModal && (
      <EditProposalModal
        proposal={selectedProposal}
        open={showEditProposalModal}
        onClose={() => {
          setShowEditProposalModal(false);
        }}
        onSave={(updatedProposal) => {
          // Update the selected proposal with the new data
          setSelectedProposal(updatedProposal);
          // Refresh the proposals list
          refetchProposals();
          // Close the edit modal
          setShowEditProposalModal(false);
        }}
        selectedDivision={selectedDivision}
        phase={effectivePhase}
        receiverPlayer={players.find(
          p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === (selectedProposal.receiverName || '').trim().toLowerCase() ||
               p.email?.toLowerCase() === selectedProposal.receiverEmail?.toLowerCase()
        )}
      />
    )}

    {allMatchesModal}

         {/* Chat Modal */}
     {showChatModal && (
       <div className={styles.modalOverlay} style={{zIndex: 99999}}>
         <div style={{
           position: 'fixed',
           top: '50%',
           left: '50%',
           transform: 'translate(-50%, -50%)',
           width: '95vw',
           height: '95vh',
           maxWidth: '1400px',
           maxHeight: '900px',
           background: '#181818',
           borderRadius: '12px',
           boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
           display: 'flex',
           flexDirection: 'column',
           overflow: 'hidden'
         }}>
           <div style={{
             display: 'flex',
             justifyContent: 'space-between',
             alignItems: 'center',
             padding: '12px 16px',
             borderBottom: '1px solid #333',
             background: '#222',
             borderRadius: '12px 12px 0 0'
           }}>
                           <h2 style={{margin: 0, color: '#ffffff', fontSize: '1.2em'}}>
                {chatType === 'league' ? 'League Chat' : 'Direct Messages'}
              </h2>
             <button
               onClick={() => setShowChatModal(false)}
               style={{
                 background: 'none',
                 border: 'none',
                 color: '#fff',
                 fontSize: '24px',
                 cursor: 'pointer',
                 padding: '4px 8px',
                 borderRadius: '4px',
                 transition: 'background-color 0.2s'
               }}
               onMouseOver={(e) => e.target.style.background = '#444'}
               onMouseOut={(e) => e.target.style.background = 'none'}
               type="button"
             >
               ×
             </button>
           </div>
           <div style={{flex: 1, overflow: 'hidden', position: 'relative'}}>
             {chatType === 'league' ? (
               <MatchChat
                 userName={`${playerName} ${playerLastName}`}
                 userEmail={senderEmail}
                 userPin={userPin}
                 onClose={() => setShowChatModal(false)}
               />
             ) : (
               <DirectMessagingModal
                 userName={`${playerName} ${playerLastName}`}
                 userEmail={senderEmail}
                 userPin={userPin}
                 selectedDivision={selectedDivision}
                 opponentEmails={opponentEmails}
                 onClose={() => setShowChatModal(false)}
               />
             )}
           </div>
         </div>
       </div>
     )}

    {showCompletedModal && (
      <ProposalListModal
        proposals={completedMatches}
        onSelect={() => {}}
        onClose={() => setShowCompletedModal(false)}
        type="completed"
        isAdmin={userPin === "777777"}
        senderEmail={senderEmail}
        senderName={`${playerName} ${playerLastName}`}
        onProposalUpdated={(updatedProposal) => {
          // Immediately update the completed matches with the new winner
          updateCompletedMatch(updatedProposal);
          // Also refresh the proposals to ensure consistency
          refetchProposals();
        }}
      />
    )}

    {/* Winner Select Modal */}
    <WinnerSelectModal
      open={winnerModalOpen}
      onClose={() => setWinnerModalOpen(false)}
      player1={winnerModalPlayers.player1}
      player2={winnerModalPlayers.player2}
      onSelect={async (winner) => {
        if (!winnerModalMatch) return;
        
        // Check if Phase 1 deadline has passed
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
          // First, try to find the corresponding match for this proposal
          const matches = await fetch(`${BACKEND_URL}/api/matches?proposalId=${winnerModalMatch._id}`);
          const matchesData = await matches.json();
          
          if (matchesData.length > 0) {
            // Use the new match completion system
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
            // Fallback to old system if no match found
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
    />

    {/* Match Validation Modal */}
    <MatchValidationModal
      isOpen={validationModalOpen}
      onClose={() => {
        setValidationModalOpen(false);
        setMatchToValidate(null);
      }}
      match={matchToValidate}
      onValidate={async (validationData) => {
        // Handle match validation
        console.log('Validating match:', validationData);
        // TODO: Implement validation logic
        refetchMatches();
      }}
      onReject={async (matchId) => {
        // Handle match rejection
        console.log('Rejecting match:', matchId);
        // TODO: Implement rejection logic
        refetchMatches();
      }}
    />

         {/* Smart Match Modals */}
          <SmartMatchmakingModal
       isOpen={showSmartMatchmakingModal}
       onClose={() => setShowSmartMatchmakingModal(false)}
       player1={currentUser}
       player2={selectedOpponentForSmartMatch}
       upcomingMatches={filteredUpcomingMatches}
       isMobile={isMobile}
       selectedDivision={selectedDivision}
       phase={effectivePhase}
       senderName={`${playerName} ${playerLastName}`}
       senderEmail={senderEmail}
       onProposalComplete={() => {
         refetchMatches();
         refetchProposals();
       }}
     />

     {/* User Profile Modal */}
     {showUserProfileModal && (
       <div
         className="modal-overlay"
         style={{
           position: "fixed",
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           background: "rgba(0,0,0,0.7)",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           zIndex: 1000,
           backdropFilter: "blur(3px)",
           WebkitBackdropFilter: "blur(3px)"
         }}
       >
                   <div
            className="draggable-modal"
            style={{
              transform: `translate(${profileModalDrag.x}px, ${profileModalDrag.y}px)`,
              cursor: profileModalDragging ? "grabbing" : "default",
              background: "linear-gradient(120deg, #232323 80%, #2a0909 100%)",
              color: "#fff",
              border: "2px solid #e53e3e",
              borderRadius: window.innerWidth <= 400 ? "0" : "1rem",
              boxShadow: "0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)",
              width: window.innerWidth <= 400 ? "95vw" : "auto",
              maxWidth: window.innerWidth <= 400 ? "95vw" : "350px",
              minWidth: 0,
              margin: window.innerWidth <= 400 ? "0" : "0 auto",
              left: 0,
              right: 0,
              animation: "modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)",
              padding: 0,
              position: "relative",
              fontFamily: "inherit",
              boxSizing: "border-box",
              textAlign: "center",
              maxHeight: "80vh",
              overflowY: "auto"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Draggable header */}
            <div
              className="modal-header"
              onMouseDown={onProfileModalMouseDown}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#e53e3e",
                padding: "0.8rem 1rem 0.6rem 1rem",
                borderTopLeftRadius: "1rem",
                borderTopRightRadius: "1rem",
                position: "relative",
                cursor: "grab",
                userSelect: "none",
                gap: "0.8rem"
              }}
            >
              <span 
                className="modal-accent-bar"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "4px",
                  background: "linear-gradient(90deg, #fff0 0%, #e53e3e 60%, #fff0 100%)",
                  borderTopLeftRadius: "1rem",
                  borderTopRightRadius: "1rem",
                  pointerEvents: "none"
                }}
              ></span>
              <h2 
                className="modal-title"
                style={{
                  margin: 0,
                  fontSize: window.innerWidth <= 500 ? "0.9rem" : "1rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                  color: "#fff",
                  textShadow: "0 1px 12px #000a",
                  zIndex: 2,
                  flex: 1,
                  wordBreak: "break-word",
                  minWidth: 0
                }}
              >
                👤 Profile Information
              </h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowUserProfileModal(false)} 
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "1.3em",
                  fontWeight: "bold",
                  cursor: "pointer",
                  zIndex: 10,
                  lineHeight: 1,
                  transition: "color 0.2s, transform 0.2s",
                  padding: 0,
                  marginLeft: "0.3rem"
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#ffd6d6";
                  e.target.style.transform = "scale(1.2) rotate(10deg)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#fff";
                  e.target.style.transform = "scale(1) rotate(0deg)";
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal content */}
            <div 
              className="modal-content"
              style={{
                padding: window.innerWidth <= 500 ? "0.5rem 0.7rem 0.3rem 0.7rem" : "0.7rem 0.9rem 0.5rem 0.9rem",
                overflowY: "auto",
                maxHeight: "calc(80vh - 60px)"
              }}
            >

           <div style={{
             display: 'grid',
             gap: isMobile ? '5px' : '6px'
           }}>
             {/* Basic Info */}
             <div style={{
               background: 'rgba(255, 255, 255, 0.05)',
               padding: isMobile ? '5px 7px' : '7px 9px',
               borderRadius: '6px',
               border: '1px solid rgba(255, 255, 255, 0.1)'
             }}>
                                <div style={{
                   fontWeight: 'bold',
                   color: '#ffffff',
                   marginBottom: '3px',
                   fontSize: isMobile ? '0.85rem' : '0.9rem'
                 }}>
                   📝 Basic Information
                 </div>
               <div style={{ color: '#cccccc', lineHeight: '1.3', fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
                 <div style={{ marginBottom: '2px' }}><strong>Name:</strong> {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : `${playerName} ${playerLastName}`}</div>
                 <div style={{ marginBottom: '2px' }}><strong>Email:</strong> {currentUser ? (currentUser.email || 'Not provided') : (senderEmail || 'Not provided')}</div>
                 <div><strong>Phone:</strong> {currentUser ? (currentUser.phone || 'Not provided') : 'Not provided'}</div>
                 {!currentUser && (
                   <div style={{ 
                     marginTop: '8px', 
                     padding: '6px 10px', 
                     background: 'rgba(255, 193, 7, 0.1)', 
                     border: '1px solid rgba(255, 193, 7, 0.3)', 
                     borderRadius: '4px',
                     fontSize: isMobile ? '0.7rem' : '0.75rem',
                     color: '#ffc107'
                   }}>
                     ⚠️ Some profile details may not be fully loaded yet
                   </div>
                 )}
               </div>
             </div>

                            {/* Contact Preferences */}
               {currentUser && currentUser.preferredContacts && currentUser.preferredContacts.length > 0 && (
                 <div style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   padding: isMobile ? '5px 7px' : '7px 9px',
                   borderRadius: '6px',
                   border: '1px solid rgba(255, 255, 255, 0.1)'
                 }}>
                                    <div style={{
                     fontWeight: 'bold',
                     color: '#ffffff',
                     marginBottom: '3px',
                     fontSize: isMobile ? '0.85rem' : '0.9rem'
                   }}>
                     📞 Preferred Contact Methods
                   </div>
                 <div style={{ color: '#cccccc', lineHeight: '1.3', fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
                   {currentUser.preferredContacts.map((method, index) => (
                     <div key={index} style={{ marginBottom: '2px' }}>
                       • {method.charAt(0).toUpperCase() + method.slice(1)}
                     </div>
                   ))}
                 </div>
               </div>
             )}

                            {/* Locations */}
               {currentUser && currentUser.locations && (
                 <div style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   padding: isMobile ? '5px 7px' : '7px 9px',
                   borderRadius: '6px',
                   border: '1px solid rgba(255, 255, 255, 0.1)'
                 }}>
                                    <div style={{
                     fontWeight: 'bold',
                     color: '#ffffff',
                     marginBottom: '3px',
                     fontSize: isMobile ? '0.85rem' : '0.9rem'
                   }}>
                     📍 Preferred Locations
                   </div>
                 <div style={{ color: '#cccccc', lineHeight: '1.3', fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
                   {currentUser.locations ? (
                     <div style={{
                       display: 'flex',
                       flexWrap: 'wrap',
                       gap: '6px',
                       alignItems: 'center'
                     }}>
                       {currentUser.locations.split(/\r?\n/).filter(Boolean).map((location, index) => (
                         <div key={index} style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '4px'
                         }}>
                           <span style={{
                             background: 'rgba(255, 255, 255, 0.1)',
                             color: '#ffffff',
                             padding: '3px 8px',
                             borderRadius: '12px',
                             fontSize: isMobile ? '0.7rem' : '0.75rem',
                             fontWeight: '500',
                             border: '1px solid rgba(255, 255, 255, 0.2)',
                             boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                           }}>
                             {location.trim()}
                           </span>
                           {index < currentUser.locations.split(/\r?\n/).filter(Boolean).length - 1 && (
                             <span style={{
                               color: '#666',
                               fontSize: isMobile ? '0.6rem' : '0.65rem'
                             }}>
                               •
                             </span>
                           )}
                         </div>
                       ))}
                     </div>
                   ) : (
                     'Not specified'
                   )}
                 </div>
               </div>
             )}

                            {/* Availability */}
               {currentUser && currentUser.availability && (
                 <div style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   padding: isMobile ? '5px 7px' : '7px 9px',
                   borderRadius: '6px',
                   border: '1px solid rgba(255, 255, 255, 0.1)'
                 }}>
                                    <div style={{
                     fontWeight: 'bold',
                     color: '#ffffff',
                     marginBottom: '3px',
                     fontSize: isMobile ? '0.85rem' : '0.9rem'
                   }}>
                     📅 Availability
                   </div>
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                   gap: isMobile ? '5px' : '6px',
                   fontSize: isMobile ? '0.75rem' : '0.8rem'
                 }}>
                   {Object.entries(currentUser.availability).map(([day, slots]) => (
                     <div key={day} style={{
                       background: 'rgba(255, 255, 255, 0.08)',
                       padding: isMobile ? '5px 7px' : '7px 9px',
                       borderRadius: '4px',
                       border: '1px solid rgba(255, 255, 255, 0.15)',
                       textAlign: 'center'
                     }}>
                       <div style={{
                         fontWeight: 'bold',
                         color: '#ffffff',
                         marginBottom: '2px',
                         fontSize: isMobile ? '0.75rem' : '0.8rem'
                       }}>
                         {day}
                       </div>
                       {slots && slots.length > 0 ? (
                         <div style={{ color: '#cccccc', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                           {slots.map((slot, index) => (
                             <div key={index} style={{ marginBottom: '1px' }}>
                               {slot}
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div style={{ color: '#888', fontStyle: 'italic', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                           No times
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}

                            {/* Divisions */}
               <div style={{
                 background: 'rgba(255, 255, 255, 0.05)',
                 padding: isMobile ? '5px 7px' : '7px 9px',
                 borderRadius: '6px',
                 border: '1px solid rgba(255, 255, 255, 0.1)'
               }}>
                                <div style={{
                   fontWeight: 'bold',
                   color: '#ffffff',
                   marginBottom: '3px',
                   fontSize: isMobile ? '0.85rem' : '0.9rem'
                 }}>
                   🏆 Divisions
                 </div>
               <div style={{ color: '#cccccc', lineHeight: '1.3', fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
                 {divisions.length > 0 ? divisions.join(', ') : 'No divisions assigned'}
               </div>
             </div>

                                                        {/* Edit Profile and Close Buttons */}
               <div style={{
                 marginTop: isMobile ? '5px' : '6px',
                 textAlign: 'center',
                 display: 'flex',
                 gap: '8px',
                 justifyContent: 'center'
               }}>
               <button
                 style={{
                   background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                   color: '#fff',
                   border: 'none',
                   borderRadius: '6px',
                   padding: isMobile ? '7px 14px' : '9px 18px',
                   fontSize: isMobile ? '0.85rem' : '0.95rem',
                   fontWeight: '600',
                   cursor: 'pointer',
                   transition: 'all 0.2s ease',
                   boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                 }}
                 onMouseEnter={(e) => {
                   e.target.style.background = 'linear-gradient(135deg, #45a049, #3d8b40)';
                   e.target.style.transform = 'translateY(-1px)';
                   e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                   e.target.style.transform = 'translateY(0)';
                   e.target.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)';
                 }}
                 onClick={() => {
                   // TODO: Implement edit profile functionality
                   alert('Edit profile functionality coming soon!');
                 }}
               >
                 ✏️ Edit Profile
               </button>
               
               <button
                 style={{
                   background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                   color: '#fff',
                   border: 'none',
                   borderRadius: '6px',
                   padding: isMobile ? '7px 14px' : '9px 18px',
                   fontSize: isMobile ? '0.85rem' : '0.95rem',
                   fontWeight: '600',
                   cursor: 'pointer',
                   transition: 'all 0.2s ease',
                   boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)'
                 }}
                 onMouseEnter={(e) => {
                   e.target.style.background = 'linear-gradient(135deg, #5a6268, #495057)';
                   e.target.style.transform = 'translateY(-1px)';
                   e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.4)';
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.background = 'linear-gradient(135deg, #6c757d, #5a6268)';
                   e.target.style.transform = 'translateY(0)';
                   e.target.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.3)';
                 }}
                 onClick={() => setShowUserProfileModal(false)}
               >
                 ❌ Close
               </button>
             </div>
             </div>
           </div>
         </div>
       </div>
     )}

     {/* Phase1 Rules Modal */}
     <Phase1RulesModal
       isOpen={showPhase1Rules}
       onClose={() => setShowPhase1Rules(false)}
       isMobile={isMobile}
     />

     {/* Phase1 Overview Modal */}
     <Phase1OverviewModal
       isOpen={showPhase1Overview}
       onClose={() => setShowPhase1Overview(false)}
       isMobile={isMobile}
       playerName={playerName}
       playerLastName={playerLastName}
       completedMatches={completedMatches}
       totalRequiredMatches={totalRequiredMatches}
       playerStats={playerStats}
       standings={standings}
       timeLeft={timeLeft}
       deadlineStatus={deadlineStatus}
       phase1EndDate={phase1EndDate}
       allPlayers={allPlayers}
       selectedDivision={selectedDivision}
     />

     {/* Player Registration Modal */}
     <PlayerRegistrationModal
       isOpen={showRegistrationModal}
       onClose={() => setShowRegistrationModal(false)}
       onSuccess={(userData) => {
         console.log('New player registered by admin:', userData);
         setShowRegistrationModal(false);
         // Refresh the page to show the new player
         window.location.reload();
       }}
       isMobile={isMobile}
       isAdmin={true}
     />

     {/* Pending Registrations Modal */}
     {showPendingRegistrationsModal && (
       <Modal
         open={showPendingRegistrationsModal}
         onClose={() => setShowPendingRegistrationsModal(false)}
         title="Pending Registrations"
         maxWidth="800px"
       >
         <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
           {pendingRegistrations.length === 0 ? (
             <div style={{ textAlign: 'center', color: '#ccc', padding: '40px' }}>
               <h3>No Pending Registrations</h3>
               <p>All registrations have been processed.</p>
             </div>
           ) : (
             <div style={{ display: 'grid', gap: '15px' }}>
               {pendingRegistrations
                 .sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate))
                 .map((registration, index) => (
                 <div
                   key={registration._id}
                   style={{
                     background: 'rgba(255,255,255,0.05)',
                     border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: '8px',
                     padding: '15px'
                   }}
                 >
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                     <div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                         <span style={{ 
                           background: '#e53e3e', 
                           color: 'white', 
                           padding: '4px 8px', 
                           borderRadius: '12px', 
                           fontSize: '12px', 
                           fontWeight: 'bold',
                           minWidth: '20px',
                           textAlign: 'center'
                         }}>
                           #{index + 1}
                         </span>
                         <h4 style={{ color: '#e53e3e', margin: '0' }}>
                           {registration.firstName} {registration.lastName}
                         </h4>
                       </div>
                       <p style={{ color: '#ccc', margin: '0 0 5px 0' }}>
                         {registration.email} • {registration.phone}
                       </p>
                       <p style={{ color: '#999', margin: '0 0 5px 0', fontSize: '12px' }}>
                         Registered: {new Date(registration.registrationDate).toLocaleDateString()}
                       </p>
                       <p style={{ color: '#999', margin: '0', fontSize: '12px' }}>
                         Division: {registration.division || 'Not assigned'}
                       </p>
                     </div>
                     <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                       {/* Division Assignment */}
                       <div style={{ marginBottom: '10px', textAlign: 'right' }}>
                         <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '2px' }}>
                           Assign Division:
                         </label>
                         <select
                           id={`division-${registration._id}`}
                           defaultValue={registration.division || ''}
                           style={{
                             padding: '4px 8px',
                             borderRadius: '4px',
                             border: '1px solid #444',
                             background: '#222',
                             color: '#fff',
                             fontSize: '12px',
                             minWidth: '120px'
                           }}
                         >
                           <option value="">Select Division</option>
                           <option value="FRBCAPL TEST">FRBCAPL TEST</option>
                           <option value="Singles Test">Singles Test</option>
                           <option value="Waiting List">Waiting List</option>
                         </select>
                       </div>
                       
                       <div style={{ display: 'flex', gap: '8px' }}>
                         <button
                           onClick={async () => {
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
                                 // Remove from list
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
                           style={{
                             background: '#4CAF50',
                             color: 'white',
                             border: 'none',
                             padding: '8px 12px',
                             borderRadius: '4px',
                             cursor: 'pointer',
                             fontSize: '12px'
                           }}
                         >
                           Approve
                         </button>
                         <button
                           onClick={async () => {
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
                                   // Remove from list
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
                           style={{
                             background: '#f44336',
                             color: 'white',
                             border: 'none',
                             padding: '8px 12px',
                             borderRadius: '4px',
                             cursor: 'pointer',
                             fontSize: '12px'
                           }}
                         >
                           Reject
                         </button>
                       </div>
                     </div>
                   
                   {/* Availability Summary */}
                   <div style={{ marginTop: '10px' }}>
                     <h5 style={{ color: '#e53e3e', margin: '0 0 5px 0', fontSize: '14px' }}>Availability:</h5>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '5px', fontSize: '12px' }}>
                       {Object.entries(registration.availability).map(([day, slots]) => (
                         <div key={day} style={{ color: '#ccc' }}>
                           <strong>{day}:</strong> {slots.length > 0 ? slots.join(', ') : 'None'}
                         </div>
                       ))}
                     </div>
                     </div>
                   </div>
                   
                   {/* Locations */}
                   <div style={{ marginTop: '10px' }}>
                     <h5 style={{ color: '#e53e3e', margin: '0 0 5px 0', fontSize: '14px' }}>Locations:</h5>
                     <p style={{ color: '#ccc', margin: '0', fontSize: '12px' }}>{registration.locations}</p>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
       </Modal>
     )}
   </div>
 );
}
