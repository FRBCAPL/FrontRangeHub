import React, { useState, useEffect } from 'react';
import { format, differenceInDays, differenceInHours, isAfter, isBefore } from 'date-fns';

const DeadlineTracker = ({ currentPhase, seasonData, completedMatches, totalRequiredMatches }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [deadlineStatus, setDeadlineStatus] = useState('normal');
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!seasonData || currentPhase !== 'scheduled') {
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = () => {
      const now = new Date();
      const phase1End = new Date(seasonData.phase1End);
      
      if (isAfter(now, phase1End)) {
        // Deadline has passed
        setTimeLeft({ days: 0, hours: 0, passed: true });
        setDeadlineStatus('passed');
        setShowWarning(true);
      } else {
        // Deadline is approaching
        const daysLeft = differenceInDays(phase1End, now);
        const hoursLeft = differenceInHours(phase1End, now) % 24;
        
        setTimeLeft({ days: daysLeft, hours: hoursLeft, passed: false });
        
        // Set warning levels
        if (daysLeft <= 0 && hoursLeft <= 24) {
          setDeadlineStatus('critical');
          setShowWarning(true);
        } else if (daysLeft <= 2) {
          setDeadlineStatus('urgent');
          setShowWarning(true);
        } else if (daysLeft <= 7) {
          setDeadlineStatus('warning');
          setShowWarning(true);
        } else {
          setDeadlineStatus('normal');
          setShowWarning(false);
        }
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [seasonData, currentPhase]);

  if (!timeLeft || currentPhase !== 'scheduled') {
    return null;
  }

  const getStatusColor = () => {
    switch (deadlineStatus) {
      case 'critical': return '#ff4444';
      case 'urgent': return '#ff8800';
      case 'warning': return '#ffaa00';
      case 'passed': return '#cc0000';
      default: return '#00aa00';
    }
  };

  const getStatusMessage = () => {
    const completedCount = completedMatches.length;
    const remainingCount = totalRequiredMatches - completedCount;
    
    if (deadlineStatus === 'passed') {
      return `⚠️ PHASE 1 DEADLINE PASSED! You have ${remainingCount} incomplete matches.`;
    } else if (deadlineStatus === 'critical') {
      return `🚨 CRITICAL: Phase 1 ends in ${timeLeft.hours} hours! You have ${remainingCount} matches to complete.`;
    } else if (deadlineStatus === 'urgent') {
      return `⚠️ URGENT: Phase 1 ends in ${timeLeft.days} days! You have ${remainingCount} matches to complete.`;
    } else if (deadlineStatus === 'warning') {
      return `⚠️ WARNING: Phase 1 ends in ${timeLeft.days} days. You have ${remainingCount} matches to complete.`;
    } else {
      return `📅 Phase 1 ends in ${timeLeft.days} days. You have ${remainingCount} matches to complete.`;
    }
  };

  const getProgressPercentage = () => {
    return Math.round((completedMatches.length / totalRequiredMatches) * 100);
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${getStatusColor()}15, ${getStatusColor()}25)`,
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '12px',
      padding: '16px',
      margin: '16px 0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern for urgency */}
      {deadlineStatus === 'critical' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            ${getStatusColor()}10 10px,
            ${getStatusColor()}10 20px
          )`,
          pointerEvents: 'none'
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: 0,
            color: getStatusColor(),
            fontSize: '1.1rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {deadlineStatus === 'critical' && '🚨'}
            {deadlineStatus === 'urgent' && '⚠️'}
            {deadlineStatus === 'warning' && '⚠️'}
            {deadlineStatus === 'passed' && '⏰'}
            {deadlineStatus === 'normal' && '📅'}
            Phase 1 Deadline Tracker
          </h3>
          
          <div style={{
            fontSize: '0.9rem',
            color: getStatusColor(),
            fontWeight: 'bold'
          }}>
            {timeLeft.passed ? (
              'DEADLINE PASSED'
            ) : (
              `${timeLeft.days}d ${timeLeft.hours}h`
            )}
          </div>
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
            background: `linear-gradient(90deg, ${getStatusColor()}, ${getStatusColor()}dd)`,
            height: '100%',
            width: `${getProgressPercentage()}%`,
            transition: 'width 0.3s ease',
            borderRadius: '8px'
          }} />
        </div>

        {/* Status Message */}
        <div style={{
          color: '#fff',
          fontSize: '0.95rem',
          lineHeight: '1.4',
          marginBottom: '8px'
        }}>
          {getStatusMessage()}
        </div>

        {/* Progress Details */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          color: '#ccc'
        }}>
          <span>Progress: {completedMatches.length}/{totalRequiredMatches} matches completed</span>
          <span>{getProgressPercentage()}% complete</span>
        </div>

        {/* Deadline Date */}
        <div style={{
          fontSize: '0.8rem',
          color: '#999',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          Phase 1 ends: {format(new Date(seasonData.phase1End), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>
    </div>
  );
};

export default DeadlineTracker; 