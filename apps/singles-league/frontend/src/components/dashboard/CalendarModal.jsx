import React, { useState } from 'react';
import { format } from 'date-fns';

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
  
  // Calculate how many empty cells are in the last row
  const totalCells = calendarDays.length;
  const emptyCellsInLastRow = 7 - (totalCells % 7);
  
  // Add empty cells to complete the last row
  for (let i = 0; i < emptyCellsInLastRow; i++) {
    calendarDays.push(null);
  }
  
  // Simple check: if there are 3 or more empty cells, we need more margin
  const needsMoreMargin = emptyCellsInLastRow >= 3;
  
  // Debug logging
  console.log(`Calendar debug: totalCells=${totalCells}, emptyCellsInLastRow=${emptyCellsInLastRow}, needsMoreMargin=${needsMoreMargin}`);
  
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
            fontSize: isMobile ? '0.9rem' : '1rem',
            cursor: 'pointer',
            padding: isMobile ? '4px 6px' : '6px 8px',
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
          fontSize: isMobile ? '1rem' : '1.2rem',
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
            fontSize: isMobile ? '0.9rem' : '1rem',
            cursor: 'pointer',
            padding: isMobile ? '4px 6px' : '6px 8px',
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
        marginBottom: isMobile ? '2px' : '3px'
      }}>
        {dayNames.map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            fontWeight: 'bold',
            color: '#cccccc',
            padding: isMobile ? '2px 1px' : '3px 1px',
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
                             width: isMobile ? '450px' : '800px',
               height: isMobile ? '280px' : '400px',
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
              aspectRatio: '1.2',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: 'bold',
              borderRadius: '2px',
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
                 fontSize: isMobile ? '0.8rem' : '0.9rem',
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
                       const displayName = opponent.length > (isMobile ? 8 : 10) ? 
                         opponent.substring(0, isMobile ? 8 : 10) + '...' : opponent;
                       
                       return (
                         <div
                           key={match._id || index}
                           style={{
                             fontSize: isMobile ? '0.5rem' : '0.6rem',
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
                           fontSize: isMobile ? '0.4rem' : '0.5rem',
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
                     marginTop: (() => {
             const margin = needsMoreMargin ? (isMobile ? '60px' : '80px') : (isMobile ? '20px' : '24px');
             console.log(`Legend margin: needsMoreMargin=${needsMoreMargin}, isMobile=${isMobile}, margin=${margin}`);
             return margin;
           })(),
        fontSize: isMobile ? '0.7rem' : '0.8rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: isMobile ? '12px' : '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px' }}>
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

const CalendarModal = ({ 
  isOpen, 
  onClose, 
  isMobile, 
  phase1EndDate, 
  upcomingMatches, 
  playerName, 
  playerLastName, 
  onOpenOpponentsModal, 
  onMatchClick,
  onSmartMatchClick
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!isOpen) return null;

  return (
         <div 
       style={{
         position: 'fixed',
         top: 0,
         left: 0,
         right: 0,
         bottom: 0,
         background: 'rgba(0, 0, 0, 0.7)',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         zIndex: 10000,
         backdropFilter: 'blur(3px)',
         WebkitBackdropFilter: 'blur(3px)',
                   padding: '60px'
       }}
      onClick={onClose}
    >
                           <div 
          style={{
            background: isMobile ? `rgba(0, 0, 0, 0.9)` : 'linear-gradient(120deg, #232323 80%, #2a0909 100%)',
            border: isMobile ? `2px solid rgba(255, 255, 255, 0.3)` : '2px solid #e53e3e',
            borderRadius: isMobile ? '16px' : '1.2rem',
            padding: isMobile ? '12px' : '0',
            width: isMobile ? '95%' : 'auto',
            maxWidth: isMobile ? 'none' : '700px',
            minWidth: isMobile ? 'auto' : '400px',
            boxShadow: isMobile ? `0 8px 32px rgba(0,0,0,0.6)` : '0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)',
            backdropFilter: isMobile ? 'blur(12px)' : 'none',
            maxHeight: isMobile ? '80%' : '65vh',
            overflow: 'auto',
            margin: isMobile ? '0' : '0 auto',
            animation: 'modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)',
            display: 'flex',
            flexDirection: 'column'
          }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'relative',
          textAlign: 'center',
          marginBottom: isMobile ? '12px' : '0',
          padding: isMobile ? '8px' : '1.1rem 1.5rem 0.7rem 1.5rem',
          borderRadius: isMobile ? '12px' : '1.2rem 1.2rem 0 0',
          background: isMobile ? 'rgba(0, 0, 0, 0.6)' : '#e53e3e',
          border: isMobile ? '1px solid rgba(255,255,255,0.2)' : 'none',
          boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isMobile ? 'default' : 'grab',
          userSelect: 'none'
        }}>
          {!isMobile && (
            <span 
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "5px",
                background: "linear-gradient(90deg, #fff0 0%, #e53e3e 60%, #fff0 100%)",
                borderTopLeftRadius: "1.2rem",
                borderTopRightRadius: "1.2rem",
                pointerEvents: "none"
              }}
            ></span>
          )}
           <h3 style={{
             margin: 0,
             color: '#ffffff',
             fontSize: isMobile ? '1.2rem' : '1.3rem',
             fontWeight: 'bold',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             textShadow: isMobile ? '2px 2px 4px rgba(0,0,0,0.8)' : '0 1px 12px #000a',
             letterSpacing: isMobile ? '0.5px' : '0.02em',
             wordBreak: 'break-word',
             minWidth: 0
           }}>
             <span style={{ 
               fontSize: isMobile ? '1rem' : '1.3rem',
               background: isMobile ? `linear-gradient(45deg, #4CAF50, #4CAF50dd)` : 'none',
               padding: isMobile ? '8px 16px' : '0',
               borderRadius: isMobile ? '8px' : '0',
               boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.4)' : 'none'
             }}>
               📅 Phase 1 Calendar
             </span>
           </h3>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: isMobile ? '8px' : '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: isMobile ? 'rgba(255, 255, 255, 0.1)' : 'none',
              border: isMobile ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
              color: '#ffffff',
              fontSize: isMobile ? '1.2rem' : '2em',
              cursor: 'pointer',
              padding: '0',
              width: isMobile ? '32px' : 'auto',
              height: isMobile ? '32px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isMobile ? '50%' : '0',
              transition: 'all 0.2s ease',
              fontWeight: 'bold',
              lineHeight: 1,
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              if (isMobile) {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1.1)';
              } else {
                e.target.style.color = '#ffd6d6';
              }
            }}
            onMouseLeave={(e) => {
              if (isMobile) {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'scale(1)';
              } else {
                e.target.style.color = '#ffffff';
              }
            }}
          >
            ×
          </button>
        </div>
        
        {/* Content Container */}
                 <div style={{
           padding: isMobile ? '0' : '0.8rem',
           flex: 1,
           overflow: 'auto',
           maxHeight: 'calc(100vh - 200px)' // Ensure modal doesn't exceed viewport height
         }}>
          {/* Instructions */}
          <div style={{
            background: 'rgba(76, 175, 80, 0.15)',
            border: '1px solid rgba(76, 175, 80, 0.4)',
            borderRadius: '12px',
            padding: isMobile ? '6px' : '10px',
            marginBottom: isMobile ? '6px' : '10px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isMobile ? '0.8rem' : '1rem',
              color: '#ffffff',
              fontWeight: 'bold',
              marginBottom: isMobile ? '3px' : '4px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}>
              📅 Click any date to see opponents available for that day
            </div>
            <div style={{
              fontSize: isMobile ? '0.7rem' : '0.9rem',
              color: '#cccccc',
              fontStyle: 'italic',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}>
              💡 Or click the Progress meter on the home screen to see all available opponents
            </div>
            <div style={{
              fontSize: isMobile ? '0.7rem' : '0.9rem',
              color: '#cccccc',
              fontStyle: 'italic',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              marginTop: isMobile ? '2px' : '3px',
              marginBottom: isMobile ? '4px' : '6px'
            }}>
              🤖 Smart Match pairs you with assigned opponents based on matching availability
            </div>
                         <button
               onClick={() => {
                 console.log('🎯 Calendar Modal: Smart Match button clicked');
                 if (onSmartMatchClick) {
                   console.log('🎯 Calendar Modal: Calling onSmartMatchClick');
                   onSmartMatchClick();
                 } else {
                   console.log('❌ Calendar Modal: onSmartMatchClick is not defined');
                   alert('Smart Match functionality is not available. Please try again.');
                 }
               }}
               style={{
                 background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.3), rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.1))',
                 border: '1px solid rgba(255, 193, 7, 0.4)',
                 color: '#ffffff',
                 fontSize: isMobile ? '0.7rem' : '0.8rem',
                 fontWeight: 'bold',
                 cursor: 'pointer',
                 padding: isMobile ? '8px 12px' : '10px 16px',
                 borderRadius: '8px',
                 transition: 'all 0.3s ease',
                 textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                 boxShadow: '0 2px 8px rgba(255, 193, 7, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '4px',
                 margin: '0 auto',
                 zIndex: 10
               }}
               onMouseEnter={(e) => {
                 e.target.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.4), rgba(255, 193, 7, 0.3), rgba(255, 193, 7, 0.2))';
                 e.target.style.transform = 'scale(1.02) translateY(-1px)';
                 e.target.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
               }}
               onMouseLeave={(e) => {
                 e.target.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.3), rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.1))';
                 e.target.style.transform = 'scale(1)';
                 e.target.style.boxShadow = '0 2px 8px rgba(255, 193, 7, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
               }}
             >
               🤖 Smart Match
             </button>
          </div>
          
          {/* Calendar Grid */}
          <CalendarGrid 
            phase1EndDate={phase1EndDate}
            isMobile={isMobile}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onOpenOpponentsModal={onOpenOpponentsModal}
            upcomingMatches={upcomingMatches}
            playerName={playerName}
            playerLastName={playerLastName}
            onMatchClick={onMatchClick}
            onDateSelect={(selectedDate) => {
              console.log('🎯 Calendar Modal: Date selected:', selectedDate);
              if (onOpenOpponentsModal) {
                console.log('🎯 Calendar Modal: Calling onOpenOpponentsModal');
                onOpenOpponentsModal(selectedDate);
              } else {
                console.log('❌ Calendar Modal: onOpenOpponentsModal is not defined');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;
