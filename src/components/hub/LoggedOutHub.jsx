import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmbeddedLoginForm from './EmbeddedLoginForm';
import UnifiedSignupModal from '../auth/UnifiedSignupModal';
import Phase1RulesModal from '../modal/Phase1RulesModal';
import Phase2RulesModal from '../modal/Phase2RulesModal';
import LadderOfLegendsRulesModal from '../modal/LadderOfLegendsRulesModal';
import GuestLadderApp from '../guest/GuestLadderApp';
import DraggableModal from '../modal/DraggableModal';
import LadderApp from '../ladder/LadderApp';
import StandaloneLadderModal from '../guest/StandaloneLadderModal';
import LadderMatchCalendar from '../ladder/LadderMatchCalendar';

import './LoggedOutHub.css';

const LoggedOutHub = ({ onLoginSuccess }) => {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showFormatDifferencesModal, setShowFormatDifferencesModal] = useState(false);
  const [showPhase1Rules, setShowPhase1Rules] = useState(false);
  const [showPhase2Rules, setShowPhase2Rules] = useState(false);
  const [showLadderRules, setShowLadderRules] = useState(false);
  const [showPublicLadderView, setShowPublicLadderView] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    singlesLeague: false,
    ladderOfLegends: false,
    keyDifferences: false,
    instructions: false
  });

  const navigate = useNavigate();

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const availableApps = [
    {
      id: 'ladder',
      name: 'Ladder of Legends Tournament Series',
      description: 'Independently run, challenge-based ladder system',
      icon: '⚔️',
      color: '#2196F3',
      status: 'active'
    },
    {
      id: 'league',
      name: 'Front Range BCAPL Singles League',
      description: 'Manage league matches, schedules, and standings',
      icon: '🏆',
      color: '#4CAF50',
      status: 'active'
    }
  ];

  const handleLoginSuccess = (name, email, pin, userType) => {
    // Check if this is a guest login
    if (email === "guest@frontrangepool.com" && pin === "GUEST") {
      setIsGuestMode(true);
      // Don't call onLoginSuccess for guest mode - we'll handle it differently
    } else {
      // Pass userType to the parent component
      onLoginSuccess(name, email, pin, userType);
    }
  };

  const handleGuestAppAccess = (appId) => {
    // Navigate to guest versions of the apps
    if (appId === 'league') {
      navigate('/guest/league');
    } else if (appId === 'ladder') {
      navigate('/guest/ladder');
    }
  };

  const handleGuestLogout = () => {
    setIsGuestMode(false);
    navigate('/');
  };



  const handlePublicView = () => {
    // Open the public ladder view directly
    setShowPublicLadderView(true);
  };

  // If in guest mode, show a different layout
  if (isGuestMode) {
    return (
      <div className="logged-out-hub-container">
        {/* Guest Header */}
        <div className="logged-out-hub-header">
          <div className="hub-title" style={{
            textAlign: window.innerWidth <= 768 ? 'center' : 'left'
          }}>
            <h1>Front Range Pool Hub</h1>
            <p>Guest Preview Mode</p>
            <div style={{ 
              marginTop: '10px',
              padding: '8px 16px',
              background: 'rgba(229, 62, 62, 0.2)',
              border: '1px solid #e53e3e',
              borderRadius: '20px',
              fontSize: '0.9rem',
              color: '#e53e3e'
            }}>
              👀 Exploring as Guest - Limited functionality
            </div>
          </div>
          
          <div className="apps-section">
            <h2 className="section-title">Available Apps</h2>
            <div className="apps-grid active-apps">
              {availableApps.filter(app => app.status === 'active').map((app) => (
                <div
                  key={app.id}
                  className={`app-card ${app.status} guest-mode`}
                  style={{ '--app-color': app.color }}
                  onClick={() => handleGuestAppAccess(app.id)}
                >
                  <div className="app-icon">{app.icon}</div>
                  <div className="app-info">
                    <h3>{app.name}</h3>
                    <p>{app.description}</p>
                    <div className="app-status">
                      <span className="status-guest-preview">Try Demo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guest Logout Button */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={handleGuestLogout}
              style={{
                background: 'transparent',
                color: '#e53e3e',
                border: '2px solid #e53e3e',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#e53e3e';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#e53e3e';
              }}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular logged out view
  return (
    <div className="logged-out-hub-container">
        {/* Instructions Section */}
        <div className="instruction-button">
          <div 
            className="instruction-button-header"
            onClick={() => toggleSection('instructions')}
          >
            <div className="instruction-button-content">
              <span className="instruction-button-icon">📋</span>
              <h3 className="instruction-button-title">
                How to Get Started
              </h3>
            </div>
            <span className={`instruction-button-arrow ${expandedSections.instructions ? 'expanded' : ''}`}>
              ▼
            </span>
          </div>
          
          {expandedSections.instructions && (
            <div className="instruction-modal">
              <div className="instruction-modal-content">
                <div className="instruction-section">
                  <span className="instruction-section-icon">🔑</span>
                  <div>
                    <strong className="instruction-section-title">Already have an account?</strong>
                    <div className="instruction-section-text">
                      Use your email OR PIN to sign in. One login = access to both League and Ladder apps.
                    </div>
                  </div>
                </div>
                
                <div className="instruction-section">
                  <span className="instruction-section-icon">👤</span>
                  <div>
                    <strong className="instruction-section-title" style={{ color: '#9C27B0' }}>Current ladder player?</strong>
                    <div className="instruction-section-text">
                      Click "Join Front Range Pool Hub" → Select "Existing Ladder Player" → Enter your name → Claim your position. Admin approval required.
                    </div>
                  </div>
                </div>
                
                <div className="instruction-section">
                  <span className="instruction-section-icon">🆕</span>
                  <div>
                   <strong className="instruction-section-title" style={{ color: '#FF9800' }}>New to the system?</strong>
                    <div className="instruction-section-text">
                      Click "Join Front Range Pool Hub" → Choose League/Ladder/Both → Provide experience & contact info → Admin approval required.
                    </div>
                  </div>
                </div>
                
                <div className="instruction-section">
                  <span className="instruction-section-icon">👀</span>
                  <div>
                    <strong className="instruction-section-title" style={{ color: '#2196F3' }}>Just want to look around?</strong>
                    <div className="instruction-section-text">
                      Use "Guest Access" buttons below to preview without creating an account.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="instruction-footer">
                💡 <strong>Need help?</strong> Contact administrators for assistance.
              </div>
            </div>
          )}
        </div>

                     {/* Login Section */}
        <div className="login-section">
          <EmbeddedLoginForm onSuccess={handleLoginSuccess} onShowSignup={() => setShowSignupForm(true)} />
        </div>

        {/* Format Differences Button - Under Simulation Section */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '10px', 
          marginBottom: '55px',
          padding: '0 10px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <button
            onClick={() => setShowFormatDifferencesModal(true)}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              padding: window.innerWidth <= 768 ? '8px 12px' : '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '0.8rem' : '1.2rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.3s ease',
              maxWidth: window.innerWidth <= 768 ? 'calc(100vw - 40px)' : '400px',
              width: window.innerWidth <= 768 ? '100%' : 'auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.3)';
            }}
          >
                         ❓   Singles League vs Ladder of Legends - What's the Difference    ❓ 
          </button>
        </div>

             {/* Title and Active Apps in Red Border */}
       <div className="logged-out-hub-header">
                   <div className="hub-title">
            <h1>Guest Access</h1>
          </div>
         
         <div className="apps-section">
          <div className="apps-grid active-apps">
            {availableApps.filter(app => app.status === 'active').map((app) => (
              <div
                key={app.id}
                className={`app-card ${app.status} logged-out ${app.id === 'ladder' ? 'ladder-card' : ''}`}
                style={{ '--app-color': app.color }}
              >
                {app.id === 'ladder' && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <button
                      className="view-ladder-btn"
                      onClick={handlePublicView}
                      style={{
                        background: 'transparent',
                        color: '#4CAF50',
                        border: '2px solid #4CAF50',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.8rem',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#4CAF50';
                        e.target.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#4CAF50';
                      }}
                    >
                      👀 View Ladder
                    </button>
    <button
      className="calendar-btn"
      onClick={() => setShowCalendar(true)}
      style={{
        background: 'rgba(139, 92, 246, 0.1)',
        color: '#8B5CF6',
        border: '2px solid #8B5CF6',
        padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.target.style.background = 'rgba(139, 92, 246, 0.2)';
        e.target.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(139, 92, 246, 0.1)';
        e.target.style.transform = 'translateY(0)';
      }}
    >
      📅 Calendar
    </button>
                  </div>
                )}
                <div className="app-icon" style={{
                  fontSize: window.innerWidth <= 768 ? '1.5rem' : '3rem',
                  marginBottom: window.innerWidth <= 768 ? '0.5rem' : '1rem',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: window.innerWidth <= 768 ? '2rem' : '4rem'
                }}>{app.icon}</div>
                <div className="app-info">
                  <h3 style={{
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '1.5rem',
                    lineHeight: window.innerWidth <= 768 ? '1.2' : '1.3',
                    marginBottom: window.innerWidth <= 768 ? '0.3rem' : '0.5rem'
                  }}>
                    {app.id === 'ladder' ? (
                      <>
                        Ladder of Legends<br />
                        Tournament Series
                      </>
                    ) : (
                      app.name
                    )}
                  </h3>
                  <p style={{
                    fontSize: window.innerWidth <= 768 ? '0.8rem' : '1rem',
                    lineHeight: window.innerWidth <= 768 ? '1.3' : '1.4',
                    marginBottom: window.innerWidth <= 768 ? '0.5rem' : '1rem'
                  }}>{app.description}</p>
                                     <div className="app-actions">
                                           <button
                        className="guest-access-btn"
                        onClick={() => handleGuestAppAccess(app.id)}
                        style={{
                          background: 'transparent',
                          color: app.id === 'ladder' ? '#4CAF50' : app.color,
                          border: `2px solid ${app.id === 'ladder' ? '#4CAF50' : app.color}`,
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                          fontWeight: 'bold',
                          marginTop: '8px',
                          marginBottom: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = app.id === 'ladder' ? '#4CAF50' : app.color;
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = app.id === 'ladder' ? '#4CAF50' : app.color;
                        }}
                      >
                        👀 Access as Guest
                      </button>
                     
                                           
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
               </div>
      


                     {/* Hub Signup Form Modal */}
        {showSignupForm && (
          <UnifiedSignupModal 
            onClose={() => setShowSignupForm(false)}
            onSuccess={(data) => {
              console.log('Signup successful:', data);
              // You can add any success handling here
            }}
          />
        )}

       {/* Format Differences Modal */}
      {showFormatDifferencesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
          zIndex: 1000,
          padding: window.innerWidth <= 768 ? '160px 5px 30px 5px' : '20px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
            border: '2px solid #f59e0b',
            borderRadius: '15px',
            width: window.innerWidth <= 768 ? '95%' : '55%',
            maxWidth: window.innerWidth <= 768 ? '100%' : '700px',
            minWidth: window.innerWidth <= 768 ? 'auto' : '700px',
            height: window.innerWidth <= 768 ? 'auto' : '90vh',
            maxHeight: window.innerWidth <= 768 ? 'calc(100vh - 280px)' : '800px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: '#ffffff',
            marginTop: window.innerWidth <= 768 ? '0px' : '20px'
          }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: window.innerWidth <= 768 ? '8px' : '15px',
              borderBottom: '2px solid #f59e0b',
              flexShrink: 0
            }}>
              <h2 style={{
                margin: 0,
                fontSize: window.innerWidth <= 768 ? '1.2rem' : '1.5rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textAlign: 'center',
                lineHeight: window.innerWidth <= 768 ? '1.3' : '1.4'
              }}>
                🏆 Singles League vs Ladder of Legends ⚔️<br></br>Seperate & Different Formats
              </h2>
              <button
                onClick={() => setShowFormatDifferencesModal(false)}
                style={{
                  position: 'absolute',
                  right: '85px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: window.innerWidth <= 768 ? '8px 5px 5px 5px' : '20px',
              fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.95rem',
              lineHeight: window.innerWidth <= 768 ? '1.3' : '1.4'
            }}>
              <div style={{
                background: 'rgba(76, 175, 80, 0.1)',
                border: '2px solid #4CAF50',
                borderRadius: '10px',
                padding: window.innerWidth <= 768 ? '6px' : '15px',
                marginBottom: window.innerWidth <= 768 ? '8px' : '20px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 8px 0', color: '#4CAF50', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1.1rem', fontWeight: 'bold' }}>
                  🔑 ONE LOGIN FOR BOTH FORMATS
                </p>
                <p style={{ margin: 0, color: '#e0e0e0', fontSize: window.innerWidth <= 768 ? '0.8rem' : '1rem' }}>
                  Use the Front Range Pool Hub to access both the Singles League and Ladder of Legends with a single login.<br></br>
                  Your account works across both systems, making it easy to participate in whichever format interests you most.
                </p>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '2px solid #f59e0b',
                borderRadius: '10px',
                padding: window.innerWidth <= 768 ? '6px' : '15px',
                marginBottom: window.innerWidth <= 768 ? '8px' : '20px',
                textAlign: 'center'
              }}>
                <h3 style={{
                  margin: '0 0 15px 0',
                  color: '#f59e0b',
                  fontSize: window.innerWidth <= 768 ? '0.9rem' : '1.2rem'
                }}>
                  ⚠️ IMPORTANT: These are TWO SEPARATE COMPETITION SYSTEMS
                </h3>
                <p style={{ margin: 0, color: '#e0e0e0', fontSize: window.innerWidth <= 768 ? '0.8rem' : '1rem' }}>
                  This detailed comparison helps explain the key differences between these completely separate formats.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr',
                gap: window.innerWidth <= 768 ? '6px' : '20px',
                marginBottom: window.innerWidth <= 768 ? '8px' : '20px'
              }}>
                {/* Singles League Section */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: window.innerWidth <= 768 ? '6px' : '18px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 
                    onClick={() => toggleSection('singlesLeague')}
                    style={{
                      color: '#ff4444',
                      margin: window.innerWidth <= 768 ? '0 0 8px 0' : '0 0 15px 0',
                      fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem',
                      textAlign: 'center',
                      borderBottom: '2px solid #ff4444',
                      paddingBottom: '10px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    🏆 Singles League 🏆 {expandedSections.singlesLeague ? '▼' : '▶'}
                  </h3>
                  
                  {expandedSections.singlesLeague && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: window.innerWidth <= 768 ? '4px' : '12px' }}>
                      {/* Structure */}
                        <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: window.innerWidth <= 768 ? '4px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#ff4444', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🏗️ League Structure</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Season Length:</strong> 10 weeks total</li>
                          <li><strong>Phase 1:</strong> Weeks 1-6 (6 mandatory matches)</li>
                          <li><strong>Phase 2:</strong> Weeks 7-10 (2-4 challenge matches)</li>
                          <li><strong>Format:</strong> BCAPL Singles Division - Hybrid</li>
                          <li><strong>Max Players:</strong> 30 players per session</li>
                        </ul>
                      </div>

                      {/* Phase 1 Details */}
                      <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#ff4444', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>📅 Phase 1 - Scheduled Matches</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>6 MANDATORY MATCHES</strong> against assigned opponents</li>
                          <li><strong>Flexible Scheduling:</strong> Any day, any time, any location</li>
                          <li><strong>Deadline:</strong> Must complete by end of Week 6</li>
                          <li><strong>Scoring:</strong> BCAPL scoring app required</li>
                          <li><strong>FargoRate:</strong> All matches integrated for ratings</li>
                        </ul>
                      </div>

                      {/* Phase 2 Details */}
                      <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#ff4444', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>⚔️ Phase 2 - Challenge System</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Total Required:</strong> 2-4 matches (minimum 2)</li>
                          <li><strong>Challenge Limit:</strong> Up to 4 spots higher in standings</li>
                          <li><strong>Weekly Limit:</strong> Only 1 match per week</li>
                          <li><strong>Defense Rules:</strong> Must accept until 2 defenses completed</li>
                          <li><strong>Dynamic Limits:</strong> Based on times challenged</li>
                        </ul>
                      </div>

                      {/* Match Rules */}
                      <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#ff4444', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🎱 Match Rules</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Race Length:</strong> Race to 5 games per match</li>
                          <li><strong>Scoring:</strong> 10 points per game + 10 bonus for match winner</li>
                          <li><strong>Rules:</strong> Official CSI rule book</li>
                          <li><strong>Payment:</strong> Standard league fees apply</li>
                          <li><strong>Communication:</strong> League Scheduling Hub required</li>
                        </ul>
                      </div>

                      {/* Key Features */}
                      <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#ff4444', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🔑 Key Features</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Season-based:</strong> Structured competition with deadlines</li>
                          <li><strong>Standings-driven:</strong> Phase 1 results determine Phase 2 eligibility</li>
                          <li><strong>League Affiliation:</strong> Official BCAPL division</li>
                          <li><strong>Website:</strong> https://frusapl.com</li>
                          <li><strong>Chat System:</strong> League-wide communication</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ladder of Legends Section */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: window.innerWidth <= 768 ? '6px' : '18px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 
                    onClick={() => toggleSection('ladderOfLegends')}
                    style={{
                      color: '#a855f7',
                      margin: window.innerWidth <= 768 ? '0 0 8px 0' : '0 0 15px 0',
                      fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem',
                      textAlign: 'center',
                      borderBottom: '2px solid #a855f7',
                      paddingBottom: '10px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    ⚔️ Ladder of Legends ⚔️ {expandedSections.ladderOfLegends ? '▼' : '▶'}
                  </h3>
                  
                  {expandedSections.ladderOfLegends && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: window.innerWidth <= 768 ? '4px' : '12px' }}>
                      {/* Structure */}
                        <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: window.innerWidth <= 768 ? '4px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#a855f7', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🏗️ Ladder Structure</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Format:</strong> Independent tournament series</li>
                          <li><strong>Divisions:</strong> 3 skill-based ladders</li>
                          <li><strong>499 & Under:</strong> Beginner to intermediate</li>
                          <li><strong>500-549:</strong> Intermediate to advanced</li>
                          <li><strong>550+:</strong> Advanced to expert</li>
                        </ul>
                      </div>

                      {/* Match Types */}
                      <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#a855f7', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>⚔️ Match Types</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Challenge Match:</strong> Up to 4 spots above, switch positions</li>
                          <li><strong>SmackDown:</strong> Call out below, special positioning rules</li>
                          <li><strong>SmackBack:</strong> Jump to 1st place opportunity</li>
                          <li><strong>No Minimum:</strong> Play as many or few as you want</li>
                          <li><strong>Flexible:</strong> Any time, any location by agreement</li>
                        </ul>
                      </div>

                      {/* Payment Structure */}
                      <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#a855f7', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>💰 Payment Structure</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Account Creation:</strong> Free - no cost to claim a position</li>
                          <li><strong>Membership:</strong> $5/month (required for challenges)</li>
                          <li><strong>Match Fee:</strong> $5 per match (total)</li>
                          <li><strong>Distribution:</strong> $3 to prize pool, $2 to platform</li>
                          <li><strong>Prize Periods:</strong> Every 2 months</li>
                          <li><strong>Winner Takes All:</strong> Entry fees + sponsor prizes</li>
                        </ul>
                      </div>

                      {/* Special Rules */}
                      <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#a855f7', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🛡️ Special Rules</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Immunity:</strong> 7 days after winning any match</li>
                          <li><strong>Top 5 Exception:</strong> Saturdays/Sundays at Legends only</li>
                          <li><strong>Live Streaming:</strong> Top 5 matches on Facebook</li>
                          <li><strong>Referee:</strong> Admin present for top 5 matches</li>
                          <li><strong>No Greens Fees:</strong> Tables open for top 5 matches</li>
                        </ul>
                      </div>

                      {/* Key Features */}
                      <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: window.innerWidth <= 768 ? '6px' : '10px', borderRadius: '8px' }}>
                        <h4 style={{ color: '#a855f7', margin: '0 0 8px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🔑 Key Features</h4>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                          <li><strong>Independent:</strong> Not affiliated with any league</li>
                          <li><strong>Challenge-based:</strong> No mandatory match requirements</li>
                          <li><strong>Prize-focused:</strong> Bi-monthly prize distributions</li>
                          <li><strong>Facebook Group:</strong> "Top Colorado Springs Pool Players"</li>
                          <li><strong>Skill-based:</strong> FargoRate integrated divisions</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Differences Summary */}
              <div style={{
                background: 'rgba(76, 175, 80, 0.1)',
                border: '2px solid #4CAF50',
                borderRadius: '10px',
                padding: window.innerWidth <= 768 ? '10px' : '18px',
                marginBottom: window.innerWidth <= 768 ? '12px' : '20px'
              }}>
                <h3 
                  onClick={() => toggleSection('keyDifferences')}
                  style={{
                    margin: window.innerWidth <= 768 ? '0 0 8px 0' : '0 0 15px 0',
                    color: '#4CAF50',
                    fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  💡 Key Differences Summary {expandedSections.keyDifferences ? '▼' : '▶'}
                </h3>
                
                {expandedSections.keyDifferences && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '6px' : '20px'
                  }}>
                    <div>
                      <h4 style={{ color: '#4CAF50', margin: '0 0 10px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🎯 Singles League</h4>
                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                        <li><strong>Structure:</strong> Season-based with deadlines</li>
                        <li><strong>Requirements:</strong> 6+ mandatory matches per season</li>
                        <li><strong>Pressure:</strong> Must complete matches to advance</li>
                        <li><strong>Affiliation:</strong> Official BCAPL division</li>
                        <li><strong>Focus:</strong> League competition and standings</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 style={{ color: '#a855f7', margin: '0 0 10px 0', fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>🏆 Ladder of Legends</h4>
                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#e0e0e0', fontSize: '0.85rem' }}>
                        <li><strong>Structure:</strong> Challenge-based with no deadlines</li>
                        <li><strong>Requirements:</strong> No minimum matches required</li>
                        <li><strong>Pressure:</strong> Play at your own pace</li>
                        <li><strong>Affiliation:</strong> Independent tournament series</li>
                        <li><strong>Focus:</strong> Individual challenges and prizes</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Rules Buttons Section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr 1fr',
                gap: window.innerWidth <= 768 ? '4px' : '15px',
                marginTop: window.innerWidth <= 768 ? '8px' : '20px'
              }}>
                <button
                  onClick={() => {
                    setShowFormatDifferencesModal(false);
                    setShowPhase1Rules(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                    color: 'white',
                    border: 'none',
                    padding: window.innerWidth <= 768 ? '6px 8px' : '12px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(255, 68, 68, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.3)';
                  }}
                >
                  📖 View Singles League<br></br> Phase 1 Rules
                </button>

                <button
                  onClick={() => {
                    setShowFormatDifferencesModal(false);
                    setShowPhase2Rules(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #ff8800 0%, #ff6600 100%)',
                    color: 'white',
                    border: 'none',
                    padding: window.innerWidth <= 768 ? '6px 8px' : '12px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(255, 136, 0, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 136, 0, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(255, 136, 0, 0.3)';
                  }}
                >
                  📖 View Single League<br></br>Phase 2 Rules
                </button>

                <button
                  onClick={() => {
                    setShowFormatDifferencesModal(false);
                    setShowLadderRules(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                    color: 'white',
                    border: 'none',
                    padding: window.innerWidth <= 768 ? '6px 8px' : '12px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.3)';
                  }}
                >
                  📖 View Ladder Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Phase 1 Rules Modal */}
        {showPhase1Rules && (
          <Phase1RulesModal 
            isOpen={showPhase1Rules} 
            onClose={() => {
              setShowPhase1Rules(false);
              setShowFormatDifferencesModal(true);
            }} 
          />
        )}

        {/* Phase 2 Rules Modal */}
        {showPhase2Rules && (
          <Phase2RulesModal 
            isOpen={showPhase2Rules} 
            onClose={() => {
              setShowPhase2Rules(false);
              setShowFormatDifferencesModal(true);
            }} 
          />
        )}

        {/* Ladder of Legends Rules Modal */}
        {showLadderRules && (
          <LadderOfLegendsRulesModal 
            isOpen={showLadderRules} 
            onClose={() => {
              setShowLadderRules(false);
              setShowFormatDifferencesModal(true);
            }} 
            isMobile={false}
          />
        )}

        {/* Public Ladder View Modal */}
        <StandaloneLadderModal
          isOpen={showPublicLadderView}
          onClose={() => setShowPublicLadderView(false)}
          onSignup={() => setShowSignupForm(true)}
        />

        {/* Calendar Modal */}
        <LadderMatchCalendar
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
        />
       
    </div>
  );
};

export default LoggedOutHub;
