import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tournamentService from '@shared/services/services/tournamentService';
import { getCurrentPhase } from '@shared/utils/utils/phaseSystem.js';

const NavigationMenu = memo(({
  isPublicView,
  navigateToView,
  userLadderData,
  handleSmartMatch,
  pendingChallenges,
  setShowMatchReportingModal,
  setShowChallengesModal,
  setShowPaymentDashboard,
  setShowPrizePoolModal,
  setShowUnifiedSignup,
  setShowRulesModal,
  setShowOnboardingHelp,
  gettingStartedAtEnd,
  setShowContactAdminModal,
  isAdmin,
  setShowApplicationsManager,
  setShowMatchCalendar,
  setShowAdminMessagesModal,
  selectedLadder,
  setSelectedTournament,
  setShowTournamentInfoModal,
  onJoinAssignedLadder
}) => {
  const navigate = useNavigate();
  const [moreNavOpen, setMoreNavOpen] = useState(false);
  const isFreePhase = userLadderData?.phaseInfo?.isFree ?? getCurrentPhase().isFree;

  const pendingCount = Array.isArray(pendingChallenges) ? pendingChallenges.length : 0;

  /** Once per browser session: if they have pending challenges, expand More so My Challenges is discoverable. */
  useEffect(() => {
    if (isPublicView) return;
    if (pendingCount <= 0) return;
    try {
      if (window.sessionStorage.getItem('ladder_nav_more_auto_opened_pending') === '1') return;
      window.sessionStorage.setItem('ladder_nav_more_auto_opened_pending', '1');
    } catch {
      return;
    }
    setMoreNavOpen(true);
  }, [isPublicView, pendingCount]);

  const showTournamentInfo = async () => {
    try {
      const result = await tournamentService.getUpcomingTournament(selectedLadder);
      if (result.success && result.data) {
        setSelectedTournament(result.data);
        setShowTournamentInfoModal(true);
      } else {
        setSelectedTournament(null);
        setShowTournamentInfoModal(true);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      setSelectedTournament(null);
      setShowTournamentInfoModal(true);
    }
  };

  return (
    <div className="ladder-navigation">
      {/* Primary row: three main player actions */}
      <div className="nav-grid nav-grid-primary">
        {!isPublicView && (
          <div className="nav-card" onClick={() => navigateToView('ladders')}>
            <div className="nav-icon">📊</div>
            <h3>View Ladders</h3>
            <p>Rankings and pick someone to challenge</p>
          </div>
        )}

        {isPublicView && (
          <div className="nav-card public-calendar-card" onClick={() => setShowMatchCalendar(true)}>
            <div className="nav-icon">📅</div>
            <h3>Match Calendar</h3>
            <p>View confirmed matches and schedule</p>
          </div>
        )}

        {!isPublicView && (
          <div className="nav-card" onClick={() => setShowMatchReportingModal(true)}>
            <div className="nav-icon">🏓</div>
            <h3>Report Result</h3>
            <p>Winner posts score and reporting step</p>
          </div>
        )}

        {!isPublicView && userLadderData?.canChallenge && (
          <div className="nav-card" onClick={handleSmartMatch}>
            <div className="nav-icon">🧠</div>
            <h3>Smart Match</h3>
            <p>Suggested opponents to challenge</p>
          </div>
        )}

        {!isPublicView && !userLadderData?.canChallenge && (
          <div className="nav-card" onClick={() => setShowMatchCalendar(true)}>
            <div className="nav-icon">📅</div>
            <h3>Match Calendar</h3>
            <p>View confirmed matches and schedule</p>
          </div>
        )}

        {isPublicView && (
          <div className="nav-card" onClick={() => setShowPrizePoolModal(true)} style={{ position: 'relative' }}>
            <div className="nav-icon">💰</div>
            <h3>Prize Pools</h3>
            <p>View current prize pools and winners</p>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.8rem',
              color: '#00ff00'
            }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#00ff00',
                animation: 'pulse 2s infinite'
              }}
              />
              Live
            </div>
          </div>
        )}

        {isPublicView && (
          <div className="nav-card" onClick={() => setShowRulesModal(true)}>
            <div className="nav-icon">📋</div>
            <h3>Ladder Rules</h3>
            <p>Read the complete ladder rules</p>
          </div>
        )}
      </div>

      {!isPublicView && !userLadderData?.canChallenge && userLadderData?.playerId !== 'guest' && (
        <div className="nav-grid" style={{ marginBottom: '14px' }}>
          <div
            className="nav-card challenge-features-locked-card"
            onClick={() => {
              if (userLadderData?.playerId === 'pending' || userLadderData?.pendingApproval) {
                setShowContactAdminModal(true);
                return;
              }
              if (userLadderData?.playerId === 'approved_no_ladder' || userLadderData?.needsLadderPlacement) {
                onJoinAssignedLadder?.();
                return;
              }
              if (isFreePhase) {
                setShowUnifiedSignup(true);
                return;
              }
              setShowPaymentDashboard(true);
            }}
            style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              cursor: 'pointer',
              gridColumn: '1 / -1'
            }}
          >
            <div className="nav-icon">🔒</div>
            <h3>Challenge Features</h3>
            <p>
              {userLadderData?.playerId === 'pending' || userLadderData?.pendingApproval
                ? 'Registration pending admin approval. Challenge features unlock after approval.'
                : userLadderData?.playerId === 'approved_no_ladder' || userLadderData?.needsLadderPlacement
                  ? `Approved. Join ${userLadderData?.assignedLadderLabel || 'your ladder'} to continue.`
                  : isFreePhase
                    ? 'Complete your profile to unlock Smart Match and challenge features'
                    : 'Membership required to unlock Smart Match and challenge features'}
            </p>
          </div>
        </div>
      )}

      <div className="nav-more-toggle-wrap">
        <button
          type="button"
          className="nav-more-toggle"
          aria-expanded={moreNavOpen}
          onClick={() => setMoreNavOpen((o) => !o)}
        >
          <span>{moreNavOpen ? '▲ Hide' : '▼ More options'}</span>
          {!moreNavOpen && pendingCount > 0 ? (
            <span className="nav-more-badge" aria-label={`${pendingCount} pending challenges`}>
              {pendingCount}
            </span>
          ) : null}
        </button>
      </div>

      {moreNavOpen ? (
        isPublicView ? (
          <div className="nav-grid nav-grid-more">
            <div className="nav-card" onClick={() => setShowPaymentDashboard(true)}>
              <div className="nav-icon">💳</div>
              <h3>Payment Dashboard</h3>
              <p>Manage credits, membership, and payments</p>
            </div>
            <div className="nav-card" onClick={() => setShowContactAdminModal(true)}>
              <div className="nav-icon">📞</div>
              <h3>Contact Admin</h3>
              <p>Get help with ladder issues</p>
            </div>
          </div>
        ) : (
          <div className="nav-grid nav-grid-more">
            {setShowOnboardingHelp && !gettingStartedAtEnd ? (
              <div className="nav-card onboarding-help-card" onClick={() => setShowOnboardingHelp(true)}>
                <div className="nav-icon">📖</div>
                <h3>Getting Started</h3>
                <p>New? Open the help guide</p>
              </div>
            ) : null}

            {setShowOnboardingHelp && gettingStartedAtEnd ? (
              <div className="nav-card onboarding-help-card" onClick={() => setShowOnboardingHelp(true)}>
                <div className="nav-icon">📖</div>
                <h3>Getting Started</h3>
                <p>Open the help guide</p>
              </div>
            ) : null}

            {userLadderData?.canChallenge ? (
              <div className="nav-card" onClick={() => setShowMatchCalendar(true)}>
                <div className="nav-icon">📅</div>
                <h3>Match Calendar</h3>
                <p>View confirmed matches and schedule</p>
              </div>
            ) : null}

            {userLadderData?.canChallenge ? (
              <div className="nav-card" onClick={() => setShowChallengesModal(true)}>
                <div className="nav-icon">⚔️</div>
                <h3>My Challenges</h3>
                <p>Manage your challenges and responses</p>
                {pendingCount > 0 ? (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ff4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}
                  >
                    {pendingCount}
                  </div>
                ) : null}
              </div>
            ) : null}

            {userLadderData?.playerId === 'ladder' ? (
              <div className="nav-card" onClick={() => navigateToView('matches')}>
                <div className="nav-icon">🎯</div>
                <h3>My Completed Matches</h3>
                <p>View your completed match history</p>
              </div>
            ) : null}

            <div className="nav-card" onClick={() => setShowPrizePoolModal(true)} style={{ position: 'relative' }}>
              <div className="nav-icon">💰</div>
              <h3>Prize Pools</h3>
              <p>View current prize pools and winners</p>
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8rem',
                color: '#00ff00'
              }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00ff00',
                  animation: 'pulse 2s infinite'
                }}
                />
                Live
              </div>
            </div>

            {userLadderData && selectedLadder ? (
              <div className="nav-card" onClick={() => { void showTournamentInfo(); }} style={{ position: 'relative' }}>
                <div className="nav-icon">🏆</div>
                <h3>Tournament</h3>
                <p>View tournament format and structure</p>
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#8b5cf6',
                  animation: 'pulse 2s infinite'
                }}
                />
              </div>
            ) : null}

            <div className="nav-card" onClick={() => setShowRulesModal(true)}>
              <div className="nav-icon">📋</div>
              <h3>Ladder Rules</h3>
              <p>Read the complete ladder rules</p>
            </div>

            <div className="nav-card" onClick={() => setShowPaymentDashboard(true)}>
              <div className="nav-icon">💳</div>
              <h3>Payment Dashboard</h3>
              <p>Manage credits, membership, and payments</p>
            </div>

            <div className="nav-card" onClick={() => setShowContactAdminModal(true)}>
              <div className="nav-icon">📞</div>
              <h3>Contact Admin</h3>
              <p>Get help with ladder issues</p>
            </div>
          </div>
        )
      ) : null}

      {isAdmin ? (
        <div className="nav-grid nav-grid-admin" style={{ marginTop: '8px' }}>
          <div className="nav-card admin-card" onClick={() => setShowApplicationsManager(true)}>
            <div className="nav-icon">📋</div>
            <h3>Applications</h3>
            <p>Review ladder signup applications</p>
          </div>
          <div className="nav-card admin-card" onClick={() => setShowAdminMessagesModal(true)}>
            <div className="nav-icon">📬</div>
            <h3>Admin Messages</h3>
            <p>View and manage user messages</p>
          </div>
          <div className="nav-card admin-card" onClick={() => navigate('/ladder/admin')}>
            <div className="nav-icon">⚙️</div>
            <h3>Ladder Admin</h3>
            <p>Manage ladder players and settings</p>
          </div>
        </div>
      ) : null}
    </div>
  );
});

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;
