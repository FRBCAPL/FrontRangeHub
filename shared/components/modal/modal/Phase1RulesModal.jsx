import React from 'react';

export default function Phase1RulesModal({ isOpen, onClose, isMobile }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '10px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        border: '2px solid #4CAF50',
        borderRadius: '12px',
        width: isMobile ? '98%' : '50%',
        maxWidth: '500px',
        height: isMobile ? '98%' : '90vh',
        maxHeight: '800px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        color: '#ffffff'
      }}>
        {/* Header */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '2px solid #4CAF50',
          flexShrink: 0
        }}>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? '1.2rem' : '1.5rem',
            color: '#ffffff',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'center'
          }}>
            🎯 Phase 1 Scheduled Opponents Rules
          </h2>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '2rem',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '25px',
          fontSize: isMobile ? '1rem' : '1.1rem',
          lineHeight: '1.6'
        }}>
          
          {/* Overview */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{
              color: '#4CAF50',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📅 Overview
            </h3>
            <p style={{ margin: '0 0 15px 0', color: '#e0e0e0' }}>
              Phase 1 covers Weeks 1-6 where each player is assigned specific opponents to schedule and complete matches with.
            </p>
            <p style={{ margin: '0 0 15px 0', color: '#e0e0e0' }}>
              This phase focuses on completing your assigned matches with maximum scheduling flexibility.
            </p>
          </div>

          {/* Opponent Assignment */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{
              color: '#4CAF50',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              👥 Opponent Assignment
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0'
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Assigned Opponents:</strong> Each player is assigned 6 opponents at the start of the session
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Match Requirements:</strong> You must complete 1 match against each of your 6 assigned opponents
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Total Matches:</strong> 6 matches total during Phase 1
              </li>
            </ul>
          </div>

          {/* Scheduling Flexibility */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{
              color: '#4CAF50',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⏰ Scheduling Flexibility
            </h3>
            <div style={{
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <p style={{ margin: '0 0 10px 0', color: '#4CAF50', fontWeight: 'bold' }}>
                Maximum scheduling flexibility for your convenience:
              </p>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                color: '#e0e0e0'
              }}>
                <li style={{ marginBottom: '5px' }}>
                  <strong>Any Day:</strong> Matches may be played on any day of the week
                </li>
                <li style={{ marginBottom: '5px' }}>
                  <strong>Any Time:</strong> Matches may be played at any time that works for both players
                </li>
                <li style={{ marginBottom: '5px' }}>
                  <strong>Any Location:</strong> Matches may be played at any safe, mutually agreed location
                </li>
              </ul>
            </div>
          </div>

          {/* Completion Deadline */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{
              color: '#4CAF50',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⏳ Completion Deadline
            </h3>
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <p style={{ margin: '0 0 10px 0', color: '#ffc107', fontWeight: 'bold' }}>
                All Phase 1 matches must be completed by the end of Week 6
              </p>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                color: '#e0e0e0'
              }}>
                <li style={{ marginBottom: '5px' }}>
                  <strong>Deadline:</strong> End of Week 6 (Sunday at 11:59 PM)
                </li>
                <li style={{ marginBottom: '5px' }}>
                  <strong>No Extensions:</strong> Phase 1 deadline is firm and cannot be extended
                </li>
                <li style={{ marginBottom: '5px' }}>
                  <strong>Impact:</strong> Incomplete matches may affect your standings and Phase 2 eligibility
                </li>
              </ul>
            </div>
          </div>

          {/* Match Rules */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{
              color: '#4CAF50',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎱 Match Rules
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0'
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Standard Rules:</strong> All matches use the official CSI rule book
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Scoring:</strong> All scoring must be done with the BCAPL scoring app
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Payment:</strong> Standard match payment and fees apply
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>FargoRate:</strong> All matches are integrated with FargoRate for ratings
              </li>
            </ul>
          </div>

          {/* Scheduling Process */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{
              color: '#4CAF50',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📋 Scheduling Process
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0'
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Contact Opponents:</strong> Reach out to your assigned opponents to schedule matches
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Mutual Agreement:</strong> Both players must agree on date, time, and location
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Record Matches:</strong> All scheduled matches must be recorded in the League Scheduling Hub
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Communication:</strong> Use the message center to coordinate with opponents
              </li>
            </ul>
          </div>

          {/* Important Notes */}
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '20px'
          }}>
            <h4 style={{
              color: '#ff4444',
              fontSize: isMobile ? '1rem' : '1.1rem',
              margin: '0 0 10px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ Important Notes
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: '#e0e0e0',
              fontSize: isMobile ? '0.85rem' : '0.9rem'
            }}>
              <li style={{ marginBottom: '5px' }}>
                Phase 1 results determine your standings position for Phase 2 challenges
              </li>
              <li style={{ marginBottom: '5px' }}>
                Incomplete matches may result in forfeits and affect your overall standings
              </li>
              <li style={{ marginBottom: '5px' }}>
                All matches must be completed and recorded before Phase 2 begins
              </li>
              <li style={{ marginBottom: '5px' }}>
                Use the calendar feature to track your scheduled matches and deadlines
              </li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
              border: 'none',
              color: '#ffffff',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: 'bold',
              padding: isMobile ? '10px 20px' : '12px 25px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            }}
          >
            Got It! ✓
          </button>
        </div>
      </div>
    </div>
  );
}
