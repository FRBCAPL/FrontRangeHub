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
    <div style={{
      position: isMobile ? 'relative' : 'absolute',
      top: isMobile ? 'auto' : '5px',
      right: isMobile ? 'auto' : '5px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: '#fff',
      padding: isMobile ? '5px 8px' : '8px 12px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      fontSize: isMobile ? '0.72rem' : '0.85rem',
      fontFamily: 'monospace',
      zIndex: 10,
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      maxWidth: isMobile ? '172px' : 'none',
      whiteSpace: 'nowrap',
      margin: isMobile ? '0 auto 8px auto' : '0'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: isMobile ? '0' : '2px', color: '#10b981' }}>
        {formatTime(currentTime)}
      </div>
      {!isMobile && (
        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
          {formatDate(currentTime)}
        </div>
      )}
      {isMobile && (
        <div style={{ fontSize: '0.6rem', opacity: 0.85, marginTop: '1px' }}>
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
  isAdmin = false
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
    <div className="ladder-header-section" style={{ position: 'relative' }}>
      {/* Local Clock - Top Right */}
      <LocalClock isMobile={isMobile} />
      
      {/* Back to Ladder Home Button - Top Left */}
      {!isPublicView && currentView !== 'main' && (
        <button 
          onClick={() => setCurrentView('main')}
          style={{
            position: 'absolute',
            top: isMobile ? '40px' : '5px',
            left: '5px',
            background: 'transparent',
            color: '#8B5CF6',
            border: '2px solid #8B5CF6',
            borderRadius: '6px',
            padding: isMobile ? '5px 10px' : '6px 12px',
            fontSize: isMobile ? '0.72rem' : '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(139, 92, 246, 0.1)';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
          }}
        >
          🏠 Back to Ladder Home
        </button>
      )}
      
      {/* Calendar Button - Above Title */}
      <div className="calendar-button-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '1rem' 
      }}>
        <button 
          className="calendar-button"
          onClick={() => setShowMatchCalendar(true)}
          style={{
            background: 'transparent',
            color: '#10b981',
            border: '2px solid #10b981',
            borderRadius: '6px',
            padding: '12px 36px',
            fontSize: '1.2rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            zIndex: 10
          }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(16, 185, 129, 0.1)';
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
        }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
          }}
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
