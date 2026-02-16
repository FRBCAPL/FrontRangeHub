import React from 'react';
import PropTypes from 'prop-types';
import tenBall from '@shared/assets/tenball.svg';
import adminAuthService from '@shared/services/services/adminAuthService.js';

/**
 * DashboardHeader Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const DashboardHeader = ({ 
  playerName, 
  playerLastName, 
  isMobile, 
  userPin,
  playerEmail,
  proposalsLoading,
  matchesLoading,
  notesLoading,
  seasonLoading,
  standingsLoading,
  scheduleLoading,
  styles 
}) => {
  const isLoading = proposalsLoading || matchesLoading || notesLoading || seasonLoading || standingsLoading || scheduleLoading;

  return (
    <>
      {/* Welcome Header */}
      <div style={{ textAlign: 'center', marginBottom: isMobile ? '8px' : '16px' }}>
        <h1 
          className={styles.dashboardTitle} 
          style={{ 
            fontSize: isMobile ? '1.6rem' : '2rem',
            textAlign: 'center',
            margin: 0,
            transition: 'all 0.2s ease'
          }}


        >
          Hello,
          <span className={styles.dashboardUserName} style={{ fontSize: isMobile ? '1.4rem' : '1.8rem' }}>
            {playerName} {playerLastName}
          </span>
        </h1>
        
        {/* Auto-update Status Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: isMobile ? '4px' : '8px',
          fontSize: isMobile ? '0.7rem' : '0.8rem',
          color: '#888'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isLoading ? '#f59e0b' : '#10b981',
            animation: isLoading ? 'pulse 2s infinite' : 'none'
          }} />
          <span>
            {isLoading ? 'Updating...' : 'Live'}
          </span>
        </div>
        

      </div>

      {/* Beta Announcement */}
      <div className={styles.announcement} style={{ fontSize: isMobile ? '0.75rem' : '1rem', marginBottom: isMobile ? '8px' : '16px' }}>
        <p>This is the BETA version. </p>Matches that are created, scheduled, and confirmed will NOT be played.<br />
        This is for testing purposes only.
      </div>

             {/* 10-Ball Tutorial Link - Admin Only (Not for guests) */}
               {adminAuthService.getCurrentAdmin() && playerEmail !== 'guest@frontrangepool.com' && (
        <div style={{ 
          marginBottom: isMobile ? 12 : 16,
          textAlign: 'center'
        }}>
          <button
            onClick={() => window.location.hash = '#/tenball-tutorial'}
            style={{
              background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
              border: 'none',
              color: 'white',
              padding: isMobile ? '10px 16px' : '12px 20px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
            }}
          >
            <img src={tenBall} alt="10-Ball" style={{ width: '20px', height: '20px', marginRight: '8px', display: 'inline-block', verticalAlign: 'text-bottom' }} />
            Play 10-Ball Tutorial & Learn Official CSI Rules
          </button>
        </div>
      )}

      {!isMobile && <br />}
    </>
  );
};

DashboardHeader.propTypes = {
  playerName: PropTypes.string.isRequired,
  playerLastName: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
  userPin: PropTypes.string,
  playerEmail: PropTypes.string,
  proposalsLoading: PropTypes.bool,
  matchesLoading: PropTypes.bool,
  notesLoading: PropTypes.bool,
  seasonLoading: PropTypes.bool,
  standingsLoading: PropTypes.bool,
  scheduleLoading: PropTypes.bool,
  onProfileClick: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired
};

export default DashboardHeader;
