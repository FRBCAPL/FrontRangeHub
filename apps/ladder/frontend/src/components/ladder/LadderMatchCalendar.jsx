import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import { isToday, formatDateForDisplay } from '@shared/utils/utils/dateUtils';
import legendsLogo from '@shared/assets/LBC logo with address.png';
import './LadderMatchCalendar.css';

const LadderMatchCalendar = ({ isOpen, onClose, onPlayerClick }) => {
  console.log('📅 Calendar: Component rendered, isOpen:', isOpen);
  
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check authentication status
  const checkAuthentication = () => {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
    return authStatus;
  };

  // Fetch confirmed matches
  const fetchMatches = async () => {
    console.log('📅 Calendar: fetchMatches called!');
    setLoading(true);
    setError('');
    
    // FORCE CLEAR any cached data first
    setMatches([]);
    
    try {
      console.log('📅 Calendar: Fetching matches from Supabase');
      const result = await supabaseDataService.getScheduledMatches();
      
      if (!result.success) {
        throw new Error(`Failed to fetch matches: ${result.error}`);
      }
      
      const data = result.matches;
      console.log('📅 Calendar: Fetched matches data:', data);
      console.log('📅 Calendar: Total matches found:', data.length);
      
      // Log ALL matches with their IDs and details
      data.forEach((match, index) => {
        console.log(`📅 Calendar: Match ${index + 1}:`, {
          id: match.id,
          player1: match.winner_name,
          player2: match.loser_name,
          scheduledDate: match.match_date,
          completedDate: match.completed_date,
          status: match.status
        });
      });
      
      // Log matches for 9/23 specifically
      const sept23Matches = data.filter(match => {
        const matchDate = new Date(match.match_date || match.completed_date);
        return matchDate.getMonth() === 8 && matchDate.getDate() === 23; // September is month 8
      });
      console.log('📅 Calendar: Matches on 9/23:', sept23Matches);
      
      // Transform data to match expected format (preserve all fields for day modal)
      const transformedMatches = (data || []).map(match => ({
        _id: match.id,
        player1: {
          id: match.winner?.id ?? match.winner_id ?? match.player1?.id,
          email: match.winner?.email ?? match.player1?.email,
          firstName: match.winner_name ? match.winner_name.split(' ')[0] : (match.player1?.firstName || 'TBD'),
          lastName: match.winner_name ? match.winner_name.split(' ').slice(1).join(' ') : (match.player1?.lastName || ''),
          position: match.winner_position ?? match.player1?.position
        },
        player2: {
          id: match.loser?.id ?? match.loser_id ?? match.player2?.id,
          email: match.loser?.email ?? match.player2?.email,
          firstName: match.loser_name ? match.loser_name.split(' ')[0] : (match.player2?.firstName || 'TBD'),
          lastName: match.loser_name ? match.loser_name.split(' ').slice(1).join(' ') : (match.player2?.lastName || ''),
          position: match.loser_position ?? match.player2?.position
        },
        scheduledDate: match.match_date || match.scheduledDate,
        completedDate: match.completed_date || match.completedDate,
        status: match.status,
        location: match.location,
        venue: match.location || match.venue,
        ladder: match.ladder_id,
        matchType: match.match_type || match.matchType || 'challenge',
        gameType: match.game_type || match.gameType || '8-ball',
        raceLength: match.race_length ?? match.raceLength ?? 5,
        notes: match.notes || '',
        winner_position: match.winner_position,
        loser_position: match.loser_position,
        winner_name: match.winner_name,
        loser_name: match.loser_name,
        // Extract time from match_date if it's a full datetime
        scheduledTime: match.match_date && match.match_date.includes('T') 
          ? new Date(match.match_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : null
      }));
      
      // Filter matches to only show appropriate ones for calendar display
      const filteredMatches = transformedMatches.filter(match => {
        // Only show matches that are scheduled or completed
        const validStatuses = ['scheduled', 'completed'];
        if (!validStatuses.includes(match.status)) {
          console.log('📅 Calendar: Filtering out match with invalid status:', match.status, match._id);
          return false;
        }
        
        // Only show matches that have a valid date
        const matchDate = match.scheduledDate || match.completedDate;
        if (!matchDate) {
          console.log('📅 Calendar: Filtering out match with no date:', match._id);
          return false;
        }
        
        // Only show matches that have both players
        if (!match.player1 || !match.player2) {
          console.log('📅 Calendar: Filtering out match with missing players:', match._id);
          return false;
        }
        
        // Calendar filter removed - matches will show normally
        
        return true;
      });
      
      console.log('📅 Calendar: Filtered matches from', data.length, 'to', filteredMatches.length);
      setMatches(filteredMatches);
      console.log('📅 Calendar: setMatches called with:', filteredMatches.length, 'matches');
    } catch (err) {
      console.error('📅 Calendar: Error in fetchMatches:', err);
      setError('Failed to load matches: ' + err.message);
    } finally {
      setLoading(false);
      console.log('📅 Calendar: fetchMatches completed, loading set to false');
    }
  };

  // Check if we're in an iframe and detect mobile
  useEffect(() => {
    const checkIframe = () => {
      // DISABLE IFRAME MODE - Always use regular calendar styling
      setIsInIframe(false);
    };

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIframe();
    checkMobile();
    
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkAuthentication();
      fetchMatches();
    }
  }, [isOpen]);

    // Listen for match updates from other components
    useEffect(() => {
      const handleMatchesUpdated = (event) => {
        console.log('📅 Calendar: Matches updated event received!', event.detail);
        console.log('📅 Calendar: Event type:', event.type);
        console.log('📅 Calendar: Event target:', event.target);
        console.log('📅 Calendar: Refreshing matches...');
        fetchMatches();
      };

      console.log('📅 Calendar: Setting up matchesUpdated event listener');
      window.addEventListener('matchesUpdated', handleMatchesUpdated);
      
      // Test if the event listener is working
      console.log('📅 Calendar: Event listener added to window:', window);
      
      return () => {
        console.log('📅 Calendar: Removing matchesUpdated event listener');
        window.removeEventListener('matchesUpdated', handleMatchesUpdated);
      };
    }, []);

    // Auto-update calendar every 30 seconds when open
    useEffect(() => {
      if (!isOpen) return;

      const autoUpdateInterval = setInterval(() => {
        console.log('📅 Calendar: Auto-updating matches...');
        fetchMatches();
      }, 30000); // Update every 30 seconds

      return () => {
        console.log('📅 Calendar: Clearing auto-update interval');
        clearInterval(autoUpdateInterval);
      };
    }, [isOpen]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Get matches for a specific date
  const getMatchesForDate = (date) => {
    // Use local date string to avoid timezone issues
    const dateStr = date.getFullYear() + '-' + 
                   String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(date.getDate()).padStart(2, '0');
    
    const dayMatches = matches.filter(match => {
      const matchDate = new Date(match.scheduledDate || match.completedDate);
      // Use local date string for comparison to avoid timezone issues
      const matchDateStr = matchDate.getFullYear() + '-' + 
                          String(matchDate.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(matchDate.getDate()).padStart(2, '0');
      return matchDateStr === dateStr;
    });
    console.log('Matches for date:', dateStr, dayMatches);
    return dayMatches;
  };

  // Navigate months
  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
    // Refresh matches when navigating to a new month to catch any updates
    fetchMatches();
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calendarDays = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Determine modal sizing based on context
  const getModalSizing = () => {
    if (isInIframe) {
      return {
        maxWidth: isMobile ? "98vw" : "95vw",
        maxHeight: isMobile ? "95vh" : "90vh",
        width: isMobile ? "98vw" : "95vw",
        height: isMobile ? "95vh" : "90vh"
      };
    } else if (isMobile) {
      return {
        maxWidth: "95vw",
        maxHeight: "90vh",
        width: "95vw",
        height: "90vh"
      };
    } else {
      return {
        maxWidth: "1100px",
        maxHeight: "85vh"
      };
    }
  };

  const modalSizing = getModalSizing();

  return createPortal(
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: isMobile ? '4px' : '8px',
          fontSize: isMobile ? '0.9rem' : '1rem'
        }}>
          <img 
            src={legendsLogo} 
            alt="LEGENDS" 
            style={{ 
              height: isMobile ? '24px' : '32px', 
              width: 'auto',
              verticalAlign: 'middle'
            }} 
          />
          <span style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>Ladder Match Calendar</span>
          <span style={{ fontSize: isMobile ? '18px' : '24px' }}>⚔️</span>
        </div>
      }
      maxWidth={modalSizing.maxWidth}
      maxHeight={modalSizing.maxHeight}
      width={modalSizing.width}
      height={modalSizing.height}
      borderColor="#064e3b"
      glowColor="#8B5CF6"
      textColor="#FFD700"
      className={`glossy-calendar-modal ${isInIframe ? 'iframe-mode' : ''} ${isMobile ? 'mobile-mode' : ''}`}
    >
      <div
        className={`ladder-match-calendar ${isInIframe ? 'iframe-mode' : ''} ${isMobile ? 'mobile-mode' : ''}`}
        style={{
          maxHeight: isInIframe ? 'calc(95vh - 80px)' : isMobile ? 'calc(90vh - 80px)' : 'calc(750px - 100px)',
          overflowY: 'auto',
          padding: isMobile ? '0.2rem' : '0.3rem'
        }}
      >
        {/* Calendar Header */}
        <div className="calendar-header">
          <button 
            className="nav-button"
            onClick={() => navigateMonth(-1)}
          >
            ←
          </button>
          <h2 className="month-year">{monthName}</h2>
          <button 
            className="nav-button"
            onClick={() => navigateMonth(1)}
          >
            →
          </button>
        </div>

        {/* Icon Legend */}
        <div className="calendar-legend" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: isMobile ? '0.3rem' : '0.5rem',
          marginBottom: isMobile ? '0.3rem' : '0.5rem',
          padding: isMobile ? '0.2rem' : '0.3rem',
          fontSize: isMobile ? '0.6rem' : '0.7rem',
          color: '#e0e0e0',
          flexWrap: 'wrap'
        }}>
          <span>👑 #1 Ranked</span>
          <span>⭐ Top 5</span>
          <span>✅ Completed</span>
          <span>🔵 Scheduled</span>
        </div>

        {/* Calendar Grid */}
        <div className={`calendar-grid ${isInIframe ? 'iframe-mode' : ''} ${isMobile ? 'mobile-mode' : ''}`}>
          {/* Day headers */}
          <div className="day-headers">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="day-header">{isMobile ? day.substring(0, 1) : day}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="calendar-days">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isTodayDate = isToday(day);
              const dayMatches = getMatchesForDate(day);
              const isSelected = false; // No longer using selected state in calendar
              const hasMatches = dayMatches.length > 0;

              return (
                <div
                  key={`${day.getTime()}-${matches.length}`}
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isTodayDate ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasMatches ? 'has-matches' : ''} ${!isAuthenticated && hasMatches ? 'login-required' : ''} ${isMobile ? 'mobile-mode' : ''} ${isInIframe ? 'iframe-mode' : ''}`}
                  onClick={() => {
                    if (isAuthenticated) {
                      setSelectedDate(day);
                      setShowMatchesModal(true);
                    } else {
                      // Show a message that login is required
                      setShowLoginMessage(true);
                    }
                  }}
                  title={hasMatches && !isAuthenticated ? 'Login required to view match details' : hasMatches ? 'Click to view match details' : ''}
                >
                  <div className="day-number">{day.getDate()}</div>
                  {hasMatches && (
                    <div className="match-indicator">
                      <span className="match-count">{dayMatches.length}</span>
                    </div>
                  )}
                  {hasMatches && (!isMobile || !isAuthenticated) && (
                    <div className="match-players">
                      {dayMatches.slice(0, 6).map((match, matchIndex) => {
                        
                        // Check if either player is ranked in the top 5 of the ladder using winner_position/loser_position
                        const winnerPosition = match.winner_position ? parseInt(match.winner_position) : null;
                        const loserPosition = match.loser_position ? parseInt(match.loser_position) : null;
                        const isTop5 = (winnerPosition && winnerPosition <= 5) || (loserPosition && loserPosition <= 5);
                        // Check if either player is ranked #1 (first place)
                        const isFirstPlace = winnerPosition === 1 || loserPosition === 1;
                        
                        const isCompleted = match.status === 'completed';
                        
                        
                        // Determine which player is #1 ranked
                        const isPlayer1First = winnerPosition === 1;
                        const isPlayer2First = loserPosition === 1;
                        
                        return (
                          <div key={matchIndex} className={`player-names ${isTop5 ? 'top5-match' : ''} ${isCompleted ? 'completed-match' : 'scheduled-match'} ${isFirstPlace ? 'first-place-match' : ''}`}>
                            <div className="player-name">
                              {match.player1?.firstName || 'TBD'}
                              {isPlayer1First && <span className="crown-icon">  👑</span>}
                            </div>
                            <div className="vs">vs</div>
                            <div className="player-name">
                              {match.player2?.firstName || 'TBD'}
                              {isPlayer2First && <span className="crown-icon">   👑</span>}
                            </div>
                            {isCompleted && <span className="status-icon">  ✅</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>


        {/* Loading and Error States */}
        {loading && (
          <div className="loading-state">
            <p>Loading matches...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>⚠️ {error}</p>
            <button onClick={fetchMatches} className="retry-button">
              Try Again
            </button>
            <button onClick={() => setError('')} className="dismiss-button">
              Dismiss
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-dot has-matches"></div>
            <span>Has matches</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot today"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Day Matches Modal */}
      <DraggableModal
        open={showMatchesModal}
        onClose={() => setShowMatchesModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <img 
              src={legendsLogo} 
              alt="LEGENDS" 
              style={{ 
                height: '50px', 
                width: 'auto',
                verticalAlign: 'middle'
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span>Matches for {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) : ''}</span>
              <span style={{ fontSize: '0.9em', opacity: 0.9 }}>
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </div>
            <span style={{ fontSize: '24px' }}>⚔️</span>
          </div>
        }
        maxWidth="680px"
        maxHeight="580px"
        borderColor="#064e3b"
        glowColor="#8B5CF6"
        textColor="#FFD700"
        className="glossy-calendar-modal"
      >
        <div className="day-matches-modal">
          {selectedDate && (
            <>
              {getMatchesForDate(selectedDate).length > 0 ? (
                <div className="matches-list">
                  {getMatchesForDate(selectedDate).map((match, index) => {
                    const p1Position = match.player1?.position ?? match.winner_position;
                    const p2Position = match.player2?.position ?? match.loser_position;
                    const isPlayer1First = parseInt(p1Position) === 1;
                    const isPlayer2First = parseInt(p2Position) === 1;
                    const handlePlayerClick = (player) => {
                      if (onPlayerClick && player) {
                        setShowMatchesModal(false);
                        onPlayerClick({
                          id: player.id,
                          email: player.email,
                          firstName: player.firstName,
                          lastName: player.lastName,
                          position: player.position,
                          ladderName: match.ladder // For stats lookup when match is from different ladder
                        });
                      }
                    };
                    return (
                    <div key={match._id || index} className="match-item">
                      <div className="match-players">
                        <div
                          className={`player-section ${onPlayerClick ? 'clickable' : ''}`}
                          role={onPlayerClick ? 'button' : undefined}
                          tabIndex={onPlayerClick ? 0 : undefined}
                          onClick={onPlayerClick ? () => handlePlayerClick(match.player1) : undefined}
                          onKeyDown={onPlayerClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlayerClick(match.player1); } } : undefined}
                        >
                          <span className="player-role challenger">⚔️ Challenger</span>
                          <div className="player-name-row">
                            <span className="player-name">{match.player1?.firstName} {match.player1?.lastName}{isPlayer1First && <span className="crown-icon"> 👑</span>}</span>
                            <span className="player-rank">#{p1Position ?? '—'}</span>
                          </div>
                        </div>
                        <span className="vs">vs</span>
                        <div
                          className={`player-section ${onPlayerClick ? 'clickable' : ''}`}
                          role={onPlayerClick ? 'button' : undefined}
                          tabIndex={onPlayerClick ? 0 : undefined}
                          onClick={onPlayerClick ? () => handlePlayerClick(match.player2) : undefined}
                          onKeyDown={onPlayerClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlayerClick(match.player2); } } : undefined}
                        >
                          <span className="player-role defender">🛡️ Defender</span>
                          <div className="player-name-row">
                            <span className="player-name">{match.player2?.firstName} {match.player2?.lastName}{isPlayer2First && <span className="crown-icon"> 👑</span>}</span>
                            <span className="player-rank">#{p2Position ?? '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="match-details">
                        <span className="match-type">{match.matchType ? String(match.matchType).replace(/\b\w/g, c => c.toUpperCase()) : 'Challenge'}</span>
                        <span className="game-race">• {match.gameType || '8-ball'} • Race to {match.raceLength ?? 5}</span>
                        {match.venue && <span className="venue">📍 {match.venue}</span>}
                        {match.scheduledTime && <span className="time">🕐 {match.scheduledTime}</span>}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-matches">No matches scheduled for this date</p>
              )}
            </>
          )}
        </div>
      </DraggableModal>

      {/* Login Required Message Modal */}
      <DraggableModal
        open={showLoginMessage}
        onClose={() => setShowLoginMessage(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🔒</span>
            <span>Login Required</span>
          </div>
        }
        maxWidth="600px"
        maxHeight="500px"
        borderColor="#ef4444"
        glowColor="#ef4444"
        textColor="#ffffff"
        className="login-required-modal"
      >
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#e0e0e0',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h3 style={{ 
            color: '#ffffff', 
            marginBottom: '1rem',
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}>
            Must be a registered user to see match data
          </h3>
          <p style={{ 
            color: '#d0d0d0', 
            marginBottom: '1.5rem',
            lineHeight: '1.5'
          }}>
            Please log in to your account to view detailed match information and history.
          </p>
          <button
            onClick={() => setShowLoginMessage(false)}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
            }}
          >
            Got it
          </button>
        </div>
      </DraggableModal>
    </DraggableModal>,
    document.body
  );
};

export default LadderMatchCalendar;
