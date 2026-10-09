import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';
import frontRangeLogo from '../assets/logo.png';
import usaplLogo from '../assets/usapl_logo.png';
import cuelessLogo from '../assets/Culess pic.jpg';
import DraggableModal from './modal/DraggableModal';
import LadderApp from '@apps/ladder/frontend/src/components/ladder/LadderApp';
import LadderMatchCalendar from '@apps/ladder/frontend/src/components/ladder/LadderMatchCalendar';
import StandaloneLadderModal from './guest/StandaloneLadderModal';
import SupabaseSignupModal from './auth/SupabaseSignupModal';
import ContactAdminModal from '@apps/ladder/frontend/src/components/ladder/ContactAdminModal.jsx';
import MatchSchedulingModal from './modal/MatchSchedulingModal';
import LadderIntroModal from '@shared/components/modal/modal/LadderIntroModal';
import TournamentBannerAll from '@shared/components/tournament/TournamentBannerAll';
import HomeAppLauncher from './HomeAppLauncher.jsx';
import useBreakAndRunTile from './useBreakAndRunTile.jsx';
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
      blurb: 'Sign up, standings, schedules, and dues — all in one place.',
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
      icon: '🎱',
      title: 'FRPL Consignment',
      blurb: 'Cues & gear for sale at Legends.',
      highlight: 'Shop the case · Bid online · Sell your gear',
      accent: '#e53e3e',
      badge: CONSIGNMENT_BETA ? 'Beta' : 'New',
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
      id: 'cueless',
      icon: <img src={cuelessLogo} alt="" className="hal-logo hal-logo--photo" />,
      title: 'Cueless in the Booth',
      blurb: 'Live-streamed pool, broadcast style.',
      accent: '#22c55e',
      onOpen: () => navigate('/cueless'),
      actions: [
        { label: 'Clips', onClick: openExternal(CUELESS_FEATURED_FACEBOOK_REEL) },
        { label: 'Streams', onClick: openExternal(CUELESS_FULL_MATCH_PLAYLIST_URL) },
      ],
    },
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
      id: 'arcade',
      icon: '🎮',
      title: 'Legends Arcade',
      blurb: 'Find any of 410 games on the Legends cabinet.',
      accent: '#f472b6',
      onOpen: () => handleNavigateToArcade('find'),
      actions: [
        { label: 'Game Finder', onClick: (e) => handleNavigateToArcadeTab(e, 'find') },
        { label: 'High Scores', onClick: (e) => handleNavigateToArcadeTab(e, 'leaderboards') },
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
    {
      id: 'duezy',
      icon: '💰',
      title: 'Duezy',
      blurb: 'Dues & payments for league operators.',
      accent: '#818cf8',
      onOpen: handleNavigateToDuesTracker,
      actions: [
        { label: 'What is it?', onClick: handleWhatIsDuezy },
        { label: 'Log in', onClick: handleNavigateToDuesTracker },
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

      {/* What is Duezy? intro modal – custom compact modal (no DraggableModal so height stays content-sized) */}
      {showWhatIsDuezyModal && (
        <div
          className="what-is-duezy-overlay"
          onClick={() => setShowWhatIsDuezyModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="What is Duezy?"
        >
          <div
            className="what-is-duezy-box"
            onClick={e => e.stopPropagation()}
          >
            <div className="what-is-duezy-header">
              <h2 className="what-is-duezy-title">What is Duezy?</h2>
              <button
                type="button"
                className="what-is-duezy-close"
                onClick={() => setShowWhatIsDuezyModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="what-is-duezy-body">
              <p>
                Duezy is a dues-tracking app for league operators.<br />
                 You can track who&apos;s paid, who&apos;s behind, and more. <br />
                 Record payments (Cash, Venmo, Cash App, Check, etc.).<br />
                 See where the money goes<br />
                 (prize fund, sanction fees, league income). <br />
                 Import divisions and teams from FargoRate LMS, and export or backup your data.
              </p>
              <div className="what-is-duezy-actions">
                <button
                  type="button"
                  className="dues-tracker-banner-learn-btn"
                  onClick={handleWhatIsDuezyLearnMore}
                >
                  Learn more
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Duezy Learn More Modal */}
      <DraggableModal
        open={showDuezyModal}
        onClose={() => setShowDuezyModal(false)}
        title="Discover Duezy - Making Dues Easy!"
        borderColor="#6366f1"
        glowColor="#6366f1"
        textColor="#fff"
        maxWidth="640px"
      >
        <div style={{ padding: '0.75rem 1.25rem', maxHeight: '85vh', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>
            Stop chasing. Start knowing.
          </h3>
          <p style={{ margin: '0 0 0.6rem 0', fontSize: '1rem', lineHeight: 1.4, color: '#c7d2fe' }}>
            Duezy gives league operators a single place to see who&apos;s paid, who&apos;s behind, and more. <br />See where every dollar goes—no spreadsheets, no guesswork.
          </p>
          <div style={{ marginBottom: '0.6rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a5b4fc' }}>
              What you get
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.55, color: '#e0e7ff', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.75rem', listStylePosition: 'inside' }}>
              {/* Left column: dues-related */}
              <li><strong>Know who&apos;s behind—instantly.</strong> See teams owed, amounts due, and payment history at a glance.</li>
              {/* Right column: division builder */}
              <li><strong>Smart builder for LMS Leagues.</strong> League Operator account required. Import divisions and teams from LMS reports websites.</li>
              <li><strong>Record payments in seconds.</strong> Paid, bye week, makeup—one click. No digging through spreedsheets or emails.</li>
              <li><strong>Custom division builder.</strong> Create/edit divisions with custom dues rates, players/matches-per-week, and much more.</li>
              <li><strong>Custom payment methods.</strong> Cash, Venmo, Cash App, check, you name it.</li>
              <li><strong>Easily add/edit teams.</strong> Add teams, add players, edit team names, assign captain, and more.</li>
              <li><strong>See where the money goes.</strong> Prize fund, sanction fees, league income, parent org—all broken down automatically.</li>
              {/* Right column: export/archive/report */}
              <li><strong>Date range reports.</strong> View expected, collected, and owed dues for any date range.</li>
              <li><strong>Sanction fees, done right.</strong> Track which players are sanctioned, who&apos;s paid, and what you owe.</li>
              <li><strong>Archive teams.</strong> Preserve history when a team drops—restore later if they return.</li>
              <li><strong>Enable individual player payments.</strong> Split a week&apos;s dues across multiple players—or enter amounts per player.</li>
              <li><strong>Export, backup, report.</strong> CSV, Excel, PDF. Full backups. </li>
            </ul>
          </div>
          <div style={{ marginBottom: '0.6rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a5b4fc' }}>
              Built to fit your league
            </p>
            <p style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', lineHeight: 1.4, color: '#e0e7ff' }}>
              Duezy adapts to how you run things—not the other way around.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.55, color: '#e0e7ff', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.75rem', listStylePosition: 'inside' }}>
              <li><strong>Customize per division.</strong> Dues rates, players-per-week, matches-per-week—each division can have its own setup. <br /><strong><center>DUEZY is designed to fit your league.</center></strong></li>
              <li><strong>Your way to split dues.</strong> User default settings or customize each division. Percentage-based (prize fund %, org %) or fixed dollar amounts per team or per player.</li>
              <li><strong>Custom org labels.</strong> Name your first and second organization (e.g. &quot;Home Office&quot;, &quot;National&quot;) so reports make sense.</li>
              <li><strong>Double-play support.</strong> Combine and track teams in two divisions at once. One payment entry for both divisions.</li>
              <li><strong>Division colors.</strong> Color-code divisions in the teams table so you can scan at a glance.</li>
              <li><strong>Dark or light mode.</strong> Use what works for you.</li>              
            </ul><center><strong> ~ Try DUEZY Today~ <br />MAKE DUES EASY!</strong></center>
          </div>
          <div style={{ padding: '0.6rem 1rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.35)' }}>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#e0e7ff' }}>
              <a href="/dues-tracker/index.html" className="duezy-learn-more-signup-link">
                Get started free—sign up with Google or email.
              </a>
            </p>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#a5b4fc' }}>
              Built by league operators for league operators. Ditch the spreadsheets and start knowing.
            </p>
          </div>
        </div>
      </DraggableModal>
    </div>
  );
};

export default Homepage;
