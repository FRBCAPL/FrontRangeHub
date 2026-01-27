import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable PlayerCard component for displaying player information
 * Designed to be league-agnostic and easily customizable
 */
const PlayerCard = ({ 
  player, 
  onSelect, 
  isSelected = false, 
  showStats = true,
  showActions = true,
  customActions = null,
  showRanking = true,
  showAvailability = false,
  className = '',
  style = {}
}) => {
  const {
    name,
    email,
    phone,
    rank,
    wins,
    losses,
    totalMatches,
    winPercentage,
    currentStreak,
    bestStreak,
    lastPlayed,
    availability,
    status = 'active',
    avatar = null,
    primaryColor = '#e53e3e',
    secondaryColor = '#c53030',
    isOnline = false
  } = player;

  const getStatusColor = () => {
    if (status === 'active') return '#10b981';
    if (status === 'inactive') return '#6b7280';
    if (status === 'suspended') return '#ef4444';
    return '#f59e0b';
  };

  const getStatusText = () => {
    if (status === 'active') return 'Active';
    if (status === 'inactive') return 'Inactive';
    if (status === 'suspended') return 'Suspended';
    return 'Pending';
  };

  const formatLastPlayed = (date) => {
    if (!date) return 'Never';
    const lastPlayedDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - lastPlayedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return lastPlayedDate.toLocaleDateString();
  };

  const getWinRateColor = (percentage) => {
    if (percentage >= 70) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div 
      className={`player-card ${isSelected ? 'selected' : ''} ${className}`}
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
      onClick={() => onSelect && onSelect(player)}
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
      {/* Online Status Indicator */}
      {isOnline && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          boxShadow: '0 0 8px #10b98140',
          border: '2px solid #1a1a1a'
        }} />
      )}

      {/* Status Badge */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
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

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px',
        marginTop: '8px'
      }}>
        {/* Avatar */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          border: `3px solid ${primaryColor}40`,
          position: 'relative'
        }}>
          {avatar ? (
            <img 
              src={avatar} 
              alt={`${name} avatar`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ffffff'
            }}>
              {name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Player Info */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 4px 0',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#ffffff',
            lineHeight: '1.2'
          }}>
            {name}
          </h3>
          
          {email && (
            <p style={{
              margin: '0 0 2px 0',
              fontSize: '0.8rem',
              color: '#aaa',
              lineHeight: '1.3'
            }}>
              {email}
            </p>
          )}

          {phone && (
            <p style={{
              margin: 0,
              fontSize: '0.8rem',
              color: '#888',
              lineHeight: '1.3'
            }}>
              {phone}
            </p>
          )}
        </div>

        {/* Ranking */}
        {showRanking && rank && (
          <div style={{
            textAlign: 'center',
            padding: '8px 12px',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
            border: `1px solid ${primaryColor}40`
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: primaryColor,
              marginBottom: '2px'
            }}>
              #{rank}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Rank
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {showStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: getWinRateColor(winPercentage),
              marginBottom: '4px'
            }}>
              {winPercentage}%
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Win Rate
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '4px'
            }}>
              {wins}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Wins
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#ef4444',
              marginBottom: '4px'
            }}>
              {losses}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Losses
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '4px'
            }}>
              {currentStreak}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Streak
            </div>
          </div>
        </div>
      )}

      {/* Availability */}
      {showAvailability && availability && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '0.8rem',
            color: '#aaa',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Availability
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#888',
            lineHeight: '1.4'
          }}>
            {availability}
          </div>
        </div>
      )}

      {/* Last Played */}
      {lastPlayed && (
        <div style={{
          marginBottom: '16px',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: '#333',
          fontSize: '0.75rem',
          color: '#888',
          textAlign: 'center'
        }}>
          Last played: {formatLastPlayed(lastPlayed)}
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
            <button
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '0.8rem',
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
              View Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
};

PlayerCard.propTypes = {
  player: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string,
    rank: PropTypes.number,
    wins: PropTypes.number,
    losses: PropTypes.number,
    totalMatches: PropTypes.number,
    winPercentage: PropTypes.number,
    currentStreak: PropTypes.number,
    bestStreak: PropTypes.number,
    lastPlayed: PropTypes.string,
    availability: PropTypes.string,
    status: PropTypes.oneOf(['active', 'inactive', 'suspended', 'pending']),
    avatar: PropTypes.string,
    primaryColor: PropTypes.string,
    secondaryColor: PropTypes.string,
    isOnline: PropTypes.bool
  }).isRequired,
  onSelect: PropTypes.func,
  isSelected: PropTypes.bool,
  showStats: PropTypes.bool,
  showActions: PropTypes.bool,
  customActions: PropTypes.node,
  showRanking: PropTypes.bool,
  showAvailability: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object
};

export default PlayerCard;
