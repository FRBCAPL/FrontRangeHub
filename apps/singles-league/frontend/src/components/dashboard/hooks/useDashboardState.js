import { useState } from 'react';

// Custom hook to manage all Dashboard state
// Extracted from Dashboard.jsx to maintain exact same functionality
export function useDashboardState() {
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

  // Additional state variables found in Dashboard.jsx
  const [chatType, setChatType] = useState('direct'); // 'direct' or 'league'
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerModalMatch, setWinnerModalMatch] = useState(null);
  const [winnerModalPlayers, setWinnerModalPlayers] = useState({ player1: '', player2: '' });
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [matchToValidate, setMatchToValidate] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showPendingRegistrationsModal, setShowPendingRegistrationsModal] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loadingPendingRegistrations, setLoadingPendingRegistrations] = useState(false);
  const [showPhase1Rules, setShowPhase1Rules] = useState(false);
  const [showPhase1Overview, setShowPhase1Overview] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [playerStats, setPlayerStats] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [deadlineStatus, setDeadlineStatus] = useState('normal');
  const [phase1EndDate, setPhase1EndDate] = useState(null);

  // Return all state and setters in a single object
  return {
    // User data state
    divisions, setDivisions,
    selectedDivision, setSelectedDivision,
    
    // Modal visibility state
    showStandings, setShowStandings,
    showDefenseChallengers, setShowDefenseChallengers,
    showProposalListModal, setShowProposalListModal,
    showSentProposalListModal, setShowSentProposalListModal,
    showCounterModal, setShowCounterModal,
    showNoteModal, setShowNoteModal,
    showAllMatches, setShowAllMatches,
    showAllMatchesModal, setShowAllMatchesModal,
    showOpponents, setShowOpponents,
    showPlayerSearch, setShowPlayerSearch,
    showAdminPlayerSearch, setShowAdminPlayerSearch,
    showPlayerAvailability, setShowPlayerAvailability,
    showProposalModal, setShowProposalModal,
    showProposalDetailsModal, setShowProposalDetailsModal,
    showEditProposalModal, setShowEditProposalModal,
    showChatModal, setShowChatModal,
    
    // Data state
    selectedProposal, setSelectedProposal,
    proposalNote, setProposalNote,
    counterProposal, setCounterProposal,
    newNote, setNewNote,
    noteError, setNoteError,
    selectedMatch, setSelectedMatch,
    modalOpen, setModalOpen,
    selectedCalendarDate, setSelectedCalendarDate,
    selectedOpponent, setSelectedOpponent,
    proposalData, setProposalData,
    players, setPlayers,
    
    // Phase state
    currentPhase, setCurrentPhase,
    phaseOverride, setPhaseOverride,
    
    // Count state
    numToSchedule, setNumToSchedule,
    totalCompleted, setTotalCompleted,
    currentPhaseTotal, setCurrentPhaseTotal,
    pendingCount, setPendingCount,
    sentCount, setSentCount,
    
    // Filter and search state
    matchesSearchTerm, setMatchesSearchTerm,
    matchesStatusFilter, setMatchesStatusFilter,
    matchesSortBy, setMatchesSortBy,
    
    // Loading state
    completingMatchId, setCompletingMatchId,
    isCreatingProposal, setIsCreatingProposal,
    
    // Additional state variables
    chatType, setChatType,
    unreadMessages, setUnreadMessages,
    winnerModalOpen, setWinnerModalOpen,
    winnerModalMatch, setWinnerModalMatch,
    winnerModalPlayers, setWinnerModalPlayers,
    validationModalOpen, setValidationModalOpen,
    matchToValidate, setMatchToValidate,
    showUserProfileModal, setShowUserProfileModal,
    showRegistrationModal, setShowRegistrationModal,
    showPendingRegistrationsModal, setShowPendingRegistrationsModal,
    pendingRegistrations, setPendingRegistrations,
    loadingPendingRegistrations, setLoadingPendingRegistrations,
    showPhase1Rules, setShowPhase1Rules,
    showPhase1Overview, setShowPhase1Overview,
    showCalendarModal, setShowCalendarModal,
    playerStats, setPlayerStats,
    timeLeft, setTimeLeft,
    deadlineStatus, setDeadlineStatus,
    phase1EndDate, setPhase1EndDate,
  };
}
