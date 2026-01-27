import React from 'react';
import PropTypes from 'prop-types';
import PlayerSearch from '@shared/components/modal/modal/PlayerSearch';
import PlayerAvailabilityModal from '@shared/components/modal/modal/PlayerAvailabilityModal';
import MatchProposalModal from '@shared/components/modal/modal/MatchProposalModal';

/**
 * ModalContainer Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const ModalContainer = ({
  // Modal visibility states
  showPlayerSearch,
  showAdminPlayerSearch,
  showPlayerAvailability,
  showProposalModal,
  // Data
  selectedOpponent,
  proposalData,
  fullName,
  senderEmail,
  selectedDivision,
  effectivePhase,
  playerName,
  playerLastName,
  // Event handlers
  onClosePlayerSearch,
  onCloseAdminPlayerSearch,
  onClosePlayerAvailability,
  onCloseProposalModal,
  onProposeMatch,
  onProposalComplete,
  onUpdateProposalLocally,
  onRefetchMatches,
  onRefetchProposals
}) => {
  return (
    <>
      {/* Player Search Modal (Phase 2) */}
      {showPlayerSearch && (
        <PlayerSearch
          onClose={onClosePlayerSearch}
          excludeName={fullName}
          senderName={fullName}
          senderEmail={senderEmail}
          selectedDivision={selectedDivision}
          phase={effectivePhase}
          onProposalComplete={onClosePlayerSearch}
        />
      )}

      {/* Admin Player Search Modal */}
      {showAdminPlayerSearch && (
        <PlayerSearch
          onClose={onCloseAdminPlayerSearch}
          excludeName={null}
          senderName={fullName}
          senderEmail={senderEmail}
          phase={effectivePhase}
          onProposalComplete={onCloseAdminPlayerSearch}
        />
      )}

      {/* Player Availability Modal */}
      {showPlayerAvailability && selectedOpponent && (
        <PlayerAvailabilityModal
          onClose={onClosePlayerAvailability}
          player={selectedOpponent}
          onProposeMatch={onProposeMatch}
          selectedDivision={selectedDivision}
          phase={effectivePhase}
        />
      )}

      {/* Proposal Modal */}
      {showProposalModal && proposalData && (
        <MatchProposalModal
          player={proposalData.player}
          day={proposalData.day}
          slot={proposalData.slot}
          selectedDivision={proposalData.selectedDivision} 
          phase={proposalData.phase || effectivePhase}
          onClose={onCloseProposalModal}
          senderName={`${playerName} ${playerLastName}`}
          senderEmail={senderEmail}
          onProposalComplete={(newProposal) => {
            onCloseProposalModal();
            
            // Immediately add the new proposal to local state for instant UI feedback
            if (newProposal) {
              onUpdateProposalLocally(newProposal, 'add');
            }
            
            // Refetch to ensure data consistency
            onRefetchMatches();
            onRefetchProposals();
          }}
        />
      )}
    </>
  );
};

ModalContainer.propTypes = {
  // Modal visibility states
  showPlayerSearch: PropTypes.bool,
  showAdminPlayerSearch: PropTypes.bool,
  showPlayerAvailability: PropTypes.bool,
  showProposalModal: PropTypes.bool,
  // Data
  selectedOpponent: PropTypes.object,
  proposalData: PropTypes.object,
  fullName: PropTypes.string.isRequired,
  senderEmail: PropTypes.string.isRequired,
  selectedDivision: PropTypes.string.isRequired,
  effectivePhase: PropTypes.string.isRequired,
  playerName: PropTypes.string.isRequired,
  playerLastName: PropTypes.string.isRequired,
  // Event handlers
  onClosePlayerSearch: PropTypes.func.isRequired,
  onCloseAdminPlayerSearch: PropTypes.func.isRequired,
  onClosePlayerAvailability: PropTypes.func.isRequired,
  onCloseProposalModal: PropTypes.func.isRequired,
  onProposeMatch: PropTypes.func.isRequired,
  onProposalComplete: PropTypes.func.isRequired,
  onUpdateProposalLocally: PropTypes.func.isRequired,
  onRefetchMatches: PropTypes.func.isRequired,
  onRefetchProposals: PropTypes.func.isRequired
};

export default ModalContainer;
