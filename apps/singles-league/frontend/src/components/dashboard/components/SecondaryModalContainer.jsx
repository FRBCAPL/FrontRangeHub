import React from 'react';
import PropTypes from 'prop-types';
import StandingsModal from '../StandingsModal';
import DefenseChallengersModal from '../DefenseChallengersModal';
import MatchDetailsModal from '@shared/components/modal/modal/MatchDetailsModal';
import ProposalListModal from '../ProposalListModal';
import ConfirmMatchDetails from '@shared/components/ConfirmMatchDetails';
import CounterProposalModal from '@shared/components/modal/modal/CounterProposalModal';
import ProposalDetailsModal from '../ProposalDetailsModal';

/**
 * SecondaryModalContainer Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const SecondaryModalContainer = ({
  // Modal visibility states
  showStandings,
  showDefenseChallengers,
  modalOpen,
  showNoteModal,
  showProposalListModal,
  showSentProposalListModal,
  showCounterModal,
  showProposalDetailsModal,
  // Data
  selectedMatch,
  selectedProposal,
  counterProposal,
  newNote,
  noteError,
  proposalNote,
  pendingProposals,
  sentProposals,
  players,
  // Constants
  STANDINGS_URLS,
  // Event handlers
  onCloseStandings,
  onCloseDefenseChallengers,
  onCloseModal,
  onCloseNoteModal,
  onCloseProposalListModal,
  onCloseSentProposalListModal,
  onCloseCounterModal,
  onCloseProposalDetailsModal,
  onAddNote,
  onUpdateNewNote,
  onSelectProposal,
  onSelectSentProposal,
  onConfirmProposal,
  onCounterPropose,
  onSubmitCounterProposal,
  onEditProposal,
  onDeleteProposal,
  onUpdateProposalLocally,
  onRefetchMatches,
  onRefetchProposals,
  // Props
  selectedDivision,
  effectivePhase,
  userPin,
  playerName,
  playerLastName,
  senderEmail,
  styles,
  proposalService
}) => {
  return (
    <>
      {/* Standings Modal */}
      <StandingsModal
        open={showStandings}
        onClose={onCloseStandings}
        standingsUrl={STANDINGS_URLS[selectedDivision]}
      />

      {/* Defense Challengers Modal */}
      <DefenseChallengersModal
        open={showDefenseChallengers}
        onClose={onCloseDefenseChallengers}
        playerName={playerName}
        playerLastName={playerLastName}
        selectedDivision={selectedDivision}
      />

      {/* Match Details Modal */}
      <MatchDetailsModal
        open={modalOpen}
        onClose={onCloseModal}
        match={selectedMatch}
        onCompleted={matchId => onUpdateProposalLocally(matchId, 'remove')}
        userPin={userPin}
        onMatchUpdated={updatedMatch => onUpdateProposalLocally(updatedMatch, 'update')}
        senderName={`${playerName} ${playerLastName}`}
        senderEmail={senderEmail}
      />

      {/* Note Modal */}
      {showNoteModal && (
        <div className={styles.modalOverlay} style={{zIndex: 99999}}>
          <div className={styles.modalContent} style={{maxWidth: 400, margin: "auto"}}>
            <h2>Add News/Note</h2>
            <textarea
              value={newNote}
              onChange={onUpdateNewNote}
              rows={4}
              style={{width: "100%", marginBottom: 12, borderRadius: 6, padding: 8}}
              placeholder="Enter your note..."
            />
            {noteError && <div style={{color: "red", marginBottom: 8}}>{noteError}</div>}
            <div style={{display: "flex", justifyContent: "flex-end", gap: 8}}>
              <button
                className={styles.dashboardBtn}
                onClick={onCloseNoteModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.dashboardBtn}
                disabled={!newNote.trim()}
                onClick={onAddNote}
                type="button"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal List Modals */}
      {showProposalListModal && (
        <ProposalListModal
          proposals={pendingProposals}
          onSelect={onSelectProposal}
          onClose={onCloseProposalListModal}
          type="received"
        />
      )}

      {showSentProposalListModal && (
        <ProposalListModal
          proposals={sentProposals}
          onSelect={onSelectSentProposal}
          onClose={onCloseSentProposalListModal}
          type="sent"
        />
      )}

      {/* Confirm Match Details Modal */}
      {selectedProposal && !showProposalDetailsModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{maxWidth: 420, margin: "auto"}}>
            <ConfirmMatchDetails
              proposal={selectedProposal}
              userNote={proposalNote}
              setUserNote={onUpdateNewNote}
              onConfirm={onConfirmProposal}
              onClose={onCloseProposalDetailsModal}
              onCounterPropose={onCounterPropose}
              phase={effectivePhase}
              currentUserName={`${playerName} ${playerLastName}`}
              currentUserEmail={senderEmail}
            />
          </div>
        </div>
      )}

      {/* Counter Proposal Modal */}
      <CounterProposalModal
        proposal={counterProposal}
        open={showCounterModal}
        onClose={onCloseCounterModal}
        onSubmit={onSubmitCounterProposal}
        senderPlayer={players.find(
          p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === (counterProposal?.senderName || '').trim().toLowerCase() ||
               p.email?.toLowerCase() === counterProposal?.senderEmail?.toLowerCase()
        )}
        phase={effectivePhase}
        selectedDivision={selectedDivision}
      />

      {/* Proposal Details Modal */}
      {selectedProposal && showProposalDetailsModal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          open={showProposalDetailsModal}
          onClose={onCloseProposalDetailsModal}
          onEdit={onEditProposal}
          onDelete={onDeleteProposal}
          phase={effectivePhase}
          currentUserName={`${playerName} ${playerLastName}`}
          currentUserEmail={senderEmail}
        />
      )}
    </>
  );
};

SecondaryModalContainer.propTypes = {
  // Modal visibility states
  showStandings: PropTypes.bool,
  showDefenseChallengers: PropTypes.bool,
  modalOpen: PropTypes.bool,
  showNoteModal: PropTypes.bool,
  showProposalListModal: PropTypes.bool,
  showSentProposalListModal: PropTypes.bool,
  showCounterModal: PropTypes.bool,
  showProposalDetailsModal: PropTypes.bool,
  // Data
  selectedMatch: PropTypes.object,
  selectedProposal: PropTypes.object,
  counterProposal: PropTypes.object,
  newNote: PropTypes.string,
  noteError: PropTypes.string,
  proposalNote: PropTypes.string,
  pendingProposals: PropTypes.array,
  sentProposals: PropTypes.array,
  players: PropTypes.array,
  // Constants
  STANDINGS_URLS: PropTypes.object.isRequired,
  // Event handlers
  onCloseStandings: PropTypes.func.isRequired,
  onCloseDefenseChallengers: PropTypes.func.isRequired,
  onCloseModal: PropTypes.func.isRequired,
  onCloseNoteModal: PropTypes.func.isRequired,
  onCloseProposalListModal: PropTypes.func.isRequired,
  onCloseSentProposalListModal: PropTypes.func.isRequired,
  onCloseCounterModal: PropTypes.func.isRequired,
  onCloseProposalDetailsModal: PropTypes.func.isRequired,
  onAddNote: PropTypes.func.isRequired,
  onUpdateNewNote: PropTypes.func.isRequired,
  onSelectProposal: PropTypes.func.isRequired,
  onSelectSentProposal: PropTypes.func.isRequired,
  onConfirmProposal: PropTypes.func.isRequired,
  onCounterPropose: PropTypes.func.isRequired,
  onSubmitCounterProposal: PropTypes.func.isRequired,
  onEditProposal: PropTypes.func.isRequired,
  onDeleteProposal: PropTypes.func.isRequired,
  onUpdateProposalLocally: PropTypes.func.isRequired,
  onRefetchMatches: PropTypes.func.isRequired,
  onRefetchProposals: PropTypes.func.isRequired,
  // Props
  selectedDivision: PropTypes.string.isRequired,
  effectivePhase: PropTypes.string.isRequired,
  userPin: PropTypes.string,
  playerName: PropTypes.string.isRequired,
  playerLastName: PropTypes.string.isRequired,
  senderEmail: PropTypes.string.isRequired,
  styles: PropTypes.object.isRequired,
  proposalService: PropTypes.object.isRequired
};

export default SecondaryModalContainer;
