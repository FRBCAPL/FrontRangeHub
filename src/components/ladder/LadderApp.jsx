/*
 * Front Range Pool Hub - Ladder Management System
 * Copyright (c) 2025 FRBCAPL
 * All rights reserved.
 * 
 * This software and its source code are proprietary and confidential.
 * Unauthorized copying, distribution, modification, or use is strictly prohibited.
 * 
 * This code contains trade secrets and proprietary information including:
 * - Advanced 4-type challenge system algorithms
 * - Tournament management business logic
 * - Payment processing workflows
 * - Prize pool management system
 * - User interface innovations
 * - Database design patterns
 * 
 * For licensing inquiries, contact: info@frontrangepoolhub.com
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { checkPaymentStatus, showPaymentRequiredModal } from '../../utils/paymentStatus.js';
import { supabaseDataService } from '../../services/supabaseDataService.js';
import { supabase } from '../../config/supabase.js';
import { 
  sanitizeInput, 
  sanitizeEmail, 
  sanitizeChallengeData,
  sanitizePlayerData,
  sanitizeNumber
} from '../../utils/security.js';
import LadderApplicationsManager from '../admin/LadderApplicationsManager';
import DraggableModal from '../modal/DraggableModal';
import LadderOfLegendsRulesModal from '../modal/LadderOfLegendsRulesModal';
import ContactAdminModal from './ContactAdminModal';
import LadderNewsTicker from './LadderNewsTicker';
import AdminMessagesModal from './AdminMessagesModal';
import LadderFloatingLogos from './LadderFloatingLogos';
import LadderHeader from './LadderHeader';
import LadderMatchCalendar from './LadderMatchCalendar';
import LadderTable from './LadderTable';
import NavigationMenu from './NavigationMenu';
import PlayerStatsModal from './PlayerStatsModal';
import FullMatchHistoryModal from './FullMatchHistoryModal';
import UserStatusCard from './UserStatusCard';
import LadderErrorBoundary from './LadderErrorBoundary';
import SupabaseSignupModal from '../auth/SupabaseSignupModal';

import LadderChallengeModal from './LadderChallengeModal';
import LadderChallengeConfirmModal from './LadderChallengeConfirmModal';
import LadderSmartMatchModal from './LadderSmartMatchModal';
import LadderPrizePoolTracker from './LadderPrizePoolTracker';
import LadderPrizePoolModal from './LadderPrizePoolModal';
import LadderMatchReportingModal from './LadderMatchReportingModal';
import ForfeitReportModal from './ForfeitReportModal';
import RescheduleRequestModal from './RescheduleRequestModal';
import RescheduleResponseModal from './RescheduleResponseModal';
import PaymentDashboard from './PaymentDashboard';
import NotificationPermissionModal from '../notifications/NotificationPermissionModal';
import notificationService from '../../services/notificationService';
import PromotionalPricingBanner from './PromotionalPricingBanner';
import './LadderApp.css';

const LadderApp = ({ 
  playerName, 
  playerLastName, 
  senderEmail, 
  userType,
  isAdmin = false,
  showClaimForm = false,
  initialView = 'main',
  isPublicView = false,
  onClaimLadderPosition,
  claimedPositions = new Set(),
  isPositionClaimed = () => false,
  setShowProfileModal
}) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState(initialView);
  const [userLadderData, setUserLadderData] = useState(null);
  const [ladderData, setLadderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerStatus, setPlayerStatus] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [showApplicationsManager, setShowApplicationsManager] = useState(false);
  const [selectedLadder, setSelectedLadder] = useState('499-under');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [hasManuallySelectedLadder, setHasManuallySelectedLadder] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(Date.now());

  const [availableLocations, setAvailableLocations] = useState([]);
  const [showUnifiedSignup, setShowUnifiedSignup] = useState(false);
  
  // Debug logging for showUnifiedSignup state changes
  useEffect(() => {
    console.log('🔍 LadderApp: showUnifiedSignup state changed to:', showUnifiedSignup);
  }, [showUnifiedSignup]);

  // Check SmackBack eligibility when user data changes
  useEffect(() => {
    const checkSmackBackEligibility = async () => {
      if (userLadderData?.email) {
        const isEligible = await hasRecentSmackDownWin(userLadderData);
        setSmackBackEligible(isEligible);
        console.log('🔍 SmackBack eligibility for', userLadderData.firstName, userLadderData.lastName, ':', isEligible);
      } else {
        setSmackBackEligible(false);
      }
    };

    checkSmackBackEligibility();
  }, [userLadderData]);
  const [showProfileCompletionPrompt, setShowProfileCompletionPrompt] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  
  // Challenge system state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showChallengeConfirmModal, setShowChallengeConfirmModal] = useState(false);
  const [showSmartMatchModal, setShowSmartMatchModal] = useState(false);
  const [selectedDefender, setSelectedDefender] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeType, setChallengeType] = useState('challenge');
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [sentChallenges, setSentChallenges] = useState([]);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [showPrizePoolModal, setShowPrizePoolModal] = useState(false);
  const [showMatchReportingModal, setShowMatchReportingModal] = useState(false);
  const [showPaymentDashboard, setShowPaymentDashboard] = useState(false);
  const [smackBackEligible, setSmackBackEligible] = useState(false);
  const [showMatchCalendar, setShowMatchCalendar] = useState(false);
  const [setShowPaymentInfo, setSetShowPaymentInfo] = useState(null);
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  const [showAdminMessagesModal, setShowAdminMessagesModal] = useState(false);
  const [showForfeitReportModal, setShowForfeitReportModal] = useState(false);
  const [showRescheduleRequestModal, setShowRescheduleRequestModal] = useState(false);
  const [showRescheduleResponseModal, setShowRescheduleResponseModal] = useState(false);
  const [selectedMatchForAction, setSelectedMatchForAction] = useState(null);
  const [selectedRescheduleRequest, setSelectedRescheduleRequest] = useState(null);
  
  // Create a wrapper function that sets both the internal state and calls the original function
  const handleShowPaymentInfo = (show) => {
    setShowPaymentInfoModal(show);
    if (setShowPaymentInfo) {
      setShowPaymentInfo(show);
    }
  };
  
  // Mobile player stats state
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState(null);
  const [showMobilePlayerStats, setShowMobilePlayerStats] = useState(false);
  const [lastMatchData, setLastMatchData] = useState(null);
  const [playerMatchHistory, setPlayerMatchHistory] = useState([]);
  const [showFullMatchHistory, setShowFullMatchHistory] = useState(false);
  const [updatedPlayerData, setUpdatedPlayerData] = useState(null);
  
  // My Matches state
  const [playerMatches, setPlayerMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  
  // Notification state
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);
  const [notificationPermissionRequested, setNotificationPermissionRequested] = useState(false);
  
  // Debounced loadData function - moved to top to avoid hoisting issues
  const loadDataTimeoutRef = useRef(null);
  
  // Derive display user data from ladderData to ensure W/L matches ladder table
  const displayUserData = React.useMemo(() => {
    if (!userLadderData || !ladderData || !Array.isArray(ladderData)) return userLadderData;
    // match by email or unified account email
    const match = ladderData.find(p => 
      p?.email && userLadderData?.email && p.email.toLowerCase() === userLadderData.email.toLowerCase() ||
      (p?.unifiedAccount?.email && userLadderData?.email && p.unifiedAccount.email.toLowerCase() === userLadderData.email.toLowerCase())
    );
    if (!match) return userLadderData;
    return {
      ...userLadderData,
      wins: typeof match.wins === 'number' ? match.wins : userLadderData.wins,
      losses: typeof match.losses === 'number' ? match.losses : userLadderData.losses,
      totalMatches: typeof match.totalMatches === 'number' ? match.totalMatches : userLadderData.totalMatches
    };
  }, [userLadderData, ladderData]);
  
  // Function to update user's wins/losses from ladder data
  const updateUserWinsLosses = useCallback((ladderData, userEmail) => {
    if (!ladderData || !Array.isArray(ladderData) || !userEmail) return;
    
    const currentUserInLadder = ladderData.find(player => 
      player.email === userEmail || 
      player.unifiedAccount?.email === userEmail
    );
    
    if (currentUserInLadder && userLadderData?.playerId === 'ladder') {
      console.log('🔍 Found current user in ladder data, updating wins/losses:', currentUserInLadder.wins, currentUserInLadder.losses);
      setUserLadderData(prev => ({
        ...prev,
        wins: currentUserInLadder.wins || 0,
        losses: currentUserInLadder.losses || 0,
        totalMatches: currentUserInLadder.totalMatches || 0
      }));
    }
  }, [userLadderData?.playerId]);
  
  const loadData = useCallback(async () => {
    // Clear existing timeout
    if (loadDataTimeoutRef.current) {
      clearTimeout(loadDataTimeoutRef.current);
    }
    
    // Set new timeout for debouncing
    loadDataTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        
        // Load ladder rankings for selected ladder from Supabase
        const result = await supabaseDataService.getLadderPlayersByName(selectedLadder);
        
        console.log('Ladder Supabase response:', result);
        
        if (result.success && Array.isArray(result.data)) {
          // Transform Supabase data to match expected format and fetch last match data
          const transformedDataPromises = result.data.map(async (profile) => {
            // Get last match data and match history for this player
            let lastMatchData = null;
            let recentMatchesData = [];
            if (profile.users?.email) {
              try {
                const lastMatchResult = await supabaseDataService.getPlayerLastMatch(profile.users.email);
                if (lastMatchResult.success && lastMatchResult.data) {
                  lastMatchData = lastMatchResult.data;
                }
                
                const matchHistoryResult = await supabaseDataService.getPlayerMatchHistory(profile.users.email, 5);
                if (matchHistoryResult.success && matchHistoryResult.data) {
                  recentMatchesData = matchHistoryResult.data;
                }
              } catch (error) {
                console.log(`Error fetching match data for ${profile.users.email}:`, error);
              }
            }

            return {
              _id: profile.id,
              email: profile.users?.email || '',
              firstName: profile.users?.first_name || '',
              lastName: profile.users?.last_name || '',
              position: profile.position,
              fargoRate: profile.fargo_rate || 0,
              totalMatches: profile.total_matches || 0,
              wins: profile.wins || 0,
              losses: profile.losses || 0,
              isActive: profile.is_active,
              immunityUntil: profile.immunity_until,
              vacationMode: profile.vacation_mode,
              vacationUntil: profile.vacation_until,
              lastMatch: lastMatchData,
              recentMatches: recentMatchesData
            };
          });
          
          const transformedData = await Promise.all(transformedDataPromises);
          setLadderData(transformedData);
          console.log(`Loaded ${transformedData.length} players from ${selectedLadder} ladder (Supabase) with last match data`);
          
          // Update user's wins/losses from the fresh ladder data
          updateUserWinsLosses(transformedData, senderEmail);
        } else {
          console.error('Error loading ladder data from Supabase:', result.error);
          setLadderData([]); // Set empty array as fallback
        }
      
      // Check if we have unified user data with ladder profile
      const unifiedUserData = localStorage.getItem("unifiedUserData");
      if (unifiedUserData) {
        try {
          const userData = JSON.parse(unifiedUserData);
          console.log('🔍 Found unified user data:', userData);
          
          if (userData.ladderProfile) {
            // User has ladder profile - use it directly
            const ladderProfile = userData.ladderProfile;
            setUserLadderData({
              playerId: 'ladder',
              name: `${userData.firstName} ${userData.lastName}`,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              fargoRate: ladderProfile.fargoRate,
              ladder: ladderProfile.ladderName,
              position: ladderProfile.position,
              wins: ladderProfile.wins || 0,
              losses: ladderProfile.losses || 0,
              immunityUntil: ladderProfile.immunityUntil,
              activeChallenges: ladderProfile.activeChallenges || [],
              canChallenge: ladderProfile.canChallenge || true,
              isActive: true, // Add isActive property
              sanctioned: ladderProfile.sanctioned, // Add BCA sanctioning status
              sanctionYear: ladderProfile.sanctionYear // Add BCA sanctioning year
            });
          } else {
            // User doesn't have ladder profile - check if they can claim account
            await checkPlayerStatus(userData.email);
          }
        } catch (error) {
          console.error('Error parsing unified user data:', error);
          await checkPlayerStatus(email);
        }
      } else {
        // No unified user data - check player status
        await checkPlayerStatus(email, '', '');
      }
      
      } catch (error) {
        console.error('Error loading ladder data:', error);
        setLadderData([]); // Clear ladder data on error
        // Force a re-render by updating a timestamp
        setLastLoadTime(Date.now());
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce by 300ms

    // Cleanup realtime subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLadder, senderEmail, updateUserWinsLosses]);

  useEffect(() => {
    // Load user's ladder data and ladder rankings
    loadData();
    loadLocations();
    loadChallenges();
    loadProfileData();
    
    // Cleanup timeout on unmount
    return () => {
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
      }
    };
  }, [selectedLadder, loadData]);

  const loadPlayerMatches = useCallback(async () => {
    console.log('🔍 loadPlayerMatches called for:', userLadderData?.email);
    if (!userLadderData?.email) {
      console.log('🔍 No email, skipping loadPlayerMatches');
      setMatchesLoading(false);
      return;
    }

    try {
      setMatchesLoading(true);
      console.log('🔍 Fetching matches from ALL ladders...');
      
      // Fetch matches from all ladders to get complete match history
      const ladderNames = isAdmin ? ['499-under', '500-549', '550-plus', 'simulation'] : ['499-under', '500-549', '550-plus'];
      const allLadderMatches = [];
      
      for (const ladderName of ladderNames) {
        try {
          console.log(`🔍 Fetching matches from ${ladderName} ladder...`);
          const response = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${ladderName}/matches`, {
        headers: createSecureHeaders(userPin)
      });
      
      if (response.ok) {
        const data = await response.json();
            const ladderMatches = data.matches || [];
            // Add ladder name to each match for tracking
            const matchesWithLadder = ladderMatches.map(match => ({
              ...match,
              ladderName: ladderName,
              ladderDisplayName: ladderName === '499-under' ? '499 & Under' : 
                                ladderName === '500-549' ? '500-549' : '550+'
            }));
            
            allLadderMatches.push(...matchesWithLadder);
          } else {
            console.log(`🔍 Failed to fetch matches from ${ladderName}:`, response.status);
          }
        } catch (error) {
          console.error(`🔍 Error fetching matches from ${ladderName}:`, error);
        }
      }
      
      console.log('🔍 Total matches from all ladders:', allLadderMatches.length);
        
        // Filter matches for the current player from all ladders
        const playerEmail = userLadderData.email.toLowerCase();
        console.log('🔍 Looking for player email:', playerEmail);
        
        const playerMatches = allLadderMatches.filter(match => {
          // Check if the match has player1 and player2 with email fields
          if (match.player1?.email && match.player2?.email) {
            const player1Email = match.player1.email.toLowerCase();
            const player2Email = match.player2.email.toLowerCase();
            
            console.log('🔍 Checking match with player1/player2 emails:', {
              player1Email,
              player2Email,
              playerEmail,
              match: match
            });
            
            return player1Email === playerEmail || player2Email === playerEmail;
          }
          
          // Check if the match has player1 and player2 with name fields (current structure)
          if (match.player1?.firstName && match.player2?.firstName) {
            const player1Name = `${match.player1.firstName} ${match.player1.lastName}`.toLowerCase();
            const player2Name = `${match.player2.firstName} ${match.player2.lastName}`.toLowerCase();
            const targetPlayerName = `${userLadderData.firstName} ${userLadderData.lastName}`.toLowerCase();
            
            console.log('🔍 Checking match with player1/player2 names:', {
              player1Name,
              player2Name,
              targetPlayerName,
              match: match
            });
            
            return player1Name === targetPlayerName || player2Name === targetPlayerName;
          }
          
          // Check if the match has a direct playerEmail field (flattened data)
          if (match.playerEmail) {
            const matchPlayerEmail = match.playerEmail.toLowerCase();
            
            console.log('🔍 Checking match with playerEmail field:', {
              matchPlayerEmail,
              playerEmail,
              match: match
            });
            
            return matchPlayerEmail === playerEmail;
          }
          
          // Check if the match has challenger/defender with email fields
          if (match.challenger?.email && match.defender?.email) {
            const challengerEmail = match.challenger.email.toLowerCase();
            const defenderEmail = match.defender.email.toLowerCase();
            
            console.log('🔍 Checking match with challenger/defender emails:', {
              challengerEmail,
              defenderEmail,
              playerEmail,
              match: match
            });
            
            return challengerEmail === playerEmail || defenderEmail === playerEmail;
          }
          
          console.log('🔍 Match structure not recognized:', match);
          console.log('🔍 player1 structure:', match.player1);
          console.log('🔍 player2 structure:', match.player2);
          return false;
        });
        
        console.log('🔍 Filtered player matches:', playerMatches);
        setPlayerMatches(playerMatches);
    } catch (error) {
      console.error('Error loading player matches:', error);
      setPlayerMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, [userLadderData?.email]);

  // Load matches when matches view is accessed
  useEffect(() => {
    if (currentView === 'matches') {
      loadPlayerMatches();
    }
  }, [currentView, userLadderData?.email, loadPlayerMatches]);

  // Load challenges when challenges view is accessed
  useEffect(() => {
    if (currentView === 'challenges') {
      loadChallenges();
    }
  }, [currentView, userLadderData?.email, selectedLadder]);

  // Auto-update selectedLadder when userLadderData changes (only initially)
  useEffect(() => {
    if (userLadderData && userLadderData.ladder && userLadderData.ladder !== 'Guest' && userLadderData.ladder !== 'League Player - Claim Account' && userLadderData.ladder !== 'Not Recognized') {
      // Only set the ladder if it hasn't been manually changed yet
      if (selectedLadder === '499-under' && !hasManuallySelectedLadder) {
        console.log('🔄 Setting selectedLadder to user ladder:', userLadderData.ladder);
        setSelectedLadder(userLadderData.ladder);
      }
    }
  }, [userLadderData]); // Remove selectedLadder from dependencies to prevent infinite loop

  // Load profile data from SimpleProfile
  const loadProfileData = async () => {
    if (!senderEmail) return;
    
    console.log('Loading profile data for email:', senderEmail);
    
    try {
      // Get user data from Supabase
      const userData = await supabaseDataService.getUserByEmail(senderEmail);
      console.log('Loaded user data from Supabase:', userData);
      
      if (userData) {
        const newPlayerInfo = {
          firstName: playerName,
          lastName: playerLastName,
          email: senderEmail,
          phone: userData.phone || '',
          preferredContacts: [],
          locations: userData.locations || '',
          availability: userData.availability || {}
        };
        console.log('Setting new playerInfo:', newPlayerInfo);
        console.log('playerInfo.locations:', newPlayerInfo.locations);
        setPlayerInfo(newPlayerInfo);
      } else {
        console.log('No user data found in Supabase, setting default playerInfo');
        setPlayerInfo({
          firstName: playerName,
          lastName: playerLastName,
          email: senderEmail,
          phone: '',
          preferredContacts: [],
          locations: '',
          availability: {}
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  // Auto-show unified signup if prop is true
  useEffect(() => {
    if (showClaimForm) {
      setShowUnifiedSignup(true);
    }
  }, [showClaimForm]);

  // Check if user needs to complete their profile after approval
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!senderEmail || !userLadderData?.canChallenge) return;
      
      try {
        // Get user data from Supabase
        const userData = await supabaseDataService.getUserByEmail(senderEmail);
        
        if (userData) {
          // Check if profile is incomplete
          const hasPhone = userData.phone && userData.phone.trim() !== '';
          const hasLocations = userData.locations && userData.locations.trim() !== '';
          const hasAvailability = userData.availability && Object.keys(userData.availability).length > 0;
          
          // Set profile completion status
          const profileComplete = hasPhone && hasLocations && hasAvailability;
          setIsProfileComplete(profileComplete);
          
          console.log('Profile completion status:', {
            hasPhone,
            hasLocations, 
            hasAvailability,
            profileComplete
          });
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
      }
    };

    checkProfileCompletion();
  }, [senderEmail, userLadderData?.canChallenge]);

  // Check notification permission on app load
  useEffect(() => {
    const checkNotificationPermission = () => {
      if (!notificationPermissionRequested && userLadderData?.canChallenge) {
        const status = notificationService.getStatus();
        
        // Show permission modal if notifications are supported but not yet requested
        if (status.isSupported && status.permission === 'default') {
          setShowNotificationPermission(true);
        }
        
        setNotificationPermissionRequested(true);
      }
    };

    checkNotificationPermission();
  }, [userLadderData?.canChallenge, notificationPermissionRequested]);

  useEffect(() => {
    // Clear existing timeout
    if (loadDataTimeoutRef.current) {
      clearTimeout(loadDataTimeoutRef.current);
    }
    
    // Set up realtime subscription for live updates
    const channel = supabase
      .channel('ladder-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ladder_profiles'
      }, async (payload) => {
        console.log('🔄 Realtime update received:', payload);
        
        // Only update if the change is for the current ladder
        if (payload.new && payload.new.ladder_name !== selectedLadder) {
          console.log(`🔄 Ignoring update for different ladder: ${payload.new.ladder_name} (current: ${selectedLadder})`);
          return;
        }
        
        // Reload ladder data when changes occur
        try {
          const result = await supabaseDataService.getLadderPlayersByName(selectedLadder);
          
          console.log('🔄 Realtime: Fetching data for ladder:', selectedLadder);
          console.log('🔄 Realtime: Result:', result);
          
          if (result.success && Array.isArray(result.data)) {
            // Transform Supabase data to match expected format and fetch last match data
            const transformedDataPromises = result.data.map(async (profile) => {
              // Get last match data and match history for this player
              let lastMatchData = null;
              let recentMatchesData = [];
              if (profile.users?.email) {
                try {
                  const lastMatchResult = await supabaseDataService.getPlayerLastMatch(profile.users.email);
                  if (lastMatchResult.success && lastMatchResult.data) {
                    lastMatchData = lastMatchResult.data;
                  }
                  
                  const matchHistoryResult = await supabaseDataService.getPlayerMatchHistory(profile.users.email, 5);
                  if (matchHistoryResult.success && matchHistoryResult.data) {
                    recentMatchesData = matchHistoryResult.data;
                  }
                } catch (error) {
                  console.log(`🔄 Realtime: Error fetching match data for ${profile.users.email}:`, error);
                }
              }

              return {
                _id: profile.id,
                email: profile.users?.email || '',
                firstName: profile.users?.first_name || '',
                lastName: profile.users?.last_name || '',
                position: profile.position,
                fargoRate: profile.fargo_rate || 0,
                totalMatches: profile.total_matches || 0,
                wins: profile.wins || 0,
                losses: profile.losses || 0,
                isActive: profile.is_active,
                immunityUntil: profile.immunity_until,
                vacationMode: profile.vacation_mode,
                vacationUntil: profile.vacation_until,
                lastMatch: lastMatchData,
                recentMatches: recentMatchesData
              };
            });
            
            const transformedData = await Promise.all(transformedDataPromises);
            setLadderData(transformedData);
            console.log(`🔄 Realtime: Updated ${transformedData.length} players from ${selectedLadder} ladder with last match data`);
            
            // Update user's wins/losses from the fresh ladder data
            updateUserWinsLosses(transformedData, senderEmail);
          } else {
            console.error('🔄 Realtime: Error loading ladder data:', result.error);
          }
        } catch (error) {
          console.error('🔄 Realtime: Error in update handler:', error);
        }
      })
      .subscribe();

    // Set new timeout for debouncing
    loadDataTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        
        // Load ladder rankings for selected ladder from Supabase
        const result = await supabaseDataService.getLadderPlayersByName(selectedLadder);
        
        console.log('Ladder Supabase response:', result);
        
        if (result.success && Array.isArray(result.data)) {
          // Transform Supabase data to match expected format and fetch last match data
          const transformedDataPromises = result.data.map(async (profile) => {
            // Get last match data and match history for this player
            let lastMatchData = null;
            let recentMatchesData = [];
            if (profile.users?.email) {
              try {
                const lastMatchResult = await supabaseDataService.getPlayerLastMatch(profile.users.email);
                if (lastMatchResult.success && lastMatchResult.data) {
                  lastMatchData = lastMatchResult.data;
                }
                
                const matchHistoryResult = await supabaseDataService.getPlayerMatchHistory(profile.users.email, 5);
                if (matchHistoryResult.success && matchHistoryResult.data) {
                  recentMatchesData = matchHistoryResult.data;
                }
              } catch (error) {
                console.log(`Error fetching match data for ${profile.users.email}:`, error);
              }
            }

            return {
              _id: profile.id,
              email: profile.users?.email || '',
              firstName: profile.users?.first_name || '',
              lastName: profile.users?.last_name || '',
              position: profile.position,
              fargoRate: profile.fargo_rate || 0,
              totalMatches: profile.total_matches || 0,
              wins: profile.wins || 0,
              losses: profile.losses || 0,
              isActive: profile.is_active,
              immunityUntil: profile.immunity_until,
              vacationMode: profile.vacation_mode,
              vacationUntil: profile.vacation_until,
              lastMatch: lastMatchData,
              recentMatches: recentMatchesData
            };
          });
          
          const transformedData = await Promise.all(transformedDataPromises);
          setLadderData(transformedData);
          console.log(`Loaded ${transformedData.length} players from ${selectedLadder} ladder (Supabase) with last match data`);
          
          // Update user's wins/losses from the fresh ladder data
          updateUserWinsLosses(transformedData, senderEmail);
        } else {
          console.error('Error loading ladder data from Supabase:', result.error);
          setLadderData([]); // Set empty array as fallback
        }
      
      // Check if we have unified user data with ladder profile
      const unifiedUserData = localStorage.getItem("unifiedUserData");
      if (unifiedUserData) {
        try {
          const userData = JSON.parse(unifiedUserData);
          console.log('🔍 Found unified user data:', userData);
          
          if (userData.ladderProfile) {
            // User has ladder profile - use it directly
            const ladderProfile = userData.ladderProfile;
            setUserLadderData({
              playerId: 'ladder',
              name: `${userData.firstName} ${userData.lastName}`,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              fargoRate: ladderProfile.fargoRate,
              fargoRateUpdatedAt: ladderProfile.fargoRateUpdatedAt,
              ladder: ladderProfile.ladderName,
              position: ladderProfile.position,
              wins: ladderProfile.wins || 0,
              losses: ladderProfile.losses || 0,
              immunityUntil: ladderProfile.immunityUntil,
              activeChallenges: [],
              canChallenge: false, // Will be updated after checking membership status
              unifiedAccount: userData.unifiedAccount, // Add the unified account information
              isActive: true, // Add isActive property
              sanctioned: ladderProfile.sanctioned, // Add BCA sanctioning status
              sanctionYear: ladderProfile.sanctionYear, // Add BCA sanctioning year
              stats: {
                wins: ladderProfile.wins,
                losses: ladderProfile.losses,
                totalMatches: ladderProfile.totalMatches
              }
            });
            
            // Debug: Log user position
            console.log(`🔍 User position set: ${userData.firstName} ${userData.lastName} - Position: ${ladderProfile.position}`);
            
            // Don't automatically switch - let user choose which ladder to view
            // setSelectedLadder(ladderProfile.ladderName);
            console.log('✅ Set user ladder data from unified profile');
            
            // Check membership status to determine if user can challenge
            await checkMembershipStatus(userData.email);
            
            // Continue loading the selected ladder data
          }
        } catch (error) {
          console.error('Error parsing unified user data:', error);
        }
      }
      
      // Fallback to old method if no unified data
      console.log('🔍 senderEmail exists:', !!senderEmail, 'Value:', senderEmail);
      if (senderEmail) {
        console.log('🚀 Calling checkPlayerStatus for:', senderEmail);
        await checkPlayerStatus(senderEmail);
        } else {
          // No email, show as guest
          setUserLadderData({
            playerId: 'guest',
            name: `${playerName} ${playerLastName}`,
            firstName: playerName,
            lastName: playerLastName,
            email: null,
            fargoRate: 450,
            ladder: '499-under',
            position: 'Guest',
            immunityUntil: null,
            activeChallenges: [],
            canChallenge: false
          });
        }
      } catch (error) {
        console.error('Error loading ladder data:', error);
        
        // Set fallback data for graceful degradation
        setLadderData([]); // Empty ladder data
        setUserLadderData({
          playerId: 'guest',
          name: `${playerName} ${playerLastName}`,
          firstName: playerName,
          lastName: playerLastName,
          email: senderEmail,
          fargoRate: 450,
          ladder: '499-under',
          position: 'Guest',
          immunityUntil: null,
          activeChallenges: [],
          canChallenge: false
        });
        
        // Show user-friendly error message (optional - could be a toast notification)
        console.warn('Ladder data could not be loaded. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce delay
  }, [selectedLadder, senderEmail, updateUserWinsLosses]);

  const loadLocations = async () => {
    // Use the same hardcoded locations as the League app
    setAvailableLocations([
      'Legends Brews & Cues',
      'Antiques',
      'Rac m',
      'Westside Billiards',
      'Bijou Billiards',
      'Crooked Cue',
      'Back on the Boulevard',
      'Main Street Tavern',
      'Murray Street Darts',
      'My House'
    ]);
  };

  const checkPlayerStatus = async (email) => {
    try {
      console.log('🔍 Checking player status for email:', email);
      
      // Get user and ladder profile data from Supabase
      const userData = await supabaseDataService.getUserByEmail(email);
      const ladderProfile = await supabaseDataService.getLadderProfileByEmail(email);
      
      console.log('📋 User data from Supabase:', userData);
      console.log('📋 Ladder profile from Supabase:', ladderProfile);
      
      // Create status object similar to old backend response
      const status = {
        isLadderPlayer: !!ladderProfile,
        unifiedAccount: userData ? {
          hasUnifiedAccount: !!userData,
          email: userData.email
        } : null
      };
      
      if (userData) {
        status.ladderInfo = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          fargoRate: userData.fargoRate,
          ladderName: ladderProfile?.ladderName || '499-under',
          position: ladderProfile?.position || null,
          wins: ladderProfile?.wins || 0,
          losses: ladderProfile?.losses || 0,
          immunityUntil: ladderProfile?.immunityUntil,
          isActive: ladderProfile?.isActive !== false,
          sanctioned: userData.sanctioned,
          sanctionYear: userData.sanctionYear,
          stats: ladderProfile?.stats,
          ladderProgression: ladderProfile?.ladderProgression
        };
      }
      
      console.log('📋 Player status response:', status);
      setPlayerStatus(status);
      
      // Note: Only use ladder-specific data in LadderApp to maintain separation from league data
      
      if (status.isLadderPlayer) {
        // Player has ladder account
        setUserLadderData({
          playerId: 'ladder',
          name: `${status.ladderInfo.firstName} ${status.ladderInfo.lastName}`,
          firstName: status.ladderInfo.firstName,
          lastName: status.ladderInfo.lastName,
          email: email,
          fargoRate: status.ladderInfo.fargoRate,
            fargoRateUpdatedAt: status.ladderInfo.fargoRateUpdatedAt,
          ladder: status.ladderInfo.ladderName,
          position: status.ladderInfo.position,
            wins: status.ladderInfo.wins || 0,
            losses: status.ladderInfo.losses || 0,
          immunityUntil: status.ladderInfo.immunityUntil,
          activeChallenges: [],
          canChallenge: false, // Will be updated after checking membership status
          unifiedAccount: status.unifiedAccount, // Add the unified account information
          isActive: status.ladderInfo.isActive !== false, // Use backend isActive status, default to true
          sanctioned: status.ladderInfo.sanctioned, // Add BCA sanctioning status
          sanctionYear: status.ladderInfo.sanctionYear, // Add BCA sanctioning year
            stats: status.ladderInfo.stats,
            ladderProgression: status.ladderInfo.ladderProgression // Add ladder progression tracking
        });
        
        // Don't automatically switch - let user choose which ladder to view
        // setSelectedLadder(status.ladderInfo.ladderName);
        
        // Check membership status to determine if user can challenge
        await checkMembershipStatus(email);
      } else if (status.isLeaguePlayer) {
        // League player but no ladder account - can claim
        setUserLadderData({
          playerId: 'league',
          name: `${status.leagueInfo.firstName} ${status.leagueInfo.lastName}`,
          firstName: status.leagueInfo.firstName,
          lastName: status.leagueInfo.lastName,
          email: email,
          fargoRate: 450,
          ladder: '499-under',
          position: 'League Player - Claim Account',
          immunityUntil: null,
          activeChallenges: [],
          canChallenge: false,
          needsClaim: true,
          leagueInfo: status.leagueInfo
        });
      } else {
        // Not recognized - not in league system
        setUserLadderData({
          playerId: 'unknown',
          name: `${playerName} ${playerLastName}`,
          firstName: playerName,
          lastName: playerLastName,
          email: email,
          fargoRate: 450,
          ladder: '499-under',
          position: 'Not Recognized',
          immunityUntil: null,
          activeChallenges: [],
          canChallenge: false
        });
      }
    } catch (error) {
      console.error('Error checking player status:', error);
    }
  };




  const navigateToView = useCallback((view) => {
    setCurrentView(view);
  }, []);

  // Memoize computed values
  const ladderDisplayName = useMemo(() => {
    switch (selectedLadder) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return selectedLadder;
    }
  }, [selectedLadder]);



  // Challenge eligibility rules based on ladder position
  const canChallengePlayer = (challenger, defender) => {
    // Sanitize input data
    const sanitizedChallenger = sanitizePlayerData(challenger);
    const sanitizedDefender = sanitizePlayerData(defender);
    
    // Debug: Log the ladder values being compared
    console.log(`🔍 Ladder comparison: Challenger ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} ladder="${sanitizedChallenger.ladder}", Defender ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} ladderName="${sanitizedDefender.ladderName}"`);
    
    // Debug: Log unified account status for challenger and defender
    console.log(`🔍 Challenger unifiedAccount:`, sanitizedChallenger.unifiedAccount);
    console.log(`🔍 Defender unifiedAccount:`, sanitizedDefender.unifiedAccount);
    console.log(`🔍 Challenger canChallenge:`, sanitizedChallenger.canChallenge);
    console.log(`🔍 Defender hasUnifiedAccount:`, sanitizedDefender.unifiedAccount?.hasUnifiedAccount);
    
    // Both players must be on the same ladder
    // Note: challenger.ladder is the user's ladder, defender.ladderName is the player's ladder
    if (sanitizedChallenger.ladder !== sanitizedDefender.ladderName) {
      console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} (${sanitizedChallenger.ladder}) cannot challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} (${sanitizedDefender.ladderName}) - Different ladder`);
      return false;
    }
    
    // Both players must have unified accounts
    if (!sanitizedChallenger.unifiedAccount?.hasUnifiedAccount) {
      console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} cannot challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} - Challenger unified account required`);
      return false;
    }
    if (!sanitizedDefender.unifiedAccount?.hasUnifiedAccount) {
      console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} cannot challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} - Defender unified account required`);
      return false;
    }
    
    // Can't challenge yourself
    if (sanitizedChallenger.email === sanitizedDefender.unifiedAccount?.email) {
      console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} cannot challenge themselves`);
      return false;
    }
    
    // Can't challenge if you're not active (but allow if isActive is undefined/null)
    if (sanitizedChallenger.isActive === false) {
      console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} is not active`);
      return false;
    }
    
    // Can't challenge if defender is not active
    if (!sanitizedDefender.isActive) {
      console.log(`🚫 Challenge blocked: ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} is not active`);
      return false;
    }
    
    // Can't challenge if defender has immunity
    if (sanitizedDefender.immunityUntil && new Date(sanitizedDefender.immunityUntil) > new Date()) {
      console.log(`🚫 Challenge blocked: ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} has immunity until ${sanitizedDefender.immunityUntil}`);
      return false;
    }
    
    // Position-based challenge rules (following official rules):
    // - Standard Challenge: Can challenge players up to 4 positions above you
    // - SmackDown: Can challenge players no more than 5 positions below you
    const challengerPosition = sanitizeNumber(sanitizedChallenger.position);
    const defenderPosition = sanitizeNumber(sanitizedDefender.position);
    const positionDifference = challengerPosition - defenderPosition;
    
    // Standard Challenge: Can challenge players above you (up to 4 positions)
    if (positionDifference >= -4 && positionDifference <= 0) {
      console.log(`✅ Standard Challenge allowed: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} (Position ${challengerPosition}) can challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} (Position ${defenderPosition}) - ${Math.abs(positionDifference)} positions above`);
      return true;
    }
    
    // SmackDown: Can challenge players below you (up to 5 positions)
    if (positionDifference > 0 && positionDifference <= 5) {
      console.log(`✅ SmackDown allowed: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} (Position ${challengerPosition}) can challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} (Position ${defenderPosition}) - ${positionDifference} positions below`);
      return true;
    }
    
    console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} (Position ${challengerPosition}) cannot challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} (Position ${defenderPosition}) - Position difference ${positionDifference} is outside allowed range (-4 to +5)`);
    return false;
  };

  // Check membership status to determine if user can challenge
  const checkMembershipStatus = async (email) => {
    if (!email) return;
    
    try {
      console.log('🔍 Checking membership status for:', email);
      console.log('🔍 Current userLadderData before membership check:', userLadderData);
      
      // Get payment status from Supabase
      const paymentStatus = await supabaseDataService.getPaymentStatus(email);
      console.log('🔍 Payment status from Supabase:', paymentStatus);
      
      if (paymentStatus) {
        // Update canChallenge based on membership status (including promotional period)
        const hasActiveMembership = paymentStatus.hasMembership && (paymentStatus.status === 'active' || paymentStatus.status === 'promotional_period');
        const isPromotionalPeriod = paymentStatus.isPromotionalPeriod || false;
        
        setUserLadderData(prev => {
          console.log('🔍 Previous userLadderData:', prev);
          console.log('🔍 hasActiveMembership:', hasActiveMembership);
          console.log('🔍 isPromotionalPeriod:', isPromotionalPeriod);
          console.log('🔍 prev?.unifiedAccount?.hasUnifiedAccount:', prev?.unifiedAccount?.hasUnifiedAccount);
          
          // Admin users can always challenge, regular users need membership OR free period
          // During promotional period, allow challenges even without unified account
          const newCanChallenge = isAdmin || 
            (isPromotionalPeriod && hasActiveMembership) || 
            (prev?.unifiedAccount?.hasUnifiedAccount && hasActiveMembership);
          console.log('🔍 Updated canChallenge to:', newCanChallenge, '(isAdmin:', isAdmin, ', hasMembership:', hasActiveMembership, ', isPromotionalPeriod:', isPromotionalPeriod, ')');
          
          const updatedData = {
            ...prev,
            canChallenge: newCanChallenge,
            membershipStatus: paymentStatus,
            isPromotionalPeriod: isPromotionalPeriod
          };
          
          console.log('🔍 Final updated userLadderData:', updatedData);
          console.log('🔍 isPromotionalPeriod in final data:', updatedData.isPromotionalPeriod);
          return updatedData;
        });
      } else {
        console.log('🔍 Failed to check membership status:', response.status);
        // If membership API is down, allow challenges for users with unified accounts (graceful degradation)
        setUserLadderData(prev => {
          // During promotional period (assumed if API fails), allow challenges even without unified account
          const fallbackCanChallenge = isAdmin || true; // Assume promotional period if API fails
          console.log('🔍 Membership API failed, using fallback canChallenge:', fallbackCanChallenge);
          return {
            ...prev,
            canChallenge: fallbackCanChallenge,
            membershipStatus: null,
            isPromotionalPeriod: true // Assume promotional period if API fails
          };
        });
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
      // If membership API throws an error, allow challenges for users with unified accounts (graceful degradation)
      setUserLadderData(prev => {
        // During promotional period (assumed if API fails), allow challenges even without unified account
        const fallbackCanChallenge = isAdmin || true; // Assume promotional period if API fails
        console.log('🔍 Membership API error, using fallback canChallenge:', fallbackCanChallenge);
        return {
          ...prev,
          canChallenge: fallbackCanChallenge,
          membershipStatus: null,
          isPromotionalPeriod: true // Assume promotional period if API fails
        };
      });
    }
  };

  // Helper function to check if a player recently won a SmackDown match
  const hasRecentSmackDownWin = async (playerId) => {
    try {
      const playerEmail = playerId?.email || playerId;
      if (!playerEmail) return false;
      
      // Fetch recent match history for this player using Supabase
      const matches = await supabaseDataService.getPlayerMatchHistory(playerEmail, 20);
      
      if (!matches || matches.length === 0) {
        console.log('No match history found for SmackBack check');
        return false;
      }
      
      // Check if player has any recent completed SmackDown matches where they were the winner
      const recentSmackDownWin = matches.find(match => {
        // Check if it's a completed SmackDown match
        if (match.status !== 'completed' || match.matchType !== 'smackdown') {
          return false;
        }
        
        // Check if this player was the winner
        const isWinner = (match.winner?.email === playerEmail || 
                         match.winner?.id === playerId?.id ||
                         match.player1?.email === playerEmail && match.winner === match.player1 ||
                         match.player2?.email === playerEmail && match.winner === match.player2);
        
        if (!isWinner) return false;
        
        // Check if the match was completed within the last 7 days
        const matchDate = new Date(match.completedDate || match.scheduledDate);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        return matchDate >= sevenDaysAgo;
      });
      
      return !!recentSmackDownWin;
    } catch (error) {
      console.error('Error checking recent SmackDown win:', error);
      return false;
    }
  };

  // Helper function to determine which challenge type is allowed
  const getChallengeType = (challenger, defender) => {
    try {
      const sanitizedChallenger = sanitizePlayerData(challenger);
      const sanitizedDefender = sanitizePlayerData(defender);
      
      // Check basic requirements first
      if (!sanitizedChallenger.unifiedAccount?.hasUnifiedAccount || !sanitizedDefender.unifiedAccount?.hasUnifiedAccount) {
        return null;
      }
      if (sanitizedChallenger.email === sanitizedDefender.unifiedAccount?.email) {
        return null;
      }
      if (sanitizedDefender.isActive === false) {
        return null;
      }
      if (sanitizedDefender.immunityUntil && new Date(sanitizedDefender.immunityUntil) > new Date()) {
        return null;
      }
      
      const challengerPosition = sanitizeNumber(sanitizedChallenger.position);
      const defenderPosition = sanitizeNumber(sanitizedDefender.position);
      const positionDifference = defenderPosition - challengerPosition; // FIXED: defender - challenger
      
      // Debug logging
      console.log(`🔍 Challenge Type Check: ${sanitizedChallenger.firstName} (Pos ${challengerPosition}) vs ${sanitizedDefender.firstName} (Pos ${defenderPosition})`);
      console.log(`🔍 Position difference: ${positionDifference} (negative = defender is above challenger, positive = defender is below challenger)`);
      
      // SmackBack: Special case - can only challenge 1st place if you recently won a SmackDown
      if (defenderPosition === 1 && smackBackEligible) {
        console.log(`🔍 → SmackBack allowed (challenger recently won SmackDown, can challenge 1st place)`);
        return 'smackback';
      }
      
      // Fast Track: Check if challenger has Fast Track privileges and can use extended range
      const hasFastTrackPrivileges = sanitizedChallenger.fastTrackChallengesRemaining > 0 && 
                                     sanitizedChallenger.fastTrackExpirationDate && 
                                     new Date() < new Date(sanitizedChallenger.fastTrackExpirationDate);
      
      // Fast Track Challenge: Can challenge players above you (up to 6 positions with Fast Track privileges)
      if (hasFastTrackPrivileges && positionDifference >= -6 && positionDifference <= 0) {
        const challengesRemaining = sanitizedChallenger.fastTrackChallengesRemaining;
        console.log(`🔍 → fast-track allowed (defender is ${Math.abs(positionDifference)} positions above, ${challengesRemaining} challenges remaining)`);
        return 'fast-track';
      }
      
      // Standard Challenge: Can challenge players above you (up to 4 positions)
      // Position difference is negative when defender is above challenger (better position = lower number)
      if (positionDifference >= -4 && positionDifference <= 0) {
        console.log(`🔍 → Challenge allowed (defender is ${Math.abs(positionDifference)} positions above)`);
        return 'challenge';
      }
      
      // SmackDown: Can challenge players below you (up to 5 positions)  
      // Position difference is positive when defender is below challenger (worse position = higher number)
      if (positionDifference > 0 && positionDifference <= 5) {
        console.log(`🔍 → SmackDown allowed (defender is ${positionDifference} positions below)`);
        return 'smackdown';
      }
      
      console.log(`🔍 → No challenge allowed (position difference ${positionDifference} outside range)`);
      
      return null;
    } catch (error) {
      console.error('Error in getChallengeType:', error);
      return null;
    }
  };

  // Helper function to get challenge reason (for debugging)
  const getChallengeReason = (challenger, defender) => {
    try {
      const sanitizedChallenger = sanitizePlayerData(challenger);
      const sanitizedDefender = sanitizePlayerData(defender);
      
      // Debug logging
      console.log('🔍 DEBUG getChallengeReason:');
      console.log('🔍 Challenger:', sanitizedChallenger.firstName, sanitizedChallenger.lastName);
      console.log('🔍 Challenger unifiedAccount:', sanitizedChallenger.unifiedAccount);
      console.log('🔍 Challenger hasUnifiedAccount:', sanitizedChallenger.unifiedAccount?.hasUnifiedAccount);
      console.log('🔍 Defender:', sanitizedDefender.firstName, sanitizedDefender.lastName);
      console.log('🔍 Defender unifiedAccount:', sanitizedDefender.unifiedAccount);
      console.log('🔍 Defender hasUnifiedAccount:', sanitizedDefender.unifiedAccount?.hasUnifiedAccount);
      
      if (!sanitizedChallenger.unifiedAccount?.hasUnifiedAccount) {
        console.log('🔍 Returning "Profile incomplete" because challenger hasUnifiedAccount is false');
        return 'Profile incomplete';
      }
      if (!sanitizedDefender.unifiedAccount?.hasUnifiedAccount) {
        console.log('🔍 Returning "Opponent profile incomplete" because defender hasUnifiedAccount is false');
        return 'Opponent profile incomplete';
      }
      if (sanitizedChallenger.email === sanitizedDefender.unifiedAccount?.email) {
        return 'Same player';
      }
      if (!sanitizedDefender.isActive) {
        return 'Defender inactive';
      }
      if (sanitizedDefender.immunityUntil && new Date(sanitizedDefender.immunityUntil) > new Date()) {
        return 'Defender immune';
      }
      
      const challengerPosition = sanitizeNumber(sanitizedChallenger.position);
      const defenderPosition = sanitizeNumber(sanitizedDefender.position);
      const positionDifference = defenderPosition - challengerPosition; // FIXED: defender - challenger
      
      // Check for SmackBack eligibility first
      if (defenderPosition === 1) {
        if (smackBackEligible) {
          return 'SmackBack eligible - Recently won SmackDown';
        } else {
          return 'Need recent SmackDown win to challenge 1st place';
        }
      }
      
      if (positionDifference < -4) {
        return `Too far above (${Math.abs(positionDifference)} positions) - Max 4 positions above allowed`;
      }
      if (positionDifference > 5) {
        return `Too far below (${positionDifference} positions) - Max 5 positions below allowed for SmackDown`;
      }
      
      return 'Eligible';
    } catch (error) {
      console.error('Error in getChallengeReason:', error);
      return 'Invalid data';
    }
  };

  // Challenge system functions
  const loadChallenges = async () => {
    if (!senderEmail) return;
    
    try {
      const sanitizedEmail = sanitizeEmail(senderEmail);
      
      // Load pending challenges (received) from Supabase
      const pendingResult = await supabaseDataService.getPendingChallenges(sanitizedEmail);
      if (pendingResult.success) {
        setPendingChallenges(pendingResult.data || []);
      } else {
        console.error('Error loading pending challenges:', pendingResult.error);
        setPendingChallenges([]);
      }
      
      // Load sent challenges from Supabase
      const sentResult = await supabaseDataService.getSentChallenges(sanitizedEmail);
      if (sentResult.success) {
        const sentData = sentResult.data || [];
        // Filter out admin-created challenges (entryFee: 0 and postContent contains 'Admin')
        const filteredSentChallenges = sentData.filter(challenge => 
          !(challenge.matchDetails?.entryFee === 0 && 
            challenge.challengePost?.postContent?.toLowerCase().includes('admin'))
        );
        setSentChallenges(filteredSentChallenges);
      } else {
        console.error('Error loading sent challenges:', sentResult.error);
        setSentChallenges([]);
      }
      
      // Load scheduled matches from Supabase
      const scheduledMatches = await supabaseDataService.getScheduledMatches(selectedLadder || null);
      console.log('🔍 All scheduled matches from Supabase:', scheduledMatches);
      console.log('🔍 Looking for user email:', sanitizedEmail);
      console.log('🔍 Looking for user name:', `${userLadderData?.firstName} ${userLadderData?.lastName}`);
      
      // Filter to only show matches where the current user is a player
      const userScheduledMatches = scheduledMatches?.filter(match => {
        // Check by email (case-insensitive)
        const player1Email = match.player1?.email?.toLowerCase();
        const player2Email = match.player2?.email?.toLowerCase();
        const userEmail = sanitizedEmail.toLowerCase();
        
        // Also check by name as fallback
        const player1Name = `${match.player1?.firstName} ${match.player1?.lastName}`.toLowerCase();
        const player2Name = `${match.player2?.firstName} ${match.player2?.lastName}`.toLowerCase();
        const userName = `${userLadderData?.firstName} ${userLadderData?.lastName}`.toLowerCase();
        
        const emailMatch = (player1Email === userEmail || player2Email === userEmail);
        const nameMatch = (player1Name === userName || player2Name === userName);
        
        if (emailMatch || nameMatch) {
          console.log('🔍 Found matching match:', match, 'emailMatch:', emailMatch, 'nameMatch:', nameMatch);
        }
        
        return emailMatch || nameMatch;
      }) || [];
      
      console.log('🔍 Filtered user scheduled matches:', userScheduledMatches);
      setScheduledMatches(userScheduledMatches);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const handleChallengePlayer = useCallback((defender, type = 'challenge') => {
    // Admin users bypass membership requirements
    if (!isAdmin) {
      // Check if user has active membership OR promotional period before allowing challenge
      const hasActiveMembership = userLadderData?.membershipStatus?.hasMembership && 
        (userLadderData?.membershipStatus?.status === 'active' || userLadderData?.membershipStatus?.status === 'promotional_period');
      
      // If membership API failed and we're using fallback, allow challenges
      const membershipApiFailed = !userLadderData?.membershipStatus && userLadderData?.canChallenge;
      
      if (!hasActiveMembership && !membershipApiFailed) {
        // Show payment required modal
        const userWantsToPay = confirm(
          userLadderData?.isPromotionalPeriod 
            ? `🔒 Profile Incomplete\n\n` +
              `To challenge other players, you need to complete your profile by adding available dates and locations.\n\n` +
              `During our promotional period, this is all you need to do!\n\n` +
              `Would you like to complete your profile now?`
            : `💳 Membership Required\n\n` +
              `To challenge other players, you need a current $10/month membership.\n\n` +
              `Would you like to purchase a membership now?`
        );
        
        if (userWantsToPay) {
          if (userLadderData?.isPromotionalPeriod) {
            // Navigate to profile completion
            alert('Please complete your profile by adding available dates and locations in your profile settings.');
          } else {
            // Navigate to payment page or show payment modal
            alert('Please visit the payment section to purchase a membership.');
          }
        }
        return;
      }
    }
    
    setSelectedDefender(defender);
    setChallengeType(type);
    setShowChallengeModal(true);
  }, [userLadderData, isAdmin]);

  // Helper function to determine player status
  const getPlayerStatus = (player) => {
    // First check if player is inactive (admin unchecked the active box)
    if (!player.isActive) {
      return { status: 'inactive', text: 'Inactive', className: 'inactive' };
    }
    
    // Check if player has immunity
    if (player.immunityUntil && new Date(player.immunityUntil) > new Date()) {
      return { status: 'immune', text: 'Immune', className: 'immune' };
    }
    
    // Helper function to check if a player matches in challenges/matches
    const isPlayerInChallenge = (challenge) => {
      // Try multiple ways to match the player
      const playerEmail = player.email || player.unifiedAccount?.email;
      const playerId = player._id;
      
      // Check by email
      if (playerEmail) {
        if (challenge.challenger?.email === playerEmail || challenge.defender?.email === playerEmail) {
          return true;
        }
      }
      
      // Check by ID if available
      if (playerId) {
        if (challenge.challenger?._id === playerId || challenge.defender?._id === playerId) {
          return true;
        }
      }
      
      // Check by name as fallback
      const playerName = `${player.firstName} ${player.lastName}`.toLowerCase();
      const challengerName = `${challenge.challenger?.firstName || ''} ${challenge.challenger?.lastName || ''}`.toLowerCase();
      const defenderName = `${challenge.defender?.firstName || ''} ${challenge.defender?.lastName || ''}`.toLowerCase();
      
      if (challengerName === playerName || defenderName === playerName) {
        return true;
      }
      
      return false;
    };
    
    // Helper function to check if a player matches in scheduled matches
    const isPlayerInMatch = (match) => {
      // Try multiple ways to match the player
      const playerEmail = player.email || player.unifiedAccount?.email;
      const playerId = player._id;
      
      // Check by email
      if (playerEmail) {
        if (match.player1?.email === playerEmail || match.player2?.email === playerEmail) {
          return true;
        }
      }
      
      // Check by ID if available
      if (playerId) {
        if (match.player1?._id === playerId || match.player2?._id === playerId) {
          return true;
        }
      }
      
      // Check by name as fallback
      const playerName = `${player.firstName} ${player.lastName}`.toLowerCase();
      const player1Name = `${match.player1?.firstName || ''} ${match.player1?.lastName || ''}`.toLowerCase();
      const player2Name = `${match.player2?.firstName || ''} ${match.player2?.lastName || ''}`.toLowerCase();
      
      if (player1Name === playerName || player2Name === playerName) {
        return true;
      }
      
      return false;
    };
    
    // Check if player has an active proposal (pending challenge)
    const hasActiveProposal = pendingChallenges.some(isPlayerInChallenge) || 
                             sentChallenges.some(isPlayerInChallenge);
    
    if (hasActiveProposal) {
      return { status: 'proposal', text: 'Challenge Pending', className: 'proposal' };
    }
    
    // Check if player has a scheduled match
    const hasScheduledMatch = scheduledMatches.some(isPlayerInMatch);
    
    if (hasScheduledMatch) {
      return { status: 'scheduled', text: 'Match Scheduled', className: 'scheduled' };
    }
    
    // Default to active
    return { status: 'active', text: 'Active', className: 'active' };
  };

  const handlePlayerClick = useCallback((player) => {
    setSelectedPlayerForStats(player);
    setShowMobilePlayerStats(true);
    
    // Use the lastMatch data that's already in the player object
    if (player.lastMatch) {
      console.log('🔍 Using existing lastMatch data from player object:', player.lastMatch);
      setLastMatchData(player.lastMatch);
    } else {
      console.log('🔍 No lastMatch data in player object, trying to fetch...');
      fetchLastMatchData(player);
    }
    
    // Use the recentMatches data that's now included in the player object
    if (player.recentMatches && player.recentMatches.length > 0) {
      console.log('🔍 Using existing recentMatches data from player object:', player.recentMatches);
      console.log('🔍 Number of recent matches:', player.recentMatches.length);
      setPlayerMatchHistory(player.recentMatches);
    } else {
      console.log('🔍 No recentMatches data in player object, trying to fetch...');
      fetchPlayerMatchHistory(player);
    }
    
    fetchUpdatedPlayerData(player);
  }, [showMobilePlayerStats, selectedPlayerForStats]);

  const fetchLastMatchData = async (player) => {
    console.log('🔍 Fetching last match data for player:', player);
    console.log('🔍 Player unifiedAccount:', player.unifiedAccount);
    console.log('🔍 Player email:', player.email);
    console.log('🔍 Player firstName:', player.firstName);
    console.log('🔍 Player lastName:', player.lastName);
    
    // Try to get email from unified account first, then fall back to direct email
    const emailToUse = player.unifiedAccount?.email || player.email;
    console.log('🔍 Using email for last match:', emailToUse);
    
    if (!emailToUse) {
      console.log('🔍 No email found anywhere, cannot fetch last match data');
      setLastMatchData(null);
      return;
    }
    
    try {
      console.log('🔍 Fetching last match from Supabase for email:', emailToUse);
      const result = await supabaseDataService.getPlayerLastMatch(emailToUse);
      
      if (result.success) {
        console.log('🔍 Last match data from Supabase:', result.data);
        setLastMatchData(result.data);
      } else {
        console.error('🔍 Error fetching last match:', result.error);
        setLastMatchData(null);
      }
    } catch (error) {
      console.error('Error fetching last match data:', error);
      setLastMatchData(null);
    }
  };

  const fetchPlayerMatchHistory = async (player) => {
    console.log('🔍 Fetching match history for player:', player);
    console.log('🔍 Player unifiedAccount:', player.unifiedAccount);
    
    // Try to get email from unified account first, then fall back to direct email
    const emailToUse = player.unifiedAccount?.email || player.email;
    console.log('🔍 Using email:', emailToUse);
    
    if (!emailToUse) {
      console.log('🔍 No email found anywhere, cannot fetch match history');
      setPlayerMatchHistory([]);
      return;
    }
    
    try {
      console.log('🔍 Fetching match history from Supabase for email:', emailToUse);
      const result = await supabaseDataService.getPlayerMatchHistory(emailToUse, 10);
      
      if (result.success) {
        console.log('🔍 Match history data from Supabase:', result.data);
        setPlayerMatchHistory(result.data);
      } else {
        console.error('🔍 Error fetching match history:', result.error);
        setPlayerMatchHistory([]);
      }
    } catch (error) {
      console.error('Error fetching player match history:', error);
      setPlayerMatchHistory([]);
    }
  };

  const fetchUpdatedPlayerData = async (player) => {
    console.log('🔍 Fetching updated player data for:', player);
    
    // Try to get email from unified account first, then fall back to direct email
    const emailToUse = player.unifiedAccount?.email || player.email;
    console.log('🔍 Using email for player data:', emailToUse);
    
    if (!emailToUse) {
      console.log('🔍 No email found anywhere, using original player data');
      setUpdatedPlayerData(player);
      return;
    }
    
    try {
      console.log('🔍 Fetching player data from Supabase for email:', emailToUse);
      
      // Fetch ladder profile from Supabase
      const result = await supabaseDataService.getLadderPlayersByName(selectedLadder);
      
      if (result.success && result.data) {
        // Find the player in the ladder data by email
        const playerProfile = result.data.find(p => 
          p.users?.email?.toLowerCase() === emailToUse.toLowerCase()
        );
        
        if (playerProfile) {
          console.log('🔍 Found player profile in Supabase:', playerProfile);
          
          const updatedPlayer = {
            ...player,
            _id: playerProfile.id,
            email: playerProfile.users?.email || emailToUse,
            firstName: playerProfile.users?.first_name || player.firstName,
            lastName: playerProfile.users?.last_name || player.lastName,
            position: playerProfile.position,
            fargoRate: playerProfile.fargo_rate || 0,
            totalMatches: playerProfile.total_matches || 0,
            wins: playerProfile.wins || 0,
            losses: playerProfile.losses || 0,
            isActive: playerProfile.is_active,
            immunityUntil: playerProfile.immunity_until,
            vacationMode: playerProfile.vacation_mode,
            vacationUntil: playerProfile.vacation_until
          };
          
          console.log('🔍 Updated player data from Supabase:', updatedPlayer);
          console.log('🔍 Updated wins:', updatedPlayer.wins);
          console.log('🔍 Updated losses:', updatedPlayer.losses);
          setUpdatedPlayerData(updatedPlayer);
        } else {
          console.log('🔍 Player not found in Supabase ladder data');
          setUpdatedPlayerData(player);
        }
      } else {
        console.log('🔍 Failed to fetch ladder data from Supabase:', result.error);
        setUpdatedPlayerData(player);
      }
    } catch (error) {
      console.error('Error fetching updated player data:', error);
      setUpdatedPlayerData(player);
    }
  };

  // Memoize available defenders for Smart Match
  const availableDefenders = useMemo(() => {
    return ladderData.filter(player => {
      // Include players with unified accounts (preferred)
      const hasUnifiedAccount = player.unifiedAccount?.hasUnifiedAccount;
      
      // Also include players without unified accounts for Smart Match testing
      // (they'll show with asterisks but can still be suggested)
      const isNotCurrentUser = player.unifiedAccount?.email !== userLadderData?.email && 
                              player.email !== userLadderData?.email &&
                              player.firstName !== userLadderData?.firstName;
      
      return isNotCurrentUser; // Include all players except the current user
    });
  }, [ladderData, userLadderData?.email, userLadderData?.firstName]);

  const handleSmartMatch = useCallback(() => {
    console.log('🧠 Smart Match clicked');
    console.log('📊 Current ladder data:', ladderData);
    console.log('👤 User ladder data:', userLadderData);
    console.log('🎯 Available defenders:', availableDefenders);
    setShowSmartMatchModal(true);
  }, [ladderData, userLadderData, availableDefenders]);

  const handleChallengeComplete = useCallback((result) => {
    // Refresh challenges and ladder data
    loadChallenges();
    loadData();
  }, []);

  const handleChallengeResponse = useCallback((response, result) => {
    // Show notification based on response type
    if (response === 'accepted' && selectedChallenge) {
      notificationService.showChallengeAcceptedNotification(selectedChallenge);
    } else if (response === 'declined' && selectedChallenge) {
      notificationService.showChallengeDeclinedNotification(selectedChallenge);
    } else if (response === 'counter-proposed' && selectedChallenge) {
      notificationService.showCounterProposalNotification(selectedChallenge);
    }
    
    // Refresh challenges and ladder data
    loadChallenges();
    loadData();
  }, [selectedChallenge]);

  const handleViewChallenge = useCallback((challenge) => {
    setSelectedChallenge(challenge);
    setShowChallengeConfirmModal(true);
  }, []);

  // Function to check if a player has a hot streak (3+ consecutive wins)
  const hasHotStreak = (player) => {
    if (!player.recentMatches || player.recentMatches.length === 0) return false;
    
    let consecutiveWins = 0;
    for (let i = 0; i < player.recentMatches.length; i++) {
      if (player.recentMatches[i].result === 'win') {
        consecutiveWins++;
        if (consecutiveWins >= 3) return true;
      } else {
        break; // Streak broken
      }
    }
    return false;
  };


  const renderLadderView = () => {
    return (
      <div 
        className={isPublicView ? "ladder-view-direct" : "ladder-view"}
        style={isPublicView ? { maxWidth: 'none', width: '100%', minWidth: '100%' } : {}}
      >
        {/* Public Ladder Instructions - Show at the TOP for public view */}
        {isPublicView && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '16px', 
            background: 'rgba(0, 0, 0, 0.8)', 
            borderRadius: '12px', 
            border: '2px solid rgba(255, 193, 7, 0.3)' 
          }}>
            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#ffc107', fontSize: '1.1rem' }}>🚀 How to Join the Ladder:</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>1. Visit <a href="https://frontrangepool.com" style={{color: '#ffc107', textDecoration: 'underline'}}>FrontRangePool.com</a> to create your account</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>2. Complete your profile with availability and preferred locations</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>3. Choose your ladder bracket based on your FargoRate</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>4. Start challenging other players to climb the ranks!</p>
            </div>

            <div style={{ padding: '12px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#4CAF50', fontSize: '1.1rem' }}>🎯 How to Claim Your Position:</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>• If you see your name on the ladder, you can claim that position</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>• Look for the green "Claim" button next to available positions</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>• Complete your profile to unlock all challenge features</p>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#fff' }}>• New players start at the bottom and work their way up</p>
            </div>

            {/* Login Button Section */}
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              background: 'rgba(139, 92, 246, 0.1)', 
              borderRadius: '8px', 
              border: '1px solid rgba(139, 92, 246, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                color: '#8b5cf6', 
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                🏆 Ready to Join the Competition?
              </h3>
              <p style={{ 
                margin: '0 0 16px 0', 
                color: '#ccc', 
                fontSize: '0.95rem',
                lineHeight: '1.4'
              }}>
                Create your account to challenge players, track your progress, and climb the ladder!
              </p>
              <button
                onClick={() => {
                  window.location.href = '/hub';
                }}
                style={{
                  background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                }}
              >
                🔐 Join the Ladder Now
              </button>
            </div>
          </div>
        )}

        {/* News Ticker for Public View */}
        {isPublicView && (
          <div style={{ 
            marginBottom: '20px',
            padding: '0 20px'
          }}>
            <LadderNewsTicker isPublicView={true} />
          </div>
        )}

        <LadderErrorBoundary>
          <LadderHeader 
            selectedLadder={selectedLadder}
            setSelectedLadder={setSelectedLadder}
            setHasManuallySelectedLadder={setHasManuallySelectedLadder}
            currentView={currentView}
            setCurrentView={setCurrentView}
            isPublicView={isPublicView}
            setShowMatchCalendar={setShowMatchCalendar}
            isAdmin={isAdmin}
          />
        </LadderErrorBoundary>
        
        {/* Promotional Pricing Banner - Hidden for public view */}
        {!isPublicView && <PromotionalPricingBanner />}
        
        {/* Match Fee Information - Separate container */}
        {!isPublicView && (
          <div className="match-fee-container">
            <div className="match-fee-info-bar sticky-match-fee">
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>💰 Match Fee Info:</span>
              <span style={{ marginLeft: '8px' }}>
                Winner reports match and pays <strong>$5 match fee</strong> (one fee per match, not per player)
              </span>
            </div>
          </div>
        )}
        
        <LadderErrorBoundary>
          <LadderTable
            ladderData={ladderData}
            isPublicView={isPublicView}
            userLadderData={userLadderData}
            canChallengePlayer={canChallengePlayer}
            getChallengeType={getChallengeType}
            getChallengeReason={getChallengeReason}
            handleChallengePlayer={handleChallengePlayer}
            handlePlayerClick={handlePlayerClick}
            getPlayerStatus={getPlayerStatus}
            isPositionClaimed={isPositionClaimed}
            selectedLadder={selectedLadder}
          />
        </LadderErrorBoundary>
        
        {!isPublicView && (
          <button onClick={() => setCurrentView('main')} className="back-btn">
            ← Back to Main Menu
          </button>
        )}
      </div>
    );
  };

  const renderChallengesView = () => {
    return (
      <div className="challenges-view">
        <div className="challenges-header-section">
          <h2>⚔️ My Challenges</h2>
          <p>Manage your challenges and responses</p>
        </div>
        
        {/* Pending Challenges (Received) */}
        <div className="challenges-section">
          <h3>📥 Pending Challenges ({pendingChallenges.length})</h3>
          
          {pendingChallenges.length === 0 ? (
            <div className="no-challenges">
              <div className="no-challenges-icon">📭</div>
              <h4>No Pending Challenges</h4>
              <p>You don't have any challenges waiting for your response.</p>
            </div>
          ) : (
            <div className="challenges-list">
              {pendingChallenges.map((challenge) => (
                <div key={challenge._id} className="challenge-card pending">
                  <div className="challenge-header">
                    <h4>
                      {challenge.challenger?.firstName} {challenge.challenger?.lastName} 
                      <span className="vs-text"> vs </span>
                      {challenge.defender?.firstName} {challenge.defender?.lastName}
                    </h4>
                    <span className={`challenge-type challenge-${challenge.challengeType}`}>
                      {challenge.challengeType === 'challenge' ? '⚔️ Challenge' :
                       challenge.challengeType === 'smackdown' ? '💥 SmackDown' :
                       challenge.challengeType === 'ladder-jump' ? '🚀 Ladder Jump' :
                       challenge.challengeType === 'fast-track' ? '🚀 Fast Track' : '🎯 Match'}
                    </span>
                  </div>
                  
                  <div className="challenge-details">
                    <p><strong>💰 Entry Fee:</strong> ${challenge.matchDetails?.entryFee || '0'}</p>
                    <p><strong>🏁 Race Length:</strong> {challenge.matchDetails?.raceLength || '5'}</p>
                    <p><strong>🎮 Game Type:</strong> {challenge.matchDetails?.gameType || '8-Ball'}</p>
                    <p><strong>📍 Location:</strong> {challenge.matchDetails?.location || 'TBD'}</p>
                    <p><strong>⏰ Expires:</strong> {challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  
                  <div className="challenge-actions">
                    <button
                      onClick={() => handleViewChallenge(challenge)}
                      className="action-btn respond-btn"
                    >
                      📝 Respond to Challenge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Sent Challenges */}
        <div className="challenges-section">
          <h3>📤 Sent Challenges ({sentChallenges.length})</h3>
          
          {sentChallenges.length === 0 ? (
            <div className="no-challenges">
              <div className="no-challenges-icon">📤</div>
              <h4>No Sent Challenges</h4>
              <p>You haven't sent any challenges yet. Challenge another player to get started!</p>
            </div>
          ) : (
            <div className="challenges-list">
              {sentChallenges.map((challenge) => (
                <div key={challenge._id} className="challenge-card sent">
                  <div className="challenge-header">
                    <h4>
                      {challenge.challenger?.firstName} {challenge.challenger?.lastName} 
                      <span className="vs-text"> vs </span>
                      {challenge.defender?.firstName} {challenge.defender?.lastName}
                    </h4>
                    <span className={`challenge-type challenge-${challenge.challengeType}`}>
                      {challenge.challengeType === 'challenge' ? '⚔️ Challenge' :
                       challenge.challengeType === 'smackdown' ? '💥 SmackDown' :
                       challenge.challengeType === 'ladder-jump' ? '🚀 Ladder Jump' :
                       challenge.challengeType === 'fast-track' ? '🚀 Fast Track' : '🎯 Match'}
                    </span>
                  </div>
                  
                  <div className="challenge-details">
                    <p><strong>📊 Status:</strong> <span className={`status-${challenge.status}`}>{challenge.status}</span></p>
                    <p><strong>💰 Entry Fee:</strong> ${challenge.matchDetails?.entryFee || '0'}</p>
                    <p><strong>🏁 Race Length:</strong> {challenge.matchDetails?.raceLength || '5'}</p>
                    <p><strong>🎮 Game Type:</strong> {challenge.matchDetails?.gameType || '8-Ball'}</p>
                    <p><strong>📍 Location:</strong> {challenge.matchDetails?.location || 'TBD'}</p>
                    <p><strong>⏰ Expires:</strong> {challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  
                  <div className="challenge-actions">
                    <button
                      className="action-btn view-btn"
                      onClick={() => handleViewChallenge(challenge)}
                    >
                      👁️ View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Scheduled Matches */}
        <div className="challenges-section">
          <h3>📅 Scheduled Matches ({scheduledMatches.length})</h3>
          
          {scheduledMatches.length === 0 ? (
            <div className="no-challenges">
              <div className="no-challenges-icon">📅</div>
              <h4>No Scheduled Matches</h4>
              <p>You don't have any matches scheduled yet.</p>
            </div>
          ) : (
            <div className="challenges-list">
              {scheduledMatches.map((match) => (
                <div key={match._id} className="challenge-card scheduled">
                  <div className="challenge-header">
                    <h4>
                      {match.player1?.firstName} {match.player1?.lastName} 
                      <span className="vs-text"> vs </span>
                      {match.player2?.firstName} {match.player2?.lastName}
                    </h4>
                    <span className={`challenge-type challenge-${match.matchType}`}>
                      {match.matchType === 'challenge' ? '⚔️ Challenge' :
                       match.matchType === 'smackdown' ? '💥 SmackDown' :
                       match.matchType === 'ladder-jump' ? '🚀 Ladder Jump' : '🎯 Match'}
                    </span>
                  </div>
                  
                  <div className="challenge-details">
                    <p><strong>📊 Status:</strong> <span className="status-scheduled">
                      {match.challengeId ? 'Created by Admin' : 'Scheduled'}
                    </span></p>
                    <p><strong>🏁 Race Length:</strong> {match.raceLength || '5'}</p>
                    <p><strong>🎮 Game Type:</strong> {match.gameType || '8-Ball'}</p>
                    <p><strong>📏 Table Size:</strong> {match.tableSize || '9ft'}</p>
                    <p><strong>📅 Scheduled Date:</strong> {match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString() : 'TBD'}</p>
                    {match.venue && <p><strong>📍 Location:</strong> {match.venue}</p>}
                  </div>
                  
                  <div className="challenge-actions">
                    <button
                      className="action-btn view-btn"
                      onClick={() => {
                        // Handle view match details
                        console.log('View match details:', match);
                      }}
                    >
                      👁️ View Match Details
                    </button>
                    
                    {/* Reschedule Button (if under limit) */}
                    {(match.rescheduleCount || 0) < 2 && (
                      <button
                        className="action-btn"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                        onClick={() => {
                          setSelectedMatchForAction(match);
                          setShowRescheduleRequestModal(true);
                        }}
                      >
                        📅 Request Reschedule ({(match.rescheduleCount || 0)}/2)
                      </button>
                    )}
                    
                    {/* Report No-Show Button (if 30+ min past scheduled time) */}
                    {(() => {
                      const scheduledTime = new Date(match.scheduledDate);
                      const thirtyMinutesLater = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
                      const now = new Date();
                      const canReportNoShow = now >= thirtyMinutesLater;
                      
                      return canReportNoShow && (
                        <button
                          className="action-btn"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}
                          onClick={() => {
                            setSelectedMatchForAction(match);
                            setShowForfeitReportModal(true);
                          }}
                        >
                          📝 Report No-Show
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {!isPublicView && (
          <button onClick={() => setCurrentView('main')} className="back-btn">
            ← Back to Main Menu
          </button>
        )}
      </div>
    );
  };

  // Removed renderAllLaddersView function - no longer needed
  const renderAllLaddersView_DISABLED = () => {
    const [allLaddersData, setAllLaddersData] = useState({});
    const [loadingAll, setLoadingAll] = useState(true);

    useEffect(() => {
      const loadAllLadders = async () => {
        try {
          setLoadingAll(true);
          const ladders = isAdmin ? ['499-under', '500-549', '550-plus', 'simulation'] : ['499-under', '500-549', '550-plus'];
          const data = {};
          
          for (const ladder of ladders) {
            const response = await fetch(`${BACKEND_URL}/api/ladder/ladders/${ladder}/players`);
            const result = await response.json();
            data[ladder] = Array.isArray(result) ? result : [];
          }
          
          setAllLaddersData(data);
        } catch (error) {
          console.error('Error loading all ladders:', error);
        } finally {
          setLoadingAll(false);
        }
      };
      
      loadAllLadders();
    }, []);

    const getLadderDisplayName = (ladderName) => {
      switch (ladderName) {
        case '499-under': return '499 & Under';
        case '500-549': return '500-549';
        case '550-plus': return '550+';
        default: return ladderName;
      }
    };

    if (loadingAll) {
      return (
        <div className="ladder-view">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>
            <div className="loading-spinner"></div>
            <p>Loading all ladders...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="ladder-view">
        <div className="ladder-header-section">
          <h2>All Ladder Divisions</h2>
          <p>Browse all three ladder divisions</p>
        </div>
        
        <div style={{ display: 'grid', gap: '2rem' }}>
          {(isAdmin ? ['499-under', '500-549', '550-plus', 'simulation'] : ['499-under', '500-549', '550-plus']).map((ladderName) => (
            <div key={ladderName} style={{
              background: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ 
                color: '#fff', 
                margin: '0 0 1rem 0',
                fontSize: '1.5rem',
                textAlign: 'center'
              }}>
                {getLadderDisplayName(ladderName)} Ladder
              </h3>
              
              <div className="ladder-table">
                <div className="table-header">
                  <div className="header-cell">Rank</div>
                  <div className="header-cell">Player</div>
                  <div className="header-cell">FargoRate</div>
                  <div className="header-cell">W</div>
                  <div className="header-cell">L</div>
                  {isPublicView ? (
                    <div className="header-cell">Last Match</div>
                  ) : (
                    <>
                      <div className="header-cell">Status</div>
                      <div className="header-cell last-match-header" style={{backgroundColor: 'red', color: 'yellow', fontSize: '50px'}}>Last Match</div>
                    </>
                  )}
                </div>
                
                {allLaddersData[ladderName]?.map((player, index) => (
                  <div key={player._id || index} className="table-row">
                    <div className="table-cell rank">#{player.position}</div>
                    <div className="table-cell name">
                      <div 
                        className="player-name-clickable"
                        onClick={() => handlePlayerClick(player)}
                      >
                        {player.firstName} {player.lastName}
                        {!isPublicView && !player.unifiedAccount?.hasUnifiedAccount && <span className="no-account">*</span>}
                        {hasHotStreak(player) && (
                          <span className="ladder-hot-streak-badge" title="Hot Streak: 3+ consecutive wins!">
                            🔥
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="table-cell fargo">{player.fargoRate === 0 ? "No FargoRate" : player.fargoRate}</div>
                    <div className="table-cell wins">{player.wins || 0}</div>
                    <div className="table-cell losses">{player.losses || 0}</div>
                    {isPublicView ? (
                      <div className="table-cell last-match">
                        {player.lastMatch ? (
                          <div style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: 'bold', color: player.lastMatch.result === 'W' ? '#4CAF50' : '#f44336' }}>
                              {player.lastMatch.result === 'W' ? 'W' : 'L'} vs {player.lastMatch.opponent}
                            </div>
                            <div style={{ color: '#666', fontSize: '0.7rem' }}>
                              {new Date(player.lastMatch.date).toLocaleDateString()}
                            </div>
                            {player.lastMatch.venue && (
                              <div style={{ color: '#888', fontSize: '0.65rem' }}>
                                {player.lastMatch.venue}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.8rem' }}>No matches</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="table-cell status">
                          {(() => {
                            const playerStatus = getPlayerStatus(player);
                            return <span className={playerStatus.className}>{playerStatus.text}</span>;
                          })()}
                        </div>
                        <div className="table-cell last-match">
                          {player.lastMatch ? (
                            <div style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                              <div style={{ fontWeight: 'bold', color: player.lastMatch.result === 'W' ? '#4CAF50' : '#f44336' }}>
                                {player.lastMatch.result === 'W' ? 'W' : 'L'} vs {player.lastMatch.opponent}
                              </div>
                              <div style={{ color: '#666', fontSize: '0.7rem' }}>
                                {new Date(player.lastMatch.date).toLocaleDateString()}
                              </div>
                              {player.lastMatch.venue && (
                                <div style={{ color: '#888', fontSize: '0.65rem' }}>
                                  {player.lastMatch.venue}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#999', fontSize: '0.8rem' }}>No matches</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {(!allLaddersData[ladderName] || allLaddersData[ladderName].length === 0) && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem', 
                    color: '#ccc',
                    fontStyle: 'italic'
                  }}>
                    No players in this ladder yet
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {!isPublicView && (
          <button onClick={() => setCurrentView('main')} className="back-btn">
            ← Back to Main Menu
          </button>
        )}
      </div>
    );
  };

  const renderMatchesView = () => {
    console.log('🔍 renderMatchesView - playerMatches:', playerMatches);
    console.log('🔍 renderMatchesView - playerMatches length:', playerMatches.length);
    
    // Sort matches by date (most recent first)
    const sortedMatches = [...playerMatches].sort((a, b) => {
      const dateA = new Date(a.scheduledDate || a.completedDate);
      const dateB = new Date(b.scheduledDate || b.completedDate);
      return dateB - dateA;
    });

    console.log('🔍 sortedMatches:', sortedMatches);

    // Group matches by status - check what status values we actually have
    const statusValues = [...new Set(sortedMatches.map(match => match.status))];
    console.log('🔍 Available status values:', statusValues);
    
    // Debug each match's status
    sortedMatches.forEach((match, index) => {
      console.log(`🔍 Match ${index + 1}:`, {
        id: match._id,
        status: match.status,
        player1: match.player1?.firstName + ' ' + match.player1?.lastName,
        player2: match.player2?.firstName + ' ' + match.player2?.lastName,
        scheduledDate: match.scheduledDate,
        completedDate: match.completedDate
      });
    });
    
    // ONLY SHOW COMPLETED MATCHES - NO UPCOMING/SCHEDULED MATCHES
    const completedMatches = sortedMatches.filter(match => 
      match.status === 'completed'
    );
    
    console.log('🔍 completedMatches count:', completedMatches.length);
    console.log('🔍 completedMatches:', completedMatches);
    
    // Debug which matches are in completed category
    console.log('🔍 COMPLETED MATCHES ONLY:');
    completedMatches.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.player1?.firstName} ${match.player1?.lastName} vs ${match.player2?.firstName} ${match.player2?.lastName} - Status: ${match.status}`);
    });

    return (
      <div className="matches-view">
        <div className="view-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2>🎯 My Completed Matches</h2>
              <p>View your completed match history</p>
            </div>
            <button 
              onClick={() => navigateToView('main')}
              style={{
                background: 'linear-gradient(45deg, #ff4444, #ff6b35)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255, 68, 68, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(45deg, #ff5722, #ff9800)';
                e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.4)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(45deg, #ff4444, #ff6b35)';
                e.target.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.3)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ← Back to Ladder
            </button>
          </div>
        </div>

        {matchesLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your matches...</p>
          </div>
        ) : completedMatches.length === 0 ? (
          <div className="no-matches">
            <div className="no-matches-icon">🎱</div>
            <h3>No Completed Matches Yet</h3>
            <p>You haven't completed any matches yet. Challenge another player to get started!</p>
            <button 
              onClick={() => navigateToView('ladders')}
              className="challenge-button"
            >
              View Ladder & Challenge Players
            </button>
          </div>
        ) : (
          <div className="matches-list">
            {/* Completed Matches Section - ONLY SHOW COMPLETED MATCHES */}
            {completedMatches.length > 0 && (
              <>
                <div className="matches-section-header">
                  <h3>✅ Completed Matches ({completedMatches.length})</h3>
                </div>
                {completedMatches.map((match, index) => {
                  // Determine if the current user won or lost
                  const currentUserEmail = userLadderData?.email?.toLowerCase();
                  const currentUserName = `${userLadderData?.firstName} ${userLadderData?.lastName}`.toLowerCase();
                  
                  
                  // Check winner by email first, then by name
                  let isCurrentUserWinner = false;
                  if (match.winner?.email) {
                    isCurrentUserWinner = match.winner.email.toLowerCase() === currentUserEmail;
                  } else if (match.winner?.firstName && match.winner?.lastName) {
                    const winnerName = `${match.winner.firstName} ${match.winner.lastName}`.toLowerCase();
                    isCurrentUserWinner = winnerName === currentUserName;
                  }
                  
                  const isCurrentUserPlayer1 = match.player1?.email?.toLowerCase() === currentUserEmail || 
                    `${match.player1?.firstName} ${match.player1?.lastName}`.toLowerCase() === currentUserName;
                  const isCurrentUserPlayer2 = match.player2?.email?.toLowerCase() === currentUserEmail || 
                    `${match.player2?.firstName} ${match.player2?.lastName}`.toLowerCase() === currentUserName;
                  
                  
                  // Get opponent info
                  const opponent = isCurrentUserPlayer1 ? match.player2 : match.player1;
                  
                  return (
                    <div key={match._id || index} className={`match-card completed ${isCurrentUserWinner ? 'win' : 'loss'}`}>
                      {/* Match Header */}
                      <div className="match-header">
                        <div className="match-type">
                          {match.matchType === 'challenge' ? '⚔️ Challenge' : 
                           match.matchType === 'ladder-jump' ? '🚀 Ladder Jump' :
                           match.matchType === 'smackdown' ? '💥 SmackDown' : '🎯 Match'}
                        </div>
                        <div className="match-status completed">
                          ✅ Completed
                        </div>
                        <div className="match-date">
                          📅 {match.completedDate ? new Date(match.completedDate).toLocaleDateString() : 
                               match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      
                      {/* Opponent Info */}
                      <div className="opponent-info">
                        <div className="opponent-name">
                          <span className="vs">vs</span> {opponent?.firstName} {opponent?.lastName} <span className="rank">#{opponent?.position || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Match Result */}
                      <div className="match-result">
                        <div className="result-icon">
                          {isCurrentUserWinner ? '🏆' : '💔'}
                        </div>
                        <div className="result-text">
                          {isCurrentUserWinner ? `Winner: ${userLadderData?.firstName} ${userLadderData?.lastName}` : `Winner: ${match.winner?.firstName} ${match.winner?.lastName}`}
                        </div>
                        {match.score && (
                          <div className="score-display">
                            Score: {match.score}
                          </div>
                        )}
                      </div>

                      {/* Match Details Grid */}
                      <div className="match-details-grid">
                        <div className="detail-item">
                          <div className="detail-icon">📅</div>
                          <div className="detail-content">
                            <div className="detail-label">Date</div>
                            <div className="detail-value">
                              {match.completedDate ? new Date(match.completedDate).toLocaleDateString() : 
                               match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-icon">🎮</div>
                          <div className="detail-content">
                            <div className="detail-label">Game</div>
                            <div className="detail-value">{match.gameType || '8-Ball'}</div>
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-icon">🏁</div>
                          <div className="detail-content">
                            <div className="detail-label">Race to</div>
                            <div className="detail-value">{match.raceLength || '5'}</div>
                          </div>
                        </div>
                        
                        {match.venue && (
                          <div className="detail-item">
                            <div className="detail-icon">📍</div>
                            <div className="detail-content">
                              <div className="detail-label">Location</div>
                              <div className="detail-value">{match.venue}</div>
                            </div>
                          </div>
                        )}
                        
                        {match.ladderDisplayName && (
                          <div className="detail-item">
                            <div className="detail-icon">🏆</div>
                            <div className="detail-content">
                              <div className="detail-label">Ladder</div>
                              <div className="detail-value">{match.ladderDisplayName}</div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </>
            )}

          </div>
        )}
      </div>
    );
  };

  const renderMainView = () => {
    return (
      <>
        <LadderErrorBoundary>
          <UserStatusCard 
            userLadderData={displayUserData || userLadderData}
            setShowUnifiedSignup={setShowUnifiedSignup}
            setShowProfileModal={setShowProfileModal}
            isAdmin={isAdmin}
            isProfileComplete={isProfileComplete}
            setShowPaymentDashboard={setShowPaymentDashboard}
            setShowPaymentInfo={handleShowPaymentInfo}
          />
        </LadderErrorBoundary>

        {/* Prize Pool Tracker - Show for active ladder players */}
        {userLadderData?.playerId === 'ladder' && userLadderData?.ladderName && (
          <LadderErrorBoundary>
            <div style={{ marginBottom: '20px', padding: '0 20px' }}>
              <LadderPrizePoolTracker selectedLadder={userLadderData.ladderName} />
            </div>
          </LadderErrorBoundary>
        )}

        {/* News Ticker - Positioned below the ladder status section */}
        <LadderErrorBoundary>
          <div style={{ 
            marginBottom: '20px',
            padding: '0 20px'
          }}>
            <LadderNewsTicker isAdmin={isAdmin} />
          </div>
        </LadderErrorBoundary>

        {/* Profile Completion Timeline - Show for users who need to complete profile */}
        {((userLadderData?.needsClaim || userLadderData?.playerId === 'unknown') || 
          (userLadderData?.playerId === 'ladder' && !isProfileComplete && !userLadderData?.unifiedAccount?.unifiedUserId)) && !isAdmin && (
          <LadderErrorBoundary>
            <div className="profile-completion-timeline">
              <div className="timeline-header">
                <h3>⚔️ Complete Your Profile To Participate in the Ladder!</h3>
                <p>Add your availability and locations to start receiving challenges from other players:</p>
              </div>
              
              <div className="timeline-steps">
                <div className="timeline-step">
                  <div className="step-circle">
                    <span className="step-number">1</span>
                  </div>
                  <div className="step-content">
                    <h4>Add Profile Info</h4>
                    <p>Availability & locations</p>
                  </div>
                  <div className="step-connector"></div>
                </div>
                
                <div className="timeline-step">
                  <div className="step-circle">
                    <span className="step-number">2</span>
                  </div>
                  <div className="step-content">
                    <h4>Start Playing</h4>
                    <p>Challenge others!</p>
                  </div>
                </div>
              </div>
              
              <div className="timeline-action">
                <button 
                  className="complete-profile-btn"
                  onClick={() => setShowProfileModal(true)}
                >
                  📝 Complete My Profile
                </button>
              </div>
            </div>
          </LadderErrorBoundary>
        )}

        <LadderErrorBoundary>
          <NavigationMenu
            isPublicView={isPublicView}
            navigateToView={navigateToView}
            userLadderData={userLadderData}
            handleSmartMatch={handleSmartMatch}
            setCurrentView={setCurrentView}
            pendingChallenges={pendingChallenges}
            setShowMatchReportingModal={setShowMatchReportingModal}
            setShowPaymentDashboard={setShowPaymentDashboard}
            setShowPrizePoolModal={setShowPrizePoolModal}
            setShowUnifiedSignup={setShowUnifiedSignup}
            setShowRulesModal={setShowRulesModal}
            setShowContactAdminModal={setShowContactAdminModal}
            isAdmin={isAdmin}
            setShowApplicationsManager={setShowApplicationsManager}
            setShowMatchCalendar={setShowMatchCalendar}
            setShowAdminMessagesModal={setShowAdminMessagesModal}
          />
        </LadderErrorBoundary>
      </>
    );
  };

  if (loading) {
    return (
      <div className="ladder-app-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading ladder data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Ladder-specific floating logos - only Legends logo and pool balls */}
      <LadderFloatingLogos />
    <div 
      className={`ladder-app-container ${isPublicView ? 'public-view' : ''}`}
      style={isPublicView ? { 
        maxWidth: 'none', 
        width: '100%', 
        minWidth: '100%',
        border: '0',
        padding: '0',
        margin: '0'
      } : {}}
    >
      


      {/* Header */}

      {/* Main Content */}
              {currentView === 'ladders' && renderLadderView()}
        {currentView === 'challenges' && renderChallengesView()}
      {currentView === 'challenge' && renderChallengeView()}
      {currentView === 'matches' && renderMatchesView()}
      {currentView === 'main' && renderMainView()}

      {!isPublicView && !userLadderData?.canChallenge && !isAdmin && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          color: '#ffc107',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>🔒 Challenge Features Locked</p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
            {userLadderData?.isPromotionalPeriod 
              ? 'Complete your profile (add available dates and locations) to unlock challenge features during our promotional period!'
              : 'To challenge other players and report matches, you need a $10/month membership.'
            }
          </p>
          <button 
            onClick={() => setShowClaimFormState(true)}
            style={{
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Create Free Account
          </button>
        </div>
      )}

      {!isPublicView && userLadderData?.canChallenge && userLadderData?.isPromotionalPeriod && !isAdmin && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          color: '#4CAF50',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>🎉 Promotional Period Active</p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
            🎉 FREE Monthly Membership until October 31st, 2025! All challenge features are unlocked during this promotional period.
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#66BB6A' }}>
            💡 <strong>Note:</strong> You must complete your profile (add availability and locations) to be able to receive challenges from other players.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="ladder-footer">
        {isPublicView ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
            <h3 style={{ color: '#8B5CF6', marginBottom: '15px' }}>🏆 Ladder of Legends 🏆</h3>
            <p style={{ marginBottom: '10px', fontSize: '16px' }}>
              <strong>Ready to join the competition?</strong>
            </p>
            <p style={{ marginBottom: '15px', fontSize: '14px', color: '#ccc' }}>
              Challenge players, climb the ranks, and compete for prizes!
            </p>
            <p style={{ fontSize: '14px', color: '#ffc107' }}>
              <strong>Visit <a href="https://frontrangepool.com" style={{ color: '#ffc107', textDecoration: 'underline' }}>FrontRangePool.com</a> to get started!</strong>
            </p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '15px' }}>
              © 2025 Front Range Pool League
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p>Challenge your way to the top! 🏆</p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
              © 2025 Front Range Pool League
            </p>
          </div>
        )}
      </div>

             {/* Supabase Signup/Claim Modal */}
       {showUnifiedSignup && (
         <>
           {console.log('🔍 LadderApp: Rendering SupabaseSignupModal, showUnifiedSignup:', showUnifiedSignup)}
           {console.log('🔍 LadderApp: selectedPlayerForStats:', selectedPlayerForStats)}
           <SupabaseSignupModal 
             isOpen={showUnifiedSignup}
             onClose={() => {
               console.log('🔍 LadderApp: SupabaseSignupModal onClose called');
               setShowUnifiedSignup(false);
             }}
             claimingPlayer={selectedPlayerForStats ? {
               firstName: selectedPlayerForStats.firstName,
               lastName: selectedPlayerForStats.lastName,
               fargoRate: selectedPlayerForStats.fargoRate,
               ladderName: selectedPlayerForStats.ladderName,
               position: selectedPlayerForStats.position
             } : null}
             onSuccess={(data) => {
               console.log('Signup successful:', data);
               setShowUnifiedSignup(false);
               // Refresh the page to show updated status
               window.location.reload();
             }}
           />
         </>
       )}

       {/* Profile Completion Prompt */}
       {showProfileCompletionPrompt && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           background: 'rgba(0, 0, 0, 0.8)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 99999,
           padding: '20px'
         }}>
           <div style={{
             background: 'white',
             borderRadius: '12px',
             padding: '30px',
             maxWidth: '500px',
             width: '100%',
             textAlign: 'center',
             boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
           }}>
             <h2 style={{ margin: '0 0 16px 0', color: '#333' }}>
               📝 Complete Your Profile
             </h2>
             <p style={{ margin: '0 0 24px 0', color: '#666', lineHeight: '1.5' }}>
               Please complete your profile with contact information, availability, and preferred locations to get full ladder access.
             </p>
             <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
               <button
                 onClick={() => setShowProfileCompletionPrompt(false)}
                 style={{
                   padding: '12px 24px',
                   border: '1px solid #ddd',
                   borderRadius: '6px',
                   background: '#f5f5f5',
                   cursor: 'pointer',
                   fontSize: '14px'
                 }}
               >
                 Later
               </button>
               <button
                 onClick={() => {
                   setShowProfileCompletionPrompt(false);
                   setShowUnifiedSignup(true);
                 }}
                 style={{
                   padding: '12px 24px',
                   border: 'none',
                   borderRadius: '6px',
                   background: '#4CAF50',
                   color: 'white',
                   cursor: 'pointer',
                   fontSize: '14px',
                   fontWeight: 'bold'
                 }}
               >
                 Complete Profile
               </button>
             </div>
           </div>
         </div>
       )}

               {/* Applications Manager Modal */}
        {showApplicationsManager && (
          <LadderApplicationsManager 
            onClose={() => setShowApplicationsManager(false)}
            onPlayerApproved={() => {
              // Refresh ladder data when a player is approved
              loadData();
            }}
            userToken={userToken}
          />
        )}

      {/* Ladder of Legends Rules Modal */}
      <LadderOfLegendsRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        isMobile={false}
        onContactAdmin={() => setShowContactAdminModal(true)}
      />

      {/* Contact Admin Modal */}
      <ContactAdminModal
        isOpen={showContactAdminModal}
        onClose={() => setShowContactAdminModal(false)}
      />

      {/* Admin Messages Modal */}
      <AdminMessagesModal
        isOpen={showAdminMessagesModal}
        onClose={() => setShowAdminMessagesModal(false)}
      />



      {/* Challenge System Modals */}
      {showChallengeModal && selectedDefender && (
        <LadderChallengeModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          challenger={userLadderData}
          defender={selectedDefender}
          challengeType={challengeType}
          onChallengeComplete={handleChallengeComplete}
        />
      )}

      {showChallengeConfirmModal && selectedChallenge && (
        <LadderChallengeConfirmModal
          isOpen={showChallengeConfirmModal}
          onClose={() => setShowChallengeConfirmModal(false)}
          challenge={selectedChallenge}
          currentUser={userLadderData}
          onChallengeResponse={handleChallengeResponse}
        />
      )}

             {showSmartMatchModal && (
         <LadderSmartMatchModal
           isOpen={showSmartMatchModal}
           onClose={() => setShowSmartMatchModal(false)}
           challenger={userLadderData}
           availableDefenders={availableDefenders}
           ladderData={ladderData}
           onChallengeComplete={handleChallengeComplete}
         />
       )}
       
       {showPrizePoolModal && (
         <LadderPrizePoolModal
           isOpen={showPrizePoolModal}
           onClose={() => setShowPrizePoolModal(false)}
           selectedLadder={selectedLadder}
         />
       )}
       
        
        {showPaymentDashboard && (
          <PaymentDashboard
            isOpen={showPaymentDashboard}
            onClose={() => setShowPaymentDashboard(false)}
            playerEmail={userLadderData?.email || `${playerName}@example.com`}
            isPromotionalPeriod={userLadderData?.isPromotionalPeriod || false}
          />
        )}

        {showMatchCalendar && (
          <LadderMatchCalendar
            isOpen={showMatchCalendar}
            onClose={() => {
              console.log('📅 LadderApp: Closing calendar');
              setShowMatchCalendar(false);
            }}
          />
        )}

        <LadderErrorBoundary>
          <PlayerStatsModal
            showMobilePlayerStats={showMobilePlayerStats}
            selectedPlayerForStats={selectedPlayerForStats}
            setShowMobilePlayerStats={setShowMobilePlayerStats}
            updatedPlayerData={updatedPlayerData}
            lastMatchData={lastMatchData}
            playerMatchHistory={playerMatchHistory}
            showFullMatchHistory={showFullMatchHistory}
            setShowFullMatchHistory={setShowFullMatchHistory}
            getPlayerStatus={getPlayerStatus}
            fetchUpdatedPlayerData={fetchUpdatedPlayerData}
            setShowUnifiedSignup={setShowUnifiedSignup}
            isPublicView={isPublicView}
            getChallengeReason={getChallengeReason}
            userLadderData={userLadderData}
          />
        </LadderErrorBoundary>

        <LadderErrorBoundary>
          <FullMatchHistoryModal
            showFullMatchHistory={showFullMatchHistory}
            selectedPlayerForStats={selectedPlayerForStats}
            setShowFullMatchHistory={setShowFullMatchHistory}
            setShowMobilePlayerStats={setShowMobilePlayerStats}
            playerMatchHistory={playerMatchHistory}
            isPublicView={isPublicView}
          />
        </LadderErrorBoundary>

        {/* Notification Permission Modal */}
        {showNotificationPermission && (
          <NotificationPermissionModal
            isOpen={showNotificationPermission}
            onClose={() => setShowNotificationPermission(false)}
            onPermissionGranted={() => {
              setShowNotificationPermission(false);
              console.log('✅ Notification permission granted!');
            }}
          />
        )}
        
     </div>
     
     {/* Match Reporting Modal - Always rendered to get setShowPaymentInfo function */}
     <LadderMatchReportingModal
       isOpen={showMatchReportingModal}
       onClose={() => setShowMatchReportingModal(false)}
       playerName={senderEmail}
       selectedLadder={selectedLadder}
       isAdmin={isAdmin}
       userLadderData={userLadderData}
       isPromotionalPeriod={userLadderData?.isPromotionalPeriod || false}
       setShowPaymentDashboard={setShowPaymentDashboard}
       onMatchReported={(matchData) => {
         // Refresh ladder data after match is reported
         loadData();
         loadChallenges();
       }}
         onPaymentInfoModalReady={(setShowPaymentInfoFn) => {
           setSetShowPaymentInfo(() => setShowPaymentInfoFn);
         }}
     />
     
     {/* Payment Information Modal - Independent of Match Reporting Modal */}
     {showPaymentInfoModal && (
       <div style={{
         position: 'fixed',
         top: 0,
         left: 0,
         right: 0,
         bottom: 0,
         background: 'rgba(0, 0, 0, 0.8)',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         zIndex: 10000
       }}>
         <div style={{
           background: 'rgba(20, 20, 20, 0.95)',
           border: '2px solid rgba(255, 68, 68, 0.3)',
           borderRadius: '12px',
           padding: '1.5rem',
           maxWidth: '80vw',
           width: '80vw',
           maxHeight: '95vh',
           overflowY: 'auto',
           position: 'relative'
         }}>
           {/* Close Button */}
           <button
             onClick={() => setShowPaymentInfoModal(false)}
             style={{
               position: 'absolute',
               top: '15px',
               right: '20px',
               background: 'none',
               border: 'none',
               color: '#ccc',
               fontSize: '1.5rem',
               cursor: 'pointer',
               padding: '5px',
               borderRadius: '50%',
               width: '40px',
               height: '40px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               transition: 'all 0.2s ease'
             }}
             onMouseEnter={(e) => {
               e.target.style.background = 'rgba(255, 255, 255, 0.1)';
               e.target.style.color = '#fff';
             }}
             onMouseLeave={(e) => {
               e.target.style.background = 'none';
               e.target.style.color = '#ccc';
             }}
           >
             ×
           </button>

           {/* Header */}
           <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
             <h2 style={{ color: '#ff4444', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
               💳 Payment Information
             </h2>
             <p style={{ color: '#ccc', margin: 0, fontSize: '1rem' }}>
               Understanding subscription and match reporting fees
             </p>
           </div>

           {/* Content */}
           <div style={{ 
             display: 'grid', 
             gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))',
             gap: '1.5rem',
             maxWidth: '500px',
             margin: '0 auto'
           }}>
             {/* Membership Subscription */}
             <div style={{
               background: 'rgba(33, 150, 243, 0.1)',
               border: '1px solid rgba(33, 150, 243, 0.3)',
               borderRadius: '8px',
               padding: '1.5rem'
             }}>
               <h3 style={{ color: '#2196f3', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                 📅 Monthly Membership - $10/month
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                 <p style={{ margin: '0 0 0.75rem 0' }}>
                   <strong>What it includes:</strong>
                 </p>
                 <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                   <li>Access to all ladder divisions</li>
                   <li>Challenge other players</li>
                   <li>View ladder standings and statistics</li>
                   <li>Participate in tournaments and events</li>
                   <li>Receive notifications and updates</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50' }}>
                   <strong>Note:</strong> Membership is required to report match results. Free membership promotional period ends Oct, 31, 2025.If your membership expires, you'll need to renew it ($10) plus pay the match fee ($5) = $15 total.
                 </p>
               </div>
             </div>

             {/* Match Reporting Fee */}
             <div style={{
               background: 'rgba(76, 175, 80, 0.1)',
               border: '1px solid rgba(76, 175, 80, 0.3)',
               borderRadius: '8px',
               padding: '1.5rem'
             }}>
               <h3 style={{ color: '#4caf50', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                 🏆 Match Reporting Fee - $5 per match
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                 <p style={{ margin: '0 0 0.75rem 0' }}>
                   <strong>How it works:</strong>
                 </p>
                 <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                   <li>Only the <strong>winner</strong> pays the $5 fee</li>
                   <li>One fee per match (not per player)</li>
                   <li>Fee is paid when reporting the match result</li>
                   <li>Supports the ladder system and prize pools</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#ff9800' }}>
                   <strong>Example:</strong> If you win a match, you pay $5 to report the result. The loser pays nothing.
                 </p>
               </div>
             </div>

             {/* Payment Methods */}
             <div style={{
               background: 'rgba(255, 193, 7, 0.1)',
               border: '1px solid rgba(255, 193, 7, 0.3)',
               borderRadius: '8px',
               padding: '1.5rem'
             }}>
               <h3 style={{ color: '#ffc107', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                 💳 Payment Methods
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                 <p style={{ margin: '0 0 0.75rem 0' }}>
                   <strong>We accept:</strong>
                 </p>
                 <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                   <li>CashApp</li>
                   <li>Venmo</li>
                   <li>PayPal</li>
                   <li>Credit/Debit Cards (via Square)</li>
                   <li>Credits (pre-purchased balance)</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50' }}>
                   <strong>Tip:</strong> Buy credits in advance for instant match reporting without verification delays!
                 </p>
               </div>
             </div>

             {/* Trust System */}
             <div style={{
               background: 'rgba(156, 39, 176, 0.1)',
               border: '1px solid rgba(156, 39, 176, 0.3)',
               borderRadius: '8px',
               padding: '1.5rem'
             }}>
               <h3 style={{ color: '#9c27b0', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                 🛡️ Trust & Verification System
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                 <p style={{ margin: '0 0 0.75rem 0' }}>
                   <strong>How verification works:</strong>
                 </p>
                 <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
                   <li><strong>New users:</strong> Payments require admin verification (24-48 hours)</li>
                   <li><strong>Verified users:</strong> 3+ successful payments = auto-approval</li>
                   <li><strong>Trusted users:</strong> 10+ successful payments = instant processing</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50' }}>
                   <strong>Build trust:</strong> Make successful payments to earn faster processing!
                 </p>
               </div>
             </div>
           </div>

           {/* Close Button */}
           <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
             <button
               onClick={() => setShowPaymentInfoModal(false)}
               style={{
                 background: 'rgba(255, 68, 68, 0.8)',
                 color: '#fff',
                 border: 'none',
                 padding: '12px 24px',
                 borderRadius: '8px',
                 fontSize: '1rem',
                 fontWeight: 'bold',
                 cursor: 'pointer',
                 transition: 'all 0.2s ease'
               }}
               onMouseEnter={(e) => {
                 e.target.style.background = 'rgba(255, 68, 68, 1)';
               }}
               onMouseLeave={(e) => {
                 e.target.style.background = 'rgba(255, 68, 68, 0.8)';
               }}
             >
               Close
             </button>
           </div>
         </div>
       </div>
     )}
     
     {/* Forfeit Report Modal */}
     <ForfeitReportModal
       isOpen={showForfeitReportModal}
       onClose={() => {
         setShowForfeitReportModal(false);
         setSelectedMatchForAction(null);
       }}
       match={selectedMatchForAction}
       currentUser={userLadderData}
       onForfeitSubmitted={(result) => {
         console.log('Forfeit submitted:', result);
         setShowForfeitReportModal(false);
         setSelectedMatchForAction(null);
         // Reload challenges and matches
         loadData();
       }}
     />
     
     {/* Reschedule Request Modal */}
     <RescheduleRequestModal
       isOpen={showRescheduleRequestModal}
       onClose={() => {
         setShowRescheduleRequestModal(false);
         setSelectedMatchForAction(null);
       }}
       match={selectedMatchForAction}
       currentUser={userLadderData}
       onRescheduleSubmitted={(result) => {
         console.log('Reschedule requested:', result);
         setShowRescheduleRequestModal(false);
         setSelectedMatchForAction(null);
         // Reload matches
         loadData();
       }}
     />
     
     {/* Reschedule Response Modal */}
     <RescheduleResponseModal
       isOpen={showRescheduleResponseModal}
       onClose={() => {
         setShowRescheduleResponseModal(false);
         setSelectedRescheduleRequest(null);
       }}
       rescheduleRequest={selectedRescheduleRequest}
       currentUser={userLadderData}
       onResponseSubmitted={(action, result) => {
         console.log('Reschedule response:', action, result);
         setShowRescheduleResponseModal(false);
         setSelectedRescheduleRequest(null);
         // Reload matches
         loadData();
       }}
     />
    </>
   );
 };

export default LadderApp;
