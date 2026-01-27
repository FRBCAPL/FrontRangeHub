import React, { useState, useEffect } from 'react';
import { format, differenceInDays, differenceInHours, isAfter, isBefore } from 'date-fns';
import { seasonService } from '@shared/services/services/seasonService.js';
import { BACKEND_URL } from '@shared/config/config.js';

import Phase1TrackerSkeleton from '@shared/components/common/Phase1TrackerSkeleton';

// Utility function to format date as MM-DD-YYYY (same as Dashboard)
function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return 'N/A';
  
  // Handle YYYY-MM-DD format
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-');
    // Use the original date values without timezone conversion
    return `${month}-${day}-${year}`;
  }
  
  // Handle different date formats
  let date;
  if (dateStr.includes('-')) {
    // Already in YYYY-MM-DD format
    date = new Date(dateStr);
  } else if (dateStr.includes('/')) {
    // Handle M/D/YYYY or MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      date = new Date(year, month - 1, day);
    } else {
      return dateStr; // Return as-is if can't parse
    }
  } else {
    return dateStr; // Return as-is if unknown format
  }
  
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if invalid date
  }
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}-${day}-${year}`;
}

     const Phase1Tracker = ({ 
     currentPhase, 
     seasonData, 
     completedMatches, 
     totalRequiredMatches,
     playerName,
     playerLastName,
     selectedDivision,
     onOpenOpponentsModal,
     onOpenCompletedMatchesModal,
     onOpenStandingsModal,
     onOpenAllMatchesModal,
     pendingCount,
     sentCount,
     onOpenProposalListModal,
     onOpenSentProposalListModal,
     upcomingMatches,
     onMatchClick,
     isMobile,
     onOpenMessageCenter,
     currentUser,
     allPlayers,
     onSmartMatchClick,
     // Phase1 modal state and handlers
     showPhase1Rules,
     setShowPhase1Rules,
     showPhase1Overview,
     setShowPhase1Overview,
     // Phase1 data state setters
     setPlayerStats,
     setTimeLeft,
     setDeadlineStatus,
     setPhase1EndDate,
     // Calendar modal handler
     onOpenCalendar
   }) => {
    // Data validation
    const validateProps = () => {
      if (!playerName || !playerLastName) {
        console.warn('Phase1Tracker: Missing player name information');
        return false;
      }
      if (!selectedDivision) {
        console.warn('Phase1Tracker: Missing selected division');
        return false;
      }
      if (!completedMatches || !Array.isArray(completedMatches)) {
        console.warn('Phase1Tracker: Invalid completedMatches prop');
        return false;
      }
      if (typeof totalRequiredMatches !== 'number' || totalRequiredMatches <= 0) {
        console.warn('Phase1Tracker: Invalid totalRequiredMatches prop');
        return false;
      }
      return true;
    };

    // Validate props on component mount
    useEffect(() => {
      validateProps();
    }, [playerName, playerLastName, selectedDivision, completedMatches, totalRequiredMatches]);
  const [standingsImpact, setStandingsImpact] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  // Remove local calendar state - will be managed by parent
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  
  // Local state for data that needs to be managed here
  const [localTimeLeft, setLocalTimeLeft] = useState(null);
  const [localDeadlineStatus, setLocalDeadlineStatus] = useState('normal');
  const [localPhase1EndDate, setLocalPhase1EndDate] = useState(null);
  const [localPlayerStats, setLocalPlayerStats] = useState(null);

  useEffect(() => {
    if (!selectedDivision || currentPhase !== 'scheduled') {
      setLocalTimeLeft(null);
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = async () => {
      try {
        // Load schedule from the backend to get current match dates
        const safeDivision = selectedDivision.replace(/[^A-Za-z0-9]/g, '_');
        const timestamp = Date.now(); // Cache-busting parameter
        const scheduleUrl = `${BACKEND_URL}/static/schedule_${safeDivision}.json?t=${timestamp}`;
        
        const response = await fetch(scheduleUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) {
          console.warn(`Failed to fetch schedule: ${response.status} - ${response.statusText}`);
          return;
        }
        
        const scheduleData = await response.json();
        
        if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
          console.warn('No schedule data available');
          return;
        }

        // Calculate Phase 1 deadline based on the 6th week of matches (Phase 1 = 6 weeks)
        // Sort matches by date and get the last match of week 6
        const sortedMatches = scheduleData
          .filter(match => match.date)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (sortedMatches.length === 0) {
          console.warn('No valid matches found in schedule');
          return;
        }

        // Get the 6th week matches (assuming 8 matches per week, so matches 33-40)
        // Adjust this calculation based on your actual schedule structure
        const phase1EndMatchIndex = Math.min(47, sortedMatches.length - 1); // 6 weeks * 8 matches = 48 matches, but use 47 for index
        const phase1EndMatch = sortedMatches[phase1EndMatchIndex];
        
        if (!phase1EndMatch || !phase1EndMatch.date) {
          console.warn('Could not determine Phase 1 end date from schedule');
          return;
        }

                 // Set deadline to end of the day for the last Phase 1 match
         const phase1EndDate = new Date(phase1EndMatch.date);
         phase1EndDate.setHours(23, 59, 59, 999); // End of day
         
                   // Store the date for display
          setLocalPhase1EndDate(phase1EndDate);
          setPhase1EndDate(phase1EndDate);
          
          const now = new Date();
          
         if (isAfter(now, phase1EndDate)) {
           const timeLeftData = { days: 0, hours: 0, passed: true };
           setLocalTimeLeft(timeLeftData);
           setTimeLeft(timeLeftData);
           setLocalDeadlineStatus('passed');
           setDeadlineStatus('passed');
         } else {
           const daysLeft = differenceInDays(phase1EndDate, now);
           const hoursLeft = differenceInHours(phase1EndDate, now) % 24;
           
           const timeLeftData = { days: daysLeft, hours: hoursLeft, passed: false };
           setLocalTimeLeft(timeLeftData);
           setTimeLeft(timeLeftData);
           
           if (daysLeft <= 0 && hoursLeft <= 24) {
             setLocalDeadlineStatus('critical');
             setDeadlineStatus('critical');
           } else if (daysLeft <= 2) {
             setLocalDeadlineStatus('urgent');
             setDeadlineStatus('urgent');
           } else if (daysLeft <= 7) {
             setLocalDeadlineStatus('warning');
             setDeadlineStatus('warning');
           } else {
             setLocalDeadlineStatus('normal');
             setDeadlineStatus('normal');
           }
         }
      } catch (error) {
        console.error('Error calculating Phase 1 deadline from schedule:', error);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [selectedDivision, currentPhase]);

  useEffect(() => {
    if (currentPhase === 'scheduled' && selectedDivision && completedMatches) {
      calculateStandingsImpact();
      calculatePlayerStats();
    }
  }, [currentPhase, selectedDivision, completedMatches, totalRequiredMatches, standings]);

  useEffect(() => {
    if (selectedDivision && currentPhase === 'scheduled') {
      loadStandings();
    }
  }, [selectedDivision, currentPhase]);

  // Load standings data from backend
  const loadStandings = async () => {
    try {
      setLoadingStandings(true);
      if (!selectedDivision) {
        console.warn('No division selected for standings');
        return;
      }

      // Use the backend to fetch standings JSON for the division
      const safeDivision = selectedDivision.replace(/[^A-Za-z0-9]/g, '_');
      const standingsUrl = `${BACKEND_URL}/static/standings_${safeDivision}.json`;
      
      
      
      const response = await fetch(standingsUrl);
      
      if (!response.ok) {
        console.warn(`Failed to fetch standings: ${response.status} - ${response.statusText}`);
        return;
      }
      
      const standingsData = await response.json();

      // Validate standings data structure
      if (!Array.isArray(standingsData)) {
        console.error('Standings data is not an array:', standingsData);
        return;
      }

      // Validate each entry has required fields
      const validStandings = standingsData.filter(entry => {
        if (!entry || typeof entry !== 'object') {
          console.warn('Invalid standings entry:', entry);
          return false;
        }
        if (!entry.name || !entry.rank) {
          console.warn('Standings entry missing name or rank:', entry);
          return false;
        }
        const rank = parseInt(entry.rank);
        if (isNaN(rank) || rank <= 0) {
          console.warn('Invalid rank in standings entry:', entry);
          return false;
        }
        return true;
      });


      setStandings(validStandings);
    } catch (error) {
      console.error('Failed to load standings:', error);
    } finally {
      setLoadingStandings(false);
    }
  };

  // Get player's actual standings position
  const getPlayerPosition = (standings, playerName) => {
    if (!standings || standings.length === 0) {
      return null;
    }
    
    const normalizedPlayerName = playerName.toLowerCase().trim();
    const playerEntry = standings.find(entry => 
      entry.name.toLowerCase().trim() === normalizedPlayerName
    );
    
    return playerEntry ? parseInt(playerEntry.rank) : null;
  };

  const calculateStandingsImpact = () => {
    const completedCount = completedMatches.length;
    const remainingCount = totalRequiredMatches - completedCount;
    
    const impact = {
      completedCount,
      remainingCount,
      deadlinePassed: seasonService.hasPhase1DeadlinePassed(seasonData)
    };

    setStandingsImpact(impact);
  };

  const calculatePlayerStats = () => {
    let wins = 0;
    let losses = 0;
    const fullPlayerName = `${playerName} ${playerLastName}`;

    // Calculate wins/losses from completed matches
    if (completedMatches && completedMatches.length > 0) {
      completedMatches.forEach(match => {
        if (match.winner === fullPlayerName) {
          wins++;
        } else {
          losses++;
        }
      });
    }

    const winRate = completedMatches && completedMatches.length > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    
    // Get actual standings position - this should work regardless of completed matches
    const actualPosition = getPlayerPosition(standings, fullPlayerName);
    let positionDisplay = 'N/A';
    
    if (actualPosition !== null) {
      positionDisplay = `${actualPosition}${getOrdinalSuffix(actualPosition)}`;
    } else if (completedMatches && completedMatches.length >= 1) {
      // Fallback to estimated position if not in standings but has completed matches
      if (winRate >= 80) positionDisplay = '1st-3rd';
      else if (winRate >= 60) positionDisplay = '4th-6th';
      else if (winRate >= 40) positionDisplay = '7th-9th';
      else positionDisplay = '10th+';
    }

         const playerStatsData = {
       wins,
       losses,
       winRate,
       position: positionDisplay,
       actualPosition
     };
     setLocalPlayerStats(playerStatsData);
     setPlayerStats(playerStatsData);
  };

  // Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  // Show skeleton while loading
  if (loadingStandings || !localTimeLeft || !standingsImpact || currentPhase !== 'scheduled') {
    return <Phase1TrackerSkeleton isMobile={isMobile} />;
  }

  const getPrimaryColor = () => {
    if (localDeadlineStatus === 'passed') return '#e74c3c';      // Lighter dark red
    if (localDeadlineStatus === 'critical') return '#ff6b6b';   // Lighter red
    if (localDeadlineStatus === 'urgent') return '#ff8800';     // Keep orange
    if (localDeadlineStatus === 'warning') return '#ffaa00';    // Keep yellow
    return '#4CAF50';                                      // Green for Phase 1
  };



  const getStatusMessage = () => {
    if (localDeadlineStatus === 'passed') {
      return '⚠️ DEADLINE PASSED!';
    } else if (localDeadlineStatus === 'critical') {
      const endDate = localPhase1EndDate ? format(localPhase1EndDate, isMobile ? 'MMM d' : 'MMM d, yyyy') : '';
      return `🚨 CRITICAL: ENDS in ${localTimeLeft.hours} hours! (${endDate})`;
    } else if (localDeadlineStatus === 'urgent') {
      const endDate = localPhase1EndDate ? format(localPhase1EndDate, isMobile ? 'MMM d' : 'MMM d, yyyy') : '';
      return `⚠️ URGENT: ENDS in ${localTimeLeft.days} days! (${endDate})`;
    } else if (localDeadlineStatus === 'warning') {
      const endDate = localPhase1EndDate ? format(localPhase1EndDate, isMobile ? 'MMM d' : 'MMM d, yyyy') : '';
      return `⚠️ WARNING: ENDS in ${localTimeLeft.days} days. (${endDate})`;
    } else {
      const endDate = localPhase1EndDate ? format(localPhase1EndDate, isMobile ? 'MMM d' : 'MMM d, yyyy') : '';
      return `ENDS in ${localTimeLeft.days} days. (${endDate})`;
    }
  };

  const getProgressPercentage = () => {
    return Math.round((completedMatches.length / totalRequiredMatches) * 100);
  };

  const primaryColor = getPrimaryColor();
  
           return (
            <div style={{
                  background: `linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(20, 20, 20, 0.9), rgba(0, 0, 0, 0.85))`,
                  border: `2px solid rgba(255, 255, 255, 0.2)`,
                  borderRadius: isMobile ? '16px' : '20px',
                  padding: isMobile ? '6px 10px 10px 10px' : '10px 16px 16px 16px',
          margin: isMobile ? '-15px 0 0 0' : '13px auto',
          width: isMobile ? '100%' : '98%',
          maxWidth: isMobile ? 'none' : '1600px',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 4px 16px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isExpanded ? 'flex-start' : 'flex-start',
                   backdropFilter: 'blur(8px)',
          overflow: isMobile ? 'auto' : 'hidden',
                   maxHeight: isMobile ? 'none' : '35vh',
           height: isMobile ? (isExpanded ? '350px' : '60px') : (isExpanded ? '408px' : '160px'),
          transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          transform: 'none',
          touchAction: 'none'
        }}
               role="presentation"
        tabIndex="-1"
     >
             {/* Header */}
                                                               <div style={{
            position: 'relative',
            textAlign: 'center',
                                marginBottom: isMobile ? '0px' : '3px',
             padding: isMobile ? '2px' : '3px',
            borderRadius: '12px',
                                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(20, 20, 20, 0.8))',
             border: '1px solid rgba(255,255,255,0.15)',
             boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
                                                                                                                                                                                               <h3 style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: isMobile ? '0.6rem' : '0.9rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isMobile ? '3px' : '5px',
                  flexWrap: 'wrap',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  letterSpacing: '0.5px',
                  minHeight: isMobile ? '2rem' : '2.5rem'
                }}>
                    {/* Center - Status indicators and Phase 1 text */}
                                         <div style={{
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: isMobile ? '2px' : '6px'
                     }}>
                       {localDeadlineStatus === 'critical' && '🚨'}
                       {localDeadlineStatus === 'urgent' && '⚠️'}
                       {localDeadlineStatus === 'warning' && '⚠️'}
                       {localDeadlineStatus === 'passed' && '⏰'}
                       {localDeadlineStatus === 'normal' && ''}
                     </div>
                    
                    {/* Phase 1 Controls - Smart Match, Phase Indicator, Rules */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? '3px' : '6px'
                    }}>
                                             {/* Smart Match Button - Left */}
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           console.log('Smart match button clicked in Phase1Tracker');
                           console.log('onSmartMatchClick function:', onSmartMatchClick);
                           if (onSmartMatchClick) {
                             console.log('Calling onSmartMatchClick');
                             onSmartMatchClick();
                           } else {
                             console.log('onSmartMatchClick is not defined');
                           }
                         }}
                         aria-label="Open smart match making"
                         role="button"
                         tabIndex="0"
                                                                                                       style={{
                             background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.3), rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.1))',
                             border: '1px solid rgba(255, 193, 7, 0.4)',
                             color: '#ffffff',
                             fontSize: isMobile ? '0.4rem' : '0.7rem',
                             fontWeight: 'bold',
                             padding: isMobile ? '6px 10px' : '8px 14px',
                             borderRadius: '8px',
                             cursor: 'pointer',
                             transition: 'all 0.3s ease',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '4px',
                             textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                             boxShadow: '0 2px 8px rgba(255, 193, 7, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                             zIndex: 10
                           }}
                                                   onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.4), rgba(255, 193, 7, 0.3), rgba(255, 193, 7, 0.2))';
                            e.target.style.transform = 'scale(1.02) translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.3), rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.1))';
                            e.target.style.transform = 'scale(1) translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(255, 193, 7, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
                          }}
                       >
                         🧠 SMART MATCH
                       </button>
                      
                                                                    {/* Phase 1 Indicator - Center */}
                                               <span 
                         onClick={(e) => {
                           e.stopPropagation();
                           setShowPhase1Overview(true);
                         }}
                         style={{ 
                           fontSize: isMobile ? '0.4rem' : '0.7rem',
                           background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor})`,
                           padding: isMobile ? '6px 10px' : '8px 14px',
                           borderRadius: '8px',
                           boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 10px rgba(255,255,255,0.1)',
                           border: '1px solid rgba(255,255,255,0.3)',
                           textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                           fontWeight: 'bold',
                           cursor: 'pointer',
                           transition: 'all 0.3s ease'
                                                  }}
                         onMouseEnter={(e) => {
                           e.target.style.transform = 'scale(1.02) translateY(-1px)';
                           e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 15px rgba(255,255,255,0.2)';
                         }}
                         onMouseLeave={(e) => {
                           e.target.style.transform = 'scale(1) translateY(0)';
                           e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 10px rgba(255,255,255,0.1)';
                         }}
                         title="Click to view Phase 1 overview"
                         role="button"
                         tabIndex="0"
                         aria-label="Open Phase 1 overview"
                                                  >
                           PHASE 1
                         </span>
                      
                                             {/* Rules Button - Right */}
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setShowPhase1Rules(true);
                         }}
                         aria-label="Open Phase 1 rules and information"
                         role="button"
                         tabIndex="0"
                                                                                                     style={{
                             background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.3), rgba(255, 68, 68, 0.2), rgba(255, 68, 68, 0.1))',
                             border: '1px solid rgba(255, 68, 68, 0.4)',
                             color: '#ffffff',
                             fontSize: isMobile ? '0.4rem' : '0.7rem',
                             fontWeight: 'bold',
                             padding: isMobile ? '6px 10px' : '8px 14px',
                             borderRadius: '8px',
                             cursor: 'pointer',
                             transition: 'all 0.3s ease',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '4px',
                             textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                             boxShadow: '0 2px 8px rgba(255, 68, 68, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                             zIndex: 10
                           }}
                                                  onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(255, 68, 68, 0.4), rgba(255, 68, 68, 0.3), rgba(255, 68, 68, 0.2))';
                            e.target.style.transform = 'scale(1.02) translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(255, 68, 68, 0.3), rgba(255, 68, 68, 0.2), rgba(255, 68, 68, 0.1))';
                            e.target.style.transform = 'scale(1) translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(255, 68, 68, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
                          }}
                       >
                         ⚔️ RULES
                       </button>
                    </div>
                 </h3>
          
                                           {/* Status Message - ends in XX days */}
                                                 <div style={{
                  color: '#ffffff',
                  fontSize: isMobile ? '0.6rem' : '0.8rem',
                  lineHeight: isMobile ? '1.1' : '1.1',
                                 marginTop: isMobile ? '1px' : '1px',
                  marginBottom: isMobile ? '1px' : '3px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
               {getStatusMessage()}
               </div>
           
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 {/* Calendar Icon - positioned to align with completion counter */}
                                                                                                                                           <div style={{
                                               position: isMobile ? 'relative' : 'absolute',
                        left: isMobile ? 'auto' : '15%',
                        top: isMobile ? 'auto' : '50%',
                        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
                         cursor: 'pointer',
                         fontSize: isMobile ? '2rem' : '2.8rem',
                         transition: 'all 0.3s ease',
                                                   display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: isMobile ? '80px' : '120px',
                         lineHeight: 1,
                                                     background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.35), rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.25))',
                            border: '1px solid rgba(76, 175, 80, 0.7)',
                          padding: isMobile ? '3px' : '5px',
                          borderRadius: isMobile ? '10px' : '16px',
                          zIndex: 1,
                                                                           boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                         minWidth: isMobile ? '60px' : '90px',
                        backdropFilter: 'blur(8px)',
                        margin: isMobile ? '8px auto' : '0'
                      }}
                                                                                                                                                                                                                                                               onClick={() => {
                                    setIsExpanded(true); // Expand the tracker when opening calendar
                                    if (onOpenCalendar) {
                                      onOpenCalendar();
                                    }
                                  }}
                                 aria-label="Open calendar to schedule matches by date"
                                 role="button"
                                 tabIndex="0"
                              >
                                                                                                                                                                                                                                                 <div style={{ 
                                                                                       fontSize: isMobile ? '0.4rem' : '0.6rem',
                                           color: '#ffffff',
                                           fontWeight: 'bold',
                                           textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                           marginBottom: isMobile ? '8px' : '12px',
                                           textAlign: 'center'
                                          }}>
                                            Today's Date
                                          </div>
                                                                                                                             <div style={{ 
                                             display: 'flex', 
                                             flexDirection: 'column', 
                                             alignItems: 'center',
                                             justifyContent: 'center',
                                             flex: 1
                                           }}>
                                             <div style={{ fontSize: isMobile ? '0.7rem' : '1rem' }}>
                                               {(() => {
                                                 const today = new Date();
                                                 const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                                 return dayNames[today.getDay()];
                                               })()}
                                             </div>
                                             <div style={{ fontSize: isMobile ? '1rem' : '1.8rem' }}>
                                               {(() => {
                                                 const today = new Date();
                                                 const month = String(today.getMonth() + 1).padStart(2, '0');
                                                 const day = String(today.getDate()).padStart(2, '0');
                                                 const year = String(today.getFullYear()).slice(-2);
                                                 return `${month}/${day}/${year}`;
                                               })()}
                                             </div>
                                           </div>
                                                                                   <div style={{ 
                                                   fontSize: isMobile ? '0.25rem' : '0.6rem', 
                         color: '#ffffff', 
                         fontWeight: 'bold',
                         textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                         marginTop: 'auto',
                         textAlign: 'center',
                         whiteSpace: 'nowrap',
                         background: 'rgba(0, 0, 0, 0.7)',
                         padding: isMobile ? '1px 2px' : '2px 3px',
                         borderRadius: '4px',
                         border: '1px solid rgba(255, 255, 255, 0.3)'
                                             }}>
                          {isMobile ? 'Schedule' : 'Click to Schedule Match by Date'}
                        </div>
                 </div>

                                                                                                                                                                                                             {/* Proposals Section - positioned on the right side */}
                                                                      <div 
                     style={{
                       position: isMobile ? 'relative' : 'absolute',
                       right: isMobile ? 'auto' : '15%',
                       top: isMobile ? 'auto' : '50%',
                       transform: isMobile ? 'none' : 'translate(50%, -50%)',
                       transition: 'all 0.3s ease',
                       display: 'flex',
                       flexDirection: 'column',
                       alignItems: 'center',
                       justifyContent: 'center',
                       lineHeight: 1,
                                               background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(52, 152, 219, 0.1), rgba(52, 152, 219, 0.05))',
                                               border: '1px solid rgba(52, 152, 219, 0.3)',
                                                padding: isMobile ? '3px' : '5px',
                        borderRadius: isMobile ? '10px' : '16px',
                         zIndex: 1,
                                                                        boxShadow: '0 2px 8px rgba(52, 152, 219, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                                                 minWidth: isMobile ? '60px' : '90px',
                          minHeight: isMobile ? '80px' : '120px',
                       backdropFilter: 'blur(8px)',
                       margin: isMobile ? '8px auto' : '0'
                     }}
                    title="Proposal management - view pending and sent proposals"
                                                                   onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.25), rgba(52, 152, 219, 0.2), rgba(52, 152, 219, 0.15))';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                    e.currentTarget.style.border = '1px solid rgba(52, 152, 219, 0.5)';
                    e.currentTarget.style.transform = 'translate(50%, -50%) scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(52, 152, 219, 0.1), rgba(52, 152, 219, 0.05))';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(52, 152, 219, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
                    e.currentTarget.style.border = '1px solid rgba(52, 152, 219, 0.3)';
                    e.currentTarget.style.transform = 'translate(50%, -50%) scale(1)';
                  }}
                >
                  <div style={{ 
                    fontSize: isMobile ? '0.5rem' : '0.75rem',
                    color: '#ffffff', 
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                    marginBottom: isMobile ? '3px' : '6px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    📋 Proposals
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '2px' : '4px',
                    justifyContent: 'center',
                    width: '100%'
                  }}>
                                                                                   <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenProposalListModal) onOpenProposalListModal();
                        }}
                                               style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          padding: isMobile ? '2px 3px' : '5px 7px',
                          fontSize: isMobile ? '0.4rem' : '0.65rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          width: '100%',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                                                 onMouseEnter={(e) => {
                           e.target.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.3), rgba(52, 152, 219, 0.25), rgba(52, 152, 219, 0.2))';
                           e.target.style.transform = 'translateY(-1px) scale(1.01)';
                           e.target.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                         }}
                         onMouseLeave={(e) => {
                           e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                           e.target.style.transform = 'translateY(0) scale(1)';
                           e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                         }}
                      >
                        📥 {pendingCount} waiting for you
                      </button>
                                                                                   <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenSentProposalListModal) onOpenSentProposalListModal();
                        }}
                                               style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          padding: isMobile ? '2px 3px' : '5px 7px',
                          fontSize: isMobile ? '0.4rem' : '0.65rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          width: '100%',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                                                 onMouseEnter={(e) => {
                           e.target.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.3), rgba(52, 152, 219, 0.25), rgba(52, 152, 219, 0.2))';
                           e.target.style.transform = 'translateY(-1px) scale(1.01)';
                           e.target.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                         }}
                         onMouseLeave={(e) => {
                           e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                           e.target.style.transform = 'translateY(0) scale(1)';
                           e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                         }}
                      >
                        📤 {sentCount} waiting for opponents
                      </button>
                  </div>
                </div>
            
                         {/* Completion counter */}
             <div style={{
                 color: '#ffffff',
                 fontSize: isMobile ? '0.65rem' : '0.8rem',
                 fontWeight: 'bold',
                 marginTop: isMobile ? '3px' : '1px',
                 marginBottom: isMobile ? '1px' : '3px',
                 textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                 lineHeight: isMobile ? '1.1' : '1.1',
                 textAlign: isMobile ? 'center' : 'center'
               }}>
                 {completedMatches.length}/{totalRequiredMatches} Matches Complete
               </div>
           
                                   {/* Remaining matches counter */}
            <div style={{
                color: '#ffffff',
                fontSize: isMobile ? '0.65rem' : '0.8rem',
                fontWeight: 'bold',
                               marginTop: isMobile ? '1px' : '1px',
               marginBottom: isMobile ? '3px' : '1px',
               textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
               lineHeight: isMobile ? '1.1' : '1.1',
               textAlign: isMobile ? 'center' : 'center'
             }}>
               {totalRequiredMatches - completedMatches.length} to Schedule
              </div>
           
                       {/* Removed the absolutely positioned Show Stats text */}
            
            {/* Show Stats Button - integrated into header */}
                         <div style={{
               textAlign: 'center',
               marginTop: isMobile ? '2px' : '4px'
             }}>
                                                            <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  style={{
                    fontSize: isMobile ? '0.4rem' : '0.8rem',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: isMobile ? '1px 2px' : '3px 6px',
                    borderRadius: '6px',
                    display: 'inline-block',
                    transition: 'background-color 0.2s ease',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    background: 'transparent',
                    border: 'none'
                  }}
               >
                 {isExpanded ? 'Hide Stats ▲' : 'Show Stats ▼'}
               </button>
             </div>
          </div>

      {/* Expanded Content */}
      {isExpanded && (
        <>
                                                                                       {/* Compact Stats Row */}
                         <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                           marginBottom: isMobile ? '6px' : '3px',
             gap: isMobile ? '4px' : '8px',
                padding: isMobile ? '4px' : '6px',
                borderRadius: '8px',
                                              background: 'rgba(0, 0, 0, 0.5)',
                 border: '1px solid rgba(255,255,255,0.15)',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                                                                                                                                                           {/* Progress Section */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenOpponentsModal) onOpenOpponentsModal();
                  }}
                                                                     style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: isMobile ? '4px' : '6px',
                      borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    flex: 1,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: isMobile ? '60px' : '70px'
                  }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.3))';
                 e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                 e.currentTarget.style.boxShadow = '0 4px 16px rgba(76, 175, 80, 0.3), 0 2px 8px rgba(0,0,0,0.2)';
                 e.currentTarget.style.border = '1px solid rgba(76, 175, 80, 0.5)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                 e.currentTarget.style.transform = 'translateY(0) scale(1)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
               }}
             >
                                                                                                                               <div style={{
                    fontSize: isMobile ? '0.5rem' : '0.7rem',
                    fontWeight: 'bold',
                    color: '#e0e0e0',
                                       marginBottom: isMobile ? '3px' : '1px'
                   }}>
                     Progress
                   </div>
                                   <div style={{
                    fontSize: isMobile ? '0.6rem' : '0.8rem',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                       marginBottom: isMobile ? '2px' : '1px'
                  }}>
                    {completedMatches.length}/{totalRequiredMatches}
                 </div>
                               {/* Progress Bar */}
                                 <div style={{
                   width: '100%',
                   height: isMobile ? '2px' : '5px',
                   background: 'rgba(255,255,255,0.15)',
                   borderRadius: '3px',
                   overflow: 'hidden',
                   marginBottom: isMobile ? '1px' : '1px',
                   boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
                 }}>
                   <div style={{
                     width: `${getProgressPercentage()}%`,
                     height: '100%',
                     background: `linear-gradient(90deg, #4CAF50, #45a049, #4CAF50)`,
                     borderRadius: '3px',
                     transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                     boxShadow: '0 0 8px rgba(76, 175, 80, 0.5)',
                     position: 'relative'
                   }}>
                     <div style={{
                       position: 'absolute',
                       top: 0,
                       left: 0,
                       right: 0,
                       bottom: 0,
                       background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                       animation: 'shimmer 2s infinite'
                     }} />
                   </div>
                 </div>
                                                                       <div style={{
                     fontSize: isMobile ? '0.45rem' : '0.65rem',
                     color: '#e0e0e0',
                     fontStyle: 'italic',
                     textAlign: 'center',
                     fontWeight: '500'
                                      }}>
                      click to see opponents
                    </div>
             </div>

             

                                                   {/* Record Section */}
                             <div
                 onClick={(e) => {
                   e.stopPropagation();
                   if (onOpenCompletedMatchesModal) onOpenCompletedMatchesModal();
                 }}
                 style={{
                   background: 'rgba(0, 0, 0, 0.4)',
                   padding: isMobile ? '3px' : '6px',
                   borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  flex: 1,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '70px'
                }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.3))';
                 e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                 e.currentTarget.style.boxShadow = '0 4px 16px rgba(33, 150, 243, 0.3), 0 2px 8px rgba(0,0,0,0.2)';
                 e.currentTarget.style.border = '1px solid rgba(33, 150, 243, 0.5)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                 e.currentTarget.style.transform = 'translateY(0) scale(1)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
               }}
             >
                               <div style={{
                  fontSize: isMobile ? '0.3rem' : '0.7rem',
                  fontWeight: 'bold',
                  color: '#e0e0e0',
                                                    marginBottom: isMobile ? '1px' : '1px'
               }}>
                 Record
                </div>
                               <div style={{
                  fontSize: isMobile ? '0.4rem' : '0.8rem',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                   marginBottom: isMobile ? '1px' : '1px'
                 }}>
                                       {localPlayerStats?.wins || 0}-{localPlayerStats?.losses || 0} ({localPlayerStats?.winRate || 0}%)
                                 </div>
                                <div style={{
                 fontSize: isMobile ? '0.35rem' : '0.65rem',
                 color: '#e0e0e0',
                 fontStyle: 'italic',
                 textAlign: 'center',
                 fontWeight: '500'
               }}>
                 click to see results
                 </div>
             </div>

                         {/* Position Section */}
                           <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenStandingsModal) onOpenStandingsModal();
                }}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: isMobile ? '4px' : '8px',
                  borderRadius: '8px',
                 cursor: 'pointer',
                 transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                 border: '1px solid rgba(255,255,255,0.2)',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                 flex: 1,
                 textAlign: 'center',
                 position: 'relative',
                 overflow: 'hidden',
                 display: 'flex',
                 flexDirection: 'column',
                 justifyContent: 'space-between',
                 minHeight: '80px'
               }}
                             onMouseEnter={(e) => {
                 e.currentTarget.style.background = 'linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(156, 39, 176, 0.3))';
                 e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                 e.currentTarget.style.boxShadow = '0 4px 16px rgba(156, 39, 176, 0.3), 0 2px 8px rgba(0,0,0,0.2)';
                 e.currentTarget.style.border = '1px solid rgba(156, 39, 176, 0.5)';
               }}
                             onMouseLeave={(e) => {
                 e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
              }}
            >
                                                         <div style={{
                 fontSize: isMobile ? '0.35rem' : '0.8rem',
                 fontWeight: 'bold',
                 color: '#e0e0e0',
                 marginBottom: isMobile ? '1px' : '1px'
               }}>
                 Position
               </div>
                             <div style={{
                                 fontSize: isMobile ? '0.4rem' : '0.9rem',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                 marginBottom: isMobile ? '1px' : '1px'
               }}>
                                   {loadingStandings ? '...' : (localPlayerStats?.position || 'N/A')}
              </div>
               <div style={{
                 fontSize: isMobile ? '0.35rem' : '0.65rem',
                 color: '#e0e0e0',
                 fontStyle: 'italic',
                 textAlign: 'center',
                 fontWeight: '500'
               }}>
                 click to view standings
               </div>
            </div>
          </div>

                                                                                                                                                                                                                                                                                                                                                               {/* Compact Matches Row */}
                                                     <div style={{
                   display: 'flex',
                                                                   gap: isMobile ? '6px' : '10px',
                                                                                                                            marginBottom: isMobile ? '3px' : '3px'
                 }}>

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  {/* Message Center Section */}
                                                                         <div style={{
                                       flex: isMobile ? '0 0 120px' : '0 0 180px',
                                       background: 'rgba(0, 0, 0, 0.4)',
                                       borderRadius: '8px',
                                       padding: isMobile ? '3px' : '3px',
                                       border: '1px solid rgba(255,255,255,0.2)',
                                       boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                       display: 'flex',
                                       flexDirection: 'column',
                                       gap: isMobile ? '3px' : '3px'
                                     }}>
                                                                                                                                                             <div style={{
                                           fontSize: isMobile ? '0.4rem' : '0.8rem',
                                           color: '#ffffff',
                                           fontWeight: 'bold',
                                           textAlign: 'center',
                                           textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                           marginBottom: isMobile ? '1px' : '1px'
                                         }}>
                                           📨 {isMobile ? 'Messages' : 'Message Center'}
                                         </div>
                                      
                                                                                                                       <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (onOpenMessageCenter) onOpenMessageCenter('direct');
                                            }}
                                                                                         style={{
                                               background: 'linear-gradient(135deg, #ff4444 0%, #cc3333 50%, #aa2222 100%)',
                                               color: '#ffffff',
                                               border: 'none',
                                               borderRadius: '6px',
                                               padding: isMobile ? '3px 5px' : '3px 5px',
                                               fontSize: isMobile ? '0.5rem' : '0.6rem',
                                               fontWeight: '600',
                                               cursor: 'pointer',
                                               boxShadow: '0 2px 6px rgba(255, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                                               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                               width: '100%',
                                               textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                               position: 'relative',
                                               overflow: 'hidden'
                                             }}
                                                                                         onMouseEnter={(e) => {
                                               e.target.style.background = 'linear-gradient(135deg, #cc3333 0%, #aa2222 50%, #881111 100%)';
                                               e.target.style.transform = 'translateY(-2px) scale(1.02)';
                                               e.target.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(0, 0, 0, 0.3)';
                                             }}
                                             onMouseLeave={(e) => {
                                               e.target.style.background = 'linear-gradient(135deg, #ff4444 0%, #cc3333 50%, #aa2222 100%)';
                                               e.target.style.transform = 'translateY(0) scale(1)';
                                               e.target.style.boxShadow = '0 2px 6px rgba(255, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                                             }}
                                                                              >
                                            💬 {isMobile ? 'DM' : 'Direct Messages'}
                                          </button>
                                       
                                                                               <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (onOpenMessageCenter) onOpenMessageCenter('league');
                                          }}
                                         style={{
                                           background: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 50%, #00695c 100%)',
                                           color: '#ffffff',
                                           border: 'none',
                                           borderRadius: '6px',
                                           padding: isMobile ? '3px 5px' : '3px 5px',
                                           fontSize: isMobile ? '0.5rem' : '0.6rem',
                                           fontWeight: '600',
                                           cursor: 'pointer',
                                           boxShadow: '0 2px 6px rgba(0, 188, 212, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                                           transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                           width: '100%',
                                           textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                           position: 'relative',
                                           overflow: 'hidden'
                                         }}
                                         onMouseEnter={(e) => {
                                           e.target.style.background = 'linear-gradient(135deg, #0097a7 0%, #00695c 50%, #004d40 100%)';
                                           e.target.style.transform = 'translateY(-2px) scale(1.02)';
                                           e.target.style.boxShadow = '0 4px 12px rgba(0, 188, 212, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(0, 0, 0, 0.3)';
                                         }}
                                         onMouseLeave={(e) => {
                                           e.target.style.background = 'linear-gradient(135deg, #00bcd4 0%, #0097a7 50%, #00695c 100%)';
                                           e.target.style.transform = 'translateY(0) scale(1)';
                                           e.target.style.boxShadow = '0 2px 6px rgba(0, 188, 212, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                                         }}
                                                                               >
                                           🚀 {isMobile ? 'Chat' : 'League Chat'}
                                         </button>
                                      
                                      
                                    </div>

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   {/* Upcoming Matches Section */}
                                   <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenAllMatchesModal) onOpenAllMatchesModal();
                      }}
                                       style={{
                                               flex: '1',
                         background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '8px',
                                                                    padding: isMobile ? '3px' : '3px',
                                                 border: '1px solid rgba(255,255,255,0.2)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                       cursor: 'pointer',
                       transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                     }}
                                   onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 68, 68, 0.15), rgba(255, 68, 68, 0.1), rgba(255, 68, 68, 0.05))';
                    e.currentTarget.style.border = '1px solid rgba(255, 68, 68, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                  }}
               >
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       <div style={{
                                              fontSize: isMobile ? '0.5rem' : '0.9rem',
                         color: '#ff4444',
                         fontWeight: 'bold',
                         marginBottom: '0px',
                         textAlign: 'center',
                         cursor: 'pointer',
                         textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                         letterSpacing: '0.5px'
                                            }}>
                                                🎯 Upcoming Matches
                        </div>
                                         {/* Click for details instruction */}
                                                                                                                                                                                                                                                                                                                                         <div style={{
                                              fontSize: isMobile ? '0.35rem' : '0.65rem',
                                              color: '#e0e0e0',
                                              textAlign: 'center',
                                              fontStyle: 'italic',
                                              fontWeight: '500',
                                              marginTop: '0px',
                                              marginBottom: '0px',
                                              padding: '0px'
                                            }}>
                                            click for match details
                                          </div>
                                                                                                                                 {/* Upcoming Matches List */}
                                 {(() => {
                                   // Use actual upcomingMatches data
                                   const displayMatches = upcomingMatches;
                                   
                                   return displayMatches && displayMatches.length > 0 ? (
                                     <div style={{
                                       display: 'flex',
                                       flexDirection: 'column',
                                       gap: '1px',
                                       marginTop: isMobile ? '1px' : '1px'
                                     }}>
                                      {/* Show up to 3 matches */}
                                      {displayMatches.slice(0, 3).map((match, index) => (
                      <div 
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMatchClick && match) {
                            onMatchClick(match);
                          }
                        }}
                                                                                                                                                                                                       style={{
                            fontSize: isMobile ? '0.4rem' : '0.7rem',
                            color: '#ccc',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            padding: isMobile ? '1px 2px' : '2px 3px',
                            borderRadius: '2px',
                            transition: 'all 0.2s ease'
                          }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#ffffff';
                          e.target.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = '#ccc';
                          e.target.style.background = 'transparent';
                        }}
                      >
                        {(() => {
                          let opponent = '';
                          let dateStr = '';
                          
                                                     // Handle both scheduled matches and confirmed proposals
                           if (match.type === 'proposal' || match.status === 'confirmed') {
                             // This is a confirmed proposal
                             if (match.senderName && match.receiverName) {
                               opponent = match.senderName.trim().toLowerCase() === `${playerName} ${playerLastName}`.trim().toLowerCase() ? 
                                 match.receiverName : match.senderName;
                             }
                             // Handle proposal match dates - use same format as All Upcoming Matches modal
                             if (match.date) {
                               dateStr = formatDateMMDDYYYY(match.date);
                             }
                           } else {
                             // This is a scheduled match
                             if (match.player1Id && match.player2Id) {
                               opponent = match.player1Id.trim().toLowerCase() === `${playerName} ${playerLastName}`.trim().toLowerCase() ? 
                                 match.player2Id : match.player1Id;
                             }
                             // Handle scheduled match dates - use same format as All Upcoming Matches modal
                             if (match.scheduledDate) {
                               const dateObj = new Date(match.scheduledDate);
                               if (!isNaN(dateObj.getTime())) {
                                 dateStr = formatDateMMDDYYYY(dateObj.toISOString().split('T')[0]);
                               }
                             } else if (match.date) {
                               dateStr = formatDateMMDDYYYY(match.date);
                             }
                           }
                          
                          if (!opponent) return 'No matches';
                          
                          return dateStr ? `vs ${opponent} (${dateStr})` : `vs ${opponent}`;
                        })()}
                      </div>
                    ))}
                    
                                                           {/* Show "more" indicator if there are more than 3 matches */}
                                       {displayMatches.length > 3 && (
                                                                                   <div style={{
                                            fontSize: isMobile ? '0.2rem' : '0.5rem',
                                            color: '#888',
                                            textAlign: 'center',
                                            fontStyle: 'italic',
                                            padding: isMobile ? '0px' : '1px'
                                          }}>
                                            +{displayMatches.length - 3} more
                                          </div>
                                                                               )}
                                      </div>
                                   ) : (
                                                                           <div style={{
                                        fontSize: isMobile ? '0.35rem' : '0.6rem',
                                        color: '#999',
                                        textAlign: 'center'
                                      }}>
                                        No matches
                                      </div>
                                   );
                                 })()}
             </div>
          </div>


        </>
      )}

                          {/* Calendar Modal - Removed, will be handled by parent Dashboard */}

      </div>
    );
  };

// Calendar Grid Component
const CalendarGrid = ({ phase1EndDate, isMobile, currentMonth, onMonthChange, onOpenOpponentsModal, upcomingMatches, playerName, playerLastName, onDateSelect, onMatchClick }) => {
  const today = new Date();
  const currentMonthIndex = currentMonth.getMonth();
  const currentYear = currentMonth.getFullYear();
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonthIndex, 1);
  const lastDay = new Date(currentYear, currentMonthIndex + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  const isPhase1EndDate = (day) => {
    if (!phase1EndDate || !day) return false;
    return day === phase1EndDate.getDate() && 
           currentMonthIndex === phase1EndDate.getMonth() && 
           currentYear === phase1EndDate.getFullYear();
  };
  
  const isToday = (day) => {
    return day === today.getDate() && 
           currentMonthIndex === today.getMonth() && 
           currentYear === today.getFullYear();
  };
  
  const isPast = (day) => {
    return day && day < today.getDate() && 
           currentMonthIndex === today.getMonth() && 
           currentYear === today.getFullYear();
  };
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentYear, currentMonthIndex - 1, 1);
    onMonthChange(newMonth);
  };
  
  const goToNextMonth = () => {
    const newMonth = new Date(currentYear, currentMonthIndex + 1, 1);
    onMonthChange(newMonth);
  };

  // Function to get matches for a specific date
  const getMatchesForDate = (day) => {
    if (!day || !upcomingMatches) return [];
    
    const targetDate = new Date(currentYear, currentMonthIndex, day);
    const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return upcomingMatches.filter(match => {
      let matchDate = null;
      
      // Handle different match date formats
      if (match.scheduledDate) {
        // New Match model
        const dateObj = new Date(match.scheduledDate);
        if (!isNaN(dateObj.getTime())) {
          matchDate = dateObj.toISOString().split('T')[0];
        }
      } else if (match.date) {
        // Old proposal format - convert to YYYY-MM-DD
        const parts = match.date.split('-');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          matchDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      return matchDate === targetDateStr;
    });
  };

  // Function to check if a date has confirmed matches
  const hasConfirmedMatches = (day) => {
    return getMatchesForDate(day).length > 0;
  };
  
  return (
    <div style={{ color: '#ffffff' }}>
      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '2px' : '4px'
      }}>
        <button
          onClick={goToPreviousMonth}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: isMobile ? '0.6rem' : '0.8rem',
            cursor: 'pointer',
            padding: isMobile ? '2px 4px' : '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          ←
        </button>
                                   <div style={{
            textAlign: 'center',
            fontSize: isMobile ? '0.7rem' : '1rem',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            width: '100%'
          }}>
            {monthNames[currentMonthIndex]} {currentYear}
          </div>
        <button
          onClick={goToNextMonth}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: isMobile ? '0.6rem' : '0.8rem',
            cursor: 'pointer',
            padding: isMobile ? '2px 4px' : '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          →
        </button>
      </div>
      
      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0px',
        marginBottom: isMobile ? '1px' : '2px'
      }}>
        {dayNames.map(day => (
                     <div key={day} style={{
             textAlign: 'center',
             fontSize: isMobile ? '0.5rem' : '0.7rem',
             fontWeight: 'bold',
             color: '#cccccc',
             padding: isMobile ? '0px' : '1px',
             textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
           }}>
             {day}
           </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div style={{
                      display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0px',
                             width: isMobile ? '400px' : '700px',
               height: isMobile ? '280px' : '450px',
              margin: '0 auto'
      }}>
               {calendarDays.map((day, index) => (
          <div
            key={index}
                                                                                                       onClick={() => {
                 if (day && !hasConfirmedMatches(day) && onDateSelect) {
                   // Only open opponents modal for empty dates
                   const selectedDate = new Date(currentYear, currentMonthIndex, day);
                   onDateSelect(selectedDate);
                 }
               }}
                           title={hasConfirmedMatches(day) ? 
                getMatchesForDate(day).map(match => {
                  let opponent = '';
                  if (match.player1Id && match.player2Id) {
                    opponent = match.player1Id.trim().toLowerCase() === `${playerName} ${playerLastName}`.trim().toLowerCase() ? 
                      match.player2Id : match.player1Id;
                  } else if (match.senderName && match.receiverName) {
                    opponent = match.senderName.trim().toLowerCase() === `${playerName} ${playerLastName}`.trim().toLowerCase() ? 
                      match.receiverName : match.senderName;
                  }
                  return `Click to view match details vs ${opponent}`;
                }).join(', ') : 
                'Click to schedule match'
              }
                         style={{
               aspectRatio: '1',
               display: 'flex',
               alignItems: 'flex-start',
               justifyContent: 'flex-end',
               fontSize: isMobile ? '0.6rem' : '0.8rem',
               fontWeight: 'bold',
               borderRadius: '1px',
               cursor: day ? 'pointer' : 'default',
                                            background: day ? (
                 isPhase1EndDate(day) ? '#e74c3c' :
                 isPast(day) ? 'rgba(255,255,255,0.1)' :
                 'transparent'
               ) : 'transparent',
               border: day ? (
                 isPhase1EndDate(day) ? '1px solid #c0392b' :
                 isToday(day) ? '2px solid #4CAF50' :
                 '1px solid rgba(255,255,255,0.1)'
               ) : 'none',
              color: day ? (
                isPhase1EndDate(day) ? '#ffffff' :
                isToday(day) ? '#ffffff' :
                isPast(day) ? '#888888' :
                '#ffffff'
              ) : 'transparent',
               transition: 'all 0.2s ease',
               padding: '2px'
             }}
            onMouseEnter={(e) => {
              if (day) {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 2px 8px rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (day) {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
                         <div style={{
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'stretch',
               justifyContent: 'space-between',
               width: '100%',
               height: '100%'
             }}>
               {/* Date number */}
               <span style={{
                 fontSize: isMobile ? '0.5rem' : '0.7rem',
                 fontWeight: 'bold',
                 color: 'inherit',
                 textAlign: 'right',
                 padding: '1px'
               }}>{day || ''}</span>
               
               {/* Opponents list - simple stacked display */}
               {hasConfirmedMatches(day) && (
                 <div style={{
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '1px',
                   padding: '1px',
                   flex: 1,
                   justifyContent: 'flex-end'
                 }}>
                   {(() => {
                     const matches = getMatchesForDate(day);
                     return matches.slice(0, isMobile ? 2 : 3).map((match, index) => {
                       let opponent = '';
                       if (match.player1Id && match.player2Id) {
                         opponent = match.player1Id.trim().toLowerCase() === `${playerName} ${playerLastName}`.trim().toLowerCase() ? 
                           match.player2Id : match.player1Id;
                       } else if (match.senderName && match.receiverName) {
                         opponent = match.senderName.trim().toLowerCase() === `${playerName} ${playerLastName}`.trim().toLowerCase() ? 
                           match.receiverName : match.senderName;
                       }
                       
                       // Truncate long names
                       const displayName = opponent.length > (isMobile ? 6 : 8) ? 
                         opponent.substring(0, isMobile ? 6 : 8) + '...' : opponent;
                       
                       return (
                         <div
                           key={match._id || index}
                           style={{
                             fontSize: isMobile ? '0.35rem' : '0.45rem',
                             color: '#4CAF50',
                             fontWeight: 'bold',
                             textAlign: 'center',
                             cursor: 'pointer',
                             textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                             padding: '1px',
                             borderRadius: '1px',
                             background: 'rgba(76, 175, 80, 0.1)',
                             border: '1px solid rgba(76, 175, 80, 0.3)',
                             transition: 'all 0.2s ease',
                             whiteSpace: 'nowrap',
                             overflow: 'hidden',
                             textOverflow: 'ellipsis'
                           }}
                           onMouseEnter={(e) => {
                             e.target.style.background = 'rgba(76, 175, 80, 0.3)';
                             e.target.style.transform = 'scale(1.05)';
                           }}
                           onMouseLeave={(e) => {
                             e.target.style.background = 'rgba(76, 175, 80, 0.1)';
                             e.target.style.transform = 'scale(1)';
                           }}
                           onClick={(e) => {
                             e.stopPropagation();
                             if (onMatchClick) {
                               onMatchClick(match);
                             }
                           }}
                           title={`Click to view match details vs ${opponent}`}
                         >
                           {displayName}
                         </div>
                       );
                     });
                   })()}
                   {(() => {
                     const matches = getMatchesForDate(day);
                     if (matches.length > (isMobile ? 2 : 3)) {
                       return (
                         <div style={{
                           fontSize: isMobile ? '0.3rem' : '0.4rem',
                           color: '#4CAF50',
                           textAlign: 'center',
                           padding: '1px',
                           fontStyle: 'italic'
                         }}>
                           +{matches.length - (isMobile ? 2 : 3)} more
                         </div>
                       );
                     }
                     return null;
                   })()}
                 </div>
               )}
             </div>
          </div>
        ))}
     </div>
     
     {/* Legend */}
     <div style={{
       marginTop: isMobile ? '2px' : '4px',
       fontSize: isMobile ? '0.5rem' : '0.7rem',
       display: 'flex',
       flexDirection: 'column',
       gap: '1px'
     }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '2px' : '4px' }}>
           <div style={{
             width: isMobile ? '6px' : '8px',
             height: isMobile ? '6px' : '8px',
             background: 'transparent',
             border: '1px solid #4CAF50',
             borderRadius: '1px'
           }}></div>
           <span>Today (outline)</span>
         </div>
               {phase1EndDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '2px' : '4px' }}>
            <div style={{
              width: isMobile ? '6px' : '8px',
              height: isMobile ? '6px' : '8px',
              background: '#e74c3c',
              border: '1px solid #c0392b',
              borderRadius: '1px'
            }}></div>
            <span>Phase 1 Deadline ({format(phase1EndDate, 'MMM d, yyyy')})</span>
          </div>
        )}
                                                               <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '2px' : '4px' }}>
            <div style={{
              width: isMobile ? '6px' : '8px',
              height: isMobile ? '6px' : '8px',
              background: 'transparent',
              border: '1px solid #4CAF50',
              borderRadius: '50%',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '2px',
                height: '2px',
                background: '#4CAF50',
                borderRadius: '50%'
              }}></div>
            </div>
            <span>Click scheduled opponent for match details</span>
          </div>
     </div>
   </div>
 );
};

export default Phase1Tracker; 