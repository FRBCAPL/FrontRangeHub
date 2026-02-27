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
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { checkPaymentStatus, showPaymentRequiredModal } from '@shared/utils/utils/paymentStatus.js';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import { supabase } from '@shared/config/supabase.js';
import { getCurrentPhase, canReportMatchesWithoutMembership } from '@shared/utils/utils/phaseSystem.js';
import { 
  sanitizeInput, 
  sanitizeEmail, 
  sanitizeChallengeData,
  sanitizePlayerData,
  sanitizeNumber
} from '@shared/utils/utils/security.js';
import LadderApplicationsManager from '@shared/components/admin/admin/LadderApplicationsManager';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import LadderOfLegendsRulesModal from '@shared/components/modal/modal/LadderOfLegendsRulesModal';
import ContactAdminModal from './ContactAdminModal';
import LadderNewsTicker from './LadderNewsTicker';
import AdminMessagesModal from './AdminMessagesModal';
import LadderFloatingLogos from './LadderFloatingLogos';
import LadderHeader from './LadderHeader';
import LadderMatchCalendar from './LadderMatchCalendar';
import LadderTable from './LadderTable';
import NavigationMenu from './NavigationMenu';
import OnboardingHelpModal from './OnboardingHelpModal';
import PlayerStatsModal from './PlayerStatsModal';
import FullMatchHistoryModal from './FullMatchHistoryModal';
import UserStatusCard from './UserStatusCard';
import LadderErrorBoundary from './LadderErrorBoundary';
import SupabaseSignupModal from '@shared/components/auth/SupabaseSignupModal';

import LadderChallengeModal from './LadderChallengeModal';
import LadderChallengeConfirmModal from './LadderChallengeConfirmModal';
import LadderSmartMatchModal from './LadderSmartMatchModal';
import LadderPrizePoolTracker from './LadderPrizePoolTracker';
import LadderPrizePoolModal from './LadderPrizePoolModal';
import LadderMatchReportingModal from './LadderMatchReportingModal';
import MyChallengesModal from './MyChallengesModal';
import ForfeitReportModal from './ForfeitReportModal';
import RescheduleRequestModal from './RescheduleRequestModal';
import RescheduleResponseModal from './RescheduleResponseModal';
import PaymentDashboard from './PaymentDashboard';
import NotificationPermissionModal from '@shared/components/notifications/NotificationPermissionModal';
import notificationService from '@shared/services/services/notificationService';
import PromotionalPricingBanner from './PromotionalPricingBanner';
import TournamentBanner from '@shared/components/tournament/TournamentBanner';
import TournamentCard from '@shared/components/tournament/TournamentCard';
import TournamentNoticeCompact from '@shared/components/tournament/TournamentNoticeCompact';
import TournamentRegistrationModal from '@shared/components/tournament/TournamentRegistrationModal';
import TournamentInfoModal from '@shared/components/tournament/TournamentInfoModal';
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
  setShowProfileModal,
  profileRefreshKey = 0,
  viewAsUser: viewAsUserProp,
  onToggleUserView: onToggleUserViewProp
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewAsUserState, setViewAsUserState] = useState(false); // when true, admin sees app as a normal user
  const effectiveViewAsUser = viewAsUserProp !== undefined ? viewAsUserProp : viewAsUserState;
  const handleToggleUserView = onToggleUserViewProp || (() => setViewAsUserState(v => !v));
  const effectiveIsAdmin = isAdmin && !effectiveViewAsUser;
  const [currentView, setCurrentView] = useState(initialView);
  const [userLadderData, setUserLadderData] = useState(null);
  const [ladderData, setLadderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerStatus, setPlayerStatus] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [showApplicationsManager, setShowApplicationsManager] = useState(false);
  const [selectedLadder, setSelectedLadder] = useState('499-under');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showTournamentRegistrationModal, setShowTournamentRegistrationModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showTournamentInfoModal, setShowTournamentInfoModal] = useState(false);
  const [tournamentRefreshTrigger, setTournamentRefreshTrigger] = useState(0);

  // Debug tournament modal state changes
  useEffect(() => {
    console.log('🏆 LadderApp: showTournamentRegistrationModal changed to:', showTournamentRegistrationModal);
    console.log('🏆 LadderApp: selectedTournament changed to:', selectedTournament);
  }, [showTournamentRegistrationModal, selectedTournament]);
  const [hasManuallySelectedLadder, setHasManuallySelectedLadder] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(Date.now());

  const [availableLocations, setAvailableLocations] = useState([]);
  const [showUnifiedSignup, setShowUnifiedSignup] = useState(false);
  
  // Debug logging for showUnifiedSignup state changes
  useEffect(() => {
    console.log('🔍 LadderApp: showUnifiedSignup state changed to:', showUnifiedSignup);
  }, [showUnifiedSignup]);

  // Open payment dashboard when returning from Square or when URL has tab=payment-dashboard
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = location.search || '';
    const fromHash = hash.includes('credit_purchase_success=1') || hash.includes('membership_purchase_success=1') || hash.includes('tab=payment-dashboard');
    const fromSearch = search.includes('credit_purchase_success=1') || search.includes('membership_purchase_success=1') || search.includes('tab=payment-dashboard');
    try {
      if (fromHash || fromSearch || sessionStorage.getItem('credit_purchase_return') === '1') {
        setShowPaymentDashboard(true);
      }
    } catch (_) {}
  }, [location.pathname, location.search]);

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
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [selectedDefender, setSelectedDefender] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeType, setChallengeType] = useState('challenge');
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [sentChallenges, setSentChallenges] = useState([]);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [showPrizePoolModal, setShowPrizePoolModal] = useState(false);
  const [showMatchReportingModal, setShowMatchReportingModal] = useState(false);
  const [preselectedMatchId, setPreselectedMatchId] = useState(null);
  const [showPaymentDashboard, setShowPaymentDashboard] = useState(false);
  const [paymentContext, setPaymentContext] = useState(null);
  const [smackBackEligible, setSmackBackEligible] = useState(false);
  const [showMatchCalendar, setShowMatchCalendar] = useState(false);
  const [setShowPaymentInfo, setSetShowPaymentInfo] = useState(null);
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  const [showAdminMessagesModal, setShowAdminMessagesModal] = useState(false);
  const [showOnboardingHelp, setShowOnboardingHelp] = useState(false);
  const [gettingStartedAtEnd, setGettingStartedAtEnd] = useState(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem('ladder_getting_started_at_end') === 'true'
  );
  const [showForfeitReportModal, setShowForfeitReportModal] = useState(false);
  const [showRescheduleRequestModal, setShowRescheduleRequestModal] = useState(false);
  const [showRescheduleResponseModal, setShowRescheduleResponseModal] = useState(false);
  const [selectedMatchForAction, setSelectedMatchForAction] = useState(null);
  const [selectedRescheduleRequest, setSelectedRescheduleRequest] = useState(null);

  const getLadderNameFromFargo = (fargoRate) => {
    const rating = Number(fargoRate || 0);
    if (rating >= 550) return '550-plus';
    if (rating >= 500) return '500-549';
    return '499-under';
  };

  const getLadderLabel = (ladderName) => {
    if (ladderName === '499-under') return '499 & Under';
    if (ladderName === '500-549') return '500-549';
    if (ladderName === '550-plus') return '550+';
    return ladderName || '499 & Under';
  };
  
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
  const [playerStatsOpenedFromCalendar, setPlayerStatsOpenedFromCalendar] = useState(false);
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
  const [statusToast, setStatusToast] = useState(null);
  
  // Debounced loadData function - moved to top to avoid hoisting issues
  const loadDataTimeoutRef = useRef(null);

  useEffect(() => {
    if (!statusToast) return undefined;
    const timer = setTimeout(() => setStatusToast(null), 3500);
    return () => clearTimeout(timer);
  }, [statusToast]);
  
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
  
  // Function to update user's wins/losses from ladder data.
  // Uses functional setState so callback has no deps - avoids loadData re-run loop (especially in guest mode).
  const updateUserWinsLosses = useCallback((ladderData, userEmail) => {
    if (!ladderData || !Array.isArray(ladderData) || !userEmail) return;
    const emailLower = (userEmail || '').toLowerCase();
    const currentUserInLadder = ladderData.find(player =>
      (player.email || '').toLowerCase() === emailLower ||
      (player.unifiedAccount?.email || '').toLowerCase() === emailLower
    );
    
    if (currentUserInLadder) {
      setUserLadderData(prev => {
        if (prev?.playerId !== 'ladder') return prev;
        console.log('🔍 Found current user in ladder data, updating wins/losses:', currentUserInLadder.wins, currentUserInLadder.losses);
        return {
          ...prev,
          wins: currentUserInLadder.wins || 0,
          losses: currentUserInLadder.losses || 0,
          totalMatches: currentUserInLadder.totalMatches || 0
        };
      });
    }
  }, []);
  
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
              userId: profile.user_id || null,
              email: profile.users?.email || '',
              firstName: profile.users?.first_name || '',
              lastName: profile.users?.last_name || '',
              position: profile.position,
              ladderName: profile.ladder_name || selectedLadder,
              fargoRate: profile.fargo_rate || 0,
              previousFargoRate: profile.previous_fargo_rate ?? null,
              totalMatches: profile.total_matches || 0,
              wins: profile.wins || 0,
              losses: profile.losses || 0,
              isActive: profile.is_active,
              immunityUntil: profile.immunity_until,
              smackbackEligibleUntil: profile.smackback_eligible_until,
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
      
      // When we have senderEmail, always fetch fresh profile from API first so merged/correct
      // ladder data shows (avoids stale localStorage hiding stats after account merge).
      const emailToUse = senderEmail || '';
      if (emailToUse) {
        const profileResult = await supabaseDataService.getPlayerProfileData(emailToUse, 'ladder');
        if (profileResult.success && profileResult.data?.ladderProfile) {
          const user = profileResult.data.user;
          const lp = profileResult.data.ladderProfile;
          setUserLadderData({
            playerId: 'ladder',
            userId: user?.id || null,
            name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || emailToUse,
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            email: (user?.email || emailToUse).trim(),
            fargoRate: lp.fargo_rate ?? 0,
            ladder: lp.ladder_name || '499-under',
            position: lp.position ?? null,
            wins: lp.wins ?? 0,
            losses: lp.losses ?? 0,
            immunityUntil: lp.immunity_until ?? null,
            activeChallenges: [],
            canChallenge: false,
            isActive: lp.is_active !== false,
            sanctioned: lp.sanctioned,
            sanctionYear: lp.sanction_year,
            stats: lp.stats,
            ladderProgression: lp.ladder_progression
          });
          await checkMembershipStatus(emailToUse);
        } else {
          await checkPlayerStatus(emailToUse);
        }
      } else {
        // No senderEmail - try localStorage then check status
        const unifiedUserData = localStorage.getItem("unifiedUserData");
        if (unifiedUserData) {
          try {
            const userData = JSON.parse(unifiedUserData);
            if (userData.ladderProfile) {
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
                isActive: true,
                sanctioned: ladderProfile.sanctioned,
                sanctionYear: ladderProfile.sanctionYear
              });
            } else {
              await checkPlayerStatus(userData.email);
            }
          } catch (error) {
            console.error('Error parsing unified user data:', error);
            await checkPlayerStatus(userData?.email || '');
          }
        } else {
          await checkPlayerStatus('');
        }
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
      console.log('🔍 Fetching matches from ALL ladders using Supabase...');
      
      // Determine which ladders to fetch from
      const ladderNames = effectiveIsAdmin ? ['499-under', '500-549', '550-plus', 'simulation'] : ['499-under', '500-549', '550-plus'];
      
      // Use Supabase service to get all player matches
      const result = await supabaseDataService.getAllPlayerMatches(userLadderData.email, ladderNames);
      
      if (result.success) {
        console.log('🔍 Total matches from Supabase:', result.matches.length);
        setPlayerMatches(result.matches);
      } else {
        console.error('🔍 Supabase Error:', result.error);
        setPlayerMatches([]);
      }
    } catch (error) {
      console.error('Error loading player matches:', error);
      setPlayerMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, [userLadderData?.email, isAdmin]);

  // Load matches when matches view is accessed
  useEffect(() => {
    if (currentView === 'matches') {
      loadPlayerMatches();
    }
  }, [currentView, userLadderData?.email, loadPlayerMatches]);

  // Load challenges when My Challenges modal is opened
  useEffect(() => {
    if (showChallengesModal && userLadderData?.email) {
      loadChallenges();
    }
  }, [showChallengesModal, userLadderData?.email, selectedLadder]);

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

  // Re-check membership status when email changes or when userLadderData is set
  useEffect(() => {
    const email = userLadderData?.email || senderEmail;
    if (email && !effectiveIsAdmin) {
      console.log('🔄 Re-checking membership status for:', email);
      checkMembershipStatus(email);
    }
  }, [userLadderData?.email, senderEmail]);

  // Load profile data from SimpleProfile
  const loadProfileData = async () => {
    if (!senderEmail) return;
    
    console.log('Loading profile data for email:', senderEmail);
    
    try {
      // Get user data from Supabase
      const userDataResult = await supabaseDataService.getPlayerProfileData(senderEmail, 'ladder');
      console.log('Loaded user data from Supabase:', userDataResult);
      
      const userData = userDataResult.success ? userDataResult.data.user : null;
      
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
      if (!senderEmail) return;
      
      try {
        // Get user data from Supabase (getUserByEmail returns { success, data }).
        const userResult = await supabaseDataService.getUserByEmail(senderEmail);
        const userData = userResult?.success ? userResult.data : null;
        if (!userData) return;

        // Normalize availability and locations because older profiles may store mixed formats.
        const rawAvailability = (() => {
          if (typeof userData.availability === 'string') {
            try {
              return JSON.parse(userData.availability);
            } catch (_) {
              return userData.availability;
            }
          }
          return userData.availability;
        })();

        const hasAvailability =
          rawAvailability &&
          (
            (Array.isArray(rawAvailability) && rawAvailability.length > 0) ||
            (typeof rawAvailability === 'string' && rawAvailability.trim() !== '') ||
            (typeof rawAvailability === 'object' &&
              Object.values(rawAvailability).some((slots) => {
                if (Array.isArray(slots)) {
                  return slots.some((slot) => String(slot).trim() !== '');
                }
                if (typeof slots === 'string') {
                  return slots.trim() !== '';
                }
                if (slots && typeof slots === 'object') {
                  return Object.keys(slots).length > 0;
                }
                return Boolean(slots);
              }))
          );

        const hasLocations = (
          (typeof userData.locations === 'string' &&
            userData.locations
              .split(/\n|,/)
              .map((loc) => loc.trim())
              .filter(Boolean).length > 0) ||
          (Array.isArray(userData.locations) && userData.locations.some((loc) => String(loc).trim() !== ''))
        );
        // Profile completion for ladder participation requires only locations + availability.
        const profileComplete = hasLocations && hasAvailability;
        setIsProfileComplete(profileComplete);
        
        console.log('Profile completion status:', {
          hasLocations, 
          hasAvailability,
          profileComplete
        });
      } catch (error) {
        console.error('Error checking profile completion:', error);
      }
    };

    checkProfileCompletion();
  }, [senderEmail, userLadderData?.playerId, profileRefreshKey]);

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
        
        // Process updates for the currently selected ladder
        if (payload.new && payload.new.ladder_name === selectedLadder) {
          console.log(`🔄 Processing realtime update for current ladder: ${selectedLadder}`);
          
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
                previousFargoRate: profile.previous_fargo_rate ?? null,
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
        } else {
          console.log(`🔄 Ignoring realtime update for different ladder: ${payload.new?.ladder_name} (current: ${selectedLadder})`);
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
              userId: profile.user_id || null,
              email: profile.users?.email || '',
              firstName: profile.users?.first_name || '',
              lastName: profile.users?.last_name || '',
              position: profile.position,
              ladderName: profile.ladder_name || selectedLadder,
              fargoRate: profile.fargo_rate || 0,
              previousFargoRate: profile.previous_fargo_rate ?? null,
              totalMatches: profile.total_matches || 0,
              wins: profile.wins || 0,
              losses: profile.losses || 0,
              isActive: profile.is_active,
              immunityUntil: profile.immunity_until,
              smackbackEligibleUntil: profile.smackback_eligible_until,
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
      const profileDataResult = await supabaseDataService.getPlayerProfileData(email, 'ladder');
      
      console.log('📋 Profile data from Supabase:', profileDataResult);
      
      if (!profileDataResult.success) {
        console.error('Failed to get profile data:', profileDataResult.error);
        return;
      }
      
      const userData = profileDataResult.data.user;
      const ladderProfile = profileDataResult.data.ladderProfile;
      const leagueProfile = profileDataResult.data.leagueProfile;
      const hasInactiveLadderProfile = !!ladderProfile && ladderProfile.is_active === false;
      const isPendingApproval = !!userData?.is_pending_approval || hasInactiveLadderProfile;
      const isApprovedWithoutLadder = !!userData && !ladderProfile && (userData.is_approved === true || userData.is_active === true || userData.is_pending_approval === false);
      
      // Create status object similar to old backend response
      const status = {
        isLadderPlayer: !!ladderProfile && ladderProfile.is_active !== false,
        hasLadderProfile: !!ladderProfile,
        isPendingApproval,
        isLeaguePlayer: !!leagueProfile,
        leagueInfo: leagueProfile ? {
          firstName: userData?.first_name || playerName,
          lastName: userData?.last_name || playerLastName,
          email: userData?.email || email
        } : null,
        unifiedAccount: userData ? {
          hasUnifiedAccount: !!userData,
          email: userData.email
        } : null
      };
      
      if (userData) {
        status.ladderInfo = {
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          fargoRate: ladderProfile?.fargo_rate || 0,
          fargoRateUpdatedAt: ladderProfile?.fargo_rate_updated_at,
          ladderName: ladderProfile?.ladder_name || '499-under',
          position: ladderProfile?.position || null,
          wins: ladderProfile?.wins || 0,
          losses: ladderProfile?.losses || 0,
          immunityUntil: ladderProfile?.immunity_until,
          isActive: ladderProfile?.is_active !== false,
          sanctioned: ladderProfile?.sanctioned,
          sanctionYear: ladderProfile?.sanction_year,
          stats: ladderProfile?.stats,
          ladderProgression: ladderProfile?.ladder_progression
        };
      }
      
      console.log('📋 Player status response:', status);
      setPlayerStatus(status);
      
      // Note: Only use ladder-specific data in LadderApp to maintain separation from league data
      
      if (status.isLadderPlayer) {
        // Player has ladder account; use canonical email from DB so stats/match lookups match
        const canonicalEmail = (userData?.email || email || '').trim();
        setUserLadderData({
          playerId: 'ladder',
          userId: userData?.id || null,
          name: `${status.ladderInfo.firstName || ''} ${status.ladderInfo.lastName || ''}`.trim() || (userData?.email || email),
          firstName: status.ladderInfo.firstName || playerName || '',
          lastName: status.ladderInfo.lastName || playerLastName || '',
          email: canonicalEmail,
          fargoRate: status.ladderInfo.fargoRate,
            fargoRateUpdatedAt: status.ladderInfo.fargoRateUpdatedAt,
          ladder: status.ladderInfo.ladderName,
          position: status.ladderInfo.position,
            wins: status.ladderInfo.wins || 0,
            losses: status.ladderInfo.losses || 0,
          immunityUntil: status.ladderInfo.immunityUntil,
          activeChallenges: [],
          canChallenge: false, // Will be updated after checking membership status
          pendingApproval: false,
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
      } else if (status.isPendingApproval) {
        // User has already registered and is waiting for admin approval
        setUserLadderData({
          playerId: 'pending',
          userId: userData?.id || null,
          name: `${userData?.first_name || playerName} ${userData?.last_name || playerLastName}`,
          firstName: userData?.first_name || playerName,
          lastName: userData?.last_name || playerLastName,
          email: email,
          fargoRate: ladderProfile?.fargo_rate || 450,
          ladder: ladderProfile?.ladder_name || 'Pending Approval',
          position: 'Pending Approval',
          immunityUntil: null,
          activeChallenges: [],
          canChallenge: false,
          pendingApproval: true
        });
      } else if (isApprovedWithoutLadder) {
        const assignedLadder = getLadderNameFromFargo(userData?.fargo_rate || 450);
        setUserLadderData({
          playerId: 'approved_no_ladder',
          userId: userData?.id || null,
          name: `${userData?.first_name || playerName} ${userData?.last_name || playerLastName}`,
          firstName: userData?.first_name || playerName,
          lastName: userData?.last_name || playerLastName,
          email: email,
          fargoRate: userData?.fargo_rate || 450,
          ladder: assignedLadder,
          assignedLadder,
          assignedLadderLabel: getLadderLabel(assignedLadder),
          position: 'Not yet placed',
          immunityUntil: null,
          activeChallenges: [],
          canChallenge: false,
          needsLadderPlacement: true
        });
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

  const handleJoinAssignedLadder = async () => {
    try {
      const email = userLadderData?.email || senderEmail;
      if (!email) return;

      let userId = userLadderData?.userId || null;
      if (!userId) {
        const userResult = await supabaseDataService.getUserByEmail(email);
        if (!userResult?.success || !userResult?.data?.id) {
          setStatusToast({
            type: 'error',
            message: 'Unable to find your account record. Please contact admin.'
          });
          return;
        }
        userId = userResult.data.id;
      }

      const ladderName = userLadderData?.assignedLadder || getLadderNameFromFargo(userLadderData?.fargoRate || 450);
      const addResult = await supabaseDataService.addUserToLadder(userId, ladderName);
      if (!addResult?.success) {
        setStatusToast({
          type: 'error',
          message: `Unable to join ladder right now: ${addResult?.error || 'Unknown error'}`
        });
        return;
      }

      setSelectedLadder(ladderName);
      await checkPlayerStatus(email);
      await loadData();
      await loadProfileData();

      const ladderLabel = getLadderLabel(ladderName);
      setStatusToast({
        type: 'success',
        message: getCurrentPhase().isFree
          ? `You are now in ${ladderLabel}. Challenge features are ready.`
          : `You are now in ${ladderLabel}. Next step: activate membership to unlock challenges.`
      });

      if (!getCurrentPhase().isFree) {
        setShowPaymentDashboard(true);
      }
    } catch (error) {
      console.error('Error joining assigned ladder:', error);
      setStatusToast({
        type: 'error',
        message: 'Something went wrong while joining your ladder. Please try again.'
      });
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
    
    // Both players must have linked accounts (userId + email)
    const hasChallengerAccount = !!(sanitizedChallenger.email || challenger?.email);
    const hasDefenderAccount = !!defender?.userId && !!(sanitizedDefender.email || defender?.email);
    if (!hasChallengerAccount) {
      console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} cannot challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} - Challenger account required`);
      return false;
    }
    if (!hasDefenderAccount) {
      console.log(`🚫 Challenge blocked: ${sanitizedChallenger.firstName} ${sanitizedChallenger.lastName} cannot challenge ${sanitizedDefender.firstName} ${sanitizedDefender.lastName} - Opponent profile incomplete`);
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
      
      // Get current phase information
      const phaseInfo = getCurrentPhase();
      const isFreePhase = phaseInfo.isFree; // Phase 1 is free
      
      if (paymentStatus) {
        // Update canChallenge based on membership status and current phase
        // Check multiple ways the membership might be indicated
        const hasMembershipFlag = paymentStatus.hasMembership === true || paymentStatus.has_membership === true;
        const statusValue = paymentStatus.status || paymentStatus.membership_status || 'inactive';
        const isActiveStatus = statusValue === 'active' || statusValue === 'free_phase' || statusValue === 'promotional_period';
        const hasActiveMembership = hasMembershipFlag && isActiveStatus;
        
        console.log('🔍 Membership check details:', {
          paymentStatus,
          hasMembershipFlag,
          statusValue,
          isActiveStatus,
          hasActiveMembership,
          paymentStatusKeys: Object.keys(paymentStatus || {}),
          paymentStatusFull: JSON.stringify(paymentStatus, null, 2)
        });
        
        setUserLadderData(prev => {
          console.log('🔍 Previous userLadderData:', prev);
          console.log('🔍 hasActiveMembership:', hasActiveMembership);
          console.log('🔍 isFreePhase (Phase 1):', isFreePhase);
          console.log('🔍 currentPhase:', phaseInfo.phase, phaseInfo.name);
          console.log('🔍 prev?.unifiedAccount?.hasUnifiedAccount:', prev?.unifiedAccount?.hasUnifiedAccount);
          
          // Admin users can always challenge
          // Phase 1 (free): Allow challenges for anyone (no membership required)
          // Phase 2/3: Require active membership OR unified account (even if no payment_status record exists - grace period)
          const hasUnifiedAccount = prev?.unifiedAccount?.hasUnifiedAccount === true;
          // Check if payment_status returned default/empty (404 means no record exists)
          const noPaymentRecord = !paymentStatus || 
            (paymentStatus.hasMembership === false && 
             paymentStatus.status === 'inactive' && 
             !paymentStatus.isPromotionalPeriod &&
             Object.keys(paymentStatus).length <= 3); // Default fallback object has 3 keys
          
          const newCanChallenge = effectiveIsAdmin || 
            isFreePhase || // Phase 1 is free for everyone
            hasActiveMembership || // Active membership allows challenges
            (hasUnifiedAccount && noPaymentRecord) || // Unified account but no payment record (grace period)
            (hasUnifiedAccount && hasActiveMembership); // Unified account with active membership
          console.log('🔍 Updated canChallenge to:', newCanChallenge, '(isAdmin:', isAdmin, ', hasMembership:', hasActiveMembership, ', isFreePhase:', isFreePhase, ', hasUnifiedAccount:', hasUnifiedAccount, ', noPaymentRecord:', noPaymentRecord, ')');
          
          const updatedData = {
            ...prev,
            canChallenge: newCanChallenge,
            membershipStatus: paymentStatus,
            currentPhase: phaseInfo.phase,
            phaseInfo: phaseInfo
          };
          
          console.log('🔍 Final updated userLadderData:', updatedData);
          console.log('🔍 Phase info in final data:', updatedData.phaseInfo);
          return updatedData;
        });
      } else {
        console.log('🔍 Failed to check membership status:', response.status);
        // If membership API is down, allow challenges during Phase 1 (graceful degradation)
        setUserLadderData(prev => {
          const fallbackCanChallenge = effectiveIsAdmin || isFreePhase; // Allow if admin or Phase 1
          console.log('🔍 Membership API failed, using fallback canChallenge:', fallbackCanChallenge, '(isFreePhase:', isFreePhase, ')');
          return {
            ...prev,
            canChallenge: fallbackCanChallenge,
            membershipStatus: null,
            currentPhase: phaseInfo.phase,
            phaseInfo: phaseInfo
          };
        });
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
      // If membership API throws an error, allow challenges during Phase 1 (graceful degradation)
      const phaseInfo = getCurrentPhase();
      const isFreePhase = phaseInfo.isFree;
      
      setUserLadderData(prev => {
        const fallbackCanChallenge = effectiveIsAdmin || isFreePhase; // Allow if admin or Phase 1
        console.log('🔍 Membership API error, using fallback canChallenge:', fallbackCanChallenge, '(isFreePhase:', isFreePhase, ')');
        return {
          ...prev,
          canChallenge: fallbackCanChallenge,
          membershipStatus: null,
          currentPhase: phaseInfo.phase,
          phaseInfo: phaseInfo
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
      const matchHistoryResult = await supabaseDataService.getPlayerMatchHistory(playerEmail, 20);
      
      if (!matchHistoryResult?.success || !matchHistoryResult.data || matchHistoryResult.data.length === 0) {
        console.log('No match history found for SmackBack check');
        return false;
      }
      
      const matches = matchHistoryResult.data;
      
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
      const cEmail = (challenger?.email || challenger?.unifiedAccount?.email || '').toString().trim();
      const dEmail = (defender?.email || defender?.unifiedAccount?.email || '').toString().trim();
      const hasChallengerAccount = !!cEmail;
      const hasDefenderAccount = !!defender?.userId && !!dEmail;

      // Check basic requirements - both must have linked accounts (userId + email)
      if (!hasChallengerAccount || !hasDefenderAccount) {
        return null;
      }
      if (cEmail && dEmail && cEmail.toLowerCase() === dEmail.toLowerCase()) {
        return null;
      }
      if (defender?.isActive === false) {
        return null;
      }
      if (defender?.immunityUntil && new Date(defender.immunityUntil) > new Date()) {
        return null;
      }
      
      const challengerPosition = sanitizeNumber(challenger?.position);
      const defenderPosition = sanitizeNumber(defender?.position);
      const positionDifference = defenderPosition - challengerPosition; // FIXED: defender - challenger
      
      // Debug logging
      console.log(`🔍 Challenge Type Check: ${challenger?.firstName} (Pos ${challengerPosition}) vs ${defender?.firstName} (Pos ${defenderPosition})`);
      console.log(`🔍 Position difference: ${positionDifference} (negative = defender is above challenger, positive = defender is below challenger)`);
      
      // SmackBack: Special case - can only challenge 1st place if you recently won a SmackDown
      if (defenderPosition === 1 && smackBackEligible) {
        console.log(`🔍 → SmackBack allowed (challenger recently won SmackDown, can challenge 1st place)`);
        return 'smackback';
      }
      
      // Fast Track: Check if challenger has Fast Track privileges and can use extended range
      const hasFastTrackPrivileges = challenger?.fastTrackChallengesRemaining > 0 && 
                                     challenger?.fastTrackExpirationDate && 
                                     new Date() < new Date(challenger.fastTrackExpirationDate);
      
      // Fast Track Challenge: Can challenge players above you (up to 6 positions with Fast Track privileges)
      if (hasFastTrackPrivileges && positionDifference >= -6 && positionDifference <= 0) {
        const challengesRemaining = challenger?.fastTrackChallengesRemaining;
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
      const cEmail = (challenger?.email || challenger?.unifiedAccount?.email || '').toString().toLowerCase().trim();
      const dEmail = (defender?.email || defender?.unifiedAccount?.email || '').toString().toLowerCase().trim();
      const cName = `${(challenger?.firstName || '')} ${(challenger?.lastName || '')}`.toLowerCase().trim();
      const dName = `${(defender?.firstName || '')} ${(defender?.lastName || '')}`.toLowerCase().trim();

      // Same player - check first (by email or name match)
      if (cEmail && dEmail && cEmail === dEmail) return 'Same player';
      if (cName && dName && cName === dName && challenger?.position === defender?.position) return 'Same player';

      // Different ladder - you can only challenge players on your ladder
      const challengerLadder = challenger?.ladder || challenger?.assignedLadder;
      const defenderLadder = defender?.ladderName || defender?.ladder;
      if (challengerLadder && defenderLadder && challengerLadder !== defenderLadder) {
        return 'Player is on a different ladder – you can only challenge players on your ladder';
      }

      // All approved ladder players have accounts. Placeholder/unclaimed positions lack userId or email.
      if (!cEmail) return 'Profile incomplete';
      if (!defender?.userId || !dEmail) return 'Opponent profile incomplete';
      if (!defender?.isActive) {
        return 'Defender inactive';
      }
      if (defender?.immunityUntil && new Date(defender.immunityUntil) > new Date()) {
        return 'Defender immune';
      }

      const challengerPosition = sanitizeNumber(challenger?.position);
      const defenderPosition = sanitizeNumber(defender?.position);
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
      const scheduledMatchesResult = await supabaseDataService.getScheduledMatches(selectedLadder || null);
      console.log('🔍 All scheduled matches from Supabase:', scheduledMatchesResult);
      
      const scheduledMatches = scheduledMatchesResult?.success ? scheduledMatchesResult.matches || [] : [];
      console.log('🔍 Looking for user email:', sanitizedEmail);
      console.log('🔍 Looking for user name:', `${userLadderData?.firstName} ${userLadderData?.lastName}`);
      
      // Filter to only show matches where the current user is a player
      // Get user ID for matching
      let userId = null;
      if (sanitizedEmail) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', sanitizedEmail.toLowerCase())
            .maybeSingle();
          if (userData && !userError) {
            userId = userData.id;
            console.log('🔍 Found user ID for matching:', userId);
          }
        } catch (e) {
          console.log('Could not get user ID:', e);
        }
      }
      
      const userScheduledMatches = scheduledMatches?.filter(match => {
        const userEmail = sanitizedEmail.toLowerCase();
        const userName = `${userLadderData?.firstName || ''} ${userLadderData?.lastName || ''}`.toLowerCase().trim();
        
        // Check by email (multiple possible field structures)
        const player1Email = (match.player1?.email || match.winner?.email)?.toLowerCase();
        const player2Email = (match.player2?.email || match.loser?.email)?.toLowerCase();
        const emailMatch = (player1Email === userEmail || player2Email === userEmail);
        
        // Check by name (multiple possible field structures)
        const player1FirstName = match.player1?.firstName || match.winner?.first_name || '';
        const player1LastName = match.player1?.lastName || match.winner?.last_name || '';
        const player1Name = `${player1FirstName} ${player1LastName}`.toLowerCase().trim();
        
        const player2FirstName = match.player2?.firstName || match.loser?.first_name || '';
        const player2LastName = match.player2?.lastName || match.loser?.last_name || '';
        const player2Name = `${player2FirstName} ${player2LastName}`.toLowerCase().trim();
        
        const nameMatch = (player1Name === userName || player2Name === userName);
        
        // Check by user ID
        const idMatch = userId && (match.winner_id === userId || match.loser_id === userId || match.player1?.id === userId || match.player2?.id === userId || match.player1?._id === userId || match.player2?._id === userId);
        
        const isMatch = emailMatch || nameMatch || idMatch;
        
        if (isMatch) {
          console.log('🔍 Found matching match:', {
            matchId: match.id || match._id,
            player1Email,
            player2Email,
            userEmail,
            player1Name,
            player2Name,
            userName,
            emailMatch,
            nameMatch,
            idMatch,
            winner_id: match.winner_id,
            loser_id: match.loser_id,
            userId
          });
        } else if (scheduledMatches.length > 0 && scheduledMatches.indexOf(match) === 0) {
          // Log first match structure for debugging
          console.log('🔍 Sample match structure:', {
            matchId: match.id || match._id,
            hasPlayer1: !!match.player1,
            hasPlayer2: !!match.player2,
            hasWinner: !!match.winner,
            hasLoser: !!match.loser,
            player1: match.player1,
            player2: match.player2,
            winner: match.winner,
            loser: match.loser,
            winner_id: match.winner_id,
            loser_id: match.loser_id
          });
        }
        
        return isMatch;
      }) || [];
      
      console.log('🔍 Filtered user scheduled matches:', userScheduledMatches);
      setScheduledMatches(userScheduledMatches);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const handleChallengePlayer = useCallback((defender, type = 'challenge') => {
    // Admin users bypass membership requirements
    if (!effectiveIsAdmin) {
      // Get current phase
      const phaseInfo = getCurrentPhase();
      const isFreePhase = phaseInfo.isFree;
      
      // Check if user has active membership OR in free phase before allowing challenge
      const hasActiveMembership = userLadderData?.membershipStatus?.hasMembership && 
        (userLadderData?.membershipStatus?.status === 'active' || userLadderData?.membershipStatus?.status === 'free_phase');
      
      // If membership API failed and we're using fallback, allow challenges
      const membershipApiFailed = !userLadderData?.membershipStatus && userLadderData?.canChallenge;
      
      if (!hasActiveMembership && !membershipApiFailed && !isFreePhase) {
        // Show payment required modal
        const userWantsToPay = confirm(
          isFreePhase 
            ? `🔒 Profile Incomplete\n\n` +
              `To challenge other players, you need to complete your profile by adding available dates and locations.\n\n` +
              `During Phase 1 (Testing), this is all you need to do!\n\n` +
              `Would you like to complete your profile now?`
            : `💳 Membership Required\n\n` +
              `To challenge other players, you need an active membership (${phaseInfo.description}).\n\n` +
              `Would you like to purchase a membership now?`
        );
        
        if (userWantsToPay) {
          if (isFreePhase) {
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
    
    // Check both immunity and SmackBack eligibility
    const hasImmunity = player.immunityUntil && new Date(player.immunityUntil) > new Date();
    const hasSmackBack = player.smackbackEligibleUntil && new Date(player.smackbackEligibleUntil) > new Date();
    
    // If player has SmackBack eligibility (with or without immunity)
    if (hasSmackBack) {
      const smackbackExpiry = new Date(player.smackbackEligibleUntil);
      const smackbackDaysLeft = Math.ceil((smackbackExpiry - new Date()) / (1000 * 60 * 60 * 24));
      
      return { 
        status: hasImmunity ? 'immune-smackback' : 'smackback', 
        text: (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            {hasImmunity && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#ff9800', 
                fontWeight: 'bold',
                background: 'rgba(255, 152, 0, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 152, 0, 0.3)'
              }}>
                🛡️ Immune
              </span>
            )}
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#8b5cf6', 
              fontWeight: 'bold',
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              🔄 SmackBack
            </span>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
              Exp: {smackbackExpiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ), 
        className: hasImmunity ? 'immune-smackback' : 'smackback-eligible' 
      };
    }
    
    // Check if player has immunity only
    if (hasImmunity) {
      const immunityExpiry = new Date(player.immunityUntil);
      return { 
        status: 'immune', 
        text: (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#ff9800', 
              fontWeight: 'bold',
              background: 'rgba(255, 152, 0, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 152, 0, 0.3)'
            }}>
              🛡️ Immune
            </span>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
              Exp: {immunityExpiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ),
        className: 'immune' 
      };
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

  // Fetch full player from other ladders when not in current ladderData (e.g. from calendar match)
  const fetchFullPlayerFromLadders = useCallback(async (calendarPlayer) => {
    const ladders = ['499-under', '500-549', '550-plus'];
    const email = calendarPlayer.email?.toLowerCase?.();
    const userId = calendarPlayer.id || calendarPlayer._id;
    for (const ladder of ladders) {
      const result = await supabaseDataService.getLadderPlayersByName(ladder);
      if (!result.success || !result.data) continue;
      const profile = result.data.find(p =>
        (userId && String(p.user_id) === String(userId)) ||
        (email && p.users?.email?.toLowerCase() === email) ||
        (calendarPlayer.firstName && calendarPlayer.lastName &&
          p.users?.first_name?.toLowerCase() === calendarPlayer.firstName?.toLowerCase() &&
          p.users?.last_name?.toLowerCase() === calendarPlayer.lastName?.toLowerCase())
      );
      if (!profile?.users?.email) continue;
      let lastMatchData = null;
      let recentMatchesData = [];
      try {
        const lastResult = await supabaseDataService.getPlayerLastMatch(profile.users.email);
        if (lastResult.success && lastResult.data) lastMatchData = lastResult.data;
        const histResult = await supabaseDataService.getPlayerMatchHistory(profile.users.email, 10);
        if (histResult.success && histResult.data) recentMatchesData = histResult.data;
      } catch (_) {}
      return {
        _id: profile.id,
        id: profile.user_id,
        userId: profile.user_id || null,
        email: profile.users?.email || '',
        firstName: profile.users?.first_name || '',
        lastName: profile.users?.last_name || '',
        position: profile.position,
        ladderName: profile.ladder_name || ladder,
        fargoRate: profile.fargo_rate || 0,
        previousFargoRate: profile.previous_fargo_rate ?? null,
        totalMatches: profile.total_matches || 0,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
        isActive: profile.is_active,
        immunityUntil: profile.immunity_until,
        smackbackEligibleUntil: profile.smackback_eligible_until,
        vacationMode: profile.vacation_mode,
        vacationUntil: profile.vacation_until,
        lastMatch: lastMatchData,
        recentMatches: recentMatchesData,
        unifiedAccount: { hasUnifiedAccount: true, email: profile.users?.email, userId: profile.user_id }
      };
    }
    return null;
  }, []);

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
    
    // Always re-fetch match history when opening stats (fixes merged-account players like Jeremy Watt;
    // cached recentMatches from initial ladder load may be empty if lookup used wrong id)
    setPlayerMatchHistory(player.recentMatches?.length ? player.recentMatches : []);
    fetchPlayerMatchHistory(player);
    
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
    
    // Prefer email for match lookup (resolves to correct user; avoids using ladder_profile id by mistake).
    const emailToUse = player.unifiedAccount?.email || player.email || player.users?.email;
    const userId = player.userId || player.user_id || player.unifiedAccount?.userId;
    
    try {
      let result;
      if (emailToUse) {
        console.log('🔍 Fetching match history by email:', emailToUse);
        result = await supabaseDataService.getPlayerMatchHistory(emailToUse, 10);
      } else if (userId) {
        console.log('🔍 Fetching match history by userId:', userId);
        result = await supabaseDataService.getPlayerMatchHistoryByUserId(userId, 10);
      } else {
        console.log('🔍 No email or userId found, cannot fetch match history');
        setPlayerMatchHistory([]);
        return;
      }
      
      if (result.success) {
        console.log('🔍 Match history data from Supabase:', result.data?.length ?? 0, 'matches');
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
      
      // Use match ladder if player came from calendar, otherwise selected ladder
      const ladderToTry = player.ladderName || selectedLadder;
      if (!ladderToTry) {
        console.log('🔍 No ladder context, using original player data');
        setUpdatedPlayerData(player);
        return;
      }
      
      // Fetch ladder profile from Supabase (try match ladder first, then selected ladder)
      let result = await supabaseDataService.getLadderPlayersByName(ladderToTry);
      if (result.success && result.data) {
        let playerProfile = result.data.find(p => 
          p.users?.email?.toLowerCase() === emailToUse.toLowerCase()
        );
        // Fallback: if match ladder is UUID and lookup failed, try selected ladder
        if (!playerProfile && player.ladderName && selectedLadder && player.ladderName !== selectedLadder) {
          result = await supabaseDataService.getLadderPlayersByName(selectedLadder);
          if (result.success && result.data) {
            playerProfile = result.data.find(p => 
              p.users?.email?.toLowerCase() === emailToUse.toLowerCase()
            );
          }
        }
        
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
            isAdmin={effectiveIsAdmin}
            isActualAdmin={isAdmin}
            viewAsUser={effectiveViewAsUser}
            onToggleUserView={handleToggleUserView}
            showUserViewInHeader={viewAsUserProp === undefined}
          />
        </LadderErrorBoundary>
        
        {/* Tournament Banner - Show upcoming tournaments */}
        {!isPublicView && userLadderData && (
          <TournamentBanner 
            ladderName={selectedLadder} 
            currentUser={userLadderData}
            refreshTrigger={tournamentRefreshTrigger}
            onOpenPaymentDashboard={(context) => {
              setPaymentContext(context);
              setShowPaymentDashboard(true);
            }}
            isGuest={senderEmail === 'guest@frontrangepool.com'}
          />
        )}
        
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

  // Removed renderChallengesView - now using MyChallengesModal

  // Removed renderAllLaddersView function - no longer needed
  const renderAllLaddersView_DISABLED = () => {
    const [allLaddersData, setAllLaddersData] = useState({});
    const [loadingAll, setLoadingAll] = useState(true);

    useEffect(() => {
      const loadAllLadders = async () => {
        try {
          setLoadingAll(true);
          const ladders = effectiveIsAdmin ? ['499-under', '500-549', '550-plus', 'simulation'] : ['499-under', '500-549', '550-plus'];
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
          {(effectiveIsAdmin ? ['499-under', '500-549', '550-plus', 'simulation'] : ['499-under', '500-549', '550-plus']).map((ladderName) => (
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
                  
                  
                  // Get opponent info (fallback to loser/winner name strings if user join missed)
                  const opponent = isCurrentUserPlayer1 ? match.player2 : match.player1;
                  const opponentName = opponent ? `${opponent.firstName ?? ''} ${opponent.lastName ?? ''}`.trim() : (isCurrentUserPlayer1 ? (match.loser_name || 'Opponent') : (match.winner_name || 'Opponent'));
                  const opponentPosition = opponent?.position ?? 'N/A';
                  
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
                        <div className="match-date" style={{ color: '#e2e8f0' }}>
                          📅 {match.completedDate ? new Date(match.completedDate).toLocaleDateString() : 
                               match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      
                      {/* Opponent Info */}
                      <div className="opponent-info">
                        <div className="opponent-name" style={{ color: '#e2e8f0' }}>
                          <span className="vs">vs</span> {opponentName} <span className="rank">#{opponentPosition}</span>
                        </div>
                      </div>

                      {/* Match Result */}
                      <div className="match-result">
                        <div className="result-icon">
                          {isCurrentUserWinner ? '🏆' : '💔'}
                        </div>
                        <div className="result-text" style={{ color: '#e2e8f0' }}>
                          {isCurrentUserWinner ? `Winner: ${userLadderData?.firstName ?? ''} ${userLadderData?.lastName ?? ''}` : `Winner: ${match.winner?.firstName ?? ''} ${match.winner?.lastName ?? ''}`.trim() || '—'}
                        </div>
                        <div className="score-display" style={{ color: '#cbd5e1' }}>
                          {match.score ? `Score: ${match.score}` : 'Score: —'}
                        </div>
                      </div>

                      {/* Match Details Grid - explicit text color so values are visible on dark cards */}
                      <div className="match-details-grid">
                        <div className="detail-item">
                          <div className="detail-icon">📅</div>
                          <div className="detail-content">
                            <div className="detail-label">Date</div>
                            <div className="detail-value" style={{ color: '#e2e8f0' }}>
                              {match.completedDate ? new Date(match.completedDate).toLocaleDateString() : 
                               match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-icon">🎮</div>
                          <div className="detail-content">
                            <div className="detail-label">Game</div>
                            <div className="detail-value" style={{ color: '#e2e8f0' }}>{match.gameType || '8-Ball'}</div>
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-icon">🏁</div>
                          <div className="detail-content">
                            <div className="detail-label">Race to</div>
                            <div className="detail-value" style={{ color: '#e2e8f0' }}>{match.raceLength || '5'}</div>
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-icon">📍</div>
                          <div className="detail-content">
                            <div className="detail-label">Location</div>
                            <div className="detail-value" style={{ color: '#e2e8f0' }}>{match.venue || match.location || '—'}</div>
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-icon">🏆</div>
                          <div className="detail-content">
                            <div className="detail-label">Ladder</div>
                            <div className="detail-value" style={{ color: '#e2e8f0' }}>{match.ladderDisplayName || match.ladderName || '—'}</div>
                          </div>
                        </div>
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
            isAdmin={effectiveIsAdmin}
            isProfileComplete={isProfileComplete}
            setShowPaymentDashboard={setShowPaymentDashboard}
            setShowPaymentInfo={handleShowPaymentInfo}
            onJoinAssignedLadder={handleJoinAssignedLadder}
            isFreePeriod={isFreePhaseLocked}
            viewAsUser={effectiveViewAsUser}
          />
        </LadderErrorBoundary>



        {/* News Ticker - Positioned below the ladder status section */}
        <LadderErrorBoundary>
          <div style={{ 
            marginBottom: '20px',
            padding: '0 20px'
          }}>
            <LadderNewsTicker isAdmin={effectiveIsAdmin} />
          </div>
        </LadderErrorBoundary>

        {/* Profile Completion Timeline - Show for users who need to complete profile */}
        {(userLadderData?.playerId === 'ladder' &&
          !isProfileComplete &&
          !userLadderData?.unifiedAccount?.unifiedUserId) && !effectiveIsAdmin && (
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

        {/* Tournament notice - compact banner above nav cards */}
        {!isPublicView && (
          <LadderErrorBoundary>
            <div style={{ marginBottom: '0.5rem', padding: '0 20px' }}>
              <TournamentNoticeCompact
                ladderName={userLadderData?.assignedLadder || selectedLadder}
                currentUser={userLadderData}
                refreshTrigger={tournamentRefreshTrigger}
                onOpenRegistration={(tournament) => {
                  setSelectedTournament(tournament);
                  setShowTournamentRegistrationModal(true);
                }}
              />
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
            setShowChallengesModal={setShowChallengesModal}
            setShowPaymentDashboard={setShowPaymentDashboard}
            setShowPrizePoolModal={setShowPrizePoolModal}
            setShowUnifiedSignup={setShowUnifiedSignup}
            setShowRulesModal={setShowRulesModal}
            setShowOnboardingHelp={setShowOnboardingHelp}
            gettingStartedAtEnd={gettingStartedAtEnd}
            setShowContactAdminModal={setShowContactAdminModal}
            isAdmin={effectiveIsAdmin}
            setShowApplicationsManager={setShowApplicationsManager}
            setShowMatchCalendar={setShowMatchCalendar}
            setShowAdminMessagesModal={setShowAdminMessagesModal}
            selectedLadder={selectedLadder}
            setSelectedTournament={setSelectedTournament}
            setShowTournamentRegistrationModal={setShowTournamentRegistrationModal}
            setShowTournamentInfoModal={setShowTournamentInfoModal}
            onJoinAssignedLadder={handleJoinAssignedLadder}
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

  const isPendingApprovalUser = userLadderData?.playerId === 'pending' || userLadderData?.pendingApproval;
  const isApprovedNoLadderUser = userLadderData?.playerId === 'approved_no_ladder' || userLadderData?.needsLadderPlacement;
  const isFreePhaseLocked = userLadderData?.phaseInfo?.isFree ?? getCurrentPhase().isFree;
  const isMembershipLocked = !isFreePhaseLocked;

  return (
    <>
      {statusToast && (
        <div
          style={{
            position: 'fixed',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 12000,
            background: statusToast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(220, 38, 38, 0.95)',
            color: '#fff',
            border: statusToast.type === 'success' ? '1px solid rgba(110, 231, 183, 0.9)' : '1px solid rgba(252, 165, 165, 0.9)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.9rem',
            fontWeight: 600,
            maxWidth: '92vw',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
          }}
        >
          {statusToast.message}
        </div>
      )}
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
      {currentView === 'challenge' && renderChallengeView()}
      {currentView === 'matches' && renderMatchesView()}
      {currentView === 'main' && renderMainView()}

      {!isPublicView && !userLadderData?.canChallenge && !effectiveIsAdmin && (
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
            {isPendingApprovalUser
              ? 'Your ladder registration is submitted and pending admin approval. Challenge features unlock after approval.'
              : isApprovedNoLadderUser
                ? `You are approved. Join ${userLadderData?.assignedLadderLabel || getLadderLabel(userLadderData?.assignedLadder)} to activate challenge placement.`
              : isFreePhaseLocked
              ? 'Complete your profile (add availability and locations) to unlock challenge features during Phase 1 (Testing)!'
              : 'To challenge other players and report matches, you need an active membership ($5/month).'}
          </p>
          <button 
            onClick={() => {
              if (isPendingApprovalUser) {
                setShowContactAdminModal(true);
                return;
              }
              if (isApprovedNoLadderUser) {
                handleJoinAssignedLadder();
                return;
              }
              if (isFreePhaseLocked) {
                setShowProfileModal(true);
                return;
              }
              if (isMembershipLocked) {
                setShowPaymentDashboard(true);
              }
            }}
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
            {isPendingApprovalUser
              ? 'Contact Admin'
              : isApprovedNoLadderUser
                ? `Join ${userLadderData?.assignedLadderLabel || getLadderLabel(userLadderData?.assignedLadder)}`
                : (isFreePhaseLocked ? 'Complete Profile' : 'Manage Membership')}
          </button>
        </div>
      )}

      {!isPublicView && userLadderData?.canChallenge && isFreePhaseLocked && !effectiveIsAdmin && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          color: '#4CAF50',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>🧪 Phase 1 (Testing) Active</p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
            🎉 FREE access to all features during testing phase! All challenge features are unlocked.
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
           padding: '56px 20px 20px'
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
          />
        )}

      {/* Ladder of Legends Rules Modal */}
      <LadderOfLegendsRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        isMobile={false}
        onContactAdmin={() => setShowContactAdminModal(true)}
      />

      {/* Onboarding / Help Guide Modal */}
      <OnboardingHelpModal
        isOpen={showOnboardingHelp}
        onClose={() => setShowOnboardingHelp(false)}
        onOpenRules={() => { setShowOnboardingHelp(false); setShowRulesModal(true); }}
        onContactAdmin={() => { setShowOnboardingHelp(false); setShowContactAdminModal(true); }}
        onGotIt={() => {
          setGettingStartedAtEnd(true);
          try { localStorage.setItem('ladder_getting_started_at_end', 'true'); } catch (_) {}
          setShowOnboardingHelp(false);
        }}
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
            onClose={() => {
              setShowPaymentDashboard(false);
              setPaymentContext(null);
            }}
            playerEmail={userLadderData?.email || `${playerName}@example.com`}
            isFreePeriod={isFreePhaseLocked}
            paymentContext={paymentContext}
          />
        )}

        {showMatchCalendar && (
          <LadderMatchCalendar
            isOpen={showMatchCalendar}
            onClose={() => {
              console.log('📅 LadderApp: Closing calendar');
              setShowMatchCalendar(false);
            }}
            onPlayerClick={async (calendarPlayer) => {
              setPlayerStatsOpenedFromCalendar(true);
              setShowMatchCalendar(false);
              // Look up full ladder player - same data as when clicking on ladder
              let fullPlayer = ladderData?.find(p =>
                (calendarPlayer.id && (String(p.userId) === String(calendarPlayer.id) || String(p._id) === String(calendarPlayer.id))) ||
                (calendarPlayer.email && (p.email?.toLowerCase() === calendarPlayer.email?.toLowerCase())) ||
                (calendarPlayer.firstName && calendarPlayer.lastName &&
                  p.firstName?.toLowerCase() === calendarPlayer.firstName?.toLowerCase() &&
                  p.lastName?.toLowerCase() === calendarPlayer.lastName?.toLowerCase())
              );
              // If not in current ladder, fetch from other ladders
              if (!fullPlayer) {
                fullPlayer = await fetchFullPlayerFromLadders(calendarPlayer);
              }
              handlePlayerClick(fullPlayer || calendarPlayer);
            }}
          />
        )}

        <LadderErrorBoundary>
          <PlayerStatsModal
            showMobilePlayerStats={showMobilePlayerStats}
            selectedPlayerForStats={selectedPlayerForStats}
            setShowMobilePlayerStats={(show) => {
              setShowMobilePlayerStats(show);
              if (!show && playerStatsOpenedFromCalendar) {
                setShowMatchCalendar(true);
                setPlayerStatsOpenedFromCalendar(false);
              }
            }}
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
            isGuest={senderEmail === 'guest@frontrangepool.com'}
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
            isGuest={senderEmail === 'guest@frontrangepool.com'}
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
     
     {/* My Challenges Modal */}
     {showChallengesModal && (
       <MyChallengesModal
         isOpen={showChallengesModal}
         onClose={() => setShowChallengesModal(false)}
         pendingChallenges={pendingChallenges}
         sentChallenges={sentChallenges}
         scheduledMatches={scheduledMatches}
         onViewChallenge={(challenge) => {
           setShowChallengesModal(false);
           setSelectedChallenge(challenge);
           setShowChallengeConfirmModal(true);
         }}
         onReportMatch={(match) => {
           setShowChallengesModal(false);
           setPreselectedMatchId(match._id || match.id);
           setShowMatchReportingModal(true);
         }}
         onRescheduleRequest={(match) => {
           setShowChallengesModal(false);
           setSelectedMatchForAction(match);
           setShowRescheduleRequestModal(true);
         }}
         onReportNoShow={(match) => {
           setShowChallengesModal(false);
           setSelectedMatchForAction(match);
           setShowForfeitReportModal(true);
         }}
       />
     )}

     {/* Match Reporting Modal - Always rendered to get setShowPaymentInfo function */}
     <LadderMatchReportingModal
       isOpen={showMatchReportingModal}
       onClose={() => {
         setShowMatchReportingModal(false);
         setPreselectedMatchId(null); // Clear preselected match when closing
       }}
       playerName={senderEmail}
       selectedLadder={selectedLadder}
       isAdmin={effectiveIsAdmin}
       userLadderData={userLadderData}
       setShowPaymentDashboard={setShowPaymentDashboard}
       preselectedMatchId={preselectedMatchId}
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
         alignItems: 'flex-start',
         justifyContent: 'center',
         padding: '88px 1rem 1rem',
         zIndex: 10000,
         overflow: 'auto',
         boxSizing: 'border-box'
       }}>
         <div style={{
           background: 'rgba(20, 20, 20, 0.95)',
           border: '2px solid rgba(255, 68, 68, 0.3)',
           borderRadius: '12px',
           padding: '0.75rem 1rem',
           maxWidth: '800px',
           width: 'min(6500px, 95vw)',
           maxHeight: 'calc(100vh - 2rem)',
           overflowY: 'auto',
           position: 'relative',
           margin: 'auto'
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
           <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
             <h2 style={{ color: '#ff4444', margin: '0 0 0.25rem 0', fontSize: '1.35rem' }}>
               💳 Payment Information
             </h2>
             <p style={{ color: '#ccc', margin: 0, fontSize: '0.85rem' }}>
               Subscription and match reporting fees
             </p>
           </div>

           {/* Content */}
           <div style={{ 
             display: 'grid', 
             gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
             gap: '0.75rem',
             margin: '0 auto'
           }}>
             {/* Membership Subscription */}
             <div style={{
               background: 'rgba(33, 150, 243, 0.1)',
               border: '1px solid rgba(33, 150, 243, 0.3)',
               borderRadius: '8px',
               padding: '0.6rem 0.75rem'
             }}>
               <h3 style={{ color: '#2196f3', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                 📅 Monthly Membership - $5/mo
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                 <p style={{ margin: '0 0 0.3rem 0' }}><strong>Includes:</strong></p>
                 <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                   <li>Access to all ladder divisions</li>
                   <li>Challenge other players</li>
                   <li>View ladder standings and statistics</li>
                   <li>Participate in tournaments and events</li>
                   <li>Receive notifications and updates</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50', fontSize: '0.75rem' }}>
                   Phase 1 (Pre-launch) FREE until we go live April 1, 2026.
                 </p>
               </div>
             </div>

             {/* Match Reporting Fee */}
             <div style={{
               background: 'rgba(76, 175, 80, 0.1)',
               border: '1px solid rgba(76, 175, 80, 0.3)',
               borderRadius: '8px',
               padding: '0.6rem 0.75rem'
             }}>
               <h3 style={{ color: '#4caf50', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                 🏆 Match Fee - $5/match
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                 <p style={{ margin: '0 0 0.3rem 0' }}><strong>How it works:</strong></p>
                 <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                   <li>Only the <strong>winner</strong> pays the $5 fee</li>
                   <li>One fee per match (not per player)</li>
                   <li>Fee is paid when reporting the match result</li>
                   <li>$3 to prize pool ($2 placement, $1 climber), $2 to platform</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#ff9800', fontSize: '0.75rem' }}>
                   Winner pays $5; loser pays nothing.
                 </p>
                 <p style={{ margin: '0.25rem 0 0 0', fontStyle: 'italic', color: '#8b5cf6', fontSize: '0.7rem' }}>
                   💡 $10/entry → $9 placement, $1 climber; match fees add $2 placement + $1 climber
                 </p>
               </div>
             </div>

             {/* Payment Methods */}
             <div style={{
               background: 'rgba(255, 193, 7, 0.1)',
               border: '1px solid rgba(255, 193, 7, 0.3)',
               borderRadius: '8px',
               padding: '0.6rem 0.75rem'
             }}>
               <h3 style={{ color: '#ffc107', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                 💳 Payment Methods
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                 <p style={{ margin: '0 0 0.3rem 0' }}><strong>We accept:</strong></p>
                 <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                   <li>CashApp</li>
                   <li>Venmo</li>
                   <li>PayPal</li>
                   <li>Credit/Debit (Square)</li>
                   <li>Credits (pre-purchased)</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50', fontSize: '0.75rem' }}>
                   Tip: Buy credits for instant reporting!
                 </p>
               </div>
             </div>

             {/* Trust System */}
             <div style={{
               background: 'rgba(156, 39, 176, 0.1)',
               border: '1px solid rgba(156, 39, 176, 0.3)',
               borderRadius: '8px',
               padding: '0.6rem 0.75rem'
             }}>
               <h3 style={{ color: '#9c27b0', margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                 🛡️ Trust & Verification
               </h3>
               <div style={{ color: '#e0e0e0', fontSize: '0.8rem', lineHeight: '1.4' }}>
                 <p style={{ margin: '0 0 0.3rem 0' }}><strong>Verification:</strong></p>
                 <ul style={{ margin: '0 0 0.4rem 0', paddingLeft: '1.2rem' }}>
                   <li><strong>New:</strong> Admin verify (24-48hrs)</li>
                   <li><strong>Verified:</strong> 3+ payments = auto</li>
                   <li><strong>Trusted:</strong> 10+ = instant</li>
                 </ul>
                 <p style={{ margin: 0, fontStyle: 'italic', color: '#4caf50', fontSize: '0.75rem' }}>
                   Build trust for faster processing!
                 </p>
               </div>
             </div>
           </div>

           {/* Close Button */}
           <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
             <button
               onClick={() => setShowPaymentInfoModal(false)}
               style={{
                 background: 'rgba(255, 68, 68, 0.8)',
                 color: '#fff',
                 border: 'none',
                 padding: '8px 20px',
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

     {/* Tournament Registration Modal */}
     {selectedTournament && (
       <TournamentRegistrationModal
         isOpen={showTournamentRegistrationModal}
         onClose={() => {
           setShowTournamentRegistrationModal(false);
           setSelectedTournament(null);
         }}
         tournamentId={selectedTournament.id}
         currentUser={userLadderData}
         onRegistrationComplete={() => {
           loadData();
           setTournamentRefreshTrigger(t => t + 1);
         }}
         onOpenPaymentDashboard={(context) => {
           setPaymentContext(context);
           setShowTournamentRegistrationModal(false);
           setSelectedTournament(null);
           setShowPaymentDashboard(true);
         }}
         isGuest={senderEmail === 'guest@frontrangepool.com'}
       />
     )}

     {/* Tournament Info Modal */}
     <TournamentInfoModal
       isOpen={showTournamentInfoModal}
       onClose={() => setShowTournamentInfoModal(false)}
       tournament={selectedTournament}
       onRegisterClick={(tournament) => {
         setSelectedTournament(tournament);
         setShowTournamentInfoModal(false);
         setShowTournamentRegistrationModal(true);
       }}
     />
    </>
   );
 };

export default LadderApp;
