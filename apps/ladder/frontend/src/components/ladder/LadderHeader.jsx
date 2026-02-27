import React, { memo, useState, useEffect } from 'react';

// Local Clock Component
const LocalClock = memo(({ isMobile = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date: Day, Month DD, YYYY (desktop) / short compact (mobile)
  const formatDate = (date, mobile = false) => {
    const options = mobile
      ? { weekday: 'short', month: 'numeric', day: 'numeric' }
      : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  // Format time: HH:MM:SS AM/PM
  const formatTime = (date) => {
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`ladder-local-clock ${isMobile ? 'is-mobile' : ''}`}>
      <div className={`ladder-local-clock-time ${isMobile ? 'is-mobile' : ''}`}>
        {formatTime(currentTime)}
      </div>
      {!isMobile && (
        <div className="ladder-local-clock-date">
          {formatDate(currentTime)}
        </div>
      )}
      {isMobile && (
        <div className="ladder-local-clock-date is-mobile">
          {formatDate(currentTime, true)}
        </div>
      )}
    </div>
  );
});

LocalClock.displayName = 'LocalClock';

const LadderHeader = memo(({ 
  selectedLadder, 
  setSelectedLadder, 
  setHasManuallySelectedLadder,
  currentView,
  setCurrentView,
  isPublicView,
  setShowMatchCalendar,
  isAdmin = false,
  isActualAdmin = false,
  viewAsUser = false,
  onToggleUserView,
  showUserViewInHeader = true
}) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const getLadderDisplayName = (ladderName) => {
    switch (ladderName) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      case 'simulation': return '🎮 Simulation';
      default: return ladderName;
    }
  };

  return (
    <div className="ladder-header-section">
      {/* Local Clock - Top Right */}
      <LocalClock isMobile={isMobile} />

      {/* Admin: User view / Admin view toggle - only in header when not shown in nav (showUserViewInHeader) */}
      {showUserViewInHeader && !isPublicView && isActualAdmin && onToggleUserView && (
        <button
          type="button"
          onClick={onToggleUserView}
          className="ladder-user-view-btn"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(139, 92, 246, 0.6)',
            background: viewAsUser ? 'rgba(34, 197, 94, 0.25)' : 'rgba(139, 92, 246, 0.25)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            zIndex: 10
          }}
          title={viewAsUser ? 'Switch back to admin view' : 'See the app as a normal user would'}
        >
          {viewAsUser ? '👤 Admin view' : '👤 User view'}
        </button>
      )}
      
      {/* Back to Ladder Home Button - Top Left */}
      {!isPublicView && currentView !== 'main' && (
        <button 
          className="ladder-back-home-btn"
          onClick={() => setCurrentView('main')}
        >
          🏠 Back to Ladder Home
        </button>
      )}
      
      {/* Calendar Button - Above Title */}
      <div className="calendar-button-container">
        <button 
          className="calendar-button"
          onClick={() => setShowMatchCalendar(true)}
        >
          📅 Match Calendar
        </button>
      </div>
      
      <h1 className="ladder-main-title" style={{ 
        color: '#000000',
        WebkitTextStroke: '0.5px #8B5CF6',
        textShadow: '0 0 20px rgba(139, 92, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.2)',
        fontWeight: 'bold',
        fontSize: '3.5rem',
        letterSpacing: '3px',
        fontFamily: '"Bebas Neue", "Orbitron", "Exo 2", "Arial Black", sans-serif',
        textTransform: 'uppercase',
        marginBottom: '0rem'
      }}>Ladder of Legends</h1>
      <p className="ladder-subtitle" style={{ marginBottom: '1.5rem', marginTop: '0rem', fontSize: '0.9rem' }}>Tournament Series</p>
      
      {/* Ladder Selector */}
      <div className="ladder-selector" style={{
        marginTop: '1rem',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <label style={{ 
          color: '#fff', 
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontSize: '0.9rem'
        }}>Select Ladder:</label>
        <select 
          value={selectedLadder} 
          onChange={(e) => {
            setSelectedLadder(e.target.value);
            setHasManuallySelectedLadder(true);
          }}
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '0.5rem 0.8rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            minWidth: '120px',
            flexShrink: 0
          }}
        >
          <option value="499-under">499 & Under</option>
          <option value="500-549">500-549</option>
          <option value="550-plus">550+</option>
          {isAdmin && <option value="simulation">🎮 Simulation</option>}
          {isAdmin && <option value="test-ladder">🧪 Test Ladder</option>}
        </select>
      </div>
      
      <h2 className="ladder-selection-title" style={{ 
        color: '#8B5CF6',
        WebkitTextStroke: '1.5px #000000',
        textShadow: '0 0 8px rgba(139, 92, 246, 0.7)',
        fontWeight: 'bold',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontSize: '2rem',
        marginBottom: '0rem',
        marginTop: '1rem',
        fontFamily: '"Orbitron", "Exo 2", "Rajdhani", "Arial Black", sans-serif'
      }}>{getLadderDisplayName(selectedLadder)}</h2>
      <p className="ladder-selection-subtitle" style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>Current rankings and positions</p>
    </div>
  );
});

LadderHeader.displayName = 'LadderHeader';

export default LadderHeader;
