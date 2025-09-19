import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveWrapper from "../ResponsiveWrapper";
import PoolSimulation from "../PoolSimulation";
import { BACKEND_URL } from '../../config.js';
import './AppHub.css';

const AppHub = ({ 
  isAuthenticated, 
  userFirstName, 
  userLastName, 
  userEmail, 
  userPin, 
  userType, 
  handleLogout,
  onOpenProfile // Add this prop to open the existing profile editor
}) => {
  const navigate = useNavigate();
  const [selectedApp, setSelectedApp] = useState(null);
  const [actualUserType, setActualUserType] = useState('league');
  const [isLoadingPlayerType, setIsLoadingPlayerType] = useState(true);

  // Detect actual player type when component mounts
  useEffect(() => {
    const detectPlayerType = async () => {
      try {
        console.log('🔍 Hub: Starting player type detection for:', userEmail);
        setIsLoadingPlayerType(true);
        const response = await fetch(`${BACKEND_URL}/api/unified-auth/profile-data?email=${encodeURIComponent(userEmail)}&appType=league`);
        console.log('🔍 Hub: API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Hub: API response data:', data);
          
          if (data.success && data.profile) {
            // Check if user has both league and ladder profiles
            const hasLeagueProfile = data.profile.divisions && data.profile.divisions.length > 0;
            const hasLadderProfile = data.profile.ladderInfo && data.profile.ladderInfo.ladderName;
            
            console.log('🔍 Hub: Profile analysis:', {
              hasLeagueProfile,
              hasLadderProfile,
              divisions: data.profile.divisions,
              ladderInfo: data.profile.ladderInfo
            });
            
            if (hasLeagueProfile && hasLadderProfile) {
              console.log('✅ Hub: Setting user type to BOTH');
              setActualUserType('both');
            } else if (hasLeagueProfile) {
              console.log('✅ Hub: Setting user type to LEAGUE');
              setActualUserType('league');
            } else if (hasLadderProfile) {
              console.log('✅ Hub: Setting user type to LADDER');
              setActualUserType('ladder');
            } else {
              console.log('⚠️ Hub: No profiles found, defaulting to LEAGUE');
              setActualUserType('league'); // Default to league
            }
          } else {
            console.log('⚠️ Hub: API response not successful or no profile data');
          }
        } else {
          console.log('❌ Hub: API response not ok:', response.status);
        }
      } catch (error) {
        console.error('❌ Hub: Error detecting player type:', error);
        setActualUserType('league'); // Default to league on error
      } finally {
        setIsLoadingPlayerType(false);
        console.log('🔍 Hub: Player type detection complete. Final type:', actualUserType);
      }
    };

    if (userEmail) {
      detectPlayerType();
    }
  }, [userEmail]);

  const availableApps = [
    {
      id: 'ladder',
      name: 'Ladder App',
      description: 'Challenge-based ladder system with rankings',
      icon: '⚔️',
      color: '#2196F3',
      status: 'active',
      route: '/ladder'
    },
    {
      id: 'league',
      name: 'League App',
      description: 'Manage league matches, schedules, and standings',
      icon: '🏆',
      color: '#4CAF50',
      status: 'active',
      route: '/league'
    }
  ];

  const handleAppSelect = async (app) => {
    if (app.status === 'active') {
      setSelectedApp(app);
      
      // Simply navigate to the app - no profile checks needed
      navigate(app.route);
    } else {
      // Show coming soon message
      alert(`${app.name} is coming soon!`);
    }
  };

  const handleLogoutClick = () => {
    handleLogout();
    navigate('/');
  };

  // Function to refresh player type (can be called from parent)
  const refreshPlayerType = async () => {
    try {
      setIsLoadingPlayerType(true);
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/profile-data?email=${encodeURIComponent(userEmail)}&appType=league`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          const hasLeagueProfile = data.profile.divisions && data.profile.divisions.length > 0;
          const hasLadderProfile = data.profile.ladderInfo && data.profile.ladderInfo.ladderName;
          
          if (hasLeagueProfile && hasLadderProfile) {
            setActualUserType('both');
          } else if (hasLeagueProfile) {
            setActualUserType('league');
          } else if (hasLadderProfile) {
            setActualUserType('ladder');
          } else {
            setActualUserType('league');
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing player type:', error);
    } finally {
      setIsLoadingPlayerType(false);
    }
  };

  return (
    <div className="app-hub-container">
      {/* Pool Simulation Background */}
      <div className="pool-simulation-background">
        <ResponsiveWrapper aspectWidth={800} aspectHeight={400}>
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            <PoolSimulation />
          </div>
        </ResponsiveWrapper>
      </div>

      {/* Content Overlay */}
      <div className="app-hub-content">
        <div className="app-hub-header">
          {isAuthenticated && (
            <div style={{ fontSize: '1.4rem', fontWeight: '600', color: 'white', marginBottom: '0.3rem', textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.3)', paddingTop: '0.5rem' }}>
              Hello, {userFirstName}
            </div>
          )}
                     {isAuthenticated && (
                         <div className="user-info">
              <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem', fontWeight: '500', textAlign: 'center', letterSpacing: '0.2px', textShadow: '0 1px 2px rgba(0,0,0,0.2)', marginBottom: '0.4rem' }}>
                {isLoadingPlayerType ? (
                  'Detecting your player type...'
                ) : (
                  `Thank you for being a ${actualUserType === 'both' ? 'League & Ladder' :
                    actualUserType === 'league' ? 'League' :
                    actualUserType === 'ladder' ? 'Ladder' : 'Unknown'} player`
                )}
              </div>
              {isLoadingPlayerType ? (
                <span style={{
                  background: '#666',
                  padding: '6px 18px',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'inline-block',
                  boxShadow: '0 3px 12px rgba(102, 102, 102, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'relative',
                  backdropFilter: 'blur(4px)',
                  letterSpacing: '0.3px'
                }}>
                  Detecting...
                </span>
              ) : (
                <span style={{
                  background: actualUserType === 'both' ? 'linear-gradient(135deg, #4CAF50 20%, #2E7D32 80%)' :
                            actualUserType === 'league' ? 'linear-gradient(135deg, #4CAF50 20%, #2E7D32 80%)' :
                            actualUserType === 'ladder' ? 'linear-gradient(135deg, #2196F3 20%, #1565C0 80%)' : '#666',
                  padding: '6px 18px',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'inline-block',
                  boxShadow: `
                    0 3px 12px ${actualUserType.includes('league') ? 'rgba(76, 175, 80, 0.4)' : 'rgba(33, 150, 243, 0.4)'},
                    inset 0 1px 2px rgba(255, 255, 255, 0.4),
                    inset 0 -1px 1px rgba(0, 0, 0, 0.2)
                  `,
                  border: '1px solid rgba(255,255,255,0.35)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'relative',
                  backdropFilter: 'blur(4px)',
                  letterSpacing: '0.3px'
                }}>
                  {actualUserType === 'both' ? 'League & Ladder Player' :
                   actualUserType === 'league' ? 'League Player' :
                   actualUserType === 'ladder' ? 'Ladder Player' : 'Unknown'}
                </span>
              )}
            </div>
           )}
           
                       <div className="hub-subtitle">
              <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white', marginTop: '0.1rem', marginBottom: '0rem'  }}>Where would you like to go today?</p>
            </div>

          {/* Active Apps Row */}
          <div className="apps-section">
            <div className="apps-grid active-apps">
              {availableApps.map((app) => (
                <div
                  key={app.id}
                  className={`app-card ${app.status} ${app.id === 'league' ? 'league-app' : ''}`}
                  onClick={() => handleAppSelect(app)}
                  style={{ '--app-color': app.color }}
                  data-app-id={app.id}
                >
                  <div className="app-icon">{app.icon}</div>
                  <div className="app-info">
                    <h3>{app.name}</h3>
                    <p>{app.description}</p>
                    <div className="app-status">
                      <span className="status-active">Available</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* No modal needed - using existing profile editor */}
    </div>
  );
};

export default AppHub;
