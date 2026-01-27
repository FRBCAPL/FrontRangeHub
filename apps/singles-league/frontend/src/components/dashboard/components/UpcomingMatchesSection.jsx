import React from 'react';
import PropTypes from 'prop-types';
import ErrorBoundary from '@shared/components/common/ErrorBoundary';
import Phase1Tracker from '../Phase1Tracker';
import Phase2Tracker from '../Phase2Tracker';
import PoolSimulation from '@shared/components/PoolSimulation.jsx';
import ResponsiveWrapper from '@shared/components/ResponsiveWrapper';

/**
 * UpcomingMatchesSection Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const UpcomingMatchesSection = ({
  isMobile,
  styles,
  effectivePhase,
  seasonData,
  completedMatches,
  totalRequiredMatches,
  playerName,
  playerLastName,
  selectedDivision,
  pendingCount,
  sentCount,
  filteredUpcomingMatches,
  currentUser,
  allPlayers,
  showPhase1Rules,
  setShowPhase1Rules,
  setShowPhase1Overview,
  setPlayerStats,
  setTimeLeft,
  setDeadlineStatus,
  setPhase1EndDate,
  // Event handlers
  onOpenOpponentsModal,
  onOpenCompletedMatchesModal,
  onOpenStandingsModal,
  onOpenDefenseChallengersModal,
  onOpenAllMatchesModal,
  onOpenProposalListModal,
  onOpenSentProposalListModal,
  onOpenPlayerSearch,
  onMatchClick,
  onSmartMatchClick,
  onOpenMessageCenter,
  onOpenCalendar,
  // Refs
  simulationRef,
  opponentsModalPortal
}) => {
  return (
    <section className={`${styles.dashboardSection} ${styles.dashboardSectionBox} ${styles.matchesSection}`}
      style={{
        position: "relative",
        overflow: "visible",
        backgroundColor: "rgba(0, 0, 0, .5)",
        minHeight: isMobile ? "650px" : "570px",
        marginBottom: isMobile ? '16px' : '36px',
        paddingBottom: isMobile ? '20px' : '20px',
      }}
    >
      {/* PoolSimulation as background and matches list overlayed on table */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className={styles.poolTableContainer} style={{ 
          marginBottom: isMobile ? '12px' : '24px', 
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '98%' : '600px',
          height: isMobile ? '400px' : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          
          {/* Phase 1 Tracker positioned over the simulation */}
          {effectivePhase === 'scheduled' && seasonData && (
            <div style={{
              position: 'absolute',
              top: isMobile ? '50px' : '35px',
              left: '0',
              right: '0',
              margin: '0 auto',
              zIndex: 100,
              width: isMobile ? '95%' : '90%',
              maxWidth: isMobile ? '500px' : '1200px',
              height: isMobile ? '150px' : '200px',
              pointerEvents: 'auto'
            }}>
              <ErrorBoundary>
                <Phase1Tracker
                  currentPhase={effectivePhase}
                  seasonData={seasonData}
                  completedMatches={completedMatches}
                  totalRequiredMatches={totalRequiredMatches}
                  playerName={playerName}
                  playerLastName={playerLastName}
                  selectedDivision={selectedDivision}
                  onOpenOpponentsModal={onOpenOpponentsModal}
                  onOpenCompletedMatchesModal={onOpenCompletedMatchesModal}
                  onOpenStandingsModal={onOpenStandingsModal}
                  onOpenAllMatchesModal={onOpenAllMatchesModal}
                  pendingCount={pendingCount}
                  sentCount={sentCount}
                  onOpenProposalListModal={onOpenProposalListModal}
                  onOpenSentProposalListModal={onOpenSentProposalListModal}
                  upcomingMatches={filteredUpcomingMatches}
                  onMatchClick={onMatchClick}
                  isMobile={isMobile}
                  onOpenMessageCenter={onOpenMessageCenter}
                  currentUser={currentUser}
                  allPlayers={allPlayers}
                  onSmartMatchClick={onSmartMatchClick}
                  // Phase1 modal state and handlers
                  showPhase1Rules={showPhase1Rules}
                  setShowPhase1Rules={setShowPhase1Rules}
                  showPhase1Overview={false}
                  setShowPhase1Overview={setShowPhase1Overview}
                  // Phase1 data state setters
                  setPlayerStats={setPlayerStats}
                  setTimeLeft={setTimeLeft}
                  setDeadlineStatus={setDeadlineStatus}
                  setPhase1EndDate={setPhase1EndDate}
                  // Calendar modal handler
                  onOpenCalendar={onOpenCalendar}
                />
              </ErrorBoundary>
            </div>
          )}

          {/* Phase 2 Tracker positioned over the simulation */}
          {effectivePhase === 'challenge' && (
            <div style={{
              position: 'absolute',
              top: isMobile ? '50px' : '35px',
              left: '0',
              right: '0',
              margin: '0 auto',
              zIndex: 10,
              width: isMobile ? '95%' : '90%',
              maxWidth: isMobile ? '500px' : '1200px',
              height: isMobile ? '150px' : '200px'
            }}>
              <Phase2Tracker
                playerName={playerName}
                playerLastName={playerLastName}
                selectedDivision={selectedDivision}
                phase={effectivePhase}
                isMobile={isMobile}
                onOpenOpponentsModal={onOpenOpponentsModal}
                onOpenCompletedMatchesModal={onOpenCompletedMatchesModal}
                onOpenStandingsModal={onOpenStandingsModal}
                onOpenDefenseChallengersModal={onOpenDefenseChallengersModal}
                onOpenAllMatchesModal={onOpenAllMatchesModal}
                pendingCount={pendingCount}
                sentCount={sentCount}
                onOpenProposalListModal={onOpenProposalListModal}
                onOpenSentProposalListModal={onOpenSentProposalListModal}
                onOpenPlayerSearch={onOpenPlayerSearch}
                upcomingMatches={filteredUpcomingMatches}
                onMatchClick={onMatchClick}
                seasonData={seasonData}
                completedMatches={completedMatches}
                standings={[]}
              />
            </div>
          )}

          {/* Pool Simulation */}
          {isMobile ? (
            <div
              className={styles.simulationContainer}
              ref={simulationRef}
              style={{
                width: '100% !important',
                height: '400px !important',
                position: 'relative',
                minWidth: '0 !important',
                maxWidth: '100% !important',
                minHeight: '400px !important',
                maxHeight: '400px !important',
                pointerEvents: effectivePhase === 'scheduled' ? 'none' : 'auto'
              }}
            >
              <PoolSimulation isRotated={true} />
            </div>
          ) : (
            <ResponsiveWrapper aspectWidth={600} aspectHeight={300}>
              <div
                className={styles.simulationContainer}
                ref={simulationRef}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  pointerEvents: effectivePhase === 'scheduled' ? 'none' : 'auto'
                }}
              >
                <PoolSimulation />
              </div>
            </ResponsiveWrapper>
          )}

          {/* OpponentsModal portal overlay (not inside simulationContainer) */}
          {opponentsModalPortal}
        </div>
      </div>
    </section>
  );
};

UpcomingMatchesSection.propTypes = {
  isMobile: PropTypes.bool.isRequired,
  styles: PropTypes.object.isRequired,
  effectivePhase: PropTypes.string.isRequired,
  seasonData: PropTypes.object,
  completedMatches: PropTypes.array,
  totalRequiredMatches: PropTypes.number,
  playerName: PropTypes.string.isRequired,
  playerLastName: PropTypes.string.isRequired,
  selectedDivision: PropTypes.string.isRequired,
  pendingCount: PropTypes.number,
  sentCount: PropTypes.number,
  filteredUpcomingMatches: PropTypes.array,
  currentUser: PropTypes.object,
  allPlayers: PropTypes.array,
  showPhase1Rules: PropTypes.bool,
  setShowPhase1Rules: PropTypes.func,
  setShowPhase1Overview: PropTypes.func,
  setPlayerStats: PropTypes.func,
  setTimeLeft: PropTypes.func,
  setDeadlineStatus: PropTypes.func,
  setPhase1EndDate: PropTypes.func,
  // Event handlers
  onOpenOpponentsModal: PropTypes.func.isRequired,
  onOpenCompletedMatchesModal: PropTypes.func.isRequired,
  onOpenStandingsModal: PropTypes.func.isRequired,
  onOpenDefenseChallengersModal: PropTypes.func.isRequired,
  onOpenAllMatchesModal: PropTypes.func.isRequired,
  onOpenProposalListModal: PropTypes.func.isRequired,
  onOpenSentProposalListModal: PropTypes.func.isRequired,
  onOpenPlayerSearch: PropTypes.func.isRequired,
  onMatchClick: PropTypes.func.isRequired,
  onSmartMatchClick: PropTypes.func.isRequired,
  onOpenMessageCenter: PropTypes.func.isRequired,
  onOpenCalendar: PropTypes.func.isRequired,
  // Refs
  simulationRef: PropTypes.object,
  opponentsModalPortal: PropTypes.node
};

export default UpcomingMatchesSection;
