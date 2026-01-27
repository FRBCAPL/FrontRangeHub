import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable MatchCard component for displaying match information
 * Designed to be league-agnostic and easily customizable
 */
const MatchCard = ({ 
  match, 
  onSelect, 
  isSelected = false, 
  showActions = true,
  customActions = null,
  showDetails = true,
  showScores = true,
  className = '',
  style = {}
}) => {
  const {
    id,
    player1,
    player2,
    player1Score,
    player2Score,
    status = 'scheduled',
    date,
    time,
    location,
    division,
    phase,
    winner,
    notes,
    primaryColor = '#e53e3e',
    secondaryColor = '#c53030'
  } = match;

  const getStatusColor = () => {
    if (status === 'completed') return '#10b981';
    if (status === 'in_progress') return '#f59e0b';
    if (status === 'cancelled') return '#ef4444';
    if (status === 'scheduled') return '#3b82f6';
    return '#6b7280';
  };

  const getStatusText = () => {
    if (status === 'completed') return 'Completed';
    if (status === 'in_progress') return 'In Progress';
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'scheduled') return 'Scheduled';
    return 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr;
  };

  const getWinnerStyle = (playerName) => {
    if (status !== 'completed' || !winner) return {};
    return {
      color: winner === playerName ? '#10b981' : '#6b7280',
      fontWeight: winner === playerName ? '700' : '400'
    };
  };

  const getScoreDisplay = (score1, score2, playerName) => {
    if (status === 'scheduled') return '-';
    if (status === 'cancelled') return 'CANCELLED';
    return score1 !== undefined && score2 !== undefined ? 
      `${score1} - ${score2}` : 'TBD';
  };

  return (
    <div 
      className={`match-card ${isSelected ? 'selected' : ''} ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
        border: `2px solid ${isSelected ? primaryColor : '#333'}`,
        borderRadius: '12px',
        padding: '16px',
        margin: '8px 0',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: isSelected 
          ? `0 8px 25px rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0.3)`
          : '0 4px 12px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      onClick={() => onSelect && onSelect(match)}
      onMouseEnter={(e) => {
        if (onSelect) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 8px 25px rgba(0, 0, 0, 0.3)`;
        }
      }}
      onMouseLeave={(e) => {
        if (onSelect) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isSelected 
            ? `0 8px 25px rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0.3)`
            : '0 4px 12px rgba(0, 0, 0, 0.2)';
        }
      }}
    >
      {/* Status Badge */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: `${getStatusColor()}20`,
        border: `1px solid ${getStatusColor()}40`
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: getStatusColor()
        }} />
        <span style={{
          fontSize: '0.7rem',
          color: getStatusColor(),
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {getStatusText()}
        </span>
      </div>

      {/* Match Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '600',
            color: '#ffffff',
            lineHeight: '1.2'
          }}>
            {player1} vs {player2}
          </h3>
          
          {division && (
            <span style={{
              fontSize: '0.75rem',
              color: '#888',
              padding: '2px 8px',
              borderRadius: '8px',
              backgroundColor: '#333',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {division}
            </span>
          )}
        </div>

        {/* Date and Time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.8rem',
          color: '#aaa'
        }}>
          <span>📅 {formatDate(date)}</span>
          {time && <span>🕐 {formatTime(time)}</span>}
          {location && <span>📍 {location}</span>}
        </div>
      </div>

      {/* Players and Scores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        {/* Player 1 */}
        <div style={{
          textAlign: 'right',
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: '#333',
          border: winner === player1 ? `2px solid #10b981` : '2px solid transparent'
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '4px',
            ...getWinnerStyle(player1)
          }}>
            {player1}
          </div>
          {winner === player1 && (
            <div style={{
              fontSize: '0.7rem',
              color: '#10b981',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              Winner
            </div>
          )}
        </div>

        {/* VS / Score */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#888',
          fontWeight: '600'
        }}>
          {showScores ? (
            <div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '2px'
              }}>
                {getScoreDisplay(player1Score, player2Score)}
              </div>
              <div style={{ fontSize: '0.7rem' }}>Score</div>
            </div>
          ) : (
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: primaryColor
            }}>
              VS
            </div>
          )}
        </div>

        {/* Player 2 */}
        <div style={{
          textAlign: 'left',
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: '#333',
          border: winner === player2 ? `2px solid #10b981` : '2px solid transparent'
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '4px',
            ...getWinnerStyle(player2)
          }}>
            {player2}
          </div>
          {winner === player2 && (
            <div style={{
              fontSize: '0.7rem',
              color: '#10b981',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              Winner
            </div>
          )}
        </div>
      </div>

      {/* Additional Details */}
      {showDetails && (
        <div style={{ marginBottom: '16px' }}>
          {phase && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '0.8rem',
              color: '#aaa'
            }}>
              <span>🎯 Phase {phase}</span>
            </div>
          )}
          
          {notes && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#333',
              fontSize: '0.75rem',
              color: '#888',
              lineHeight: '1.4'
            }}>
              📝 {notes}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          {customActions || (
            <>
              {status === 'scheduled' && (
                <button
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Schedule
                </button>
              )}
              
              {status === 'in_progress' && (
                <button
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Update Score
                </button>
              )}
              
              <button
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                View Details
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

MatchCard.propTypes = {
  match: PropTypes.shape({
    id: PropTypes.string.isRequired,
    player1: PropTypes.string.isRequired,
    player2: PropTypes.string.isRequired,
    player1Score: PropTypes.number,
    player2Score: PropTypes.number,
    status: PropTypes.oneOf(['scheduled', 'in_progress', 'completed', 'cancelled']),
    date: PropTypes.string,
    time: PropTypes.string,
    location: PropTypes.string,
    division: PropTypes.string,
    phase: PropTypes.string,
    winner: PropTypes.string,
    notes: PropTypes.string,
    primaryColor: PropTypes.string,
    secondaryColor: PropTypes.string
  }).isRequired,
  onSelect: PropTypes.func,
  isSelected: PropTypes.bool,
  showActions: PropTypes.bool,
  customActions: PropTypes.node,
  showDetails: PropTypes.bool,
  showScores: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object
};

export default MatchCard;
