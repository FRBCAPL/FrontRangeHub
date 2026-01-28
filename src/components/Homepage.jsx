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
import LadderApp from './ladder/LadderApp';
import LadderMatchCalendar from './ladder/LadderMatchCalendar';
import StandaloneLadderModal from './guest/StandaloneLadderModal';
import SupabaseSignupModal from './auth/SupabaseSignupModal';
import MatchSchedulingModal from './modal/MatchSchedulingModal';

const Homepage = () => {
  const navigate = useNavigate();
  const [showPublicLadderView, setShowPublicLadderView] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showMatchScheduling, setShowMatchScheduling] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [logoDragStart, setLogoDragStart] = useState({ x: 0, y: 0 });
  const [isInIframe, setIsInIframe] = useState(false);

  const handleNavigateToHub = () => {
    console.log('Navigating to /hub');
    navigate('/hub');
  };

  const handleNavigateToUSAPool = () => {
    // Open Front Range USA Pool League website in new tab
    window.open('https://frusapl.com', '_blank');
  };

  const handleNavigateToLegendsTracker = () => {
    // Navigate to Legends Pool League Tracker within the app
    navigate('/legends-tracker');
  };

  const handleNavigateToDuesTracker = () => {
    // Navigate directly to the static HTML file to avoid React Router interference
    window.location.href = '/dues-tracker/index.html';
  };

  const handleViewLadder = (e) => {
    e.stopPropagation(); // Prevent the card click
    // Open the public ladder view modal
    setShowPublicLadderView(true);
  };

  const handleMatchCalendar = (e) => {
    e.stopPropagation(); // Prevent the card click
    // Open the calendar modal
    setShowCalendar(true);
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
      <h2 className="section-title">Choose Your Destination</h2>

      {/* Quick Action Buttons */}
      <div className="quick-actions">
        <button className="quick-action-button view-ladder-btn" onClick={handleViewLadder}>
          View The Ladder of Legends
        </button>
        <button className="quick-action-button match-scheduling-btn" onClick={() => setShowMatchScheduling(true)}>
          Schedule A Ladder Match
        </button>
        <button className="quick-action-button calendar-btn" onClick={handleMatchCalendar}>
          Ladder of Legends Calendar
        </button>
        
      </div>

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
                  <div className="feature-tag-row">
                    <span className="feature-tag vegas-tag">All things USAPL in one place</span>
                  </div>
                  <div className="feature-tag-row">
                    <span className="feature-tag vegas-tag" id="vegas-trip-tag">1 in 12 Teams Win a Trip to Las Vegas!</span>
                  </div>
                  <div className="feature-tag-row">
                    <span className="feature-tag">Team Play</span>
                    <span className="feature-tag">Structured Format</span>
                    <span className="feature-tag">Scheduled Opponents</span>
                    <span className="feature-tag">Assigned Locations</span>
                    <span className="feature-tag">Dual Sanctioned</span>
                    <span className="feature-tag">Official Rules</span>
                    <span className="feature-tag">Registration</span>
                    <span className="feature-tag">Information</span>
                    <span className="feature-tag">Resources</span>
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

            {/* The Hub Card */}
            <div className="nav-card hub-card" onClick={handleNavigateToHub}>
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
                {/* MOBILE ONLY - Access to the Ladder of Legends */}
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
            </div>

            {/* Cueless in the Booth */}
            <div className="nav-card future-card cueless-card" onClick={() => navigate('/cueless')}>
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
            </div>

          </div>

          {/* Dues Tracker – wide banner below the 3 cards */}
          <div className="dues-tracker-banner" onClick={handleNavigateToDuesTracker}>
            <span className="dues-tracker-banner-icon" aria-hidden="true">💰</span>
            <div className="dues-tracker-banner-content">
              <h2>Dues Tracker</h2>
              <p>For league operators. Track dues, payments, sanction fees, and financials.</p>
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

        {/* Small Legends Tracker Button */}
        <div className="legends-tracker-small">
          <button className="legends-tracker-small-btn" onClick={handleNavigateToLegendsTracker}>
            🏠 Legends Tracker
          </button>
        </div>

        {/* Footer Section */}
        <footer className="homepage-footer">
          <p>Thanks for visiting www.frontrangepool.com</p>
        </footer>
      </div>

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

      {/* Supabase Signup/Claim Modal */}
      <SupabaseSignupModal 
        isOpen={showSignupForm}
        onClose={() => setShowSignupForm(false)}
        onSuccess={(data) => {
          console.log('Signup successful:', data);
          setShowSignupForm(false);
          // You can add any success handling here
        }}
      />

      {/* Match Scheduling Modal */}
      <MatchSchedulingModal
        isOpen={showMatchScheduling}
        onClose={() => setShowMatchScheduling(false)}
      />
    </div>
  );
};

export default Homepage;
