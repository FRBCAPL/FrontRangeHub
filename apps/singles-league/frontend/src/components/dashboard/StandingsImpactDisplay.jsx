import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { seasonService } from '@shared/services/seasonService.js';

const StandingsImpactDisplay = ({ 
  currentPhase, 
  seasonData, 
  completedMatches, 
  totalRequiredMatches,
  playerName 
}) => {
  const [standingsImpact, setStandingsImpact] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (currentPhase === 'scheduled' && seasonData && completedMatches) {
      calculateStandingsImpact();
    }
  }, [currentPhase, seasonData, completedMatches, totalRequiredMatches]);

  const calculateStandingsImpact = () => {
    const completedCount = completedMatches.length;
    const remainingCount = totalRequiredMatches - completedCount;
    const completionPercentage = Math.round((completedCount / totalRequiredMatches) * 100);
    
    // Calculate potential standings impact
    const impact = {
      completedCount,
      remainingCount,
      completionPercentage,
      potentialPoints: remainingCount * 2, // Assuming 2 points per match
      maxPossibleRank: calculateMaxPossibleRank(completedCount, totalRequiredMatches),
      minPossibleRank: calculateMinPossibleRank(completedCount, totalRequiredMatches),
      deadlinePassed: seasonService.hasPhase1DeadlinePassed(seasonData)
    };

    setStandingsImpact(impact);
  };

  const calculateMaxPossibleRank = (completed, total) => {
    // If all remaining matches are won, this is the best possible rank
    const potentialWins = completed + (total - completed);
    return Math.max(1, Math.floor(potentialWins / 2)); // Simplified calculation
  };

  const calculateMinPossibleRank = (completed, total) => {
    // If all remaining matches are lost, this is the worst possible rank
    return Math.max(1, completed); // Simplified calculation
  };

  if (!standingsImpact || currentPhase !== 'scheduled') {
    return null;
  }

  const getImpactColor = () => {
    if (standingsImpact.deadlinePassed) return '#ff4444';
    if (standingsImpact.remainingCount >= 4) return '#ff8800';
    if (standingsImpact.remainingCount >= 2) return '#ffaa00';
    return '#00aa00';
  };

  const getImpactMessage = () => {
    if (standingsImpact.deadlinePassed) {
      return `⚠️ DEADLINE PASSED: ${standingsImpact.remainingCount} incomplete matches will affect your final standings`;
    }
    
    if (standingsImpact.remainingCount === 0) {
      return '✅ All Phase 1 matches completed! Your standings are secure.';
    }
    
    return `📊 ${standingsImpact.remainingCount} incomplete matches could impact your standings`;
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${getImpactColor()}15, ${getImpactColor()}25)`,
      border: `2px solid ${getImpactColor()}`,
      borderRadius: '12px',
      padding: '16px',
      margin: '16px 0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          color: getImpactColor(),
          fontSize: '1.1rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Standings Impact
        </h3>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: 'none',
            border: 'none',
            color: getImpactColor(),
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Main Message */}
      <div style={{
        color: '#fff',
        fontSize: '0.95rem',
        lineHeight: '1.4',
        marginBottom: '12px'
      }}>
        {getImpactMessage()}
      </div>

      {/* Progress Bar */}
      <div style={{
        background: '#333',
        borderRadius: '8px',
        height: '8px',
        marginBottom: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${getImpactColor()}, ${getImpactColor()}dd)`,
          height: '100%',
          width: `${standingsImpact.completionPercentage}%`,
          transition: 'width 0.3s ease',
          borderRadius: '8px'
        }} />
      </div>

      {/* Basic Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
        color: '#ccc',
        marginBottom: '8px'
      }}>
        <span>Completed: {standingsImpact.completedCount}/{totalRequiredMatches}</span>
        <span>{standingsImpact.completionPercentage}% complete</span>
      </div>

      {/* Detailed Impact (when expanded) */}
      {showDetails && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: getImpactColor() }}>Potential Impact:</strong>
          </div>
          
          <div style={{ marginBottom: '6px' }}>
            📈 <strong>Best Possible Rank:</strong> #{standingsImpact.maxPossibleRank}
          </div>
          
          <div style={{ marginBottom: '6px' }}>
            📉 <strong>Worst Possible Rank:</strong> #{standingsImpact.minPossibleRank}
          </div>
          
          <div style={{ marginBottom: '6px' }}>
            🎯 <strong>Potential Points at Stake:</strong> {standingsImpact.potentialPoints} points
          </div>
          
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: '#aaa'
          }}>
            💡 <strong>Tip:</strong> Complete your remaining matches to secure the best possible standings position for Phase 2.
          </div>
        </div>
      )}
    </div>
  );
};

export default StandingsImpactDisplay; 