import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { applyEstateAuthLanding, estateOAuthCallbackHash } from "@shared/utils/estateAuthLanding.js";

// Estate Vault Google/email confirm — normalize #access_token=... before HashRouter mounts.
applyEstateAuthLanding();

// IMMEDIATE check for Dues Tracker OAuth callbacks - runs before React renders
// This handles cases where OAuth tokens are in the pathname instead of hash
(function checkDuesTrackerOAuthImmediately() {
  // Check if this is a Dues Tracker OAuth callback
  const isDuesTrackerOAuth = localStorage.getItem('__DUES_TRACKER_OAUTH__') === 'true';
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  
  // Check if tokens are in pathname (unusual but can happen)
  const hasTokensInPathname = pathname.includes('access_token=') || pathname.includes('type=recovery');
  // Check if tokens are in hash (normal)
  const hasTokensInHash = hash && (hash.includes('access_token') || hash.includes('type=recovery'));
  
  if (isDuesTrackerOAuth && (hasTokensInPathname || hasTokensInHash)) {
    console.log('🚨 Dues Tracker OAuth detected in App.jsx - IMMEDIATELY redirecting');
    console.log('🔍 Pathname:', pathname);
    console.log('🔍 Hash:', hash);
    
    // Clear the flag
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');
    
    // Convert pathname tokens to hash format if needed
    let finalHash = hash;
    if (hasTokensInPathname && !hasTokensInHash) {
      // Extract tokens from pathname and put them in hash
      const tokenMatch = pathname.match(/(access_token=[^&]+.*)/);
      if (tokenMatch) {
        finalHash = '#' + tokenMatch[1];
      }
    }
    
    // Redirect to Dues Tracker with tokens
    const duesTrackerUrl = window.location.origin + '/dues-tracker/index.html' + finalHash;
    console.log('🔍 Redirecting to:', duesTrackerUrl);
    window.location.replace(duesTrackerUrl);
  }
})();

/** fiduciarylog.com → marketing storefront; app remains at /#/estateit */
(function redirectEstateItCustomDomain() {
  const host = (window.location.hostname || '').toLowerCase();
  if (host !== 'fiduciarylog.com' && host !== 'www.fiduciarylog.com') return;
  document.title = APP_NAME;
  const hash = window.location.hash || '';
  if (hash.startsWith('#/estateit') || hash.startsWith('#/estate-inventory')) return;
  const pathname = window.location.pathname || '';
  if (
    pathname.startsWith('/estate-vault') ||
    pathname.startsWith('/dues-tracker') ||
    pathname.startsWith('/arcade')
  ) {
    return;
  }
  if (pathname === '/' || pathname === '') {
    window.location.replace(
      `${window.location.origin}/estate-vault/${window.location.search || ''}`
    );
    return;
  }
  window.location.replace(
    `${window.location.origin}/#/estateit${window.location.search || ''}`
  );
})();

// Main pages/components
import ConfirmMatch from "./components/ConfirmMatch";
import Dashboard from "@apps/singles-league/frontend/src/components/dashboard/Dashboard.jsx";
import MatchChat from "@apps/singles-league/frontend/src/components/chat/MatchChat.jsx";
import AdminDashboard from "@apps/singles-league/frontend/src/components/dashboard/AdminDashboard.jsx";
import PlatformAdminDashboard from "@shared/components/PlatformAdminDashboard";
import SupabaseLogin from "@shared/components/modal/modal/SupabaseLogin";
import FloatingLogos from './components/FloatingLogos';
import TenBallTutorial from './components/TenBallTutorial';
import SimplePoolGame from './components/tenball/SimplePoolGame';
import MobileTestPage from './components/MobileTestPage';
import AppHub from '@apps/hub/frontend/src/components/hub/AppHub';
import LoggedOutHub from '@apps/hub/frontend/src/components/hub/LoggedOutHub';
import HubNavigation from '@apps/hub/frontend/src/components/hub/HubNavigation';
import AppRouteWrapper from '@apps/hub/frontend/src/components/hub/AppRouteWrapper';
import LadderSignInGate from '@apps/hub/frontend/src/components/hub/LadderSignInGate';
import Homepage from './components/Homepage';
import EmbedLanding from './components/EmbedLanding';
import CuelessInTheBooth from '@apps/cueless/frontend/src/components/cueless/CuelessInTheBooth';
import LadderApp from '@apps/ladder/frontend/src/components/ladder/LadderApp';
import LadderManagement from '@apps/ladder/frontend/src/components/ladder/LadderManagement';
import LadderPlayerManagement from '@apps/ladder/frontend/src/components/ladder/LadderPlayerManagement';
import PublicLadderEmbed from '@apps/ladder/frontend/src/components/ladder/PublicLadderEmbed';
import EmbedApp from './EmbedApp';
import SimpleLadderEmbed from '@apps/ladder/frontend/src/components/ladder/SimpleLadderEmbed';
import PlayerManagement from '@shared/components/admin/admin/PlayerManagement';
import UserProfileModal from '@shared/components/modal/modal/UserProfileModal';
import DuesTracker from '@apps/dues-tracker/frontend/src/components/dues/DuesTracker';
import LegendsPoolLeagueTracker from './components/legends/LegendsPoolLeagueTracker';
import TournamentBracketApp from '@apps/tournament-bracket/frontend/src/components/tournament/TournamentBracketApp';
import TournamentBracketGate from '@apps/tournament-bracket/frontend/src/components/tournament/TournamentBracketGate';
import CashClimbTvView from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/CashClimbTvView';
import CashClimbPublicGuide from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/CashClimbPublicGuide.jsx';
import CashClimbSubmitPage from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/CashClimbSubmitPage.jsx';
import ElimSubmitPage from '@apps/tournament-bracket/frontend/src/components/tournament/ElimSubmitPage.jsx';
import { isCashClimbSubmitPath } from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/cashClimbSubmit.js';
import { isElimSubmitPath } from '@apps/tournament-bracket/frontend/src/components/tournament/elimSubmit.js';
import { isTournamentOperator, peekLoginReturn } from '@apps/tournament-bracket/frontend/src/components/tournament/tournamentOperators.js';
import { hasLocalTournamentWork } from '@apps/tournament-bracket/frontend/src/components/tournament/tournamentLocalWork.js';
import EstateAdminGate from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateAdminGate';
import EstateCaseEntry from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateCaseEntry';
import EstateFamilySignIn from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateFamilySignIn';
import EstateVaultOAuthCallback from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateVaultOAuthCallback';
import EstateOwnerHome from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateOwnerHome';
import EstateSuperGate from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateSuperGate';
import EstateRoleLanding from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateRoleLanding';
import { EstateCaseProvider } from '@apps/estate-inventory/frontend/src/components/estate-inventory/EstateCaseContext';
import SiblingPortal from '@apps/estate-inventory/frontend/src/components/estate-inventory/SiblingPortal';
import HelperPortal from '@apps/estate-inventory/frontend/src/components/estate-inventory/HelperPortal';
import AdvisorPortal from '@apps/estate-inventory/frontend/src/components/estate-inventory/AdvisorPortal';
import AuctionPortal from '@apps/estate-inventory/frontend/src/components/estate-inventory/AuctionPortal';
import { APP_NAME, ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import adminAuthService from '@shared/services/services/adminAuthService.js';
import { signOutHubSession, subscribeHubSession } from '@shared/services/hubSession.js';

// Guest App Components
import GuestLeagueApp from '@shared/components/guest/GuestLeagueApp';
import GuestLadderApp from '@shared/components/guest/GuestLadderApp';
import LadderTvView from '@shared/components/guest/LadderTvView';
import ArcadeKiosk from '@apps/arcade/frontend/src/components/arcade/ArcadeKiosk';
import ArcadeAdmin from '@apps/arcade/frontend/src/components/arcade/ArcadeAdmin';
import PaymentSuccess from './components/payment/PaymentSuccess';
import ResetPassword from './components/auth/ResetPassword';
import ConfirmEmail from './components/auth/ConfirmEmail';
import OAuthCallback from './components/auth/OAuthCallback';

import logo from "./assets/logo.png";
import bcaplLogo from "./assets/bcapl_logo.png";
import csiLogo from "./assets/csi_logo.png";
import usaplLogo from "./assets/usapl_logo.png";
import fargorateLogo from "./assets/fargorate-logo.png";
import "./styles/variables.css";
import "./styles/global.css";

function MainApp({
  isAuthenticated,
  userFirstName,
  userLastName,
  userEmail,
  userPin,
  userType,
  handleLoginSuccess,
  handleLogout
}) {
  const navigate = useNavigate();
  return (
    <main className="main-app-content">
      {!isAuthenticated ? (
        <LoggedOutHub onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AppHub
          isAuthenticated={isAuthenticated}
          userFirstName={userFirstName}
          userLastName={userLastName}
          userEmail={userEmail}
          userPin={userPin}
          userType={userType}
          handleLogout={handleLogout}
        />
      )}
    </main>
  );
}

/** HashRouter routes live in the hash; bare paths like /ladder otherwise show the homepage. */
const PATHNAME_TO_HASH_ROUTE = {
  '/ladder': '#/ladder',
  '/guest/ladder': '#/guest/ladder',
  '/hub': '#/ladder',
  '/tournament-bracket': '#/tournament-bracket',
  '/tournament-bracket/tv': '#/tournament-bracket/tv',
  '/tournament-bracket/how-it-works': '#/tournament-bracket/how-it-works',
  '/tournament-bracket/submit': '#/tournament-bracket/submit',
  '/tournament-bracket/elim': '#/tournament-bracket/elim',
  '/league': '#/league',
  '/guest/league': '#/guest/league',
  '/arcade': '#/arcade/kiosk',
  '/arcade/kiosk': '#/arcade/kiosk',
  '/arcade/admin': '#/arcade/admin',
  '/estateit': '#/estateit',
  '/estateit/enter': '#/estateit/enter',
  '/estateit/owner': '#/estateit/owner',
  '/estateit/super': '#/estateit/super',
  '/estateit/oauth': '#/estateit/oauth',
  // Legacy short paths → gateway (never invent a seed case number)
  '/estateit/admin': '#/estateit/owner',
  '/estateit/helper': '#/estateit/enter',
  '/estateit/family': '#/estateit/enter',
  '/estateit/advisor': '#/estateit/enter',
  '/estateit/auction': '#/estateit',
  '/estate-inventory': '#/estateit',
  '/estate-inventory/admin': '#/estateit/owner',
  '/estate-inventory/helper': '#/estateit/enter',
  '/estate-inventory/family': '#/estateit/enter',
  '/estate-inventory/advisor': '#/estateit/enter',
  '/estate-inventory/auction': '#/estateit',
};

/** Full-screen TV leaderboard lives at /arcade/tv (static page), not in the React hash router. */
function ArcadeTvRedirect() {
  useLayoutEffect(() => {
    window.location.replace('/arcade/tv');
  }, []);
  return null;
}

function redirectHashArcadeTvToStaticPage() {
  const hash = window.location.hash || '';
  if (!/^#\/arcade\/tv(\?|$)/.test(hash)) return false;
  const qs = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
  window.location.replace(`${window.location.origin}/arcade/tv${qs}`);
  return true;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const getStoredValue = (key, fallback = "") => {
    if (typeof window === "undefined") return fallback;
    try {
      const value = localStorage.getItem(key);
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  };

  // Hash route #/arcade/tv → static full TV display at /arcade/tv
  useLayoutEffect(() => {
    redirectHashArcadeTvToStaticPage();
  }, []);

  // Bare pathname links (e.g. /ladder) → hash routes so bookmarks and external tools reach the right screen.
  useLayoutEffect(() => {
    if (redirectHashArcadeTvToStaticPage()) return;
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';
    if (hash.startsWith('#/')) return;
    if (
      pathname === '/ladder-embed' ||
      pathname === '/ladder-tv' ||
      pathname === '/arcade' ||
      pathname.startsWith('/arcade/') ||
      pathname.startsWith('/dues-tracker')
    ) {
      return;
    }
    const targetHash = PATHNAME_TO_HASH_ROUTE[pathname]
      || (isCashClimbSubmitPath(pathname) ? `#${pathname}` : null)
      || (isElimSubmitPath(pathname) ? `#${pathname}` : null);
    if (targetHash) {
      const search = window.location.search || '';
      window.location.replace(`${window.location.origin}/${search}${targetHash}`);
    }
  }, []);

  // When returning from Square (credit or membership purchase): run before paint so we land on ladder with payment modal.
  useLayoutEffect(() => {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';
    const q = new URLSearchParams(search || (hash.includes('?') ? hash.slice(hash.indexOf('?')) : ''));
    const pathMatch = pathname.match(/transactionId=([^&/]+)/i) || pathname.match(/transaction_id=([^&/]+)/i) || pathname.match(/orderId=([^&/]+)/i);
    const transactionIdFromPath = pathMatch ? pathMatch[1] : null;
    const transactionId = q.get('transactionId') || q.get('transaction_id') || transactionIdFromPath;
    const fromCredit = q.get('credit_purchase_success') === '1' || hash.includes('credit_purchase_success=1');
    const fromMembership = q.get('membership_purchase_success') === '1' || hash.includes('membership_purchase_success=1');
    const fromSquareReturn = transactionId || pathname.includes('transactionId=') || pathname.includes('orderId=');
    if (fromCredit) {
      try { sessionStorage.setItem('credit_purchase_return', '1'); } catch (_) {}
      const newHash = '#/ladder?tab=payment-dashboard&credit_purchase_success=1' + (transactionId ? '&transactionId=' + encodeURIComponent(transactionId) : '');
      if (!hash.startsWith('#/ladder')) {
        if (pathname !== '/' && pathname !== '') window.history.replaceState(null, '', '/' + search + hash);
        window.location.hash = newHash;
      }
    } else if (fromMembership) {
      try { sessionStorage.setItem('credit_purchase_return', '1'); } catch (_) {}
      const newHash = '#/ladder?tab=payment-dashboard&membership_purchase_success=1' + (transactionId ? '&transactionId=' + encodeURIComponent(transactionId) : '');
      if (!hash.startsWith('#/ladder')) {
        if (pathname !== '/' && pathname !== '') window.history.replaceState(null, '', '/' + search + hash);
        window.location.hash = newHash;
      }
    } else if (fromSquareReturn && !hash.startsWith('#/ladder')) {
      try { sessionStorage.setItem('credit_purchase_return', '1'); } catch (_) {}
      const newHash = '#/ladder?tab=payment-dashboard&membership_purchase_success=1' + (transactionId ? '&transactionId=' + encodeURIComponent(transactionId) : '');
      if (pathname !== '/' && pathname !== '') window.history.replaceState(null, '', '/' + (window.location.search || '') + hash);
      window.location.hash = newHash;
    }
  }, []);

  // --- State ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => getStoredValue("isAuthenticated") === "true");
  const [userFirstName, setUserFirstName] = useState(() => getStoredValue("userFirstName"));
  const [userLastName, setUserLastName] = useState(() => getStoredValue("userLastName"));
  const [userEmail, setUserEmail] = useState(() => getStoredValue("userEmail"));
  const [userPin, setUserPin] = useState(() => getStoredValue("userPin"));
  const [userToken, setUserToken] = useState(() => getStoredValue("userToken"));
  const [userType, setUserType] = useState(() => getStoredValue("userType", "league"));
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [currentAppName, setCurrentAppName] = useState("");
  const [useSupabaseAuth, setUseSupabaseAuth] = useState(true); // Toggle for Supabase vs old auth

  useEffect(() => {
    const handleViewportChange = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  // Confirm the live Supabase session. localStorage isAuthenticated is only a hint.
  useEffect(() => {
    return subscribeHubSession({
      onSession: (profile) => {
        setUserFirstName(profile.firstName || '');
        setUserLastName(profile.lastName || '');
        setUserEmail(profile.email || '');
        setUserPin(profile.pin || 'supabase-auth');
        setUserToken(profile.token || '');
        setUserType(profile.userType || 'league');
        setIsAuthenticated(true);
      },
      onSignedOut: () => {
        setUserFirstName('');
        setUserLastName('');
        setUserEmail('');
        setUserPin('');
        setUserToken('');
        setUserType('league');
        setIsAuthenticated(false);
      },
    });
  }, []);

  // --- When OAuth completes in a separate tab (e.g. from iframe), reload to pick up session ---
  useEffect(() => {
    const onMessage = (e) => {
      if (e.data?.type === 'OAUTH_COMPLETE' && e.origin === window.location.origin) {
        window.location.reload();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // --- Listen for app name changes and ladder login success ---
  useEffect(() => {
    const handleAppNameChange = (event) => {
      setCurrentAppName(event.detail);
    };

    // Listen for ladder login success events
    const handleLadderLoginSuccess = (event) => {
      console.log('App.jsx received ladderLoginSuccess event:', event.detail);
      const { name, email, pin, userType } = event.detail;
      
      // Call the existing login success handler
      handleLoginSuccess(name, email, pin, userType);
    };

    window.addEventListener('appNameChange', handleAppNameChange);
    window.addEventListener('ladderLoginSuccess', handleLadderLoginSuccess);

    return () => {
      window.removeEventListener('appNameChange', handleAppNameChange);
      window.removeEventListener('ladderLoginSuccess', handleLadderLoginSuccess);
    };
  }, []);

  // --- Login handler ---
  const handleLoginSuccess = (name, email, pin, userType, token, userData = null) => {
    console.log('🔐 handleLoginSuccess called with:', {
      name,
      email,
      pin: pin ? '***' : 'none',
      userType,
      hasToken: !!token,
      hasUserData: !!userData,
      userDataKeys: userData ? Object.keys(userData) : []
    });
    
    let firstName = "";
    let lastName = "";
    if (name) {
      const parts = name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    }
    
    // If userData has first_name/last_name, use those instead (more reliable)
    if (userData) {
      if (userData.first_name) firstName = userData.first_name;
      if (userData.last_name) lastName = userData.last_name;
    }
    
    setUserFirstName(firstName);
    setUserLastName(lastName);
    setUserEmail(email);
    setUserPin(pin || '');
    setUserToken(token || '');
    setUserType(userType || 'league');
    setIsAuthenticated(true);
    setAdminLoading(true);

    // Store unified user data IMMEDIATELY
    localStorage.setItem("userFirstName", firstName);
    localStorage.setItem("userLastName", lastName);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userPin", pin || '');
    localStorage.setItem("userToken", token || '');
    localStorage.setItem("userType", userType || 'league'); // Default to league if not specified
    localStorage.setItem("isAuthenticated", "true");
    
    // Store complete user data if provided (includes ladderProfile, leagueProfile, etc.)
    if (userData) {
      localStorage.setItem("unifiedUserData", JSON.stringify(userData));
    }
    
    console.log('✅ Unified Login Success - Data stored:', {
      firstName,
      lastName,
      email,
      userType,
      isAuthenticated: true,
      localStorageCheck: localStorage.getItem("isAuthenticated")
    });

    const returnTo = peekLoginReturn();
    if (returnTo && returnTo.startsWith('/tournament-bracket')) {
      navigate('/tournament-bracket', { replace: true });
    }
  };

  // --- Check if user is super admin ---
  const [isSuperAdminState, setIsSuperAdminState] = useState(false);
  const [isAdminState, setIsAdminState] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [viewAsUserLadder, setViewAsUserLadder] = useState(false); // admin toggle: see ladder app as user

  const isSuperAdmin = () => {
    return isSuperAdminState;
  };

  const isAdmin = () => {
    return isAdminState;
  };

  const canRunTournament = isAuthenticated && (isAdminState || isTournamentOperator(userEmail));

  // Check admin status when user logs in
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated || !userEmail) {
        setIsSuperAdminState(false);
        setIsAdminState(false);
        setAdminLoading(false);
        return;
      }
      setAdminLoading(true);
      try {
        const superAdminResult = await adminAuthService.isSuperAdmin(userEmail, userPin || 'supabase-auth');
        setIsSuperAdminState(superAdminResult);
        const adminResult = await adminAuthService.isAdmin(userEmail, userPin || 'supabase-auth');
        setIsAdminState(adminResult);
        console.log('🔍 Admin Status Check:', {
          userEmail: userEmail,
          userPin: userPin ? '***' : 'supabase-auth',
          isSuperAdmin: superAdminResult,
          isAdmin: adminResult
        });
      } catch (error) {
        console.log('🔍 Admin check failed:', error.message);
        setIsSuperAdminState(false);
        setIsAdminState(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, userEmail, userPin]);

  const isEstateInventory =
    location.pathname === '/estateit' ||
    location.pathname.startsWith('/estateit/') ||
    location.pathname === '/estate-inventory' ||
    location.pathname.startsWith('/estate-inventory/');

  const isFiduciaryLogHost = (() => {
    const host = (window.location.hostname || '').toLowerCase();
    return host === 'fiduciarylog.com' || host === 'www.fiduciarylog.com';
  })();

  // Must stay above kiosk/TV early returns. Skipping this hook on those routes
  // throws React #300 (fewer hooks than expected) on client-side navigation.
  useEffect(() => {
    if (isFiduciaryLogHost || isEstateInventory) {
      document.title = APP_NAME;
    }
  }, [isFiduciaryLogHost, isEstateInventory, location.pathname]);

  // --- Profile modal handler ---
  const handleProfileClick = () => {
    setShowProfileModal(true);
  };

  // --- Logout handler ---
  const handleLogout = () => {
    setUserFirstName("");
    setUserLastName("");
    setUserEmail("");
    setUserPin("");
    setUserToken("");
    setUserType("league");
    setCurrentAppName("");
    setIsAuthenticated(false);
    setIsAdminState(false);
    setIsSuperAdminState(false);
    setAdminLoading(false);
    signOutHubSession();
  };

  // --- Ladder position claim handler ---
  const handleClaimLadderPosition = (ladderPosition) => {
    console.log('Claiming ladder position:', ladderPosition);
    // The UnifiedSignupForm in LadderApp will handle the claim process
    // This function is kept for compatibility but the actual work is done in LadderApp
  };

  // --- Main Router ---
  
  // Special case: If we're on the embed route, render ONLY the embed component
  if (location.pathname === '/ladder-embed') {
    return (
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        padding: 0,
        margin: 0,
        zIndex: 9999,
        overflow: 'auto'
      }}>
        <PublicLadderEmbed />
      </div>
    );
  }

  // Cash Climb TV: same-browser local event, no hub nav
  if (location.pathname === '/tournament-bracket/tv') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100%',
        background: '#000',
        padding: 0,
        margin: 0,
        zIndex: 9999,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <CashClimbTvView />
      </div>
    );
  }

  // Public Cash Climb explainer: scrollable page, no operator gate
  if (location.pathname === '/tournament-bracket/how-it-works') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#020617',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 9999,
        WebkitOverflowScrolling: 'touch',
      }}>
        <CashClimbPublicGuide />
      </div>
    );
  }

  if (isCashClimbSubmitPath(location.pathname) || isElimSubmitPath(location.pathname)) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#020617',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 9999,
        WebkitOverflowScrolling: 'touch',
      }}>
        {isElimSubmitPath(location.pathname) ? <ElimSubmitPage /> : <CashClimbSubmitPage />}
      </div>
    );
  }

  // Public TV view: ladder + players only, no nav (for TV/kiosk display)
  if (location.pathname === '/ladder-tv') {
    return (
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100%',
        background: '#000',
        padding: 0,
        margin: 0,
        zIndex: 9999,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <LadderTvView />
      </div>
    );
  }

  // Arcade cabinet tablet — locked kiosk UI, no hub nav
  if (location.pathname === '/arcade/kiosk' || location.pathname === '/arcade') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: '100%',
        background: '#000',
        padding: 0,
        margin: 0,
        zIndex: 9999,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ArcadeKiosk />
      </div>
    );
  }

  // When ?preview=1 on homepage, show logged-out nav (for embed previews on frusapl.com etc.)
  const isPreviewMode = location.pathname === '/' && (location.search?.includes('preview=1') || window.location.hash?.includes('preview=1'));

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflowX: "hidden", background: "#000" }}>
        {/* Hide FloatingLogos on ladder, embed-preview, and Estate Vault */}
        {(() => {
          const isLadderRoute = location.pathname.startsWith('/ladder');
          const isEmbedPreview = location.pathname === '/embed-preview';
          return !isLadderRoute && !isEmbedPreview && !isEstateInventory && location.pathname !== '/tournament-bracket/tv' && <FloatingLogos />;
        })()}
        {!isEstateInventory && location.pathname !== '/tournament-bracket/tv' ? (
                         <HubNavigation 
          currentAppName={currentAppName} 
          isAdmin={isPreviewMode ? false : isAdminState}
          isSuperAdmin={isPreviewMode ? false : isSuperAdminState}
          onLogout={handleLogout}
          userFirstName={isPreviewMode ? '' : userFirstName}
          userLastName={isPreviewMode ? '' : userLastName}
          onProfileClick={handleProfileClick}
          hideBrand={location.pathname === '/embed-preview'}
          hideNavButtons={location.pathname === '/embed-preview'}
          showLadderUserViewToggle={!isPreviewMode && isAdminState && location.pathname === '/ladder'}
          ladderUserViewActive={viewAsUserLadder}
          onToggleLadderUserView={() => setViewAsUserLadder(v => !v)}
        />
        ) : null}

                 <div className={`main-content-wrapper${isEstateInventory ? ' estateit-shell' : ''}`} style={{ position: "relative", zIndex: 3, maxWidth: location.pathname === '/' ? 1400 : location.pathname === '/embed-preview' ? 1000 : location.pathname === '/estateit/super' ? 1100 : location.pathname === '/estateit' ? 920 : isEstateInventory ? 720 : 900, margin: "0 auto", width: "100%", background: "none", minHeight: "100vh", paddingTop: isEstateInventory ? "0px" : "80px" }}>
          <Routes>
            
            {/* League App Routes */}
                         <Route
               path="/league"
               element={
                 isAuthenticated ? (
                   <AppRouteWrapper appName="Front Range Pool League">
                    <main className="main-app-content">
                      <Dashboard
                        playerName={userFirstName}
                        playerLastName={userLastName}
                        senderEmail={userEmail}
                        onScheduleMatch={() => {}}
                        onOpenChat={() => (window.location.hash = "#/league/chat")}
                        userPin={userPin}
                        onGoToAdmin={() => {}}
                        onGoToPlatformAdmin={() => navigate("/platform-admin")}
                        isAdmin={isAdminState}
                      />
                    </main>
                  </AppRouteWrapper>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            
                         <Route
               path="/league/chat"
               element={
                 isAuthenticated ? (
                   <AppRouteWrapper appName="Front Range Pool League - Chat">
                    <main className="main-app-content">
                      <MatchChat
                        userName={`${userFirstName} ${userLastName}`}
                        userEmail={userEmail}
                        userPin={userPin}
                      />
                    </main>
                  </AppRouteWrapper>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            
                         {/* Ladder App Routes */}
                           <Route
                path="/ladder"
                element={
                  isAuthenticated ? (
                    <AppRouteWrapper appName="Ladder of Legends">
                      <main className="main-app-content">
                        <LadderApp
                          playerName={userFirstName}
                          playerLastName={userLastName}
                          senderEmail={userEmail}
                          userPin={userPin}
                          isAdmin={isAdminState}
                          userType={userType}
                          onClaimLadderPosition={handleClaimLadderPosition}
                          setShowProfileModal={setShowProfileModal}
                          profileRefreshKey={profileRefreshKey}
                          viewAsUser={viewAsUserLadder}
                          onToggleUserView={() => setViewAsUserLadder(v => !v)}
                        />
                      </main>
                    </AppRouteWrapper>
                  ) : (
                    <AppRouteWrapper appName="Ladder of Legends">
                      <main className="main-app-content">
                        <LadderSignInGate onLoginSuccess={handleLoginSuccess} />
                      </main>
                    </AppRouteWrapper>
                  )
                }
              />
             
              

             {/* Guest App Routes */}
             <Route
               path="/guest/league"
               element={
                 <AppRouteWrapper appName="League App - Guest Preview">
                   <main className="main-app-content">
                     <GuestLeagueApp />
                   </main>
                 </AppRouteWrapper>
               }
             />
             
             <Route
               path="/guest/ladder"
               element={
                 <AppRouteWrapper appName="Ladder of Legends - Guest Preview">
                   <main className="main-app-content guest-ladder-content">
                     <GuestLadderApp />
                   </main>
                 </AppRouteWrapper>
               }
             />

             {/* Ladder Management Route */}
              <Route
                path="/ladder/manage"
                element={
                  isAuthenticated && isAdmin() ? (
                    <AppRouteWrapper appName="Ladder Admin">
                      <main className="main-app-content">
                        <LadderManagement
                          userEmail={userEmail}
                          userPin={userPin}
                        />
                      </main>
                    </AppRouteWrapper>
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              
              {/* Ladder Player Management Route */}
              <Route
                path="/ladder/admin"
                element={
                  isAuthenticated && isAdmin() ? (
                    <AppRouteWrapper appName="Ladder Admin">
                      <main className="main-app-content">
                        <LadderPlayerManagement userToken={userToken} />
                      </main>
                    </AppRouteWrapper>
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />

              {/* Public Ladder Embed Route - No authentication required */}
              <Route
                path="/embed/*"
                element={<EmbedApp />}
              />

             
             {/* Admin Routes */}
             <Route
               path="/admin"
               element={
                 isAuthenticated && isAdmin() ? (
                   <AppRouteWrapper appName="Admin Dashboard">
                     <div className="admin-app-content">
                       <AdminDashboard userToken={userToken} />
                     </div>
                   </AppRouteWrapper>
                 ) : (
                   <Navigate to="/" />
                 )
               }
             />

             {/* Dues Tracker Route - Public (has its own authentication) */}
             <Route
               path="/dues-tracker"
               element={
                 <AppRouteWrapper appName="USA Pool League Dues Tracker">
                   <main className="main-app-content">
                     <DuesTracker />
                   </main>
                 </AppRouteWrapper>
               }
             />
             
             {/* Player Management Route */}
             <Route
               path="/admin/players"
               element={
                 isAuthenticated && isAdmin() ? (
                   <AppRouteWrapper appName="Player Management">
                     <div className="admin-app-content">
                       <PlayerManagement />
                     </div>
                   </AppRouteWrapper>
                 ) : (
                   <Navigate to="/" />
                 )
               }
             />
            <Route
              path="/platform-admin"
              element={
                isAuthenticated && isSuperAdmin() ? (
                  <AppRouteWrapper appName="Platform Admin">
                    <div className="platform-admin-app-content">
                      <PlatformAdminDashboard />
                    </div>
                  </AppRouteWrapper>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            
            {/* Other Routes */}
            <Route path="/confirm-match" element={<ConfirmMatch />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/auth/callback" element={<OAuthCallback onSuccess={handleLoginSuccess} />} />
            <Route
              path="/simple-pool"
              element={<SimplePoolGame />}
            />
            <Route
              path="/tenball-tutorial"
              element={<TenBallTutorial />}
            />
            <Route
              path="/mobile-test"
              element={<MobileTestPage />}
            />
            
            {/* Cueless in the Booth Route */}
            <Route
              path="/cueless"
              element={<CuelessInTheBooth />}
            />

            {/* Arcade — redirects to kiosk; fullscreen handled above */}
            <Route path="/arcade" element={<Navigate to="/arcade/kiosk" replace />} />
            <Route path="/arcade/kiosk" element={<ArcadeKiosk />} />
            <Route path="/arcade/tv" element={<ArcadeTvRedirect />} />
            <Route
              path="/arcade/admin"
              element={
                isAuthenticated && isAdmin() ? (
                  <AppRouteWrapper appName="Arcade Admin">
                    <main className="main-app-content">
                      <ArcadeAdmin />
                    </main>
                  </AppRouteWrapper>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            
            {/* Legends Pool League Tracker Route */}
            <Route
              path="/legends-tracker"
              element={
                <AppRouteWrapper appName="Legends Pool League Tracker">
                  <main className="main-app-content">
                    <LegendsPoolLeagueTracker />
                  </main>
                </AppRouteWrapper>
              }
            />

            {/* Tournament Bracket — operator only. TV and how-it-works stay public. */}
            <Route
              path="/tournament-bracket"
              element={
                canRunTournament || hasLocalTournamentWork() ? (
                  <AppRouteWrapper appName="Tournament Bracket">
                    <main className="main-app-content">
                      <TournamentBracketApp />
                    </main>
                  </AppRouteWrapper>
                ) : (
                  <AppRouteWrapper appName="Tournament Bracket">
                    <main className="main-app-content">
                      <TournamentBracketGate
                        isAuthenticated={isAuthenticated}
                        adminLoading={adminLoading}
                        onLoginSuccess={handleLoginSuccess}
                      />
                    </main>
                  </AppRouteWrapper>
                )
              }
            />
            <Route
              path="/tournament-bracket/tv"
              element={
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  minHeight: '100%',
                  background: '#000',
                  padding: 0,
                  margin: 0,
                  zIndex: 9999,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <CashClimbTvView />
                </div>
              }
            />
            <Route
              path="/tournament-bracket/how-it-works"
              element={
                <AppRouteWrapper appName="How Cash Climb works">
                  <main className="main-app-content">
                    <CashClimbPublicGuide />
                  </main>
                </AppRouteWrapper>
              }
            />
            <Route
              path="/tournament-bracket/submit/:eventId?"
              element={
                <AppRouteWrapper appName="Submit Cash Climb result">
                  <main className="main-app-content">
                    <CashClimbSubmitPage />
                  </main>
                </AppRouteWrapper>
              }
            />
            <Route
              path="/tournament-bracket/elim/:eventId?"
              element={
                <AppRouteWrapper appName="Submit elimination result">
                  <main className="main-app-content">
                    <ElimSubmitPage />
                  </main>
                </AppRouteWrapper>
              }
            />

            {/* Estate Vault — case entry, then case-scoped shell (routes stay /estateit) */}
            <Route path="/estate-inventory" element={<Navigate to="/estateit" replace />} />
            <Route
              path="/estate-inventory/admin"
              element={<Navigate to={`${ESTATEIT_PATH}/owner`} replace />}
            />
            <Route
              path="/estate-inventory/helper"
              element={<Navigate to={`${ESTATEIT_PATH}/enter`} replace />}
            />
            <Route
              path="/estate-inventory/family"
              element={<Navigate to={`${ESTATEIT_PATH}/enter`} replace />}
            />
            <Route
              path="/estate-inventory/advisor"
              element={<Navigate to={`${ESTATEIT_PATH}/enter`} replace />}
            />
            <Route
              path="/estate-inventory/auction"
              element={<Navigate to={ESTATEIT_PATH} replace />}
            />

            <Route
              path="/estateit"
              element={
                <main className="main-app-content">
                  <EstateCaseEntry />
                </main>
              }
            />

            <Route
              path="/estateit/enter"
              element={
                <main className="main-app-content">
                  <EstateFamilySignIn />
                </main>
              }
            />

            <Route
              path="/estateit/oauth"
              element={
                <main className="main-app-content">
                  <EstateVaultOAuthCallback />
                </main>
              }
            />

            <Route
              path="/estateit/owner"
              element={
                <main className="main-app-content">
                  <EstateOwnerHome />
                </main>
              }
            />

            <Route
              path="/estateit/super"
              element={
                <main className="main-app-content">
                  <EstateSuperGate />
                </main>
              }
            />

            {/* Legacy short role URLs → gateway (no hardcoded seed case) */}
            <Route
              path="/estateit/admin"
              element={<Navigate to={`${ESTATEIT_PATH}/owner`} replace />}
            />
            <Route
              path="/estateit/helper"
              element={<Navigate to={`${ESTATEIT_PATH}/enter`} replace />}
            />
            <Route
              path="/estateit/family"
              element={<Navigate to={`${ESTATEIT_PATH}/enter`} replace />}
            />
            <Route
              path="/estateit/advisor"
              element={<Navigate to={`${ESTATEIT_PATH}/enter`} replace />}
            />
            <Route
              path="/estateit/auction"
              element={<Navigate to={ESTATEIT_PATH} replace />}
            />

            <Route
              path="/estateit/:caseNumber"
              element={
                <EstateCaseProvider>
                  <main className="main-app-content">
                    <EstateRoleLanding />
                  </main>
                </EstateCaseProvider>
              }
            />

            <Route
              path="/estateit/:caseNumber/admin"
              element={
                <EstateCaseProvider>
                  <AppRouteWrapper appName={`${APP_NAME} · Admin`}>
                    <main className="main-app-content">
                      <EstateAdminGate />
                    </main>
                  </AppRouteWrapper>
                </EstateCaseProvider>
              }
            />

            <Route
              path="/estateit/:caseNumber/helper"
              element={
                <EstateCaseProvider>
                  <main className="main-app-content">
                    <HelperPortal />
                  </main>
                </EstateCaseProvider>
              }
            />

            <Route
              path="/estateit/:caseNumber/advisor"
              element={
                <EstateCaseProvider>
                  <main className="main-app-content">
                    <AdvisorPortal />
                  </main>
                </EstateCaseProvider>
              }
            />

            <Route
              path="/estateit/:caseNumber/family"
              element={
                <EstateCaseProvider>
                  <main className="main-app-content">
                    <SiblingPortal />
                  </main>
                </EstateCaseProvider>
              }
            />

            <Route
              path="/estateit/:caseNumber/auction"
              element={
                <EstateCaseProvider>
                  <main className="main-app-content">
                    <AuctionPortal />
                  </main>
                </EstateCaseProvider>
              }
            />
            
            {/* Hub Route */}
            <Route
              path="/hub"
              element={<Navigate to="/ladder" replace />}
            />

            {/* Embed-only landing for frusapl.com / GoDaddy iframe (2 cards + Duezy, no USAPL) */}
            <Route
              path="/embed-preview"
              element={<EmbedLanding />}
            />

            {/* Default Route - Homepage */}
            <Route
              path="/"
              element={<Homepage canRunTournament={canRunTournament} />}
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Global Profile Modal */}
        {isAuthenticated && (
          <UserProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            currentUser={{
              firstName: userFirstName,
              lastName: userLastName,
              email: userEmail,
              phone: '',
              locations: '',
              availability: {}
            }}
            isMobile={isMobileViewport}
            onUserUpdate={() => {
              // Trigger ladder/profile consumers to re-check completion state.
              setProfileRefreshKey((prev) => prev + 1);
            }}
          />
        )}

      </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
