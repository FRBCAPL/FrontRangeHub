import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';
import frontRangeLogo from '../assets/logo.png';
import usaplLogo from '../assets/usapl_logo.png';
import CuelessCubeLogo from './CuelessCubeLogo';
import LadderApp from '@apps/ladder/frontend/src/components/ladder/LadderApp';
import LadderMatchCalendar from '@apps/ladder/frontend/src/components/ladder/LadderMatchCalendar';
import StandaloneLadderModal from './guest/StandaloneLadderModal';
import SupabaseSignupModal from './auth/SupabaseSignupModal';
import ContactAdminModal from '@apps/ladder/frontend/src/components/ladder/ContactAdminModal.jsx';
import MatchSchedulingModal from './modal/MatchSchedulingModal';
import LadderIntroModal from '@shared/components/modal/modal/LadderIntroModal';
import TournamentBannerAll from '@shared/components/tournament/TournamentBannerAll';
import HomeAppLauncher from './HomeAppLauncher.jsx';
import HomeDuezyBanner from './HomeDuezyBanner.jsx';
import { DuezyLearnMoreModal, DuezyWhatIsModal } from './DuezyIntroModals.jsx';
import useBreakAndRunTile from './useBreakAndRunTile.jsx';
import useArcadeNewScoreBadge from './useArcadeNewScoreBadge.js';
import useConsignmentNewBadge from './useConsignmentNewBadge.js';
import { TRAP_EM_PATH, TRAP_EM_SUBTITLE, TRAP_EM_TITLE } from '@apps/hub/frontend/src/components/games/trapEmContent.js';
import { CONSIGNMENT_BETA, CONSIGNMENT_PATH } from '@apps/consignment/frontend/src/data/consignmentConstants.js';
import HomepageTournamentListModal from '@shared/components/tournament/HomepageTournamentListModal.jsx';
import { loadHomepageTournamentBanner } from '@shared/components/tournament/homepageTournamentBannerData.js';
import { LADDER_ONE_LINER } from '@shared/utils/utils/ladderEntryCopy.js';
import {
  CUELESS_FEATURED_FACEBOOK_REEL,
  CUELESS_FULL_MATCH_PLAYLIST_URL,
} from '@shared/utils/utils/cuelessFeaturedMedia.js';
import { CASH_CLIMB_GUIDE_HASH } from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/cashClimbGuideRoute.js';
import { CASH_CLIMB_SUBMIT_HASH } from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/cashClimbSubmit.js';
import { rememberLoginReturn } from '@apps/tournament-bracket/frontend/src/components/tournament/tournamentOperators.js';

const CUESYNC_URL = 'https://www.cuesync.us';

const Homepage = ({ canRunTournament = false }) => {
  const navigate = useNavigate();
  const arcadeNewScoreBadge = useArcadeNewScoreBadge();
  const consignmentNewBadge = useConsignmentNewBadge();
  const [showPublicLadderView, setShowPublicLadderView] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  const [showMatchScheduling, setShowMatchScheduling] = useState(false);
  const [showWhatIsDuezyModal, setShowWhatIsDuezyModal] = useState(false);
  const [showDuezyModal, setShowDuezyModal] = useState(false);
  const [showWhatIsLadderModal, setShowWhatIsLadderModal] = useState(false);
  const [showLadderLearnMoreModal, setShowLadderLearnMoreModal] = useState(false);
  const [publicTournamentListOpen, setPublicTournamentListOpen] = useState(false);
  const [publicTournamentListLoading, setPublicTournamentListLoading] = useState(false);
  const [publicTournamentListItems, setPublicTournamentListItems] = useState([]);
  const [publicTournamentListTitle, setPublicTournamentListTitle] = useState('Current tournaments');
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [logoDragStart, setLogoDragStart] = useState({ x: 0, y: 0 });
  const [isInIframe, setIsInIframe] = useState(false);
  const breakAndRun = useBreakAndRunTile(navigate);

  const handleNavigateToHub = () => {
    navigate('/ladder');
  };

  const handleLadderPlayerLogin = (e) => {
    e.stopPropagation();
    navigate('/ladder');
  };

  const handleLadderNewPlayer = (e) => {
    e.stopPropagation();
    navigate('/ladder', { state: { openSignup: true } });
  };

  const handleViewLadder = (e) => {
    e.stopPropagation();
    setShowPublicLadderView(true);
  };

  const handleMatchCalendar = (e) => {
    e.stopPropagation();
    setShowCalendar(true);
  };

  const handleNavigateToUSAPool = () => {
    navigate('/usapl');
  };

  const handleNavigateToTournamentBracket = (e) => {
    e?.stopPropagation?.();
    rememberLoginReturn('/tournament-bracket');
    navigate('/tournament-bracket');
  };

  const handleTournamentCardClick = async (e) => {
    e?.stopPropagation?.();
    if (canRunTournament) {
      handleNavigateToTournamentBracket(e);
      return;
    }
    setPublicTournamentListOpen(true);
    setPublicTournamentListLoading(true);
    setPublicTournamentListItems([]);
    setPublicTournamentListTitle('Current tournaments');
    try {
      const next = await loadHomepageTournamentBanner();
      const items = next.hasLive ? next.items.filter((item) => item.live) : next.items;
      setPublicTournamentListItems(items);
      setPublicTournamentListTitle(next.hasLive ? 'Live tournaments' : 'Current tournaments');
    } catch (err) {
      console.error('Public tournament list fetch error:', err);
      setPublicTournamentListItems([]);
    } finally {
      setPublicTournamentListLoading(false);
    }
  };

  const handlePickPublicTournament = (item) => {
    setPublicTournamentListOpen(false);
    if (item?.path) navigate(item.path);
  };

  const handleNavigateToCashClimbGuide = (e) => {
    e?.stopPropagation?.();
    navigate(CASH_CLIMB_GUIDE_HASH);
  };

  const handleNavigateToCashClimbSubmit = (e) => {
    e?.stopPropagation?.();
    navigate(CASH_CLIMB_SUBMIT_HASH);
  };

  const handleNavigateToEstateIt = () => {
    navigate('/estateit');
  };

  const handleNavigateToDuesTracker = () => {
    // Navigate directly to the static HTML file to avoid React Router interference
    window.location.href = '/dues-tracker/index.html';
  };

  const handleNavigateToArcade = (tab = 'find') => {
    navigate(`/arcade/kiosk?tab=${tab}`);
  };

  const handleNavigateToArcadeTab = (e, tab) => {
    e.stopPropagation();
    handleNavigateToArcade(tab);
  };

  const handleWhatIsDuezy = (e) => {
    e.stopPropagation(); // Prevent banner click (navigate)
    setShowWhatIsDuezyModal(true);
  };

  const handleStartDuezy = () => {
    setShowWhatIsDuezyModal(false);
    setShowDuezyModal(false);
    navigate('/duezy');
  };

  const handleWhatIsDuezyLearnMore = () => {
    setShowWhatIsDuezyModal(false);
    setShowDuezyModal(true);
  };

  const handleWhatIsLadder = (e) => {
    e?.stopPropagation?.();
    setShowWhatIsLadderModal(true);
  };

  const handleWhatIsLadderLearnMore = () => {
    setShowWhatIsLadderModal(false);
    setShowLadderLearnMoreModal(true);
  };

  const openExternal = (url) => (e) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const featuredTiles = [
    {
      id: 'usapl',
      icon: <img src={usaplLogo} alt="" className="hal-logo" />,
      title: 'Front Range USA Pool League',
      blurb: 'Sign up, standings, schedules, and dues. \n All in one place.',
      highlight: '1 in 12 Teams Win a Trip to Las Vegas!',
      accent: '#e53e3e',
      onOpen: handleNavigateToUSAPool,
      actions: [
        { label: 'Sign up', onClick: () => navigate('/usapl/signup') },
        { label: 'Divisions', onClick: () => navigate('/usapl/divisions') },
        { label: 'Pay dues', onClick: () => navigate('/usapl/dues') },
        { label: 'Vegas Cup', onClick: () => navigate('/usapl/vegas-cup') },
      ],
    },
    {
      id: 'ladder',
      icon: <img src={frontRangeLogo} alt="" className="hal-logo" />,
      title: 'Ladder of Legends',
      blurb: LADDER_ONE_LINER,
      highlight: 'Singles · Flexible schedule · BCAPL sanctioned',
      accent: '#a855f7',
      onOpen: handleNavigateToHub,
      actions: [
        { label: 'Player login', onClick: handleLadderPlayerLogin },
        { label: 'New player? Start here', onClick: handleLadderNewPlayer },
        { label: 'What is it?', onClick: handleWhatIsLadder },
        { label: 'View the ladder', onClick: handleViewLadder },
        { label: 'Schedule a match', onClick: () => setShowMatchScheduling(true) },
        { label: 'Calendar', onClick: handleMatchCalendar },
      ],
    },
    {
      id: 'consignment',
      icon: '🏪',
      title: 'FRPL Consignment',
      blurb: 'Cues, cases and gear for sale by local players\nat Legends.',
      highlight: 'Shop the case · Bid online · Sell your gear',
      accent: '#e53e3e',
      badge: CONSIGNMENT_BETA ? 'Beta' : 'New',
      newBadge: consignmentNewBadge || undefined,
      onOpen: () => navigate(`${CONSIGNMENT_PATH}/home`),
      actions: [
        { label: 'How it works', onClick: () => navigate(`${CONSIGNMENT_PATH}/home`) },
        { label: 'Browse', onClick: () => navigate(CONSIGNMENT_PATH) },
        { label: 'Sell', onClick: () => navigate(`${CONSIGNMENT_PATH}/sell`) },
      ],
    },
  ];

  const poolTiles = [
    {
      id: 'tournaments',
      icon: '🏆',
      title: 'Tournaments',
      blurb: 'Cash Climb, single & double elimination.',
      accent: '#22c55e',
      onOpen: () => handleTournamentCardClick(),
      actions: [
        { label: 'Cash Climb', onClick: handleNavigateToCashClimbGuide },
        { label: 'Submit result', onClick: handleNavigateToCashClimbSubmit },
      ],
    },
    breakAndRun.tile,
    {
      id: 'trap-em',
      icon: <span className="hal-eightball"><span>8</span></span>,
      title: TRAP_EM_TITLE,
      blurb: TRAP_EM_SUBTITLE,
      accent: '#38bdf8',
      badge: 'New',
      onOpen: () => navigate(TRAP_EM_PATH),
      actions: [
        { label: 'How to play', onClick: () => navigate(`${TRAP_EM_PATH}?section=how`) },
        { label: 'Rules', onClick: () => navigate(`${TRAP_EM_PATH}?section=rules`) },
      ],
    },
  ];

  const otherTiles = [
    {
      id: 'cueless',
      icon: <CuelessCubeLogo />,
      title: 'Cueless in the Booth',
      blurb: 'Live-streamed pool, broadcast style.',
      accent: '#22c55e',
      onOpen: () => navigate('/cueless'),
      actions: [
        { label: 'Clips', onClick: openExternal(CUELESS_FEATURED_FACEBOOK_REEL) },
        { label: 'Streams', onClick: openExternal(CUELESS_FULL_MATCH_PLAYLIST_URL) },
        { label: 'Book Cueless Now!', onClick: (e) => { e.stopPropagation(); navigate('/cueless?section=book'); } },
      ],
    },
    {
      id: 'arcade',
      icon: '🎮',
      title: 'Legends Arcade',
      blurb: 'Find any of 410 games on the Legends cabinet.',
      accent: '#f472b6',
      badge: arcadeNewScoreBadge || undefined,
      badgeVariant: 'arcade',
      onOpen: () => handleNavigateToArcade('find'),
      actions: [
        { label: 'Game Finder', onClick: (e) => handleNavigateToArcadeTab(e, 'find') },
        { label: 'High Scores', onClick: (e) => handleNavigateToArcadeTab(e, 'leaderboards') },
        { label: 'Submit Score', onClick: (e) => handleNavigateToArcadeTab(e, 'submit') },
      ],
    },
    {
      id: 'cuesync',
      icon: '📋',
      title: 'CueSync',
      blurb: 'Pool hall table management. Import league nights once; tables assign themselves.',
      accent: '#2dd4bf',
      badge: 'Beta',
      onOpen: () => window.open(CUESYNC_URL, '_blank', 'noopener,noreferrer'),
      actions: [
        { label: 'Demo', onClick: openExternal(CUESYNC_URL) },
        { label: 'Sign in', onClick: openExternal(CUESYNC_URL) },
      ],
    },
  ];

  const handleCameraMouseDown = (e) => {
    e.stopPropagation(); // Prevent card click
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cameraPosition.x,
      y: e.clientY - cameraPosition.y
    });
  };

  const handleCameraMouseMove = (e) => {
    if (!isDragging) return;
    setCameraPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleCameraMouseUp = () => {
    setIsDragging(false);
  };

  const handleLogoMouseDown = (e) => {
    e.stopPropagation(); // Prevent card click
    setIsLogoDragging(true);
    setLogoDragStart({
      x: e.clientX - logoPosition.x,
      y: e.clientY - logoPosition.y
    });
  };

  const handleLogoMouseMove = (e) => {
    if (!isLogoDragging) return;
    setLogoPosition({
      x: e.clientX - logoDragStart.x,
      y: e.clientY - logoDragStart.y
    });
  };

  const handleLogoMouseUp = () => {
    setIsLogoDragging(false);
  };

  useEffect(() => {
    // Check if we're running in an iframe
    const checkIfInIframe = () => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    };
    
    setIsInIframe(checkIfInIframe());

    if (isDragging) {
      document.addEventListener('mousemove', handleCameraMouseMove);
      document.addEventListener('mouseup', handleCameraMouseUp);
    }
    if (isLogoDragging) {
      document.addEventListener('mousemove', handleLogoMouseMove);
      document.addEventListener('mouseup', handleLogoMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleCameraMouseMove);
      document.removeEventListener('mouseup', handleCameraMouseUp);
      document.removeEventListener('mousemove', handleLogoMouseMove);
      document.removeEventListener('mouseup', handleLogoMouseUp);
    };
  }, [isDragging, dragStart, isLogoDragging, logoDragStart]);

  return (
    <div className={`homepage ${isInIframe ? 'iframe-mode' : ''}`}>
      {/* Live / upcoming tournaments — full viewport width; collapses when empty */}
      <div className="home-tournament-banner-wrap">
        <TournamentBannerAll />
      </div>

      <h2 className="section-title">Choose Your Destination</h2>

      <div className="homepage-container">
        {/* Main Navigation Cards */}
        <div className="homepage-navigation">
          <HomeAppLauncher featured title="" tiles={featuredTiles} />
          <HomeDuezyBanner onOpen={() => navigate('/duezy')} onWhatIs={handleWhatIsDuezy} />
          <div className="hal-row">
            <HomeAppLauncher tiles={poolTiles} />
            <HomeAppLauncher title="Beyond the Table" tiles={otherTiles} />
          </div>
        </div>

        {/* Footer Section */}
        <footer className="homepage-footer">
          <button type="button" className="homepage-footer-app" onClick={handleNavigateToEstateIt}>
            <span aria-hidden="true">🗄️</span> Estate Vault
          </button>
          <button type="button" className="homepage-footer-app homepage-footer-app--itemsure" onClick={() => navigate('/itemsure')}>
            <span aria-hidden="true">📦</span> ItemSure
          </button>
          <button type="button" className="homepage-footer-app homepage-footer-app--duezy" onClick={handleNavigateToDuesTracker}>
            <span aria-hidden="true">💰</span> FRUSAPL Dues Tracker
          </button>
          <p>Thanks for visiting www.frontrangepool.com</p>
        </footer>
      </div>

      {breakAndRun.modal}
      {publicTournamentListOpen ? (
        <HomepageTournamentListModal
          title={publicTournamentListTitle}
          items={publicTournamentListItems}
          loading={publicTournamentListLoading}
          onClose={() => setPublicTournamentListOpen(false)}
          onPick={handlePickPublicTournament}
        />
      ) : null}

      {/* Public Ladder View Modal */}
      <StandaloneLadderModal
        isOpen={showPublicLadderView}
        onClose={() => setShowPublicLadderView(false)}
        onSignup={() => setShowSignupForm(true)}
      />

      {/* Calendar Modal */}
      <LadderMatchCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
      />

      {/* Supabase Signup/Claim Modal (Join the Ladder flow) */}
      <SupabaseSignupModal 
        isOpen={showSignupForm}
        onClose={() => setShowSignupForm(false)}
        onContactAdmin={() => setShowContactAdminModal(true)}
        onSuccess={(data) => {
          console.log('Signup successful:', data);
          setShowSignupForm(false);
          // You can add any success handling here
        }}
      />

      {/* Contact Admin Modal */}
      <ContactAdminModal
        isOpen={showContactAdminModal}
        onClose={() => setShowContactAdminModal(false)}
      />

      {/* Match Scheduling Modal */}
      <MatchSchedulingModal
        isOpen={showMatchScheduling}
        onClose={() => setShowMatchScheduling(false)}
      />

      {/* What is the Ladder? intro modal – compact */}
      {showWhatIsLadderModal && (
        <div
          className="what-is-ladder-overlay"
          onClick={() => setShowWhatIsLadderModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="What is the Ladder of Legends?"
        >
          <div className="what-is-ladder-box" onClick={(e) => e.stopPropagation()}>
            <div className="what-is-ladder-header">
              <h2 className="what-is-ladder-title">What is the Ladder of Legends?</h2>
              <button
                type="button"
                className="what-is-ladder-close"
                onClick={() => setShowWhatIsLadderModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="what-is-ladder-body">
              <p>
                The Ladder of Legends is a BCAPL singles pool league with skill-based brackets and a dynamic ranking system.
                <br />
                Challenge players above you to climb the ladder, play matches anywhere, and compete for prizes every 3 months.
              </p>
              <div className="what-is-ladder-actions">
                <button
                  type="button"
                  className="what-is-ladder-learn-btn"
                  onClick={handleWhatIsLadderLearnMore}
                >
                  Learn more
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ladder Learn More – full features intro */}
      <LadderIntroModal
        isOpen={showLadderLearnMoreModal}
        onClose={() => setShowLadderLearnMoreModal(false)}
        onViewLadder={() => setShowPublicLadderView(true)}
      />

      <DuezyWhatIsModal
        open={showWhatIsDuezyModal}
        onClose={() => setShowWhatIsDuezyModal(false)}
        onLearnMore={handleWhatIsDuezyLearnMore}
        onStart={handleStartDuezy}
      />

      <DuezyLearnMoreModal
        open={showDuezyModal}
        onClose={() => setShowDuezyModal(false)}
        onStart={handleStartDuezy}
      />
    </div>
  );
};

export default Homepage;
