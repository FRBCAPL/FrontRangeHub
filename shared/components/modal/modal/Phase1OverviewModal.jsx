import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const Phase1OverviewModal = ({ 
  isOpen, 
  onClose, 
  isMobile, 
  playerName,
  playerLastName,
  completedMatches,
  totalRequiredMatches,
  playerStats,
  standings,
  timeLeft,
  deadlineStatus,
  phase1EndDate,
  allPlayers,
  selectedDivision
}) => {
  const [leagueStats, setLeagueStats] = useState(null);

  useEffect(() => {
    if (isOpen && allPlayers && standings) {
      calculateLeagueStats();
    }
  }, [isOpen, allPlayers, standings]);

  const calculateLeagueStats = () => {
    if (!allPlayers || !standings) return;

    const totalPlayers = allPlayers.length;
    const playersWithMatches = standings.filter(player => 
      player.matchesCompleted && player.matchesCompleted > 0
    ).length;
    
    const totalMatchesCompleted = standings.reduce((sum, player) => 
      sum + (player.matchesCompleted || 0), 0
    );
    
    const totalMatchesRequired = totalPlayers * totalRequiredMatches;
    const leagueProgress = Math.round((totalMatchesCompleted / totalMatchesRequired) * 100);
    
    // Calculate average completion rate
    const avgCompletion = Math.round((totalMatchesCompleted / totalPlayers) / totalRequiredMatches * 100);
    
    // Find top performers (players with highest completion rates)
    const topPerformers = standings
      .filter(player => player.matchesCompleted > 0)
      .sort((a, b) => {
        const aRate = (a.matchesCompleted || 0) / totalRequiredMatches;
        const bRate = (b.matchesCompleted || 0) / totalRequiredMatches;
        return bRate - aRate;
      })
      .slice(0, 5);

    setLeagueStats({
      totalPlayers,
      playersWithMatches,
      totalMatchesCompleted,
      totalMatchesRequired,
      leagueProgress,
      avgCompletion,
      topPerformers
    });
  };

  const getStatusColor = () => {
    if (deadlineStatus === 'passed') return '#e74c3c';
    if (deadlineStatus === 'critical') return '#ff6b6b';
    if (deadlineStatus === 'urgent') return '#ff8800';
    if (deadlineStatus === 'warning') return '#ffaa00';
    return '#4CAF50';
  };

  const getStatusIcon = () => {
    if (deadlineStatus === 'passed') return '⏰';
    if (deadlineStatus === 'critical') return '🚨';
    if (deadlineStatus === 'urgent') return '⚠️';
    if (deadlineStatus === 'warning') return '⚠️';
    return '✅';
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
                                       <div
                style={{
                  background: `linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(20, 20, 20, 0.95))`,
                  border: `2px solid rgba(255, 255, 255, 0.2)`,
                  borderRadius: isMobile ? '8px' : '12px',
                  padding: isMobile ? '8px' : '12px',
                  width: isMobile ? '88%' : '75%',
                  maxWidth: isMobile ? 'none' : '800px',
                  maxHeight: isMobile ? '75vh' : '70vh',
                  overflow: 'auto',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 4px 16px rgba(255,255,255,0.1)`,
                  backdropFilter: 'blur(12px)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                                               {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isMobile ? '8px' : '12px',
                  paddingBottom: isMobile ? '6px' : '8px',
                  borderBottom: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px'
                  }}>
                    <div style={{
                      fontSize: isMobile ? '1rem' : '1.2rem',
                      color: getStatusColor()
                    }}>
                      {getStatusIcon()}
                    </div>
                    <h2 style={{
                      margin: 0,
                      color: '#ffffff',
                      fontSize: isMobile ? '0.8rem' : '1.1rem',
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}>
                      Phase 1 Overview
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      fontSize: isMobile ? '0.9rem' : '1.1rem',
                      cursor: 'pointer',
                      padding: isMobile ? '4px 8px' : '6px 10px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontWeight: 'bold'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                  >
                    Close
                  </button>
                </div>

                                               {/* Content Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? '8px' : '12px'
                }}>
          
                                                       {/* Left Column - Personal Status */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '8px',
                    padding: isMobile ? '8px' : '12px',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}>
                                                               <h3 style={{
                      margin: '0 0 8px 0',
                      color: '#ffffff',
                      fontSize: isMobile ? '0.7rem' : '0.9rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                    }}>
                      Your Status
                    </h3>

                                                               {/* Personal Progress */}
                    <div style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      padding: isMobile ? '6px' : '8px',
                      marginBottom: isMobile ? '6px' : '8px'
                    }}>
                             <div style={{
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 marginBottom: '4px'
               }}>
                 <span style={{
                   color: '#ffffff',
                   fontSize: isMobile ? '0.7rem' : '0.9rem',
                   fontWeight: '600'
                 }}>
                   Progress
                 </span>
                 <span style={{
                   color: '#4CAF50',
                   fontSize: isMobile ? '0.7rem' : '0.9rem',
                   fontWeight: 'bold'
                 }}>
                   {completedMatches.length}/{totalRequiredMatches}
                 </span>
               </div>
                             <div style={{
                 width: '100%',
                 height: isMobile ? '6px' : '8px',
                 background: 'rgba(255,255,255,0.1)',
                 borderRadius: '4px',
                 overflow: 'hidden'
               }}>
                 <div style={{
                   width: `${Math.round((completedMatches.length / totalRequiredMatches) * 100)}%`,
                   height: '100%',
                   background: `linear-gradient(90deg, ${getStatusColor()}, ${getStatusColor()}dd)`,
                   borderRadius: '4px',
                   transition: 'width 0.4s ease'
                 }} />
               </div>
            </div>

                               {/* Personal Stats */}
                   <div style={{
                     display: 'grid',
                     gridTemplateColumns: '1fr 1fr',
                     gap: isMobile ? '6px' : '8px'
                   }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: isMobile ? '6px' : '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  color: '#cccccc',
                  fontSize: isMobile ? '0.6rem' : '0.8rem',
                  marginBottom: '3px'
                }}>
                  Record
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: isMobile ? '0.8rem' : '1rem',
                  fontWeight: 'bold'
                }}>
                  {playerStats?.wins || 0}-{playerStats?.losses || 0}
                </div>
                <div style={{
                  color: '#4CAF50',
                  fontSize: isMobile ? '0.6rem' : '0.8rem',
                  fontWeight: '600'
                }}>
                  {playerStats?.winRate || 0}%
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: isMobile ? '6px' : '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  color: '#cccccc',
                  fontSize: isMobile ? '0.6rem' : '0.8rem',
                  marginBottom: '3px'
                }}>
                  Position
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: isMobile ? '0.8rem' : '1rem',
                  fontWeight: 'bold'
                }}>
                  {playerStats?.position || 'N/A'}
                </div>
              </div>
            </div>

                         {/* Time Remaining */}
             <div style={{
               background: 'rgba(255,255,255,0.05)',
               borderRadius: '4px',
               padding: isMobile ? '6px' : '8px',
               marginTop: isMobile ? '6px' : '8px',
               textAlign: 'center'
             }}>
               <div style={{
                 color: '#cccccc',
                 fontSize: isMobile ? '0.6rem' : '0.8rem',
                 marginBottom: '4px'
               }}>
                 Time Remaining
               </div>
               <div style={{
                 color: getStatusColor(),
                 fontSize: isMobile ? '0.8rem' : '1rem',
                 fontWeight: 'bold',
                 textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
               }}>
                 {timeLeft?.passed ? 'DEADLINE PASSED' : 
                  timeLeft?.days > 0 ? `${timeLeft.days} days` :
                  timeLeft?.hours > 0 ? `${timeLeft.hours} hours` : 'Less than 1 hour'}
               </div>
                             {phase1EndDate && (
                 <div style={{
                   color: '#cccccc',
                   fontSize: isMobile ? '0.5rem' : '0.7rem',
                   marginTop: '2px'
                 }}>
                   Ends: {format(phase1EndDate, 'MMM d, yyyy')}
                 </div>
               )}
            </div>
          </div>

                     {/* Right Column - League Status */}
           <div style={{
             background: 'rgba(0, 0, 0, 0.4)',
             borderRadius: '8px',
             padding: isMobile ? '8px' : '12px',
             border: '1px solid rgba(255,255,255,0.15)'
           }}>
                         <h3 style={{
               margin: '0 0 8px 0',
               color: '#ffffff',
               fontSize: isMobile ? '0.7rem' : '0.9rem',
               fontWeight: 'bold',
               textAlign: 'center',
               textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
             }}>
               League Status
             </h3>

            {leagueStats ? (
              <>
                                 {/* League Progress */}
                 <div style={{
                   background: 'rgba(255,255,255,0.05)',
                   borderRadius: '4px',
                   padding: isMobile ? '6px' : '8px',
                   marginBottom: isMobile ? '6px' : '8px'
                 }}>
                                     <div style={{
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center',
                     marginBottom: '4px'
                   }}>
                     <span style={{
                       color: '#ffffff',
                       fontSize: isMobile ? '0.7rem' : '0.9rem',
                       fontWeight: '600'
                     }}>
                       League Progress
                     </span>
                     <span style={{
                       color: '#4CAF50',
                       fontSize: isMobile ? '0.7rem' : '0.9rem',
                       fontWeight: 'bold'
                     }}>
                       {leagueStats.leagueProgress}%
                     </span>
                   </div>
                                     <div style={{
                     width: '100%',
                     height: isMobile ? '6px' : '8px',
                     background: 'rgba(255,255,255,0.1)',
                     borderRadius: '4px',
                     overflow: 'hidden'
                   }}>
                     <div style={{
                       width: `${leagueStats.leagueProgress}%`,
                       height: '100%',
                       background: 'linear-gradient(90deg, #4CAF50, #45a049)',
                       borderRadius: '4px',
                       transition: 'width 0.4s ease'
                     }} />
                   </div>
                </div>

                                 {/* League Stats */}
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: '1fr 1fr',
                   gap: isMobile ? '4px' : '6px',
                   marginBottom: isMobile ? '6px' : '8px'
                 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    padding: isMobile ? '4px' : '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      color: '#cccccc',
                      fontSize: isMobile ? '0.5rem' : '0.7rem',
                      marginBottom: '2px'
                    }}>
                      Active Players
                    </div>
                    <div style={{
                      color: '#ffffff',
                      fontSize: isMobile ? '0.7rem' : '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      {leagueStats.playersWithMatches}/{leagueStats.totalPlayers}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    padding: isMobile ? '4px' : '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      color: '#cccccc',
                      fontSize: isMobile ? '0.5rem' : '0.7rem',
                      marginBottom: '2px'
                    }}>
                      Avg Completion
                    </div>
                    <div style={{
                      color: '#ffffff',
                      fontSize: isMobile ? '0.7rem' : '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      {leagueStats.avgCompletion}%
                    </div>
                  </div>
                </div>

                {/* Top Performers */}
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                  padding: isMobile ? '6px' : '8px'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: isMobile ? '0.7rem' : '0.9rem',
                    fontWeight: '600',
                    marginBottom: '4px',
                    textAlign: 'center'
                  }}>
                    Top Performers
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {leagueStats.topPerformers.map((player, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '4px'
                      }}>
                        <span style={{
                          color: '#ffffff',
                          fontSize: isMobile ? '0.5rem' : '0.7rem',
                          fontWeight: index === 0 ? 'bold' : 'normal'
                        }}>
                          {index + 1}. {player.name}
                        </span>
                        <span style={{
                          color: '#4CAF50',
                          fontSize: isMobile ? '0.5rem' : '0.7rem',
                          fontWeight: '600'
                        }}>
                          {Math.round((player.matchesCompleted / totalRequiredMatches) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                color: '#cccccc',
                textAlign: 'center',
                fontSize: isMobile ? '0.9rem' : '1.1rem',
                padding: '20px'
              }}>
                Loading league statistics...
              </div>
            )}
          </div>
        </div>

                 {/* Footer */}
         <div style={{
           marginTop: isMobile ? '8px' : '12px',
           paddingTop: isMobile ? '6px' : '8px',
           borderTop: '1px solid rgba(255,255,255,0.2)',
           textAlign: 'center'
         }}>
           <div style={{
             color: '#cccccc',
             fontSize: isMobile ? '0.5rem' : '0.7rem',
             fontStyle: 'italic',
             marginBottom: isMobile ? '8px' : '12px'
           }}>
             Phase 1 ends when all players complete {totalRequiredMatches} matches or the deadline passes
           </div>
           
           {/* Bottom Close Button */}
           <button
             onClick={onClose}
             style={{
               background: 'linear-gradient(135deg, #4CAF50, #45a049)',
               border: 'none',
               color: '#ffffff',
               fontSize: isMobile ? '0.8rem' : '1rem',
               cursor: 'pointer',
               padding: isMobile ? '8px 16px' : '10px 20px',
               borderRadius: '6px',
               transition: 'all 0.2s ease',
               fontWeight: 'bold',
               boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
               minWidth: isMobile ? '100px' : '120px'
             }}
             onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
             onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
           >
             Close Overview
           </button>
         </div>
      </div>
    </div>
  );
};

export default Phase1OverviewModal;
