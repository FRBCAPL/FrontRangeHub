import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable LeagueCard component for displaying league information
 * Designed to be league-agnostic and easily customizable
 */
const LeagueCard = ({ 
  league, 
  onSelect, 
  isSelected = false, 
  showStats = true,
  showActions = true,
  customActions = null,
  className = '',
  style = {}
}) => {
  const {
    name,
    description,
    playerCount,
    currentPhase,
    totalMatches,
    completedMatches,
    startDate,
    endDate,
    status = 'active',
    logo = null,
    primaryColor = '#e53e3e',
    secondaryColor = '#c53030'
  } = league;

  const completionRate = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isPending = status === 'pending';

  const getStatusColor = () => {
    if (isActive) return '#10b981';
    if (isCompleted) return '#3b82f6';
    if (isPending) return '#f59e0b';
    return '#6b7280';
  };

  const getStatusText = () => {
    if (isActive) return 'Active';
    if (isCompleted) return 'Completed';
    if (isPending) return 'Pending';
    return 'Inactive';
  };

  return (
    <div 
      className={`league-card ${isSelected ? 'selected' : ''} ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
        border: `2px solid ${isSelected ? primaryColor : '#333'}`,
        borderRadius: '12px',
        padding: '20px',
        margin: '8px 0',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isSelected 
          ? `0 8px 25px rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0.3)`
          : '0 4px 12px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      onClick={() => onSelect && onSelect(league)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 25px rgba(0, 0, 0, 0.3)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isSelected 
          ? `0 8px 25px rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0.3)`
          : '0 4px 12px rgba(0, 0, 0, 0.2)';
      }}
    >
      {/* Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          boxShadow: `0 0 8px ${getStatusColor()}40`
        }} />
        <span style={{
          fontSize: '0.75rem',
          color: '#888',
          fontWeight: '500'
        }}>
          {getStatusText()}
        </span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        {logo && (
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img 
              src={logo} 
              alt={`${name} logo`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 4px 0',
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#ffffff',
            lineHeight: '1.2'
          }}>
            {name}
          </h3>
          
          {description && (
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#aaa',
              lineHeight: '1.4'
            }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {showStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: primaryColor,
              marginBottom: '4px'
            }}>
              {playerCount}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Players
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '4px'
            }}>
              {completionRate}%
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Complete
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '4px'
            }}>
              {currentPhase}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Phase
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}>
          <span style={{
            fontSize: '0.875rem',
            color: '#aaa',
            fontWeight: '500'
          }}>
            Progress
          </span>
          <span style={{
            fontSize: '0.875rem',
            color: '#888'
          }}>
            {completedMatches}/{totalMatches} matches
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#333',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${completionRate}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

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
                fontSize: '0.875rem',
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
          )}
        </div>
      )}

      {/* Date Range */}
      {(startDate || endDate) && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #333',
          fontSize: '0.75rem',
          color: '#666',
          textAlign: 'center'
        }}>
          {startDate && endDate ? (
            `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
          ) : startDate ? (
            `Started: ${new Date(startDate).toLocaleDateString()}`
          ) : endDate ? (
            `Ends: ${new Date(endDate).toLocaleDateString()}`
          ) : null}
        </div>
      )}
    </div>
  );
};

LeagueCard.propTypes = {
  league: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    playerCount: PropTypes.number,
    currentPhase: PropTypes.string,
    totalMatches: PropTypes.number,
    completedMatches: PropTypes.number,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    status: PropTypes.oneOf(['active', 'completed', 'pending', 'inactive']),
    logo: PropTypes.string,
    primaryColor: PropTypes.string,
    secondaryColor: PropTypes.string
  }).isRequired,
  onSelect: PropTypes.func,
  isSelected: PropTypes.bool,
  showStats: PropTypes.bool,
  showActions: PropTypes.bool,
  customActions: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object
};

export default LeagueCard;
