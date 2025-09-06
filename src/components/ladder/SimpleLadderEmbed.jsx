import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BACKEND_URL } from '../../config.js';

const SimpleLadderEmbed = () => {
  const [searchParams] = useSearchParams();
  const ladderName = searchParams.get('ladder') || '499-under';
  const [ladderData, setLadderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLadderData();
  }, [ladderName]);

  const loadLadderData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/embed/${ladderName}`);
      
      if (response.ok) {
        const data = await response.json();
        setLadderData(data.players || []);
      } else {
        setError('Failed to load ladder data');
      }
    } catch (err) {
      console.error('Error loading ladder data:', err);
      setError('Error loading ladder data');
    } finally {
      setLoading(false);
    }
  };

  const getLadderDisplayName = (ladder) => {
    switch (ladder) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return ladder;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666',
        fontFamily: 'Arial, sans-serif',
        background: '#1a1a1a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏆</div>
          <div>Loading ladder data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#e53e3e',
        fontFamily: 'Arial, sans-serif',
        background: '#1a1a1a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      color: '#fff',
      minHeight: '100vh',
      padding: '10px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        borderBottom: '2px solid #e53e3e',
        paddingBottom: '15px'
      }}>
        <h1 style={{ 
          margin: '0 0 5px 0', 
          fontSize: '24px',
          color: '#e53e3e',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          Ladder of Legends
        </h1>
        <h2 style={{ 
          margin: '0', 
          fontSize: '18px',
          color: '#ccc',
          fontWeight: 'normal'
        }}>
          {getLadderDisplayName(ladderName)} Ladder
        </h2>
      </div>

      {/* Ladder Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 80px 50px 50px 80px',
          background: 'linear-gradient(135deg, #e53e3e, #c53030)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          padding: '12px 8px',
          textAlign: 'center'
        }}>
          <div>Rank</div>
          <div>Player</div>
          <div>Fargo</div>
          <div>W</div>
          <div>L</div>
          <div>Status</div>
        </div>

        {/* Table Rows */}
        {ladderData.map((player, index) => (
          <div 
            key={player._id || index} 
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 80px 50px 50px 80px',
              padding: '10px 8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '14px',
              alignItems: 'center',
              background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
            }}
          >
            <div style={{ 
              textAlign: 'center', 
              fontWeight: 'bold',
              color: '#e53e3e'
            }}>
              #{player.position}
            </div>
            <div style={{ 
              paddingLeft: '8px',
              fontWeight: '500'
            }}>
              {player.firstName} {player.lastName}
            </div>
            <div style={{ 
              textAlign: 'center',
              color: '#ccc'
            }}>
              {player.fargoRate === 0 ? "N/A" : player.fargoRate}
            </div>
            <div style={{ 
              textAlign: 'center',
              color: '#4CAF50',
              fontWeight: 'bold'
            }}>
              {player.wins || 0}
            </div>
            <div style={{ 
              textAlign: 'center',
              color: '#f44336',
              fontWeight: 'bold'
            }}>
              {player.losses || 0}
            </div>
            <div style={{ 
              textAlign: 'center'
            }}>
              {!player.isActive ? (
                <span style={{ 
                  color: '#f44336',
                  fontSize: '12px'
                }}>Inactive</span>
              ) : player.immunityUntil && new Date(player.immunityUntil) > new Date() ? (
                <span style={{ 
                  color: '#ff9800',
                  fontSize: '12px'
                }}>Immune</span>
              ) : (
                <span style={{ 
                  color: '#4CAF50',
                  fontSize: '12px'
                }}>Active</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px',
        fontSize: '12px',
        color: '#888',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '15px'
      }}>
        <p style={{ margin: '5px 0' }}>
          <strong>Challenge Rules:</strong> Standard challenges up to 4 positions above, SmackDown up to 5 positions below
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Anyone can view the ladder - no account required!</strong>
        </p>
        <p style={{ margin: '5px 0', color: '#e53e3e' }}>
          <strong>⚠️ INDEPENDENT TOURNAMENT SERIES ⚠️</strong>
        </p>
        <p style={{ margin: '5px 0', fontSize: '11px' }}>
          This ladder system is <strong>NOT</strong> affiliated with, endorsed by, or sanctioned by the Front Range Pool League,<br/>
          CueSports International, BCA Pool League, or USA Pool League.<br/>
          It is an independent tournament series operated by <strong>Legends Brews and Cues</strong>.
        </p>
      </div>
    </div>
  );
};

export default SimpleLadderEmbed;
