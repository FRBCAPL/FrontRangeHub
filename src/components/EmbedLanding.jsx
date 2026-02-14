import React, { useState } from 'react';
import './EmbedLanding.css';
import './Homepage.css';
import bcaplLogo from '../assets/bcapl_logo.png';
import frontRangeLogo from '../assets/logo.png';
import cuelessLogo from '../assets/Culess pic.jpg';
import StandaloneLadderModal from './guest/StandaloneLadderModal';
import MatchSchedulingModal from './modal/MatchSchedulingModal';
import LadderMatchCalendar from '@apps/ladder/frontend/src/components/ladder/LadderMatchCalendar';
import DraggableModal from './modal/DraggableModal';
import LadderIntroModal from '@shared/components/modal/modal/LadderIntroModal';

/**
 * Embed-only landing for frusapl.com / GoDaddy iframe.
 * Two cards (Hub + Cueless), Duezy banner, top ladder buttons open modals.
 */
const EmbedLanding = () => {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const hubUrl = `${base}/#/hub`;
  const cuelessUrl = `${base}/#/cueless`;
  const duesTrackerUrl = `${base}/dues-tracker/index.html`;

  const [showLadderModal, setShowLadderModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showWhatIsDuezyModal, setShowWhatIsDuezyModal] = useState(false);
  const [showDuezyModal, setShowDuezyModal] = useState(false);
  const [showWhatIsLadderModal, setShowWhatIsLadderModal] = useState(false);
  const [showLadderLearnMoreModal, setShowLadderLearnMoreModal] = useState(false);

  return (
    <div className="embed-landing homepage">
      <h2 className="section-title">Choose Your Destination</h2>

      {/* Quick Action Buttons – open modals (same as main landing) */}
      <div className="quick-actions quick-actions-row-1">
        <button
          type="button"
          className="quick-action-button view-ladder-btn"
          onClick={() => setShowLadderModal(true)}
        >
          View The Ladder of Legends
        </button>
        <button
          type="button"
          className="quick-action-button match-scheduling-btn"
          onClick={() => setShowScheduleModal(true)}
        >
          Schedule A Ladder Match
        </button>
        <button
          type="button"
          className="quick-action-button calendar-btn"
          onClick={() => setShowCalendarModal(true)}
        >
          Ladder of Legends Calendar
        </button>
      </div>
      <div className="quick-actions quick-actions-row-2">
        <button
          type="button"
          className="quick-action-button what-is-ladder-btn"
          onClick={() => setShowWhatIsLadderModal(true)}
        >
          What is the Ladder?
        </button>
      </div>

      <div className="homepage-container embed-landing-container">
        <div className="homepage-navigation">
          <div className="nav-cards embed-landing-cards">
            {/* The Hub Card */}
            <a
              href={hubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-card hub-card embed-landing-card"
            >
              <div className="nav-card-logos">
                <img src={frontRangeLogo} alt="Front Range Logo" className="league-logo" />
                <img src={bcaplLogo} alt="BCAPL Logo" className="league-logo" />
              </div>
              <div className="nav-card-features">
                <div className="feature-tag-row">
                  <span className="feature-tag hub-highlight-tag">Access to the Ladder of Legends</span>
                </div>
              </div>
              <div className="nav-card-content">
                <div className="hub-ladder-tag-mobile">
                  <span className="feature-tag hub-highlight-tag">Access to the Ladder of Legends</span>
                </div>
                <h2>The Hub</h2>
                <p>One place to access both singles play formats.</p>
                <div className="nav-card-features">
                  <div className="feature-tag-row">
                    <span className="feature-tag hub-highlight-tag">Access to Front Range BCA Singles Pool League</span>
                  </div>
                </div>
                <div className="nav-card-features">
                  <div className="feature-tag-row">
                    <span className="feature-tag independent-formats-tag">Seperate and Independent Singles Formats</span>
                  </div>
                  <div className="feature-tag-row">
                    <span className="feature-tag">Singles Play</span>
                    <span className="feature-tag">Flexible Schedule</span>
                    <span className="feature-tag">Play Anyday/Anywhere</span>
                    <span className="feature-tag">BCAPL Sanctioned</span>
                    <span className="feature-tag">Registration</span>
                    <span className="feature-tag">Player Tools</span>
                    <span className="feature-tag">Statistics</span>
                  </div>
                </div>
              </div>
              <div className="nav-card-arrow">→</div>
            </a>

            {/* Cueless in the Booth */}
            <a
              href={cuelessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-card future-card cueless-card embed-landing-card"
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
                <div className="cueless-flashing-tag">
                  <span className="line-1">Got game?</span>
                  <span className="line-2">Want it streamed?</span>
                  <span className="line-3">We got you covered!</span>
                </div>
                <p>Live stream your pool matches with... "commentary" 😅</p>
                <p>Book a match to be Live Streamed at Legends Brews & Cues</p>
                <p>Have Cueless come to your event</p>
                <div className="nav-card-features">
                  <div className="feature-tag-row">
                    <span className="feature-tag">Live Streaming</span>
                    <span className="feature-tag">At Legends Brews & Cues</span>
                    <span className="feature-tag">On-Location Available</span>
                    <span className="feature-tag">Equipment Provided</span>
                    <span className="feature-tag">"Expert" Commentary</span>
                    <span className="feature-tag">Unfiltered & Real</span>
                    <span className="feature-tag">No League or Ladder Membership Required</span>
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* Duezy banner – opens Dues Tracker in new tab; "What is Duezy?" opens modal */}
          <div
            className="dues-tracker-banner embed-landing-duezy"
            onClick={() => window.open(duesTrackerUrl, '_blank')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && window.open(duesTrackerUrl, '_blank')}
            style={{ cursor: 'pointer' }}
          >
            <span className="dues-tracker-banner-icon" aria-hidden="true">💰</span>
            <div className="dues-tracker-banner-content">
              <h2>Duezy</h2>
              <p>Dues tracking made easy</p>
              <div className="dues-tracker-banner-actions">
                <button
                  type="button"
                  className="dues-tracker-banner-learn-btn"
                  onClick={(e) => { e.stopPropagation(); setShowWhatIsDuezyModal(true); }}
                >
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
        </div>
      </div>

      {/* Ladder / schedule / calendar modals – work inside the iframe */}
      <StandaloneLadderModal
        isOpen={showLadderModal}
        onClose={() => setShowLadderModal(false)}
        onSignup={() => window.open(`${base}/#/`, '_blank')}
      />
      <MatchSchedulingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />
      <LadderMatchCalendar
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      />

      {/* What is the Ladder? intro modal */}
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
                  onClick={() => { setShowWhatIsLadderModal(false); setShowLadderLearnMoreModal(true); }}
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
        onViewLadder={() => setShowLadderModal(true)}
      />

      {/* What is Duezy? intro modal */}
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
            onClick={(e) => e.stopPropagation()}
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
                  onClick={() => { setShowWhatIsDuezyModal(false); setShowDuezyModal(true); }}
                >
                  Learn more
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <li><strong>Know who&apos;s behind—instantly.</strong> See teams owed, amounts due, and payment history at a glance.</li>
              <li><strong>Smart builder for LMS Leagues.</strong> League Operator account required. Import divisions and teams from LMS reports websites.</li>
              <li><strong>Record payments in seconds.</strong> Paid, bye week, makeup—one click. No digging through spreedsheets or emails.</li>
              <li><strong>Custom division builder.</strong> Create/edit divisions with custom dues rates, players/matches-per-week, and much more.</li>
              <li><strong>Custom payment methods.</strong> Cash, Venmo, Cash App, check, you name it.</li>
              <li><strong>Easily add/edit teams.</strong> Add teams, add players, edit team names, assign captain, and more.</li>
              <li><strong>See where the money goes.</strong> Prize fund, sanction fees, league income, parent org—all broken down automatically.</li>
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
            </ul>
            <center><strong> ~ Try DUEZY Today~ <br />MAKE DUES EASY!</strong></center>
          </div>
          <div style={{ padding: '0.6rem 1rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.35)' }}>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#e0e7ff' }}>
              <a href={duesTrackerUrl} target="_blank" rel="noopener noreferrer" className="duezy-learn-more-signup-link">
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

export default EmbedLanding;
