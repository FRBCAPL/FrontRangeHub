import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';
import bcaplLogo from '../assets/bcapl_logo.png';
import frontRangeLogo from '../assets/logo.png';
import usaplLogo from '../assets/usapl_logo.png';
import usaplNationalsLogo from '../assets/usapl_nationals_logo_color.png';
import fargorateLogo from '../assets/fargorate-logo.png';
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
import HomepageTournamentListModal from '@shared/components/tournament/HomepageTournamentListModal.jsx';
import { loadHomepageTournamentBanner } from '@shared/components/tournament/homepageTournamentBannerData.js';
import RotatingFeatureBadge from './RotatingFeatureBadge';
import { LADDER_ONE_LINER } from '@shared/utils/utils/ladderEntryCopy.js';
import {
  CUELESS_TAGLINE,
  CUELESS_CARD_BLURB,
  CUELESS_FEATURED_FACEBOOK_REEL,
  CUELESS_FULL_MATCH_PLAYLIST_URL,
} from '@shared/utils/utils/cuelessFeaturedMedia.js';
import { CASH_CLIMB_GUIDE_HASH } from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/cashClimbGuideRoute.js';
import { CASH_CLIMB_SUBMIT_HASH } from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/cashClimbSubmit.js';
import { rememberLoginReturn } from '@apps/tournament-bracket/frontend/src/components/tournament/tournamentOperators.js';

const USAPL_HIGHLIGHT_BADGES = [
  'All things USAPL in one place',
  '1 in 12 Teams Win a Trip to Las Vegas!',
];

const USAPL_FEATURE_BADGES = [
  'Team Play',
  'Structured Format',
  'Scheduled Opponents',
  'Assigned Locations',
  'Dual Sanctioned',
  'Official Rules',
  'Registration',
  'Information',
  'Resources',
];

const LADDER_FEATURE_BADGES = [
  'Singles Play',
  'Flexible Schedule',
  'Play Anyday/Anywhere',
  'BCAPL Sanctioned',
  'Registration',
  'Player Tools',
  'Statistics',
];

const CUELESS_PROMO_LINES = ['Got game?', 'Want it streamed?', 'We got you covered!'];

const CUELESS_FEATURE_BADGES = [
  'Live Streaming',
  'At Legends Brews & Cues',
  'On-Location Available',
  'Equipment Provided',
  '"Expert" Commentary',
  'Unfiltered & Real',
  'No League or Ladder Membership Required',
];

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
    // Open Front Range USA Pool League website in new tab
    window.open('https://frusapl.com', '_blank');
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

  const handleNavigateToArcadeTv = (e) => {
    e.stopPropagation();
    window.location.href = '/arcade/tv';
  };

  const handleWhatIsDuezy = (e) => {
    e.stopPropagation(); // Prevent banner click (navigate)
    setShowWhatIsDuezyModal(true);
  };

  const handleDuezyLearnMore = (e) => {
    e.stopPropagation(); // Prevent banner click (navigate)
    setShowDuezyModal(true);
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
          <div className="nav-cards">
            {/* USA Pool Website Card */}
            <div className="nav-card usapool-card" onClick={handleNavigateToUSAPool}>
              <div className="nav-card-logos">
                <img src={bcaplLogo} alt="BCAPL Logo" className="league-logo" />
                <img src={frontRangeLogo} alt="Front Range Logo" className="league-logo" />
                <img src={fargorateLogo} alt="Fargorate Logo" className="league-logo" />
                <img src={usaplLogo} alt="USAPL Logo" className="league-logo" />
                <img src={usaplNationalsLogo} alt="USAPL Nationals Logo" className="league-logo" />
              </div>
              <div className="nav-card-content">
                <h2>Front Range USA Pool League</h2>
                <p>Click here to go to the Front Range USA Pool League website.</p>
                <div className="nav-card-features">
                  <div className="feature-tag-row usapool-highlight-row">
                    <RotatingFeatureBadge
                      id="vegas-trip-tag"
                      className="feature-tag vegas-tag"
                      items={USAPL_HIGHLIGHT_BADGES}
                      intervalMs={5500}
                    />
                  </div>
                  <div className="feature-tag-row usapool-chips-row">
                    <RotatingFeatureBadge
                      className="feature-tag"
                      items={USAPL_FEATURE_BADGES}
                      intervalMs={4800}
                    />
                  </div>
                </div>
                {/* Bottom logos for iframe - BCA and National Championship */}
                <div className="bottom-logos">
                  <img src={bcaplLogo} alt="BCAPL Logo" className="bottom-logo" />
                  <img src={usaplNationalsLogo} alt="USAPL Nationals Logo" className="bottom-logo" />
                </div>
              </div>
              <div className="nav-card-arrow">↗</div>
            </div>

            {/* Ladder Card */}
            <div
              className="nav-card hub-card ladder-home-card"
              onClick={handleNavigateToHub}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleNavigateToHub()}
            >
              <div className="nav-card-logos ladder-home-logos">
                <img src={frontRangeLogo} alt="Front Range Logo" className="league-logo ladder-home-logo-left" />
                <img src={bcaplLogo} alt="BCAPL Logo" className="league-logo ladder-home-logo-right" />
              </div>
              <div className="nav-card-content hub-card-ladder-content">
                <div className="hub-card-ladder-heading">
                  <h2>Ladder of Legends</h2>
                  <p className="hub-card-ladder-pitch">{LADDER_ONE_LINER}</p>
                </div>
                <div className="ladder-entry-ctas" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="ladder-entry-cta primary" onClick={handleLadderPlayerLogin}>
                    Player login / <br />Ladder Access
                  </button>
                  <button type="button" className="ladder-entry-cta secondary" onClick={handleLadderNewPlayer}>
                    New player? <br />Start here
                  </button>
                </div>
                <div className="ladder-home-tags">
                  <RotatingFeatureBadge
                    className="feature-tag ladder-rotating-badge"
                    items={LADDER_FEATURE_BADGES}
                    intervalMs={3400}
                  />
                </div>
                <div className="ladder-home-page-btns" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="quick-action-button what-is-ladder-btn" onClick={handleWhatIsLadder}>
                    What is the Ladder of Legends?
                  </button>
                  <button type="button" className="quick-action-button view-ladder-btn" onClick={handleViewLadder}>
                    View The Ladder of Legends
                  </button>
                  <button type="button" className="quick-action-button match-scheduling-btn" onClick={() => setShowMatchScheduling(true)}>
                    Schedule A Ladder Match
                  </button>
                  <button type="button" className="quick-action-button calendar-btn" onClick={handleMatchCalendar}>
                    Ladder of Legends Calendar
                  </button>
                </div>
                <p className="hub-card-ladder-tap">Or tap anywhere else on this card to open the ladder app</p>
              </div>
              <div className="nav-card-arrow">→</div>
            </div>

            {/* Cueless in the Booth – 4-sided rotating cube logos */}
            <div
              className="nav-card future-card cueless-card cueless-home-card"
              onClick={() => navigate('/cueless')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/cueless')}
            >
              <div className="nav-card-logos cueless-cube-logos">
                <div className="cueless-cube cueless-cube-left">
                  <div className="cueless-cube-inner">
                    <div className="cueless-cube-face front"><img src={cuelessLogo} alt="" /></div>
                    <div className="cueless-cube-face right"><img src={cuelessLogo} alt="" /></div>
                    <div className="cueless-cube-face back"><img src={cuelessLogo} alt="" /></div>
                    <div className="cueless-cube-face left"><img src={cuelessLogo} alt="" /></div>
                  </div>
                </div>
                <div className="cueless-cube cueless-cube-right">
                  <div className="cueless-cube-inner">
                    <div className="cueless-cube-face front"><img src={cuelessLogo} alt="" /></div>
                    <div className="cueless-cube-face right"><img src={cuelessLogo} alt="" /></div>
                    <div className="cueless-cube-face back"><img src={cuelessLogo} alt="" /></div>
                    <div className="cueless-cube-face left"><img src={cuelessLogo} alt="" /></div>
                  </div>
                </div>
              </div>
              <div className="cueless-clapper-icon">🎬</div>
              <div className="cueless-camera-icon">🎥</div>
                <div className="nav-card-content">
                  <h2>Cueless in the Booth</h2>
                  <RotatingFeatureBadge
                    className="feature-tag cueless-highlight-tag cueless-promo-badge"
                    items={CUELESS_PROMO_LINES}
                    intervalMs={2200}
                    ariaHidden
                  />
                  <div className="cueless-home-highlights">
                    <span className="feature-tag cueless-highlight-tag">{CUELESS_TAGLINE}</span>
                  </div>
                  <p>{CUELESS_CARD_BLURB}</p>
                  <div
                    className="cueless-card-watch"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="group"
                    aria-label="Watch featured Cueless clips"
                  >
                    <a
                      href={CUELESS_FEATURED_FACEBOOK_REEL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cueless-watch-link cueless-watch-link--fb"
                    >
                      More clips on Facebook
                    </a>
                    <a
                      href={CUELESS_FULL_MATCH_PLAYLIST_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cueless-watch-link cueless-watch-link--yt"
                    >
                      Full streams on YouTube
                    </a>
                  </div>
                  <div className="nav-card-features cueless-home-features">
                    <RotatingFeatureBadge
                      className="feature-tag cueless-highlight-tag cueless-rotating-badge"
                      items={CUELESS_FEATURE_BADGES}
                      intervalMs={2600}
                    />
                  </div>
                </div>
            </div>

          </div>

          <div
            className="tournament-banner"
            onClick={handleTournamentCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleTournamentCardClick(e)}
          >
            <span className="tournament-banner-icon" aria-hidden="true">🏆</span>
            <div className="tournament-banner-content">
              <h2>Tournaments</h2>
              <p>Cash Climb, single elimination, and double elimination.</p>
              <div
                className="tournament-banner-tags"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="group"
                aria-label="Tournament shortcuts"
              >
                <button type="button" className="tournament-banner-tag-btn" onClick={handleNavigateToCashClimbGuide}>
                  How Cash Climb works
                </button>
                <button type="button" className="tournament-banner-tag-btn" onClick={handleNavigateToCashClimbSubmit}>
                  Submit a result
                </button>
                {canRunTournament ? (
                  <button type="button" className="tournament-banner-tag-btn" onClick={handleNavigateToTournamentBracket}>
                    Run event
                  </button>
                ) : null}
              </div>
            </div>
            <span className="tournament-banner-arrow">→</span>
          </div>

          {/* Dues Tracker – wide banner below the 3 cards */}
          <div className="dues-tracker-banner" onClick={handleNavigateToDuesTracker}>
            <span className="dues-tracker-banner-icon" aria-hidden="true">💰</span>
            <div className="dues-tracker-banner-content">
              <h2>Duezy</h2>
              <p>Dues tracking made easy</p>
              <div className="dues-tracker-banner-actions">
                <button type="button" className="dues-tracker-banner-learn-btn" onClick={handleWhatIsDuezy}>
                  What is Duezy?
                </button>
              </div>
              <div className="dues-tracker-banner-tags">
                <span className="feature-tag dues-highlight-tag">League operator tools</span>
                <span className="feature-tag">Financial Breakdowns</span>
                <span className="feature-tag">Export &amp; Reports</span>
                <span className="feature-tag">FargoRate Import</span>
                <span className="feature-tag">Dues &amp; Payments</span>
                <span className="feature-tag">Sanction Fees</span>
              </div>
            </div>
            <span className="dues-tracker-banner-arrow">→</span>
          </div>

          {/* Arcade – game finder & leaderboards at Legends */}
          <div
            className="arcade-banner"
            onClick={handleNavigateToArcade}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigateToArcade()}
          >
            <span className="arcade-banner-icon" aria-hidden="true">🎮</span>
            <div className="arcade-banner-content">
              <h2>Legends Brews &amp; Cues Arcade</h2>
              <p>Find any game on our arcade cabinet — search 410 titles by name</p>
              <div
                className="arcade-banner-tags"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="group"
                aria-label="Arcade shortcuts"
              >
                <button
                  type="button"
                  className="arcade-banner-tag-btn"
                  onClick={(e) => handleNavigateToArcadeTab(e, 'find')}
                >
                  Game Finder
                </button>
                <button
                  type="button"
                  className="arcade-banner-tag-btn"
                  onClick={(e) => handleNavigateToArcadeTab(e, 'leaderboards')}
                >
                  High Scores
                </button>
                <button
                  type="button"
                  className="arcade-banner-tag-btn"
                  onClick={(e) => handleNavigateToArcadeTab(e, 'find')}
                >
                  410 Games
                </button>
                <button
                  type="button"
                  className="arcade-banner-tag-btn arcade-banner-tag-btn--tv"
                  onClick={handleNavigateToArcadeTv}
                >
                  Wall TV Leaderboard
                </button>
              </div>
            </div>
            <span className="arcade-banner-arrow">→</span>
          </div>
        </div>

        {/* EstateIt — estate inventory (not a league promo) */}
        <div className="legends-tracker-small estateit-home-link">
          <button className="legends-tracker-small-btn estateit-home-btn" onClick={handleNavigateToEstateIt}>
            Estate Vault
          </button>
        </div>

        {/* Footer Section */}
        <footer className="homepage-footer">
          <p>Thanks for visiting www.frontrangepool.com</p>
        </footer>
      </div>

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
