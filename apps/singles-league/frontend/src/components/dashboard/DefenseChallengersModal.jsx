import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { BACKEND_URL } from '@shared/config/config.js';
import styles from './dashboard.module.css';

export default function DefenseChallengersModal({
  open,
  onClose,
  playerName,
  playerLastName,
  selectedDivision
}) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [challengers, setChallengers] = useState([]);

  const fullPlayerName = `${playerName} ${playerLastName}`;

  useEffect(() => {
    if (!open || !selectedDivision) return;

    async function fetchStandings() {
      try {
        setLoading(true);
        setError(null);

        // Use the backend to fetch standings JSON for the division (same as PlayerSearch and Phase1Tracker)
        const safeDivision = selectedDivision.replace(/[^A-Za-z0-9]/g, '_');
        const standingsUrl = `${BACKEND_URL}/static/standings_${safeDivision}.json`;
        
        const response = await fetch(standingsUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch standings: ${response.status}`);
        }

        const data = await response.json();

        // Find user's position
        const userIndex = data.findIndex(player => 
          player.name && player.name.toLowerCase().includes(fullPlayerName.toLowerCase())
        );

        if (userIndex !== -1) {
          setUserPosition(userIndex + 1);
          
          // Get the 4 players ranked below the user
          const challengersList = data.slice(userIndex + 1, userIndex + 5);
          setChallengers(challengersList);
        } else {
          setError('Could not find user in standings');
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Failed to load standings data');
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, [open, selectedDivision, fullPlayerName]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.dashboardModalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            🛡️ Potential Challengers
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px',
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <p style={{
            margin: '0 0 20px 0',
            color: '#e0e0e0',
            fontSize: '0.9rem',
            fontStyle: 'italic',
            textAlign: 'center'
          }}>
            Players ranked below you who could challenge you in Phase 2
          </p>

          {/* Loading State */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#888',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>🔄</div>
              Loading potential challengers...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#e53e3e',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>⚠️</div>
              {error}
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* User Position Info */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  marginBottom: '5px'
                }}>
                  Your Position: #{userPosition}
                </div>
                <div style={{
                  color: '#e0e0e0',
                  fontSize: '0.9rem'
                }}>
                  {fullPlayerName}
                </div>
              </div>

              {/* Challengers List */}
              <div style={{ marginBottom: '20px', flex: 1 }}>
                <h3 style={{
                  color: '#ffffff',
                  fontSize: '1.2rem',
                  marginBottom: '15px',
                  textAlign: 'center',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                }}>
                  Potential Challengers ({challengers.length})
                </h3>

                {challengers.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#888',
                    fontStyle: 'italic'
                  }}>
                    No players ranked below you found in standings
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gap: '10px'
                  }}>
                    {challengers.map((player, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          padding: '15px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{
                            color: '#ffffff',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            marginBottom: '5px'
                          }}>
                            #{userPosition + index + 1} - {player.name || 'Unknown Player'}
                          </div>
                          {player.record && (
                            <div style={{
                              color: '#e0e0e0',
                              fontSize: '0.85rem'
                            }}>
                              Record: {player.record}
                            </div>
                          )}
                          {player.points && (
                            <div style={{
                              color: '#e0e0e0',
                              fontSize: '0.85rem'
                            }}>
                              Points: {player.points}
                            </div>
                          )}
                        </div>
                        <div style={{
                          color: '#ff4444',
                          fontSize: '1.5rem',
                          marginLeft: '15px'
                        }}>
                          ⚔️
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '15px',
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '20px'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  <strong>Phase 2 Defense Rules:</strong><br />
                  • Players ranked below you can challenge you<br />
                  • You must accept at least 2 defense challenges<br />
                  • These are the players who could challenge you
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
