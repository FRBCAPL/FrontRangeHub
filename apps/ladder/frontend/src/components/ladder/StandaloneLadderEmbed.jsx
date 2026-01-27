import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

const StandaloneLadderEmbed = () => {
  const { ladderName = '499-under' } = useParams();
  const [ladderData, setLadderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLadderData();
  }, [ladderName]);

  const loadLadderData = async () => {
    try {
      setLoading(true);
      // Use Supabase instead of old backend API
      const result = await supabaseDataService.getLadderPlayersByName(ladderName);
      
      if (result.success && Array.isArray(result.data)) {
        // Transform Supabase data to match expected format
        const transformedPlayers = result.data.map(player => ({
          _id: player.user_id,
          firstName: player.users?.first_name || 'Unknown',
          lastName: player.users?.last_name || 'Unknown',
          position: player.position,
          fargoRate: player.fargo_rate || 0,
          wins: player.wins || 0,
          losses: player.losses || 0,
          isActive: player.is_active,
          immunityUntil: player.immunity_until
        }));
        setLadderData(transformedPlayers);
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
          margin: '0 0 15px 0', 
          fontSize: '18px',
          color: '#ccc',
          fontWeight: 'normal'
        }}>
          {getLadderDisplayName(ladderName)} Ladder
        </h2>
        
        {/* Login Button */}
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => {
              // Navigate to the main app login
              window.location.href = '/hub';
            }}
            style={{
              background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              textDecoration: 'none',
              display: 'inline-block'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
            }}
          >
            🔐 Join the Ladder
          </button>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '12px', 
            color: '#888',
            fontStyle: 'italic'
          }}>
            Create an account to challenge players and track your progress
          </p>
        </div>
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
        {/* Call to Action */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            color: '#8b5cf6', 
            margin: '0 0 10px 0', 
            fontSize: '16px' 
          }}>
            🏆 Ready to Join the Competition?
          </h3>
          <p style={{ 
            margin: '0 0 15px 0', 
            color: '#ccc',
            fontSize: '14px'
          }}>
            Create your account to challenge players, track your progress, and climb the ladder!
          </p>
          <button
            onClick={() => {
              window.location.href = '/hub';
            }}
            style={{
              background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 3px 10px rgba(139, 92, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 3px 10px rgba(139, 92, 246, 0.3)';
            }}
          >
            🚀 Get Started Now
          </button>
        </div>

        <p style={{ margin: '5px 0' }}>
          <strong>Challenge Rules:</strong> Standard challenges up to 4 positions above, SmackDown up to 5 positions below
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Anyone can view the ladder - no account required!</strong>
        </p>
      </div>
    </div>
  );
};

export default StandaloneLadderEmbed;
