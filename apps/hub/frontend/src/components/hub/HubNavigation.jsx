import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HubNavigation.css';
import HubLoginModal from './HubLoginModal.jsx';
import './HubLoginModal.css';
import AdminAlertsBell from '../admin-inbox/AdminAlertsBell.jsx';
import useAdminAttention from '../admin-inbox/useAdminAttention.js';
import { ADMIN_INBOX_PATH } from '../admin-inbox/adminAttentionService.js';
import useNavSideWidth from './useNavSideWidth.js';
import ball8 from '@shared/assets/ball8.svg';
import ball9 from '@shared/assets/nineball.svg';
import ball10 from '@shared/assets/tenball.svg';

function hubCenterTitle(pathname, currentAppName, userFirstName) {
  if (pathname === '/') return 'Front Range Pool.com';
  if (pathname === '/usapl' || String(pathname || '').startsWith('/usapl/')) {
    return 'Front Range USA Pool League';
  }
  if (pathname === '/consignment' || String(pathname || '').startsWith('/consignment/')) {
    return 'Consignment Shop';
  }
  if (pathname === '/hub') return !userFirstName ? 'Ladder - Login' : 'Ladder of Legends';
  if (pathname === '/guest/ladder' || pathname === '/ladder') return 'Ladder of Legends';
  if (pathname === '/cueless') return 'Cueless in the Booth';
  if (pathname === '/admin') return 'Admin Panel';
  if (pathname === '/platform-admin') return 'Platform Admin';
  if (pathname === '/dues-tracker') return 'Dues Tracker';
  if (pathname === '/tournament-bracket/how-it-works') return 'How Cash Climb works';
  if (pathname.startsWith('/tournament-bracket/submit')) return 'Submit Cash Climb result';
  if (pathname === '/tournament-bracket') return 'Tournament Bracket';
  if (pathname === '/estate-inventory' || pathname.startsWith('/estate-inventory/')) return 'Estate Vault';
  if (pathname === '/calendar') return 'Match Calendar';
  return currentAppName || 'Front Range Pool';
}

const HubNavigation = ({ currentAppName, isAdmin, isSuperAdmin, onLogout, userFirstName, userLastName, onProfileClick, showLadderUserViewToggle, ladderUserViewActive, onToggleLadderUserView, onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showLogin, setShowLogin] = React.useState(false);
  const showLoginButton = !userFirstName && Boolean(onLoginSuccess);
  const attention = useAdminAttention(Boolean(isAdmin && userFirstName));

  // Lets app pages (e.g. consignment bidding) open the hub sign-in: window.dispatchEvent(new Event('frpl:open-login'))
  React.useEffect(() => {
    if (!onLoginSuccess) return undefined;
    const open = () => setShowLogin(true);
    window.addEventListener('frpl:open-login', open);
    return () => window.removeEventListener('frpl:open-login', open);
  }, [onLoginSuccess]);

  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 768px)').matches
      : false
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (event) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  React.useEffect(() => {
    // Keep mobile menu closed when route changes
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    // Close only when actually leaving mobile layout
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  const handleReturnToHub = () => {
    navigate('/ladder');
  };

  const handleSwitchApp = () => {
    navigate('/ladder');
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  const handlePlayerManagementClick = () => {
    navigate('/admin/players');
  };

  const handlePlatformAdminClick = () => {
    navigate('/platform-admin');
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/');
  };

  const isLadderApp = location.pathname === '/guest/ladder' || location.pathname === '/ladder' || location.pathname.startsWith('/ladder/') || currentAppName === 'Ladder of Legends';
  const isUsaplApp = location.pathname === '/usapl' || location.pathname.startsWith('/usapl/');
  const isConsignmentApp = location.pathname === '/consignment' || location.pathname.startsWith('/consignment/');
  const isCuelessApp = location.pathname === '/cueless' || location.pathname.startsWith('/cueless/');
  const isArcadeApp = location.pathname.startsWith('/arcade/');
  const isTournamentApp =
    location.pathname.startsWith('/tournament-bracket') &&
    location.pathname !== '/tournament-bracket/tv' &&
    !location.pathname.startsWith('/tournament-bracket/break-and-run/tv') &&
    !location.pathname.startsWith('/tournament-bracket/break-and-run/view') &&
    !location.pathname.startsWith('/tournament-bracket/break-and-run/rules');
  const centerTitle = hubCenterTitle(location.pathname, currentAppName, userFirstName);
  const fullName = [userFirstName, userLastName].filter(Boolean).join(' ');
  const navRootRef = React.useRef(null);
  useNavSideWidth(navRootRef, (isConsignmentApp || isArcadeApp) && !isMobile, [userFirstName, isAdmin, isSuperAdmin]);
  const handleHamburgerClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMobileMenuOpen((prev) => !prev);
  };
  
  return (
    <div ref={navRootRef} className={`hub-navigation ${isLadderApp ? 'ladder-app' : ''} ${isUsaplApp ? 'usapl-nav' : ''} ${isConsignmentApp ? 'consignment-nav' : ''} ${isArcadeApp ? 'arcade-nav' : ''} ${isCuelessApp ? 'cueless-app' : ''} ${isTournamentApp ? 'tournament-app' : ''} ${location.pathname === '/' ? 'homepage-nav' : ''} ${isMobile ? 'mobile-nav' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <div className="nav-content">
        {/* Mobile layout: 8/9/10 ball button above title */}
        <div className={`nav-left ${location.pathname === '/' ? 'hide-on-homepage' : ''}`} style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          order: 1
        }}>
          {/* Show button on desktop, hide on mobile (will be shown above title on mobile) */}
          {!isMobile && (
            <div 
              className="hub-brand hub-brand-clickable"
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
              aria-label="Front Range Pool.com home"
            >
              <img src={ball8} alt="8-ball" className="nav-ball" />
              Front Range
              <img src={ball9} alt="9-ball" className="nav-ball" />
              Pool.com
              <img src={ball10} alt="10-ball" className="nav-ball" />
            </div>
          )}
        </div>
        
        {/* Mobile button above title */}
        {isMobile && (
          <div className="mobile-brand-above-title" style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginTop: '0',
            marginBottom: '0'
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 1rem'
            }}>
              <div 
                className="hub-brand hub-brand-clickable mobile-brand"
                onClick={() => navigate('/')}
                style={{ cursor: 'pointer' }}
                aria-label="Front Range Pool.com home"
              >
                <img src={ball8} alt="8-ball" className="nav-ball" />
                Front Range
                <img src={ball9} alt="9-ball" className="nav-ball" />
                Pool.com
                <img src={ball10} alt="10-ball" className="nav-ball" />
              </div>
            </div>
            <div className="nav-center" style={{ order: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', padding: '0 .5rem 0 0rem' }}>
              <div style={{ textAlign: 'center' }}>
                <span className="app-title" style={location.pathname === '/' ? {
                  backgroundColor: 'red',
                  color: 'yellow',
                  fontSize: '1.4rem',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap'
                } : {}}>
                  {centerTitle}
                </span>
              </div>
              {showLoginButton ? (
                <button
                  type="button"
                  className="hub-login-nav-btn"
                  onClick={() => setShowLogin(true)}
                  style={{ marginRight: '1rem' }}
                >
                  <span className="hub-login-nav-part">🔑 Sign up</span> <span className="hub-login-nav-part">/ Log in</span>
                </button>
              ) : (
              <button 
                type="button"
                className="hamburger-btn"
                onClick={handleHamburgerClick}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
                style={{
                  position: 'relative',
                  width: '50px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: '3rem'
                }}
              >
                ☰
                {isAdmin && attention.total ? (
                  <span className="aib-badge" aria-label={`${attention.total} admin alerts`}>
                    {attention.total > 99 ? '99+' : attention.total}
                  </span>
                ) : null}
              </button>
              )}
            </div>
          </div>
        )}
        
        {/* Desktop layout: Title and welcome message */}
        {!isMobile && (
          <div className="nav-center" style={{ order: 2 }}>
            <div>
              <span className="app-title" style={location.pathname === '/' ? {
                backgroundColor: 'red',
                color: 'yellow',
                fontSize: '2.2rem',
                letterSpacing: '1px',
                whiteSpace: 'nowrap'
              } : {}}>
                {centerTitle}
              </span>
            </div>
          </div>
        )}
        
        {/* Mobile layout: Buttons below welcome message */}
        {!userFirstName ? (
          <div className="nav-right" style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
            order: 3
          }}>
            <div className="login-nav-info" style={{ display: 'none' }}>
              🎯  Front Range Pool Hub
            </div>
            {showLoginButton && !isMobile ? (
              <button type="button" className="hub-login-nav-btn" onClick={() => setShowLogin(true)}>
                <span className="hub-login-nav-part">🔑 Sign up</span> <span className="hub-login-nav-part">/ Log in</span>
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Desktop buttons */}
            {!isMobile && (
              <div className="nav-right" style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
                gap: '0.5rem',
                order: 3
              }}>
                <span className="hub-nav-greeting" title={fullName}>
                  Hi, <strong>{userFirstName}</strong>
                </span>
                {/* Ladder: User view toggle (admin only) – next to Admin */}
                {showLadderUserViewToggle && onToggleLadderUserView && (
                  <button
                    type="button"
                    onClick={onToggleLadderUserView}
                    className="ladder-user-view-nav-btn"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(139, 92, 246, 0.6)',
                      background: ladderUserViewActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(139, 92, 246, 0.2)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title={ladderUserViewActive ? 'Switch back to admin view' : 'See ladder as a normal user'}
                  >
                    {ladderUserViewActive ? '👤 Admin view' : '👤 User view'}
                  </button>
                )}
                {isAdmin && <AdminAlertsBell attention={attention} />}
                {/* Admin dropdown */}
                {(isAdmin || isSuperAdmin) && (
                  <div className="admin-dropdown">
                    <button className="admin-btn dropdown-toggle">
                      ⚙️ Admin
                    </button>
                    <div className="dropdown-menu">
                      {isAdmin && (
                        <>
                          <button onClick={() => navigate(ADMIN_INBOX_PATH)} className="dropdown-item">
                            🔔 Admin Inbox{attention.total ? ` (${attention.total})` : ''}
                          </button>
                          <button onClick={handlePlayerManagementClick} className="dropdown-item">
                            👥 Players
                          </button>
                          <button onClick={handleAdminClick} className="dropdown-item">
                            ⚙️ Admin
                          </button>
                        </>
                      )}
                      {isSuperAdmin && (
                        <button onClick={handlePlatformAdminClick} className="dropdown-item">
                          🔧 Platform Admin
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                <button onClick={onProfileClick} className="profile-btn">
                  👤 Profile
                </button>
                <button onClick={handleSwitchApp} className="switch-app-btn">
                  🔄 Switch App
                </button>
                <button onClick={handleLogout} className="logout-btn">
                  🚪 Logout
                </button>
              </div>
            )}

          </>
        )}
      </div>

      {/* Mobile menu dropdown */}
      {isMobile && isMobileMenuOpen && userFirstName && (
        <div className="mobile-menu-dropdown">
          <div className="mobile-menu-content">
            <p className="hub-nav-greeting hub-nav-greeting--menu">
              Signed in as <strong>{fullName}</strong>
            </p>
            {/* Admin options */}
            {(isAdmin || isSuperAdmin) && (
              <div className="mobile-admin-section">
                <h4>Admin</h4>
                {isAdmin && (
                  <>
                    <button onClick={() => { navigate(ADMIN_INBOX_PATH); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                      🔔 Admin Inbox{attention.total ? ` (${attention.total})` : ''}
                    </button>
                    <button onClick={() => { handlePlayerManagementClick(); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                      👥 Players
                    </button>
                    <button onClick={() => { handleAdminClick(); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                      ⚙️ Admin
                    </button>
                  </>
                )}
                {isSuperAdmin && (
                  <button onClick={() => { handlePlatformAdminClick(); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                    🔧 Platform Admin
                  </button>
                )}
              </div>
            )}
            
            {/* User options */}
            <div className="mobile-user-section">
              <button onClick={() => { onProfileClick(); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                👤 Profile
              </button>
              <button onClick={() => { handleSwitchApp(); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                🔄 Switch App
              </button>
              <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="mobile-menu-item logout">
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogin ? (
        <HubLoginModal onClose={() => setShowLogin(false)} onLoginSuccess={onLoginSuccess} />
      ) : null}
    </div>
  );
};

export default HubNavigation;
