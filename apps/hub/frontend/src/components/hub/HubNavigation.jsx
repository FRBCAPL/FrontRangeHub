import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HubNavigation.css';
import ball8 from '@shared/assets/ball8.svg';
import ball9 from '@shared/assets/nineball.svg';
import ball10 from '@shared/assets/tenball.svg';

const HubNavigation = ({ currentAppName, isAdmin, isSuperAdmin, onLogout, userFirstName, userLastName, onProfileClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
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
    navigate('/hub');
  };

  const handleSwitchApp = () => {
    navigate('/hub');
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

  const isLadderApp = location.pathname === '/guest/ladder' || location.pathname === '/ladder' || currentAppName === 'Ladder of Legends';
  const handleHamburgerClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMobileMenuOpen((prev) => !prev);
  };
  
  return (
    <div className={`hub-navigation ${isLadderApp ? 'ladder-app' : ''} ${location.pathname === '/' ? 'homepage-nav' : ''} ${isMobile ? 'mobile-nav' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
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
              >
                <img src={ball8} alt="8-ball" className="nav-ball" />
                Front Range
                <img src={ball9} alt="9-ball" className="nav-ball" />
                Pool.com
                <img src={ball10} alt="10-ball" className="nav-ball" />
              </div>
            </div>
            <div className="nav-center" style={{ order: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 0.5rem', position: 'relative' }}>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <span className="app-title" style={location.pathname === '/' ? {
                  backgroundColor: 'red',
                  color: 'yellow',
                  fontSize: '1.4rem',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap'
                } : {}}>
                  {location.pathname === '/'
                    ? 'Front Range Pool.com'
                    : location.pathname === '/hub'
                    ? (!userFirstName ? 'THE HUB - Login' : 'THE HUB')
                    : location.pathname === '/guest/ladder' || location.pathname === '/ladder'
                    ? 'Ladder of Legends'
                    : location.pathname === '/cueless'
                    ? 'Cueless in the Booth'
                    : location.pathname === '/admin'
                    ? 'Admin Panel'
                    : location.pathname === '/platform-admin'
                    ? 'Platform Admin'
                    : location.pathname === '/dues-tracker'
                    ? 'Dues Tracker'
                    : location.pathname === '/tournament-bracket'
                    ? 'Tournament Bracket'
                    : location.pathname === '/calendar'
                    ? 'Match Calendar'
                    : currentAppName || 'Front Range Pool'
                  }
                </span>
              </div>
              <button 
                type="button"
                className="hamburger-btn"
                onClick={handleHamburgerClick}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
                style={{
                  width: '44px',
                  minWidth: '44px',
                  height: '34px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 0,
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              >
                ☰
              </button>
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
                {location.pathname === '/'
                  ? 'Front Range Pool.com'
                  : location.pathname === '/hub'
                  ? (!userFirstName ? 'THE HUB - Login' : 'THE HUB')
                  : location.pathname === '/guest/ladder' || location.pathname === '/ladder'
                  ? 'Ladder of Legends'
                  : location.pathname === '/cueless'
                  ? 'Cueless in the Booth'
                  : location.pathname === '/admin'
                  ? 'Admin Panel'
                  : location.pathname === '/platform-admin'
                  ? 'Platform Admin'
                  : location.pathname === '/dues-tracker'
                  ? 'Dues Tracker'
                  : location.pathname === '/tournament-bracket'
                  ? 'Tournament Bracket'
                  : location.pathname === '/calendar'
                  ? 'Match Calendar'
                  : currentAppName || 'Front Range Pool'
                }
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
                {/* Admin dropdown */}
                {(isAdmin || isSuperAdmin) && (
                  <div className="admin-dropdown">
                    <button className="admin-btn dropdown-toggle">
                      ⚙️ Admin
                    </button>
                    <div className="dropdown-menu">
                      {isAdmin && (
                        <>
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
            {/* Admin options */}
            {(isAdmin || isSuperAdmin) && (
              <div className="mobile-admin-section">
                <h4>Admin</h4>
                {isAdmin && (
                  <>
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
    </div>
  );
};

export default HubNavigation;
