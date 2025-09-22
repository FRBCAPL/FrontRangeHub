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

const Homepage = () => {
  const navigate = useNavigate();
  const [showPublicLadderView, setShowPublicLadderView] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
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
                    <span className="feature-tag vegas-tag">1 in 12 Teams Win a Trip to Las Vegas!</span>
                  </div>
                  <div className="feature-tag-row">
                    <span className="feature-tag vegas-tag">All things USAPL in one place</span>
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
                
                <div className="nav-card-features">
                <div className="feature-tag-row">
                <span className="feature-tag hub-highlight-tag">Access to Front Range BCA Singles Pool League</span>
                </div>
              </div>
                
                <div className="nav-card-features">
                  <div className="feature-tag-row">
                    <span className="feature-tag">Seperate and Independent Singles Formats</span>
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
                <img src={cuelessLogo} alt="Cueless Logo" className="cueless-logo" />
              </div>
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

        {/* Footer Section */}
        <footer className="homepage-footer">
          <p>Welcome to the Front Range Pool Hub - Your comprehensive pool management platform</p>
        </footer>
      </div>

      {/* Public Ladder View Modal */}
      {showPublicLadderView && (
        <DraggableModal
          open={showPublicLadderView}
          onClose={() => setShowPublicLadderView(false)}
          title="📊 Ladder Rankings - Public View"
          maxWidth="1000px"
          maxHeight="90vh"
          borderColor="#8A8A8A"
          textColor="#000000"
          glowColor="#8B5CF6"
          style={{
            maxHeight: '85vh',
            height: '85vh',
            overflowY: 'auto'
          }}
        >
          <div className="public-ladder-view">
            {/* Public View Notice */}
            <div style={{
              background: 'rgba(229, 62, 62, 0.1)',
              border: '1px solid rgba(229, 62, 62, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <span style={{
                color: '#e53e3e',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                👁️ Public View - Anyone can view the ladder rankings
              </span>
            </div>
            
            <LadderApp
              playerName="Guest"
              playerLastName="User"
              senderEmail="guest@frontrangepool.com"
              userPin="GUEST"
              onLogout={() => setShowPublicLadderView(false)}
              isAdmin={false}
              showClaimForm={false}
              initialView="ladders"
              isPublicView={true}
              onClaimLadderPosition={() => {}}
              claimedPositions={[]}
              isPositionClaimed={() => false}
            />
          </div>
        </DraggableModal>
      )}

      {/* Calendar Modal */}
      <LadderMatchCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
      />
    </div>
  );
};

export default Homepage;
