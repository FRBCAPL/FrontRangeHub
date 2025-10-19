import React, { useState, useEffect, useRef } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

// Main pages/components
import ConfirmMatch from "./components/ConfirmMatch";
import Dashboard from "./components/dashboard/Dashboard";
import MatchChat from "./components/chat/MatchChat";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import PlatformAdminDashboard from "./components/PlatformAdminDashboard";
import SupabaseLogin from "./components/modal/SupabaseLogin";
import FloatingLogos from './components/FloatingLogos';
import TenBallTutorial from './components/TenBallTutorial';
import SimplePoolGame from './components/tenball/SimplePoolGame';
import MobileTestPage from './components/MobileTestPage';
import AppHub from './components/hub/AppHub';
import LoggedOutHub from './components/hub/LoggedOutHub';
import HubNavigation from './components/hub/HubNavigation';
import AppRouteWrapper from './components/hub/AppRouteWrapper';
import Homepage from './components/Homepage';
import CuelessInTheBooth from './components/cueless/CuelessInTheBooth';
import LadderApp from './components/ladder/LadderApp';
import LadderManagement from './components/ladder/LadderManagement';
import LadderPlayerManagement from './components/ladder/LadderPlayerManagement';
import PublicLadderEmbed from './components/ladder/PublicLadderEmbed';
import EmbedApp from './EmbedApp';
import SimpleLadderEmbed from './components/ladder/SimpleLadderEmbed';
import PlayerManagement from './components/admin/PlayerManagement';
import UserProfileModal from './components/modal/UserProfileModal';
import DuesTracker from './components/dues/DuesTracker';
import LegendsPoolLeagueTracker from './components/legends/LegendsPoolLeagueTracker';
import adminAuthService from './services/adminAuthService.js';

// Guest App Components
import GuestLeagueApp from './components/guest/GuestLeagueApp';
import GuestLadderApp from './components/guest/GuestLadderApp';
import PaymentSuccess from './components/payment/PaymentSuccess';

import logo from "./assets/logo.png";
import bcaplLogo from "./assets/bcapl_logo.png";
import csiLogo from "./assets/csi_logo.png";
import usaplLogo from "./assets/usapl_logo.png";
import fargorateLogo from "./assets/fargorate-logo.png";
import "./styles/variables.css";
import "./styles/global.css";
   // render force update
// Mobile optimization test script (development only)
const mobileOptimizationTestScript = `
// Mobile Optimization Test Script
console.log('🧪 Testing Mobile Optimization...');

// Test mobile detection
function testMobileDetection() {
  console.log('📱 Testing Mobile Detection:');
  console.log('- Window width:', window.innerWidth);
  console.log('- Window height:', window.innerHeight);
  console.log('- User agent:', navigator.userAgent);
  console.log('- Touch support:', 'ontouchstart' in window);
  console.log('- Max touch points:', navigator.maxTouchPoints);
  
  // Check if mobile components are loaded
  const mobileDashboard = document.querySelector('[data-mobile-dashboard]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const mobileCards = document.querySelectorAll('[data-mobile-card]');
  
  console.log('- Mobile Dashboard found:', !!mobileDashboard);
  console.log('- Mobile Navigation found:', !!mobileNav);
  console.log('- Mobile Cards found:', mobileCards.length);
}

// Test touch interactions
function testTouchInteractions() {
  console.log('👆 Testing Touch Interactions:');
  
  // Check for touch-friendly elements
  const buttons = document.querySelectorAll('button');
  const inputs = document.querySelectorAll('input');
  const links = document.querySelectorAll('a');
  
  let touchFriendlyButtons = 0;
  let touchFriendlyInputs = 0;
  
  buttons.forEach(button => {
    const style = window.getComputedStyle(button);
    const height = parseInt(style.height);
    const width = parseInt(style.width);
    if (height >= 44 && width >= 44) touchFriendlyButtons++;
  });
  
  inputs.forEach(input => {
    const style = window.getComputedStyle(input);
    const fontSize = parseInt(style.fontSize);
    if (fontSize >= 16) touchFriendlyInputs++;
  });
  
  console.log('- Touch-friendly buttons:', touchFriendlyButtons, '/', buttons.length);
  console.log('- Touch-friendly inputs:', touchFriendlyInputs, '/', inputs.length);
  console.log('- Total interactive elements:', buttons.length + inputs.length + links.length);
}

// Test responsive design
function testResponsiveDesign() {
  console.log('📐 Testing Responsive Design:');
  
  const viewport = document.querySelector('meta[name="viewport"]');
  console.log('- Viewport meta tag:', !!viewport);
  if (viewport) {
    console.log('- Viewport content:', viewport.getAttribute('content'));
  }
  
  // Check for mobile-specific CSS classes
  const mobileClasses = [
    'mobile-padding',
    'mobile-margin', 
    'mobile-text',
    'mobile-scroll',
    'mobile-touch-feedback'
  ];
  
  mobileClasses.forEach(className => {
    const elements = document.querySelectorAll(\`.\${className}\`);
    console.log(\`- Elements with .\${className}:\`, elements.length);
  });
}

// Test performance
function testPerformance() {
  console.log('⚡ Testing Performance:');
  
  // Check for optimized animations
  const styleSheets = Array.from(document.styleSheets);
  let mobileOptimizations = 0;
  
  styleSheets.forEach(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      rules.forEach(rule => {
        if (rule.cssText.includes('@media (max-width: 768px)')) {
          mobileOptimizations++;
        }
        if (rule.cssText.includes('touch-action')) {
          mobileOptimizations++;
        }
        if (rule.cssText.includes('-webkit-overflow-scrolling')) {
          mobileOptimizations++;
        }
      });
    } catch (e) {
      // Cross-origin stylesheets will throw errors
    }
  });
  
  console.log('- Mobile CSS optimizations found:', mobileOptimizations);
  
  // Check for lazy loading
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  console.log('- Lazy-loaded images:', lazyImages.length);
}

// Test accessibility
function testAccessibility() {
  console.log('♿ Testing Accessibility:');
  
  // Check for ARIA labels
  const ariaLabels = document.querySelectorAll('[aria-label]');
  const ariaLabelledBy = document.querySelectorAll('[aria-labelledby]');
  
  console.log('- Elements with aria-label:', ariaLabels.length);
  console.log('- Elements with aria-labelledby:', ariaLabelledBy.length);
  
  // Check for proper heading structure
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  console.log('- Total headings:', headings.length);
  
  // Check for focus indicators
  const focusableElements = document.querySelectorAll('button, input, select, textarea, a, [tabindex]');
  console.log('- Focusable elements:', focusableElements.length);
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Mobile Optimization Tests...\\n');
  
  testMobileDetection();
  console.log('');
  
  testTouchInteractions();
  console.log('');
  
  testResponsiveDesign();
  console.log('');
  
  testPerformance();
  console.log('');
  
  testAccessibility();
  console.log('');
  
  console.log('✅ Mobile Optimization Tests Complete!');
  console.log('💡 Check the results above to identify any issues.');
}

// Export for manual testing
window.testMobileOptimization = {
  runAllTests,
  testMobileDetection,
  testTouchInteractions,
  testResponsiveDesign,
  testPerformance,
  testAccessibility
};

console.log('🔧 Mobile optimization test functions loaded. Use testMobileOptimization.runAllTests() to run tests.');
`;


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
  
  // --- State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Load mobile optimization test script in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      try {
        // Execute the test script
        eval(mobileOptimizationTestScript);
        console.log('🧪 Mobile optimization test script loaded successfully');
      } catch (error) {
        console.error('❌ Error loading mobile optimization test script:', error);
      }
    }
  }, []);
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
    let firstName = "";
    let lastName = "";
    if (name) {
      const parts = name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    }
    setUserFirstName(firstName);
    setUserLastName(lastName);
    setUserEmail(email);
    setUserPin(pin);
    setUserToken(token || '');
    setUserType(userType || 'league');
    setIsAuthenticated(true);

    // Store unified user data
    localStorage.setItem("userFirstName", firstName);
    localStorage.setItem("userLastName", lastName);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userPin", pin);
    localStorage.setItem("userToken", token || '');
    localStorage.setItem("userType", userType || 'league'); // Default to league if not specified
    localStorage.setItem("isAuthenticated", "true");
    
    // Store complete user data if provided (includes ladderProfile, leagueProfile, etc.)
    if (userData) {
      localStorage.setItem("unifiedUserData", JSON.stringify(userData));
    }
    
    console.log('🔐 Unified Login Success:', {
      firstName,
      lastName,
      email,
      userType,
      pin: pin ? '***' : 'none',
      hasUserData: !!userData
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

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflowX: "hidden", background: "#000" }}>
        {/* Only show global FloatingLogos when NOT on ladder routes */}
        {(() => {
          const isLadderRoute = location.pathname.startsWith('/ladder');
          console.log('🔍 Current pathname:', location.pathname);
          console.log('🔍 Is ladder route:', isLadderRoute);
          console.log('🔍 Should show global FloatingLogos:', !isLadderRoute);
          return !isLadderRoute && <FloatingLogos />;
        })()}
                         <HubNavigation 
          currentAppName={currentAppName} 
          isAdmin={isAdminState}
          isSuperAdmin={isSuperAdminState}
          onLogout={handleLogout}
          userFirstName={userFirstName}
          userLastName={userLastName}
          onProfileClick={handleProfileClick}
        />

                 <div className="main-content-wrapper" style={{ position: "relative", zIndex: 3, maxWidth: 900, margin: "0 auto", width: "100%", background: "none", minHeight: "100vh", paddingTop: "80px" }}>
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

             {/* Dues Tracker Route - Admin Only */}
             <Route
               path="/dues-tracker"
               element={
                 isAuthenticated && isAdmin() ? (
                   <AppRouteWrapper appName="USA Pool League Dues Tracker">
                     <main className="main-app-content">
                       <DuesTracker />
                     </main>
                   </AppRouteWrapper>
                 ) : (
                   <Navigate to="/" />
                 )
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
