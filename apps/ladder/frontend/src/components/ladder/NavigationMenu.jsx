import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import tournamentService from '@shared/services/services/tournamentService';
import { getCurrentPhase } from '@shared/utils/utils/phaseSystem.js';

const NavigationMenu = memo(({
  isPublicView,
  navigateToView,
  userLadderData,
  handleSmartMatch,
  setCurrentView,
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
  setShowTournamentRegistrationModal,
  setShowTournamentInfoModal,
  onJoinAssignedLadder
}) => {
  const navigate = useNavigate();
  const isFreePhase = userLadderData?.phaseInfo?.isFree ?? getCurrentPhase().isFree;
  
  // Debug logging
  console.log('🔍 NavigationMenu - isPublicView:', isPublicView);

  const showTournamentInfo = async () => {
    console.log('🏆 Tournament info card clicked');
    try {
      // Try to fetch actual tournament data first
      const result = await tournamentService.getUpcomingTournament(selectedLadder);
      if (result.success && result.data) {
        console.log('🏆 Found actual tournament:', result.data);
        setSelectedTournament(result.data);
        setShowTournamentInfoModal(true);
      } else {
        console.log('🏆 No tournament found, showing generic info');
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
      <div className="nav-grid">
        {/* Getting Started / Help - first only when not yet "Got it" */}
        {!isPublicView && setShowOnboardingHelp && !gettingStartedAtEnd && (
          <div className="nav-card onboarding-help-card" onClick={() => setShowOnboardingHelp(true)}>
            <div className="nav-icon">📖</div>
            <h3>Getting Started</h3>
            <p>New? Open the help guide</p>
          </div>
        )}

        {/* Row 1: View Ladders, Match Calendar, Smart Match */}
        {!isPublicView && (
          <div className="nav-card" onClick={() => navigateToView('ladders')}>
            <div className="nav-icon">📊</div>
            <h3>View Ladders</h3>
            <p>See all ladder positions and rankings</p>
          </div>
        )}
        
        <div className="nav-card" onClick={() => {
          console.log('📅 NavigationMenu: Match Calendar clicked, opening calendar');
          setShowMatchCalendar(true);
        }}>
          <div className="nav-icon">📅</div>
          <h3>Match Calendar</h3>
          <p>View confirmed matches and schedule</p>
        </div>
        
        {!isPublicView && userLadderData?.canChallenge && (
          <div className="nav-card" onClick={handleSmartMatch}>
            <div className="nav-icon">🧠</div>
            <h3>Smart Match</h3>
            <p>AI-powered challenge suggestions</p>
          </div>
        )}
        
        {/* Row 2: My Challenges, Report Match, My Completed Matches */}
        {!isPublicView && userLadderData?.canChallenge && (
          <div className="nav-card" onClick={() => setShowChallengesModal(true)}>
            <div className="nav-icon">⚔️</div>
            <h3>My Challenges</h3>
            <p>Manage your challenges and responses</p>
            {pendingChallenges.length > 0 && (
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
              }}>
                {pendingChallenges.length}
              </div>
            )}
          </div>
        )}
        
        {!isPublicView && (
          <div className="nav-card" onClick={() => setShowMatchReportingModal(true)}>
            <div className="nav-icon">🏓</div>
            <h3>Report Match</h3>
            <p>Report match results and pay fees</p>
          </div>
        )}
        
        {!isPublicView && userLadderData?.playerId === 'ladder' && (
          <div className="nav-card" onClick={() => navigateToView('matches')}>
            <div className="nav-icon">🎯</div>
            <h3>My Completed Matches</h3>
            <p>View your completed match history</p>
          </div>
        )}
        
        {/* Row 3: Prize Pools, Tournament, Ladder Rules */}
        <div className="nav-card" onClick={() => setShowPrizePoolModal(true)} style={{ position: 'relative' }}>
          <div className="nav-icon">💰</div>
          <h3>Prize Pools</h3>
          <p>View current prize pools and winners</p>
          
          {/* Live Update Indicator */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.8rem',
            color: '#00ff00'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00ff00',
              animation: 'pulse 2s infinite'
            }}></div>
            Live
          </div>
        </div>
        
        {/* Tournament Card - Show for active ladder players */}
        {!isPublicView && userLadderData && selectedLadder && (
          <div className="nav-card" onClick={() => {
            showTournamentInfo();
          }} style={{ position: 'relative' }}>
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
            }}></div>
          </div>
        )}
        
        <div className="nav-card" onClick={() => setShowRulesModal(true)}>
          <div className="nav-icon">📋</div>
          <h3>Ladder Rules</h3>
          <p>Read the complete ladder rules</p>
        </div>
        
        {/* Row 4: Payment Dashboard, Contact Admin */}
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
        
        {!userLadderData?.canChallenge && userLadderData?.playerId !== 'guest' && (
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
              cursor: 'pointer'
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
        )}

        {/* Getting Started at end (after "Got it") - last before admin cards */}
        {!isPublicView && setShowOnboardingHelp && gettingStartedAtEnd && (
          <div className="nav-card onboarding-help-card" onClick={() => setShowOnboardingHelp(true)}>
            <div className="nav-icon">📖</div>
            <h3>Getting Started</h3>
            <p>Open the help guide</p>
          </div>
        )}

        {/* Admin Buttons */}
        {isAdmin && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
});

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;
