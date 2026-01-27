import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './Dashboard';
import logger from '@shared/utils/utils/logger';

/**
 * DashboardContainer - Main container for dashboard functionality
 * Handles state management and data fetching for the dashboard
 */
const DashboardContainer = ({ 
  playerName, 
  playerLastName, 
  userEmail, 
  userPin, 
  isSuperAdmin,
  onLogout 
}) => {
  // Core state
  const [currentUser, setCurrentUser] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showMatchProposalModal, setShowMatchProposalModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showPendingRegistrationsModal, setShowPendingRegistrationsModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showOpponentsModal, setShowOpponentsModal] = useState(false);
  const [showSmartMatchmakingModal, setShowSmartMatchmakingModal] = useState(false);

  // Data states
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loadingPendingRegistrations, setLoadingPendingRegistrations] = useState(false);
  const [phaseOverride, setPhaseOverride] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('All Divisions');

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        logger.info('Initializing dashboard data...');
        
        // Load user data
        const userData = {
          firstName: playerName,
          lastName: playerLastName,
          email: userEmail,
          pin: userPin,
          isSuperAdmin
        };
        setCurrentUser(userData);
        
        // Load players data
        await loadPlayersData();
        
        logger.info('Dashboard initialization complete');
      } catch (err) {
        logger.error('Dashboard initialization failed:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [playerName, playerLastName, userEmail, userPin, isSuperAdmin]);

  // Load players data
  const loadPlayersData = async () => {
    try {
      logger.debug('Loading players data...');
      // This would typically fetch from your API
      // For now, we'll set an empty array
      setAllPlayers([]);
    } catch (err) {
      logger.error('Failed to load players data:', err);
      throw err;
    }
  };

  // Handle admin actions
  const handleAdminAction = useCallback((action, data) => {
    logger.info(`Admin action: ${action}`, data);
    
    switch (action) {
      case 'showRegistrationModal':
        setShowRegistrationModal(true);
        break;
      case 'showPendingRegistrations':
        setShowPendingRegistrationsModal(true);
        break;
      case 'showNoteModal':
        setShowNoteModal(true);
        break;
      default:
        logger.warn(`Unknown admin action: ${action}`);
    }
  }, []);

  // Handle modal actions
  const handleModalAction = useCallback((modal, action, data) => {
    logger.debug(`Modal action: ${modal} - ${action}`, data);
    
    switch (modal) {
      case 'matchProposal':
        setShowMatchProposalModal(action === 'show');
        break;
      case 'userProfile':
        setShowUserProfileModal(action === 'show');
        break;
      case 'calendar':
        setShowCalendarModal(action === 'show');
        break;
      case 'opponents':
        setShowOpponentsModal(action === 'show');
        break;
      case 'smartMatchmaking':
        setShowSmartMatchmakingModal(action === 'show');
        break;
      default:
        logger.warn(`Unknown modal action: ${modal} - ${action}`);
    }
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <Dashboard
      // Core props
      playerName={playerName}
      playerLastName={playerLastName}
      userEmail={userEmail}
      userPin={userPin}
      isSuperAdmin={isSuperAdmin}
      onLogout={onLogout}
      
      // State props
      currentUser={currentUser}
      allPlayers={allPlayers}
      pendingRegistrations={pendingRegistrations}
      loadingPendingRegistrations={loadingPendingRegistrations}
      phaseOverride={phaseOverride}
      selectedDivision={selectedDivision}
      
      // Modal states
      showMatchProposalModal={showMatchProposalModal}
      showUserProfileModal={showUserProfileModal}
      showRegistrationModal={showRegistrationModal}
      showPendingRegistrationsModal={showPendingRegistrationsModal}
      showNoteModal={showNoteModal}
      showCalendarModal={showCalendarModal}
      showOpponentsModal={showOpponentsModal}
      showSmartMatchmakingModal={showSmartMatchmakingModal}
      
      // Action handlers
      onAdminAction={handleAdminAction}
      onModalAction={handleModalAction}
      onSetPendingRegistrations={setPendingRegistrations}
      onSetPhaseOverride={setPhaseOverride}
      onSetSelectedDivision={setSelectedDivision}
    />
  );
};

export default DashboardContainer;
