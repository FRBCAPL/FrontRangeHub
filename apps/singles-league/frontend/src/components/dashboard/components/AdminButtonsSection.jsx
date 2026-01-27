import React from 'react';
import PropTypes from 'prop-types';
import adminAuthService from '@shared/services/services/adminAuthService.js';

/**
 * AdminButtonsSection Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const AdminButtonsSection = ({
  userPin,
  loadingPendingRegistrations,
  phaseOverride,
  selectedDivision,
  BACKEND_URL,
  styles,
  // Event handlers
  onShowRegistrationModal,
  onLoadPendingRegistrations,
  onSetPendingRegistrations,
  onShowPendingRegistrationsModal,
  onCreateTestRegistration,
  onShowNoteModal,
  onGoToAdmin,
  onGoToPlatformAdmin,
  isSuperAdmin,
  onActivatePhase2,
  onSetPhaseOverride,
  onRefreshSeasonData,
  onShowPendingClaimsModal
}) => {
  // Check if user is authenticated as admin
  const currentAdmin = adminAuthService.getCurrentAdmin();
  
  if (!currentAdmin) {
    return null;
  }

  return (
    <>
      <button
        className={styles.dashboardAdminBtn}
        onClick={onShowRegistrationModal}
        type="button"
        style={{ background: '#4CAF50' }}
      >
        Register Player
      </button>
      
      <button
        className={styles.dashboardAdminBtn}
        onClick={async () => {
          onLoadPendingRegistrations(true);
          try {
            const response = await fetch(`${BACKEND_URL}/api/users/pending-registrations`);
            if (response.ok) {
              const data = await response.json();
              onSetPendingRegistrations(data);
              onShowPendingRegistrationsModal(true);
            } else {
              alert('Failed to load pending registrations');
            }
                     } catch (error) {
             // Use logger instead of console.error
             // console.error('Error loading pending registrations:', error);
             alert('Error loading pending registrations');
           } finally {
            onLoadPendingRegistrations(false);
          }
        }}
        type="button"
        style={{ background: '#FF9800' }}
        disabled={loadingPendingRegistrations}
      >
        {loadingPendingRegistrations ? 'Loading...' : 'Pending Registrations'}
      </button>
      
      <button
        className={styles.dashboardAdminBtn}
        onClick={onCreateTestRegistration}
        type="button"
        style={{ background: '#9C27B0' }}
      >
        Create Test Registration
      </button>
      
      <button
        className={styles.dashboardAdminBtn}
        onClick={onShowNoteModal}
        type="button"
      >
        Add Note
      </button>
      
      <button
        className={styles.dashboardAdminBtn}
        onClick={onShowPendingClaimsModal}
        type="button"
        style={{ background: '#2196F3' }}
      >
        🔑 Pending Claims
      </button>
      
      <button
        className={styles.dashboardAdminBtn}
        onClick={onGoToAdmin}
        type="button"
      >
        Admin
      </button>
      
      {isSuperAdmin() && onGoToPlatformAdmin && (
        <button
          className={styles.dashboardAdminBtn}
          onClick={onGoToPlatformAdmin}
          type="button"
          style={{ background: "#8B4513" }}
        >
          Platform Admin
        </button>
      )}
      
      <button
        className={styles.dashboardAdminBtn}
        onClick={async () => {
          if (phaseOverride === "challenge") {
            // Switching back to Phase 1 - just update UI
            onSetPhaseOverride("scheduled");
          } else {
            // Switching to Phase 2 - activate it in the backend
            try {
              const response = await fetch(`${BACKEND_URL}/api/seasons/activate-phase2/${encodeURIComponent(selectedDivision)}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                }
              });
              
              const data = await response.json();
              
              if (data.success) {
                // Use logger instead of console.log
               // console.log('✅ Phase 2 activated successfully:', data.message);
                onSetPhaseOverride("challenge");
                // Show success message and refresh season data
                alert('✅ Phase 2 activated successfully! The system will now allow Phase 2 challenges.');
                // Refresh season data without reloading the page
                if (selectedDivision) {
                  onRefreshSeasonData();
                }
                             } else {
                 // Use logger instead of console.error
                 // console.error('❌ Failed to activate Phase 2:', data.error);
                 alert('Failed to activate Phase 2: ' + data.error);
               }
                         } catch (error) {
               // Use logger instead of console.error
               // console.error('❌ Error activating Phase 2:', error);
               alert('Error activating Phase 2: ' + error.message);
             }
          }
        }}
        type="button"
      >
        {phaseOverride === "challenge" ? "Switch to Phase 1 (Scheduled)" : "Activate Phase 2 (Challenge)"}
      </button>
      
      {phaseOverride && (
        <button
          className={styles.dashboardAdminBtn}
          onClick={() => onSetPhaseOverride(null)}
          type="button"
          style={{ background: "#888" }}
        >
          Clear Phase Override
        </button>
      )}
    </>
  );
};

AdminButtonsSection.propTypes = {
  userPin: PropTypes.string,
  loadingPendingRegistrations: PropTypes.bool,
  phaseOverride: PropTypes.string,
  selectedDivision: PropTypes.string,
  BACKEND_URL: PropTypes.string.isRequired,
  styles: PropTypes.object.isRequired,
  // Event handlers
  onShowRegistrationModal: PropTypes.func.isRequired,
  onLoadPendingRegistrations: PropTypes.func.isRequired,
  onSetPendingRegistrations: PropTypes.func.isRequired,
  onShowPendingRegistrationsModal: PropTypes.func.isRequired,
  onCreateTestRegistration: PropTypes.func.isRequired,
  onShowNoteModal: PropTypes.func.isRequired,
  onGoToAdmin: PropTypes.func.isRequired,
  onGoToPlatformAdmin: PropTypes.func,
  isSuperAdmin: PropTypes.func.isRequired,
  onActivatePhase2: PropTypes.func.isRequired,
  onSetPhaseOverride: PropTypes.func.isRequired,
  onRefreshSeasonData: PropTypes.func.isRequired,
  onShowPendingClaimsModal: PropTypes.func.isRequired
};

export default AdminButtonsSection;
