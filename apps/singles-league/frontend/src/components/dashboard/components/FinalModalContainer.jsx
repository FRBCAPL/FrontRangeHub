import React from 'react';
import PropTypes from 'prop-types';
import EditProposalModal from '../EditProposalModal';
import MatchChat from '../../chat/MatchChat';
import DirectMessagingModal from '@shared/components/DirectMessagingModal';
import WinnerSelectModal from '@shared/components/modal/modal/WinnerSelectModal';
import MatchValidationModal from '../MatchValidationModal';
import SmartMatchmakingModal from '@shared/components/modal/modal/SmartMatchmakingModal';
import UserProfileModal from '@shared/components/modal/modal/UserProfileModal';
import Phase1RulesModal from '@shared/components/modal/modal/Phase1RulesModal';
import Phase1OverviewModal from '@shared/components/modal/modal/Phase1OverviewModal';
import PlayerRegistrationModal from '@shared/components/modal/modal/PlayerRegistrationModal';
import CalendarModal from '../CalendarModal';

/**
 * FinalModalContainer Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const FinalModalContainer = ({
  // Modal visibility states
  showEditProposalModal,
  showChatModal,
  showCompletedModal,
  winnerModalOpen,
  validationModalOpen,
  showSmartMatchmakingModal,
  showUserProfileModal,
  showPhase1Rules,
  showPhase1Overview,
  showRegistrationModal,
  showPendingRegistrationsModal,
  showCalendarModal,
  // Data
  selectedProposal,
  chatType,
  opponentEmails,
  completedMatches,
  winnerModalPlayers,
  winnerModalMatch,
  matchToValidate,
  selectedOpponentForSmartMatch,
  pendingRegistrations,
  // Event handlers
  onCloseEditProposalModal,
  onCloseChatModal,
  onCloseCompletedModal,
  onCloseWinnerModal,
  onCloseValidationModal,
  onCloseSmartMatchmakingModal,
  onCloseUserProfileModal,
  onClosePhase1Rules,
  onClosePhase1Overview,
  onCloseRegistrationModal,
  onClosePendingRegistrationsModal,
  onCloseCalendarModal,
  onSaveEditProposal,
  onProposalUpdated,
  onSelectWinner,
  onValidateMatch,
  onRejectMatch,
  onSmartMatchProposalComplete,
  onUserUpdate,
  onRegistrationSuccess,
  onApproveRegistration,
  onRejectRegistration,
  onOpenOpponentsModal,
  onMatchClick,
  onSmartMatchClick,
  // Props
  selectedDivision,
  effectivePhase,
  userPin,
  playerName,
  playerLastName,
  senderEmail,
  isMobile,
  currentUser,
  players,
  filteredUpcomingMatches,
  phase1EndDate,
  playerStats,
  standings,
  timeLeft,
  deadlineStatus,
  allPlayers,
  styles,
  proposalService,
  seasonService,
  seasonData,
  currentPhaseInfo,
  BACKEND_URL,
  markMatchCompleted,
  setCompletingMatchId,
  updateCompletedMatch,
  refetchMatches,
  refetchProposals,
  setPendingRegistrations
}) => {
  return (
    <>
      {/* Edit Proposal Modal */}
      {selectedProposal && showEditProposalModal && (
        <EditProposalModal
          proposal={selectedProposal}
          open={showEditProposalModal}
          onClose={onCloseEditProposalModal}
          onSave={onSaveEditProposal}
          selectedDivision={selectedDivision}
          phase={effectivePhase}
          receiverPlayer={players.find(
            p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === (selectedProposal.receiverName || '').trim().toLowerCase() ||
                 p.email?.toLowerCase() === selectedProposal.receiverEmail?.toLowerCase()
          )}
        />
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className={styles.modalOverlay} style={{zIndex: 99999}}>
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '95vw',
            height: '95vh',
            maxWidth: '1400px',
            maxHeight: '900px',
            background: '#181818',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              background: '#222',
              borderRadius: '12px 12px 0 0'
            }}>
              <h2 style={{margin: 0, color: '#ffffff', fontSize: '1.2em'}}>
                {chatType === 'league' ? 'League Chat' : 'Direct Messages'}
              </h2>
              <button
                onClick={onCloseChatModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#444'}
                onMouseOut={(e) => e.target.style.background = 'none'}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{flex: 1, overflow: 'hidden', position: 'relative'}}>
              {chatType === 'league' ? (
                <MatchChat
                  userName={`${playerName} ${playerLastName}`}
                  userEmail={senderEmail}
                  userPin={userPin}
                  onClose={onCloseChatModal}
                />
              ) : (
                <DirectMessagingModal
                  userName={`${playerName} ${playerLastName}`}
                  userEmail={senderEmail}
                  userPin={userPin}
                  selectedDivision={selectedDivision}
                  opponentEmails={opponentEmails}
                  onClose={onCloseChatModal}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed Matches Modal */}
      {showCompletedModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{maxWidth: 800, margin: "auto"}}>
            <h2>Completed Matches</h2>
            <div style={{maxHeight: '70vh', overflowY: 'auto'}}>
              {completedMatches.length === 0 ? (
                <p>No completed matches yet.</p>
              ) : (
                <div style={{display: 'grid', gap: '10px'}}>
                  {completedMatches.map((match, index) => (
                    <div key={match._id || index} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '15px'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <strong>{match.senderName}</strong> vs <strong>{match.receiverName}</strong>
                        </div>
                        <div style={{color: '#4CAF50'}}>
                          Winner: <strong>{match.winner}</strong>
                        </div>
                      </div>
                      {match.notes && (
                        <p style={{margin: '5px 0 0 0', color: '#ccc', fontSize: '0.9em'}}>
                          Notes: {match.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 15}}>
              <button
                className={styles.dashboardBtn}
                onClick={onCloseCompletedModal}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner Select Modal */}
      <WinnerSelectModal
        open={winnerModalOpen}
        onClose={onCloseWinnerModal}
        player1={winnerModalPlayers.player1}
        player2={winnerModalPlayers.player2}
        onSelect={onSelectWinner}
      />

      {/* Match Validation Modal */}
      <MatchValidationModal
        isOpen={validationModalOpen}
        onClose={onCloseValidationModal}
        match={matchToValidate}
        onValidate={onValidateMatch}
        onReject={onRejectMatch}
      />

      {/* Smart Matchmaking Modal */}
      <SmartMatchmakingModal
        isOpen={showSmartMatchmakingModal}
        onClose={onCloseSmartMatchmakingModal}
        player1={currentUser}
        player2={selectedOpponentForSmartMatch}
        upcomingMatches={filteredUpcomingMatches}
        isMobile={isMobile}
        selectedDivision={selectedDivision}
        phase={effectivePhase}
        senderName={`${playerName} ${playerLastName}`}
        senderEmail={senderEmail}
        onProposalComplete={onSmartMatchProposalComplete}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={onCloseUserProfileModal}
        currentUser={currentUser}
        isMobile={isMobile}
        onUserUpdate={onUserUpdate}
        availableLocations={[
          'Legends Brews & Cues',
          'Antiques',
          'Rac m',
          'Westside Billiards',
          'Bijou Billiards',
          'Crooked Cue',
          'Back on the Boulevard',
          'Main Street Tavern',
          'Murray Street Darts',
          'My House'
        ]}
      />

      {/* Phase1 Rules Modal */}
      <Phase1RulesModal
        isOpen={showPhase1Rules}
        onClose={onClosePhase1Rules}
        isMobile={isMobile}
      />

      {/* Phase1 Overview Modal */}
      <Phase1OverviewModal
        isOpen={showPhase1Overview}
        onClose={onClosePhase1Overview}
        isMobile={isMobile}
        playerName={playerName}
        playerLastName={playerLastName}
        completedMatches={completedMatches}
        totalRequiredMatches={0}
        playerStats={playerStats}
        standings={standings}
        timeLeft={timeLeft}
        deadlineStatus={deadlineStatus}
        phase1EndDate={phase1EndDate}
        allPlayers={allPlayers}
        selectedDivision={selectedDivision}
      />

      {/* Player Registration Modal */}
      <PlayerRegistrationModal
        isOpen={showRegistrationModal}
        onClose={onCloseRegistrationModal}
        onSuccess={onRegistrationSuccess}
        isMobile={isMobile}
        isAdmin={true}
      />

      {/* Pending Registrations Modal */}
      {showPendingRegistrationsModal && (
        <div className={styles.modalOverlay} style={{zIndex: 99999}}>
          <div className={styles.modalContent} style={{maxWidth: 800, margin: "auto"}}>
            <h2>Pending Registrations</h2>
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {pendingRegistrations.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#ccc', padding: '40px' }}>
                  <h3>No Pending Registrations</h3>
                  <p>All registrations have been processed.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {pendingRegistrations
                    .sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate))
                    .map((registration, index) => (
                    <div
                      key={registration._id}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '15px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                            <span style={{ 
                              background: '#e53e3e', 
                              color: 'white', 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              minWidth: '20px',
                              textAlign: 'center'
                            }}>
                              #{index + 1}
                            </span>
                            <h4 style={{ color: '#e53e3e', margin: '0' }}>
                              {registration.firstName} {registration.lastName}
                            </h4>
                          </div>
                          <p style={{ color: '#ccc', margin: '0 0 5px 0' }}>
                            {registration.email} • {registration.phone}
                          </p>
                          <p style={{ color: '#999', margin: '0 0 5px 0', fontSize: '12px' }}>
                            Registered: {new Date(registration.registrationDate).toLocaleDateString()}
                          </p>
                          <p style={{ color: '#999', margin: '0', fontSize: '12px' }}>
                            Division: {registration.division || 'Not assigned'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                          {/* Division Assignment */}
                          <div style={{ marginBottom: '10px', textAlign: 'right' }}>
                            <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '2px' }}>
                              Assign Division:
                            </label>
                            <select
                              id={`division-${registration._id}`}
                              defaultValue={registration.division || ''}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #444',
                                background: '#222',
                                color: '#fff',
                                fontSize: '12px',
                                minWidth: '120px'
                              }}
                            >
                              <option value="">Select Division</option>
                              <option value="FRBCAPL TEST">FRBCAPL TEST</option>
                              <option value="Singles Test">Singles Test</option>
                              <option value="Waiting List">Waiting List</option>
                            </select>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => onApproveRegistration(registration)}
                              style={{
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onRejectRegistration(registration)}
                              style={{
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    
                      {/* Availability Summary */}
                      <div style={{ marginTop: '10px' }}>
                        <h5 style={{ color: '#e53e3e', margin: '0 0 5px 0', fontSize: '14px' }}>Availability:</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '5px', fontSize: '12px' }}>
                          {Object.entries(registration.availability).map(([day, slots]) => (
                            <div key={day} style={{ color: '#ccc' }}>
                              <strong>{day}:</strong> {slots.length > 0 ? slots.join(', ') : 'None'}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Locations */}
                      <div style={{ marginTop: '10px' }}>
                        <h5 style={{ color: '#e53e3e', margin: '0 0 5px 0', fontSize: '14px' }}>Locations:</h5>
                        <p style={{ color: '#ccc', margin: '0', fontSize: '12px' }}>{registration.locations}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 15}}>
              <button
                className={styles.dashboardBtn}
                onClick={onClosePendingRegistrationsModal}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={onCloseCalendarModal}
        isMobile={isMobile}
        phase1EndDate={phase1EndDate}
        upcomingMatches={filteredUpcomingMatches}
        playerName={playerName}
        playerLastName={playerLastName}
        onOpenOpponentsModal={onOpenOpponentsModal}
        onMatchClick={onMatchClick}
        onSmartMatchClick={onSmartMatchClick}
      />
    </>
  );
};

FinalModalContainer.propTypes = {
  // Modal visibility states
  showEditProposalModal: PropTypes.bool,
  showChatModal: PropTypes.bool,
  showCompletedModal: PropTypes.bool,
  winnerModalOpen: PropTypes.bool,
  validationModalOpen: PropTypes.bool,
  showSmartMatchmakingModal: PropTypes.bool,
  showUserProfileModal: PropTypes.bool,
  showPhase1Rules: PropTypes.bool,
  showPhase1Overview: PropTypes.bool,
  showRegistrationModal: PropTypes.bool,
  showPendingRegistrationsModal: PropTypes.bool,
  showCalendarModal: PropTypes.bool,
  // Data
  selectedProposal: PropTypes.object,
  chatType: PropTypes.string,
  opponentEmails: PropTypes.array,
  completedMatches: PropTypes.array,
  winnerModalPlayers: PropTypes.object,
  winnerModalMatch: PropTypes.object,
  matchToValidate: PropTypes.object,
  selectedOpponentForSmartMatch: PropTypes.object,
  pendingRegistrations: PropTypes.array,
  // Event handlers
  onCloseEditProposalModal: PropTypes.func.isRequired,
  onCloseChatModal: PropTypes.func.isRequired,
  onCloseCompletedModal: PropTypes.func.isRequired,
  onCloseWinnerModal: PropTypes.func.isRequired,
  onCloseValidationModal: PropTypes.func.isRequired,
  onCloseSmartMatchmakingModal: PropTypes.func.isRequired,
  onCloseUserProfileModal: PropTypes.func.isRequired,
  onClosePhase1Rules: PropTypes.func.isRequired,
  onClosePhase1Overview: PropTypes.func.isRequired,
  onCloseRegistrationModal: PropTypes.func.isRequired,
  onClosePendingRegistrationsModal: PropTypes.func.isRequired,
  onCloseCalendarModal: PropTypes.func.isRequired,
  onSaveEditProposal: PropTypes.func.isRequired,
  onProposalUpdated: PropTypes.func.isRequired,
  onSelectWinner: PropTypes.func.isRequired,
  onValidateMatch: PropTypes.func.isRequired,
  onRejectMatch: PropTypes.func.isRequired,
  onSmartMatchProposalComplete: PropTypes.func.isRequired,
  onUserUpdate: PropTypes.func.isRequired,
  onRegistrationSuccess: PropTypes.func.isRequired,
  onApproveRegistration: PropTypes.func.isRequired,
  onRejectRegistration: PropTypes.func.isRequired,
  onOpenOpponentsModal: PropTypes.func.isRequired,
  onMatchClick: PropTypes.func.isRequired,
  onSmartMatchClick: PropTypes.func.isRequired,
  // Props
  selectedDivision: PropTypes.string.isRequired,
  effectivePhase: PropTypes.string.isRequired,
  userPin: PropTypes.string,
  playerName: PropTypes.string.isRequired,
  playerLastName: PropTypes.string.isRequired,
  senderEmail: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
  currentUser: PropTypes.object,
  players: PropTypes.array,
  filteredUpcomingMatches: PropTypes.array,
  phase1EndDate: PropTypes.string,
  playerStats: PropTypes.object,
  standings: PropTypes.array,
  timeLeft: PropTypes.string,
  deadlineStatus: PropTypes.string,
  allPlayers: PropTypes.array,
  styles: PropTypes.object.isRequired,
  proposalService: PropTypes.object.isRequired,
  seasonService: PropTypes.object.isRequired,
  seasonData: PropTypes.object,
  currentPhaseInfo: PropTypes.object,
  BACKEND_URL: PropTypes.string.isRequired,
  markMatchCompleted: PropTypes.func.isRequired,
  setCompletingMatchId: PropTypes.func.isRequired,
  updateCompletedMatch: PropTypes.func.isRequired,
  refetchMatches: PropTypes.func.isRequired,
  refetchProposals: PropTypes.func.isRequired,
  setPendingRegistrations: PropTypes.func.isRequired
};

export default FinalModalContainer;
