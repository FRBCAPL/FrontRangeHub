import React from 'react';
import './EmbedLanding.css';
import './Homepage.css';
import bcaplLogo from '../assets/bcapl_logo.png';
import frontRangeLogo from '../assets/logo.png';
import cuelessLogo from '../assets/Culess pic.jpg';

/**
 * Embed-only landing for frusapl.com / GoDaddy iframe.
 * Two cards (Hub + Cueless), Duezy banner, top ladder buttons.
 * All links open frontrangepool.com in a new tab so they work from the embed.
 */
const EmbedLanding = () => {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const hubUrl = `${base}/#/hub`;
  const ladderUrl = `${base}/#/ladder`;
  const cuelessUrl = `${base}/#/cueless`;
  const duesTrackerUrl = `${base}/dues-tracker/index.html`;

  return (
    <div className="embed-landing homepage">
      <h2 className="section-title">Choose Your Destination</h2>

      {/* Quick Action Buttons – open in new tab */}
      <div className="quick-actions">
        <a
          href={ladderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="quick-action-button view-ladder-btn"
        >
          View The Ladder of Legends
        </a>
        <a
          href={hubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="quick-action-button match-scheduling-btn"
        >
          Schedule A Ladder Match
        </a>
        <a
          href={ladderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="quick-action-button calendar-btn"
        >
          Ladder of Legends Calendar
        </a>
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
              <div className="nav-card-logos">
                <img src={cuelessLogo} alt="Cueless Logo" className="cueless-logo cueless-logo-left" />
                <img src={cuelessLogo} alt="Cueless Logo" className="cueless-logo cueless-logo-right" />
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

          {/* Duezy banner – opens Dues Tracker in new tab */}
          <a
            href={duesTrackerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dues-tracker-banner embed-landing-duezy"
          >
            <span className="dues-tracker-banner-icon" aria-hidden="true">💰</span>
            <div className="dues-tracker-banner-content">
              <h2>Duezy</h2>
              <p>Dues tracking made easy</p>
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
          </a>
        </div>

        <footer className="homepage-footer">
          <p>Thanks for visiting www.frontrangepool.com</p>
        </footer>
      </div>
    </div>
  );
};

export default EmbedLanding;
