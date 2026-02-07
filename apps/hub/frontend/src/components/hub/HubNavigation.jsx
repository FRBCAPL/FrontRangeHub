import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HubNavigation.css';
import ball8 from '@shared/assets/ball8.svg';
import ball9 from '@shared/assets/nineball.svg';
import ball10 from '@shared/assets/tenball.svg';

const HubNavigation = ({ currentAppName, isAdmin, isSuperAdmin, onLogout, userFirstName, userLastName, onProfileClick, hideBrand }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

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
  
  return (
    <div className={`hub-navigation ${isLadderApp ? 'ladder-app' : ''} ${location.pathname === '/' ? 'homepage-nav' : ''} ${isMobile ? 'mobile-nav' : ''}`}>
      <div className="nav-content">
        {/* Desktop: 8/9/10 ball + Front Range Pool.com – hidden when hideBrand (e.g. embed-preview) */}
        <div className={`nav-left ${location.pathname === '/' ? 'hide-on-homepage' : ''}`} style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          order: 1
        }}>
          {!hideBrand && window.innerWidth > 768 && (
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
        
        {/* Mobile: 8/9/10 ball + Front Range Pool.com above title – hidden when hideBrand */}
        {window.innerWidth <= 768 && (
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
              {!hideBrand && (
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
              )}
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
                  {location.pathname === '/' || location.pathname === '/embed-preview'
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
                    : location.pathname === '/calendar'
                    ? 'Match Calendar'
                    : currentAppName || 'Front Range Pool'
                  }
                </span>
              </div>
              <button 
                className="hamburger-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  width: '50px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: '3rem'
                }}
              >
                ☰
              </button>
            </div>
          </div>
        )}
        
        {/* Desktop layout: Title and welcome message */}
        {window.innerWidth > 768 && (
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
