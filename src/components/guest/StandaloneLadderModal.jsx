import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../../config.js';
// import '../ladder/LadderApp.css';
import './GuestApp.css';
import '../Homepage.css';
import PlayerStatsModal from '../ladder/PlayerStatsModal.jsx';
import LadderMatchCalendar from '../ladder/LadderMatchCalendar.jsx';
import UnifiedSignupModal from '../auth/UnifiedSignupModal.jsx';
import LadderOfLegendsRulesModal from '../modal/LadderOfLegendsRulesModal.jsx';
import ContactAdminModal from '../ladder/ContactAdminModal.jsx';
import LadderNewsTicker from '../ladder/LadderNewsTicker.jsx';

const StandaloneLadderModal = ({ isOpen, onClose, onSignup }) => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLadder, setSelectedLadder] = useState('499-under');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showUnifiedSignup, setShowUnifiedSignup] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);

  const getLadderDisplayName = (ladderName) => {
    switch (ladderName) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return ladderName;
    }
  };

  // Helper function to format opponent name for public view (first name + last initial only)
  const formatOpponentName = (fullName) => {
    if (!fullName || fullName === 'Unknown') return 'Unknown';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0]; // Only first name
    } else {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      return `${firstName} ${lastName.charAt(0)}.`;
    }
  };

  // Handle player row click
  const handlePlayerClick = (player) => {
    console.log('Player clicked:', player);
    setSelectedPlayer(player);
    setShowPlayerModal(true);
    console.log('Modal should be opening...');
  };

  // Close player modal
  const closePlayerModal = () => {
    setShowPlayerModal(false);
    setSelectedPlayer(null);
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen, selectedLadder]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      console.log('Fetching players for ladder:', selectedLadder);
      
      // Use the ladder name directly (it's already in API format)
      const apiLadderName = selectedLadder;
      
      console.log('API ladder name:', apiLadderName);
      
      const response = await fetch(`${BACKEND_URL}/api/ladder/ladders/${encodeURIComponent(apiLadderName)}/players`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Players data:', data);
        console.log('First player unifiedAccount:', JSON.stringify(data[0]?.unifiedAccount, null, 2));
        setPlayers(data.sort((a, b) => a.position - b.position));
      } else {
        console.error('Failed to fetch players:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <style>{`
        .standalone-last-match-header {
          transform: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          text-align: center !important;
          justify-content: center !important;
        }
        
        @media (min-width: 769px) {
          .ladder-table:not(.logged-in-view) .table-cell.name {
            padding-left: 0px !important;
            margin-left: 0px !important;
            transform: translateX(0px) !important;
          }
        }
        
        /* Maximum specificity override for the 80px transform */
        .ladder-table:not(.logged-in-view) .table-cell.name {
          transform: translateX(0px) !important;
        }
        
        .public-ladder-player-name {
          transform: translateX(0px) !important;
        }
        
        @media (max-width: 768px) {
          .w-header-mobile {
            margin-left: -20px !important;
            transform: translateX(-20px) !important;
            position: relative !important;
            left: -20px !important;
            background-color: transparent !important;
          }
          
          .l-header-mobile {
            margin-left: -25px !important;
            transform: translateX(-25px) !important;
            position: relative !important;
            left: -25px !important;
          }
          
          .l-data-mobile {
            margin-left: -10px !important;
            transform: translateX(-10px) !important;
            position: relative !important;
            left: -10px !important;
          }
          
          .last-match-header-mobile {
            margin-left: -10px !important;
            transform: translateX(-10px) !important;
            position: relative !important;
            left: -10px !important;
          }
          
          .last-match-data-mobile {
            margin-left: -10px !important;
            transform: translateX(-10px) !important;
            position: relative !important;
            left: -10px !important;
          }
        }
        
        .quick-action-button.rules-btn {
          background: linear-gradient(45deg, #ff6b35, #f7931e) !important;
          border: 1px solid rgba(255, 107, 53, 0.3) !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3) !important;
        }
        
        .quick-action-button.rules-btn:hover {
          background: linear-gradient(45deg, #ff5722, #ff9800) !important;
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4) !important;
          transform: translateY(-2px) !important;
        }
        
      `}</style>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: window.innerWidth <= 768 ? '0px' : '20px',
          boxSizing: 'border-box'
        }}
        onClick={onClose}
      >
      <div 
        style={{
          background: 'linear-gradient(120deg, #232323 80%, #2a0909 100%)',
          borderRadius: window.innerWidth <= 768 ? '0px' : '15px',
          boxShadow: window.innerWidth <= 768 ? 'none' : '0 0 40px #8B5CF6, 0 0 60px rgba(0,0,0,0.9)',
          width: window.innerWidth <= 768 ? '100vw' : '50vw',
          maxWidth: window.innerWidth <= 768 ? '100vw' : '1200px',
          minWidth: window.innerWidth <= 768 ? '100vw' : '800px',
          height: window.innerWidth <= 768 ? '100vh' : '95vh',
          maxHeight: window.innerWidth <= 768 ? '100vh' : '95vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'auto',
          boxSizing: 'border-box'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%)',
            padding: window.innerWidth <= 768 ? '8px 12px' : '15px 20px',
            borderRadius: '0px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            position: 'relative',
            margin: '0',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <h2 style={{ 
            margin: 0, 
            color: '#000000',
            WebkitTextStroke: '0.5px #8B5CF6',
            textShadow: '0 0 20px rgba(139, 92, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.2)',
            fontSize: window.innerWidth <= 768 ? '1.2rem' : '1.6rem',
            fontWeight: 'bold',
            textAlign: 'center',
            paddingRight: window.innerWidth <= 768 ? '50px' : '60px',
            paddingLeft: window.innerWidth <= 768 ? '50px' : '60px',
            letterSpacing: window.innerWidth <= 768 ? '1px' : '2px',
            fontFamily: '"Bebas Neue", "Orbitron", "Exo 2", "Arial Black", sans-serif',
            textTransform: 'uppercase'
          }}>
            📊 Ladder of Legends - Public View
          </h2>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: '#333',
              fontSize: window.innerWidth <= 768 ? '1.5rem' : '1.8rem',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '50%',
              width: window.innerWidth <= 768 ? '30px' : '35px',
              height: window.innerWidth <= 768 ? '30px' : '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease',
              position: 'absolute',
              right: window.innerWidth <= 768 ? '12px' : '20px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            &times;
          </button>
        </div>

        {/* Public View Notice */}
        <div style={{
          background: 'rgba(229, 62, 62, 0.15)',
          border: window.innerWidth <= 768 ? '1px solid rgba(229, 62, 62, 0.4)' : '2px solid rgba(229, 62, 62, 0.4)',
          padding: window.innerWidth <= 768 ? '8px 10px' : '12px 20px',
          textAlign: 'center',
          flexShrink: 0,
          margin: window.innerWidth <= 768 ? '4px 10px 4px 10px' : '10px 20px 10px 20px',
          borderRadius: window.innerWidth <= 768 ? '6px' : '0px'
        }}>
          <div style={{
            color: '#e53e3e',
            fontWeight: '600',
            fontSize: window.innerWidth <= 768 ? '0.75rem' : '1rem',
            lineHeight: window.innerWidth <= 768 ? '1.2' : '1.5'
          }}>
            {window.innerWidth <= 768 ? (
              '👁️ Public View - Limited Access'
            ) : (
              <>
                👁️ Public View - Anyone can view the ladder rankings.
                <br />
                Members get access to many more features when logged into the Hub
              </>
            )}
          </div>
        </div>

        {/* News Ticker for Standalone Public View */}
        <div style={{ 
          margin: window.innerWidth <= 768 ? '8px 10px' : '12px 20px',
          flexShrink: 0
        }}>
          <LadderNewsTicker userPin="GUEST" isPublicView={true} />
        </div>

        {/* How to Join Instructions - Side by Side */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '12px',
          padding: window.innerWidth <= 768 ? '12px' : '16px',
          margin: window.innerWidth <= 768 ? '8px 10px' : '12px 20px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
          gap: window.innerWidth <= 768 ? '12px' : '16px'
        }}>
          {/* How to Claim */}
          <div style={{
            flex: 1,
            padding: window.innerWidth <= 768 ? '8px' : '12px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            textAlign: 'center'
          }}>
            <p style={{
              margin: '0 0 8px 0',
              fontWeight: 'bold',
              color: '#4CAF50',
              fontSize: window.innerWidth <= 768 ? '0.9rem' : '1.0rem'
            }}>
              🎯 How to Claim:
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              • See your name? Click it or Click 'Join The Ladder'
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              • Choose "Check If I am already in the system"
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              • Enter your name and email
            </p>
            <p style={{ margin: '0 0 0 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              • Get PIN after admin approval
            </p>
          </div>

          {/* How to Join */}
          <div style={{
            flex: 1,
            padding: window.innerWidth <= 768 ? '8px' : '12px',
            background: 'rgba(255, 193, 7, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            textAlign: 'center'
          }}>
            <p style={{
              margin: '0 0 8px 0',
              fontWeight: 'bold',
              color: '#ffc107',
              fontSize: window.innerWidth <= 768 ? '0.9rem' : '1.0rem'
            }}>
              🚀 How to Join:
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              1. Click 'Join The Ladder' below
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              2. Choose "New User" and fill out info
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              3. Select "Ladder" and submit for approval
            </p>
            <p style={{ margin: '0 0 0 0', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem', color: '#fff' }}>
              4. After approval, start challenging!
            </p>
          </div>
        </div>

        {/* Login Button Section */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '8px',
          padding: window.innerWidth <= 768 ? '12px' : '16px',
          margin: window.innerWidth <= 768 ? '8px 10px' : '12px 20px',
          flexShrink: 0,
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#8b5cf6',
            margin: '0 0 8px 0',
            fontSize: window.innerWidth <= 768 ? '1rem' : '1.2rem',
            fontWeight: 'bold'
          }}>
            🔐 Already Have an Account?
          </h3>
          <p style={{
            color: '#ccc',
            margin: '0 0 12px 0',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
            lineHeight: '1.4'
          }}>
            Log in to access the full ladder app with all features!
          </p>
          <button
            onClick={() => {
              onClose(); // Close the public ladder modal first
              navigate('/hub'); // Navigate to hub using React Router (same as hub card)
            }}
            style={{
              background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: window.innerWidth <= 768 ? '10px 16px' : '12px 24px',
              fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
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
            🔑 Log In to Ladder
          </button>
        </div>

        {/* Title Section - Using your existing classes */}
        <div className="ladder-header-section">
          <div style={{ 
            textAlign: 'center', 
            marginBottom: window.innerWidth <= 768 ? '8px' : '15px',
            display: 'flex',
            gap: window.innerWidth <= 768 ? '15px' : '20px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              className="quick-action-button view-ladder-btn"
              onClick={() => {
                // Trigger signup first, then close modal
                if (onSignup) {
                  onSignup();
                }
                onClose();
              }}
              style={{
                fontSize: window.innerWidth <= 768 ? '0.8rem' : '1.1rem',
                padding: window.innerWidth <= 768 ? '12px 16px' : '16px 24px',
                minWidth: window.innerWidth <= 768 ? '140px' : '200px',
                maxWidth: window.innerWidth <= 768 ? '160px' : '220px',
                whiteSpace: 'normal',
                lineHeight: '1.2'
              }}
            >
              {window.innerWidth <= 768 ? 'Join Ladder' : 'Join The Ladder'}
            </button>
            
            <button 
              className="quick-action-button calendar-btn"
              onClick={() => setShowCalendar(true)}
              style={{
                fontSize: window.innerWidth <= 768 ? '0.8rem' : '1.1rem',
                padding: window.innerWidth <= 768 ? '12px 16px' : '16px 24px',
                minWidth: window.innerWidth <= 768 ? '140px' : '200px',
                maxWidth: window.innerWidth <= 768 ? '160px' : '220px',
                whiteSpace: 'normal',
                lineHeight: '1.2'
              }}
            >
              {window.innerWidth <= 768 ? 'Calendar' : 'Ladder Calendar'}
            </button>
            
            <button 
              className="quick-action-button rules-btn"
              onClick={() => setShowRulesModal(true)}
              style={{
                fontSize: window.innerWidth <= 768 ? '0.8rem' : '1.1rem',
                padding: window.innerWidth <= 768 ? '12px 16px' : '16px 24px',
                minWidth: window.innerWidth <= 768 ? '140px' : '200px',
                maxWidth: window.innerWidth <= 768 ? '160px' : '220px',
                whiteSpace: 'normal',
                lineHeight: '1.2'
              }}
            >
              {window.innerWidth <= 768 ? 'Rules' : 'View Rules'}
            </button>
          </div>
          
          <h1 className="ladder-main-title" style={{ 
            color: '#000000',
            WebkitTextStroke: '0.5px #8B5CF6',
            textShadow: '0 0 20px rgba(139, 92, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.2)',
            fontWeight: 'bold',
            fontSize: window.innerWidth <= 768 ? '2.2rem' : '3.2rem',
            letterSpacing: window.innerWidth <= 768 ? '2px' : '3px',
            fontFamily: '"Bebas Neue", "Orbitron", "Exo 2", "Arial Black", sans-serif',
            textTransform: 'uppercase',
            marginBottom: '0.2rem',
            marginTop: '0.5rem'
          }}>Ladder of Legends</h1>
          <p className="ladder-subtitle" style={{ marginBottom: '0.8rem', marginTop: '0rem', fontSize: '0.8rem' }}>Tournament Series</p>
          
          <div className="ladder-selector" style={{
            marginTop: window.innerWidth <= 768 ? '0.1rem' : '0.5rem',
            padding: window.innerWidth <= 768 ? '0.3rem 0.5rem 0.4rem 0.5rem' : '0.6rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: window.innerWidth <= 768 ? '6px' : '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: window.innerWidth <= 768 ? '0.2rem' : '0.5rem',
            margin: window.innerWidth <= 768 ? '0.1rem 0.6rem 0 0.6rem' : '0',
            boxSizing: 'border-box'
          }}>
            <p className="ladder-selection-title" style={{
              margin: '0',
              color: '#ffffff',
              fontSize: window.innerWidth <= 768 ? '0.65rem' : '0.9rem',
              fontWeight: '600',
              textAlign: 'center',
              order: window.innerWidth <= 768 ? 1 : 1,
              lineHeight: window.innerWidth <= 768 ? '1.0' : 'normal'
            }}>{window.innerWidth <= 768 ? 'Select Ladder' : 'Select Ladder:'}</p>
            <select 
              value={selectedLadder}
              onChange={(e) => setSelectedLadder(e.target.value)}
              style={{
                padding: window.innerWidth <= 768 ? '0.4rem 0.6rem' : '0.4rem 0.8rem',
                borderRadius: window.innerWidth <= 768 ? '4px' : '6px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(0, 0, 0, 0.5)',
                color: '#ffffff',
                fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.9rem',
                minWidth: window.innerWidth <= 768 ? '120px' : '180px',
                maxWidth: window.innerWidth <= 768 ? '70%' : 'none',
                width: window.innerWidth <= 768 ? 'auto' : 'auto',
                textAlign: 'center',
                order: window.innerWidth <= 768 ? 2 : 2,
                boxSizing: 'border-box'
              }}
            >
              <option value="499-under">499 & Under</option>
              <option value="500-549">500-549</option>
              <option value="550-plus">550+</option>
            </select>
          </div>

          <h2 className="ladder-active-title" style={{
            color: '#000000',
            WebkitTextStroke: '0.5px #8B5CF6',
            textShadow: '0 0 20px rgba(139, 92, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.2)',
            fontWeight: 'bold',
            fontSize: window.innerWidth <= 768 ? '1.6rem' : '2.4rem',
            letterSpacing: window.innerWidth <= 768 ? '1px' : '2px',
            fontFamily: '"Bebas Neue", "Orbitron", "Exo 2", "Arial Black", sans-serif',
            textTransform: 'uppercase',
            marginBottom: window.innerWidth <= 768 ? '0.2rem' : '0.3rem',
            marginTop: window.innerWidth <= 768 ? '0.3rem' : '0.5rem'
          }}>{getLadderDisplayName(selectedLadder).toUpperCase()}</h2>
          <p className="ladder-selection-subtitle" style={{
            margin: window.innerWidth <= 768 ? '0 0 0.3rem 0' : '0 0 0.5rem 0',
            color: '#cccccc',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.85rem'
          }}>Current rankings and positions</p>
        </div>

        {/* Ladder Table - Using your existing classes */}
        <div style={{
          flex: 1,
          overflow: 'visible',
          padding: window.innerWidth <= 768 ? '0 12px 0 12px' : '0 20px 0 20px',
          marginBottom: window.innerWidth <= 768 ? '10px' : '20px'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: '#ccc',
              fontSize: '1.2rem'
            }}>
              Loading ladder data...
            </div>
          ) : (
            <div className="ladder-table-modal" style={{
              width: '100%',
              maxWidth: '100%',
              minWidth: '100%',
              overflow: 'visible',
              boxSizing: 'border-box'
            }}>
              <div className="ladder-table" style={{
                width: '100%',
                minWidth: '100%',
                maxWidth: '100%',
                overflow: 'visible',
                boxSizing: 'border-box',
                background: 'rgba(10, 10, 20, 0.98)',
                backdropFilter: 'blur(15px)',
                boxShadow: '0 4px 20px rgba(107, 70, 193, 0.4)',
                borderBottom: '2px solid rgba(107, 70, 193, 0.5)',
                borderRadius: '8px',
                padding: '12px 0'
              }}>
                {/* Header */}
                <div className="table-header" style={{
                  display: 'flex',
                  width: '100%',
                  minWidth: '100%',
                  padding: window.innerWidth <= 768 ? '8px 15px' : '10px 20px',
                  borderBottom: '1px solid rgba(107, 70, 193, 0.3)'
                }}>
                  <div className="header-cell" style={{
                    width: '80px',
                    padding: window.innerWidth <= 768 ? '6px 0 6px 0' : '10px 0',
                    fontWeight: 'bold',
                    color: '#FFD700',
                    textAlign: 'center',
                    fontSize: window.innerWidth <= 768 ? '0.8rem' : '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textShadow: '0 0 6px #FFD700, 0 0 12px #FFD700',
                    marginLeft: window.innerWidth <= 768 ? '-10px' : '0',
                    paddingLeft: window.innerWidth <= 768 ? '0' : '0',
                    transform: window.innerWidth <= 768 ? 'translateX(-5px)' : 'none'
                  }}>Rank</div>
                  <div className="header-cell" style={{
                    flex: '1',
                    padding: window.innerWidth <= 768 ? '6px 0 6px -5px' : '10px 0 10px 10px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textAlign: 'left',
                    fontSize: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                    display: 'flex',
                    justifyContent: window.innerWidth <= 768 ? 'flex-start' : 'flex-start',
                    alignItems: 'center',
                    textShadow: '0 0 8px #8B5CF6, 0 0 15px #8B5CF6',
                    marginLeft: window.innerWidth <= 768 ? '-20px' : '0'
                  }}>Player</div>
                  <div className="header-cell w-header-mobile" style={{
                    width: '60px',
                    padding: window.innerWidth <= 768 ? '6px 0 6px -5px' : '10px 0',
                    fontWeight: 'bold',
                    color: '#4CAF50',
                    textAlign: 'center',
                    fontSize: window.innerWidth <= 768 ? '0.7rem' : '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textShadow: '0 0 8px #4CAF50, 0 0 15px #4CAF50',
                    marginLeft: window.innerWidth <= 768 ? '-10px' : '0',
                    position: 'relative',
                    left: window.innerWidth <= 768 ? '-10px' : '0'
                  }}>W</div>
                  <div className="header-cell l-header-mobile" style={{
                    width: '60px',
                    padding: window.innerWidth <= 768 ? '6px 0 6px -5px' : '10px 0',
                    fontWeight: 'bold',
                    color: '#f44336',
                    textAlign: 'center',
                    fontSize: window.innerWidth <= 768 ? '0.7rem' : '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textShadow: '0 0 8px #f44336, 0 0 15px #f44336',
                    marginLeft: window.innerWidth <= 768 ? '-5px' : '0',
                    position: 'relative',
                    left: window.innerWidth <= 768 ? '-5px' : '0'
                  }}>L</div>
                  <div className="last-match-header-mobile" style={{
                    flex: '1',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontSize: window.innerWidth <= 768 ? '0.7rem' : '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: window.innerWidth <= 768 ? '6px 0' : '10px 0',
                    textShadow: '0 0 8px #8B5CF6, 0 0 15px #8B5CF6'
                  }}>Last Match</div>
                </div>

                {/* Player Rows */}
                {players.map((player) => (
                  <div key={player._id} className={`table-row ${player.position === 1 ? 'first-place-row' : ''}`} style={{
                    display: 'flex',
                    width: '100%',
                    minWidth: '100%',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: window.innerWidth <= 768 ? '6px 15px' : '8px 20px',
                    borderBottom: '1px solid rgba(107, 70, 193, 0.1)'
                  }} onClick={() => handlePlayerClick(player)}>
                    <div className="table-cell rank" style={{
                      width: '80px',
                      padding: window.innerWidth <= 768 ? '3px 0 3px 0' : '5px 0',
                      color: player.position === 1 ? '#FFD700' : '#ffffff',
                      textAlign: window.innerWidth <= 768 ? 'left' : 'center',
                      fontSize: player.position === 1 ? '1.2rem' : (window.innerWidth <= 768 ? '0.75rem' : '0.9rem'),
                      fontWeight: 'bold',
                      display: window.innerWidth <= 768 ? 'block' : 'flex',
                      justifyContent: window.innerWidth <= 768 ? 'flex-start' : 'center',
                      alignItems: 'center',
                      marginLeft: window.innerWidth <= 768 ? '-5px' : '0',
                      paddingLeft: window.innerWidth <= 768 ? '8px' : '0',
                      textShadow: player.position === 1 ? '0 0 8px #FFD700' : 'none'
                    }}>
                      {player.position === 1 ? '🏆 ' : ''}#{player.position}
                    </div>
                    <div className="table-cell name public-ladder-player-name" style={{
                      flex: '1',
                      padding: window.innerWidth <= 768 ? '3px 0 3px 8px' : '5px 0 5px 0px',
                      color: player.position === 1 ? '#FFD700' : '#ffffff',
                      fontSize: player.position === 1 ? '1.15rem' : 'inherit',
                      fontWeight: player.position === 1 ? '600' : 'normal',
                      textShadow: player.position === 1 ? '0 0 5px rgba(255, 215, 0, 0.5)' : 'none',
                      position: 'relative',
                      textAlign: 'left',
                      fontSize: window.innerWidth <= 768 ? '1.1rem' : '0.9rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      marginLeft: window.innerWidth <= 768 ? '0' : '100px',
                      transform: 'none',
                      backgroundColor: window.innerWidth <= 768 ? 'transparent' : 'transparent',
                      position: 'relative',
                      left: window.innerWidth <= 768 ? '0' : '100px'
                    }}>
                      {player.position === 1 && (
                        <span style={{
                          position: 'absolute',
                          top: '-14px',
                          left: '-2px',
                          fontSize: '1.3rem',
                          transform: 'rotate(-10deg)',
                          zIndex: 10,
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}>
                          👑
                        </span>
                      )}
                      <div className="player-name-clickable" style={{
                        whiteSpace: window.innerWidth <= 768 ? 'normal' : 'nowrap',
                        wordWrap: window.innerWidth <= 768 ? 'break-word' : 'normal',
                        overflowWrap: window.innerWidth <= 768 ? 'break-word' : 'normal',
                        lineHeight: window.innerWidth <= 768 ? '1.3' : '1.2'
                      }}>
                        {player.firstName} {player.lastName ? player.lastName.charAt(0) + '.' : ''}
                      </div>
                    </div>
                    <div className="table-cell wins" style={{
                      width: '60px',
                      padding: window.innerWidth <= 768 ? '3px 0' : '5px 0',
                      color: '#4CAF50',
                      textAlign: 'center',
                      fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.9rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {player.wins || 0}
                    </div>
                    <div className="table-cell losses l-data-mobile" style={{
                      width: '60px',
                      padding: window.innerWidth <= 768 ? '3px 0' : '5px 0',
                      color: '#f44336',
                      textAlign: 'center',
                      fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.9rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {player.losses || 0}
                    </div>
                    <div className="table-cell last-match last-match-data-mobile" style={{
                      flex: '1',
                      fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.9rem',
                      padding: window.innerWidth <= 768 ? '3px 0' : '5px 0',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {player.lastMatch ? (
                        <div style={{ 
                          fontSize: window.innerWidth <= 768 ? '0.65rem' : '0.9rem',
                          fontWeight: 'bold', 
                          color: player.lastMatch.result === 'W' ? '#4CAF50' : '#f44336',
                          whiteSpace: window.innerWidth <= 768 ? 'normal' : 'nowrap',
                          wordWrap: window.innerWidth <= 768 ? 'break-word' : 'normal',
                          overflowWrap: window.innerWidth <= 768 ? 'break-word' : 'normal',
                          hyphens: window.innerWidth <= 768 ? 'auto' : 'none',
                          display: window.innerWidth <= 768 ? 'block' : 'inline',
                          lineHeight: window.innerWidth <= 768 ? '1.3' : '1.2',
                          maxWidth: window.innerWidth <= 768 ? 'none' : 'auto',
                          minWidth: window.innerWidth <= 768 ? '0' : 'auto'
                        }}>
                          {player.lastMatch.result === 'W' ? 'W' : 'L'} vs {formatOpponentName(player.lastMatch.opponent)}
                        </div>
                      ) : (
                        <span style={{ 
                          fontSize: window.innerWidth <= 768 ? '0.65rem' : '0.8rem',
                          color: '#999',
                          whiteSpace: window.innerWidth <= 768 ? 'normal' : 'nowrap',
                          wordWrap: window.innerWidth <= 768 ? 'break-word' : 'normal',
                          overflowWrap: window.innerWidth <= 768 ? 'break-word' : 'normal',
                          hyphens: window.innerWidth <= 768 ? 'auto' : 'none',
                          display: window.innerWidth <= 768 ? 'block' : 'inline',
                          lineHeight: window.innerWidth <= 768 ? '1.3' : '1.2',
                          maxWidth: window.innerWidth <= 768 ? 'none' : 'auto',
                          minWidth: window.innerWidth <= 768 ? '0' : 'auto'
                        }}>No matches</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sign Up Section at Bottom - Separate section */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          padding: window.innerWidth <= 768 ? '10px' : '12px',
          margin: window.innerWidth <= 768 ? '0 15px 15px 15px' : '0 20px 20px 20px',
          flexShrink: 0,
          clear: 'both'
        }}>
          <h3 style={{
            color: '#4CAF50',
            margin: '0 0 8px 0',
            fontSize: '0.9rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            🎯 Ready to Join the Ladder?
          </h3>
          <p style={{
            color: '#ccc',
            margin: '0 0 8px 0',
            fontSize: '0.8rem',
            fontStyle: 'italic',
            textAlign: 'center'
          }}>
            BCA Sanctioned - Fargo Reported Tournament Series
          </p>
          <ul style={{
            margin: '0',
            paddingLeft: '1rem',
            color: '#bbb',
            fontSize: '0.75rem',
            lineHeight: '1.4',
            textAlign: 'center',
            listStyle: 'none',
            paddingLeft: '0'
          }}>
            <li><strong>BCA Sanctioned</strong> - Official tournament play</li>
            <li><strong>Professional System</strong> - Advanced ladder management</li>
            <li><strong>Fair Competition</strong> - Challenge your way up the rankings</li>
            <li><strong>Prize Pools</strong> + Earn your bragging rights!</li>
            <li><strong>Community</strong> - Join Colorado's premier singles play pool community</li>
          </ul>
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button 
              onClick={() => {
                // Trigger signup first, then close modal
                if (onSignup) {
                  onSignup();
                }
                onClose();
              }}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 6px rgba(76, 175, 80, 0.3)'
              }}
            >
              📈 Join the Ladder Now
            </button>
          </div>
        </div>
      </div>

      {/* Player Stats Modal */}
      {showPlayerModal && selectedPlayer && (
        <div onClick={(e) => e.stopPropagation()}>
          <PlayerStatsModal
            showMobilePlayerStats={showPlayerModal}
            selectedPlayerForStats={selectedPlayer}
            setShowMobilePlayerStats={closePlayerModal}
            updatedPlayerData={selectedPlayer}
            lastMatchData={selectedPlayer.lastMatch}
            playerMatchHistory={[]}
            showFullMatchHistory={false}
            setShowFullMatchHistory={() => {}}
            getPlayerStatus={() => 'active'}
            fetchUpdatedPlayerData={() => {}}
            setShowUnifiedSignup={() => {
              setShowPlayerModal(false); // Close the player stats modal first
              setShowUnifiedSignup(true); // Then open the signup modal
            }}
            isPublicView={true}
          />
        </div>
      )}

      {/* Calendar Modal */}
      <LadderMatchCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
      />

      {/* Unified Signup Modal */}
      <UnifiedSignupModal
        isOpen={showUnifiedSignup}
        onClose={() => setShowUnifiedSignup(false)}
        onSuccess={(data) => {
          console.log('Signup successful:', data);
          setShowUnifiedSignup(false);
          // You can add any success handling here
        }}
      />

      {/* Rules Modal */}
      <LadderOfLegendsRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        isMobile={window.innerWidth <= 768}
        onContactAdmin={() => setShowContactAdminModal(true)}
      />

      {/* Contact Admin Modal */}
      <ContactAdminModal
        isOpen={showContactAdminModal}
        onClose={() => setShowContactAdminModal(false)}
      />

      </div>
    </>,
    document.body
  );
};

export default StandaloneLadderModal;
