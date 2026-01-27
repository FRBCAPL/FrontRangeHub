import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import './OverdueMatchesManager.css';

const OverdueMatchesManager = ({ selectedLadder, userPin }) => {
  const [overdueMatches, setOverdueMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOverdueMatches();
  }, [selectedLadder]);

  const loadOverdueMatches = async () => {
    setLoading(true);
    try {
      // Fetch all matches for the selected ladder
      const response = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${selectedLadder}/matches`);
      
      if (response.ok) {
        const allMatches = await response.json();
        
        // Filter for overdue status
        const overdue = allMatches.filter(m => m.status === 'overdue');
        
        setOverdueMatches(overdue);
      } else {
        console.error('Failed to load matches');
      }
    } catch (error) {
      console.error('Error loading overdue matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveMatch = async (match, action) => {
    let confirmMessage = '';
    
    switch(action) {
      case 'cancel':
        confirmMessage = `Cancel this match?\n\n${match.player1?.firstName} ${match.player1?.lastName} vs ${match.player2?.firstName} ${match.player2?.lastName}\n\nThis will remove the match from the system with no position changes.`;
        break;
      case 'reschedule':
        const newDate = prompt(`Reschedule this match to (YYYY-MM-DD):`);
        if (!newDate) return;
        
        try {
          const response = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${selectedLadder}/matches/${match._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scheduledDate: new Date(newDate).toISOString(),
              status: 'scheduled'
            }),
          });

          if (response.ok) {
            setMessage(`✅ Match rescheduled to ${newDate}`);
            await loadOverdueMatches();
          } else {
            setMessage('❌ Failed to reschedule match');
          }
        } catch (error) {
          console.error('Error rescheduling match:', error);
          setMessage('❌ Error rescheduling match');
        }
        return;
    }
    
    if (!confirm(confirmMessage)) return;

    try {
      if (action === 'cancel') {
        const response = await fetch(`${BACKEND_URL}/api/ladder/front-range-pool-hub/ladders/${selectedLadder}/matches/${match._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'cancelled',
            adminNotes: 'Match cancelled due to being overdue'
          }),
        });

        if (response.ok) {
          setMessage('✅ Match cancelled');
          await loadOverdueMatches();
        } else {
          setMessage('❌ Failed to cancel match');
        }
      }
    } catch (error) {
      console.error('Error resolving match:', error);
      setMessage('❌ Error resolving match');
    }
  };

  const calculateDaysOverdue = (scheduledDate) => {
    const scheduled = new Date(scheduledDate);
    const today = new Date();
    const gracePeriod = 3; // 3 days grace period
    const daysOverdue = Math.floor((today - scheduled) / (1000 * 60 * 60 * 24)) - gracePeriod;
    return Math.max(0, daysOverdue);
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#e0e0e0' }}>Loading overdue matches...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#e0e0e0', marginBottom: '20px' }}>
        ⚠️ Overdue Matches ({overdueMatches.length})
      </h2>

      {message && (
        <div style={{ 
          padding: '12px', 
          background: message.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
          border: `1px solid ${message.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`, 
          borderRadius: '4px', 
          color: message.startsWith('✅') ? '#10b981' : '#ff6b6b',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}

      {overdueMatches.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#999',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px'
        }}>
          ✅ No overdue matches
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {overdueMatches.map((match) => {
            const daysOverdue = calculateDaysOverdue(match.scheduledDate);
            
            return (
              <div 
                key={match._id}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '20px'
                }}
              >
                {/* Match Header */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ color: '#e0e0e0', margin: '0 0 8px 0', fontSize: '1.1rem' }}>
                    {match.player1?.firstName} {match.player1?.lastName} vs {match.player2?.firstName} {match.player2?.lastName}
                  </h3>
                  <div style={{ 
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '4px',
                    color: '#f59e0b',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}>
                    ⚠️ {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                  </div>
                </div>

                {/* Match Details */}
                <div style={{ 
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>
                    <div><strong>Match Type:</strong> {match.matchType || 'challenge'}</div>
                    <div><strong>Scheduled Date:</strong> {new Date(match.scheduledDate).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}</div>
                    {match.venue && <div><strong>Location:</strong> {match.venue}</div>}
                    {match.rescheduleCount > 0 && (
                      <div style={{ color: '#f59e0b' }}>
                        <strong>Reschedules:</strong> {match.rescheduleCount}/2 used
                      </div>
                    )}
                  </div>
                </div>

                {/* Player Contact Info */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ 
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <h5 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                      Player 1
                    </h5>
                    <div style={{ color: '#e0e0e0', fontSize: '0.85rem' }}>
                      <div><strong>{match.player1?.firstName} {match.player1?.lastName}</strong></div>
                      <div>Position #{match.player1?.position}</div>
                      {match.player1?.email && <div>{match.player1.email}</div>}
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <h5 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                      Player 2
                    </h5>
                    <div style={{ color: '#e0e0e0', fontSize: '0.85rem' }}>
                      <div><strong>{match.player2?.firstName} {match.player2?.lastName}</strong></div>
                      <div>Position #{match.player2?.position}</div>
                      {match.player2?.email && <div>{match.player2.email}</div>}
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div style={{ 
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <h5 style={{ color: '#f59e0b', margin: '0 0 12px 0', fontSize: '0.9rem' }}>
                    Admin Actions
                  </h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleResolveMatch(match, 'reschedule')}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}
                    >
                      📅 Reschedule
                    </button>
                    
                    <button
                      onClick={() => handleResolveMatch(match, 'cancel')}
                      style={{
                        padding: '8px 16px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}
                    >
                      ❌ Cancel Match
                    </button>
                    
                    <button
                      onClick={() => window.open(`mailto:${match.player1?.email},${match.player2?.email}?subject=Overdue Match Follow-up&body=Your match scheduled for ${new Date(match.scheduledDate).toLocaleDateString()} is overdue. Please contact me to resolve.`, '_blank')}
                      style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}
                    >
                      📧 Email Both Players
                    </button>
                  </div>
                  <p style={{ color: '#999', fontSize: '0.8rem', margin: '8px 0 0 0' }}>
                    ℹ️ Contact players to determine what happened, then reschedule or cancel as appropriate
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OverdueMatchesManager;

