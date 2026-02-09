import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

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
import adminAuthService from '@shared/services/services/adminAuthService.js';

// Guest App Components
import GuestLeagueApp from '@shared/components/guest/GuestLeagueApp';
import GuestLadderApp from '@shared/components/guest/GuestLadderApp';
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

function AppContent() {
  const location = useLocation();

  // When returning from Square credit purchase: run before paint so we land on ladder with payment modal.
  useLayoutEffect(() => {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const q = new URLSearchParams(search || (hash.includes('?') ? hash.slice(hash.indexOf('?')) : ''));
    const fromReturn = q.get('credit_purchase_success') === '1' || hash.includes('credit_purchase_success=1');
    if (fromReturn) {
      try { sessionStorage.setItem('credit_purchase_return', '1'); } catch (_) {}
      const transactionId = q.get('transactionId') || q.get('transaction_id');
      const newHash = '#/ladder?tab=payment-dashboard&credit_purchase_success=1' + (transactionId ? '&transactionId=' + encodeURIComponent(transactionId) : '');
      if (!hash.startsWith('#/ladder')) {
        window.location.hash = newHash;
      }
    }
  }, []);

  // --- State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPin, setUserPin] = useState("");
  const [userToken, setUserToken] = useState("");
  const [userType, setUserType] = useState("league");
  const [currentAppName, setCurrentAppName] = useState("");
  const [useSupabaseAuth, setUseSupabaseAuth] = useState(true); // Toggle for Supabase vs old auth

  // --- Load auth/user info from localStorage on mount ---
  useEffect(() => {
    const savedAuth = localStorage.getItem("isAuthenticated");
    if (savedAuth === "true") {
      setUserFirstName(localStorage.getItem("userFirstName") || "");
      setUserLastName(localStorage.getItem("userLastName") || "");
      setUserEmail(localStorage.getItem("userEmail") || "");
      setUserPin(localStorage.getItem("userPin") || "");
      setUserToken(localStorage.getItem("userToken") || "");
      setUserType(localStorage.getItem("userType") || "league");
      setIsAuthenticated(true);
    }
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
  };

  // --- Check if user is super admin ---
  const [isSuperAdminState, setIsSuperAdminState] = useState(false);
  const [isAdminState, setIsAdminState] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isSuperAdmin = () => {
    return isSuperAdminState;
  };

  const isAdmin = () => {
    return isAdminState;
  };

  // Check admin status when user logs in
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isAuthenticated && userEmail) {
        setAdminLoading(true);
        try {
          // Check if user is a super admin
          const superAdminResult = await adminAuthService.isSuperAdmin(userEmail, userPin || 'supabase-auth');
          setIsSuperAdminState(superAdminResult);
          
          // Check if user is any type of admin
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
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, userEmail, userPin]);

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
    setUserType("league");
    setCurrentAppName("");
    setIsAuthenticated(false);
    setIsAdminState(false);
    setIsSuperAdminState(false);
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("userLastName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPin");
    localStorage.removeItem("userType");
    localStorage.removeItem("isAuthenticated");
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

  // When ?preview=1 on homepage, show logged-out nav (for embed previews on frusapl.com etc.)
  const isPreviewMode = location.pathname === '/' && (location.search?.includes('preview=1') || window.location.hash?.includes('preview=1'));

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflowX: "hidden", background: "#000" }}>
        {/* Only show global FloatingLogos when NOT on ladder routes */}
        {(() => {
          const isLadderRoute = location.pathname.startsWith('/ladder');
          const isEmbedPreview = location.pathname === '/embed-preview';
          return !isLadderRoute && !isEmbedPreview && <FloatingLogos />;
        })()}
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
        />

                 <div className="main-content-wrapper" style={{ position: "relative", zIndex: 3, maxWidth: location.pathname === '/' ? 1400 : location.pathname === '/embed-preview' ? 1000 : 900, margin: "0 auto", width: "100%", background: "none", minHeight: "100vh", paddingTop: "80px" }}>
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
                        />
                      </main>
                    </AppRouteWrapper>
                  ) : (
                    <Navigate to="/" />
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
                    <AppRouteWrapper appName="Ladder of Legends Management">
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
                    <AppRouteWrapper appName="Ladder of Legends Player Management">
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

            {/* Tournament Bracket Route */}
            <Route
              path="/tournament-bracket"
              element={
                isAuthenticated ? (
                  <AppRouteWrapper appName="Tournament Bracket">
                    <main className="main-app-content">
                      <TournamentBracketApp />
                    </main>
                  </AppRouteWrapper>
                ) : (
                  <Navigate to="/hub" />
                )
              }
            />
            
            {/* Hub Route */}
            <Route
              path="/hub"
              element={
                <AppRouteWrapper appName={isAuthenticated ? "Front Range Pool Hub" : ""}>
                  <MainApp
                    isAuthenticated={isAuthenticated}
                    userFirstName={userFirstName}
                    userLastName={userLastName}
                    userEmail={userEmail}
                    userPin={userPin}
                    userType={userType}
                    handleLoginSuccess={handleLoginSuccess}
                    handleLogout={handleLogout}
                  />
                </AppRouteWrapper>
              }
            />

            {/* Embed-only landing for frusapl.com / GoDaddy iframe (2 cards + Duezy, no USAPL) */}
            <Route
              path="/embed-preview"
              element={<EmbedLanding />}
            />

            {/* Default Route - Homepage */}
            <Route
              path="/"
              element={<Homepage />}
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
            isMobile={false}
            onUserUpdate={() => {
              // Refresh any necessary data after profile update
              console.log('Profile updated from global modal');
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
