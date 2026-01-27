import React, { useState, useEffect } from 'react';
import tournamentService from '@shared/services/services/tournamentService';

const TournamentStandingsTable = ({ tournamentId, autoRefresh = true, standingsData = null, currentRound = null, tournament = null }) => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  
  // Check if we're in King of the Hill mode
  const isKingOfTheHill = currentRound && currentRound.round_name === 'King of the Hill';
  console.log('🏆 TournamentStandingsTable - isKingOfTheHill:', isKingOfTheHill, 'round_name:', currentRound?.round_name);

  // If standingsData is provided, use it directly (for instant updates)
  useEffect(() => {
    if (standingsData) {
      console.log('📊 Using provided standings data (instant update)');
      setStandings(standingsData);
      setLoading(false);
      return;
    }
  }, [standingsData]);

  useEffect(() => {
    // Only fetch if standingsData is not provided
    if (!standingsData) {
      fetchStandings();

      if (autoRefresh) {
        // Set up real-time subscription
        const channel = tournamentService.subscribeToStandings(tournamentId, handleStandingsUpdate);
        setSubscription(channel);

        // Also poll every 30 seconds as backup
        const interval = setInterval(fetchStandings, 30000);

        return () => {
          if (channel) {
            tournamentService.unsubscribe(channel);
          }
          clearInterval(interval);
        };
      }
    }
  }, [tournamentId, autoRefresh, standingsData]);

  const fetchStandings = async () => {
    try {
      const result = await tournamentService.getTournamentStandings(tournamentId);
      if (result.success) {
        setStandings(result.data);
      } else {
        setError('Failed to load standings');
      }
    } catch (err) {
      console.error('Error fetching standings:', err);
      setError('Error loading standings');
    } finally {
      setLoading(false);
    }
  };

  const handleStandingsUpdate = (payload) => {
    console.log('Standings update:', payload);
    // Refresh standings when changes detected
    fetchStandings();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getWinPercentage = (wins, losses) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  const getRankEmoji = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#00ff00' }}>
        Loading standings...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#ff4444' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.8)',
      borderRadius: '12px',
      border: '1px solid rgba(0, 255, 0, 0.3)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)',
        padding: '1rem',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#000', margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>
          🏆 Live Standings
        </h3>
        {autoRefresh && (
          <div style={{ 
            color: 'rgba(0,0,0,0.7)', 
            fontSize: '0.8rem', 
            marginTop: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#000',
              animation: 'pulse 2s infinite'
            }} />
            Live Updates
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '0.95rem'
        }}>
          <thead>
            <tr style={{
              background: 'rgba(0, 255, 0, 0.1)',
              borderBottom: '2px solid rgba(0, 255, 0, 0.3)'
            }}>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                color: '#00ff00',
                fontWeight: 'bold'
              }}>
                Rank
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                color: '#00ff00',
                fontWeight: 'bold'
              }}>
                Player
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'center', 
                color: '#00ff00',
                fontWeight: 'bold'
              }}>
                W-L
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'center', 
                color: '#00ff00',
                fontWeight: 'bold'
              }}>
                Win %
              </th>
              {isKingOfTheHill && (
                <th style={{ 
                  padding: '0.75rem', 
                  textAlign: 'center', 
                  color: '#ff9800',
                  fontWeight: 'bold'
                }}>
                  👑 KOH Losses
                </th>
              )}
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'right', 
                color: '#00ff00',
                fontWeight: 'bold'
              }}>
                Earned
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'center', 
                color: '#00ff00',
                fontWeight: 'bold'
              }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((player, index) => (
              <tr 
                key={player.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: player.eliminated 
                    ? 'rgba(255, 0, 0, 0.1)' 
                    : index < 3 
                    ? 'rgba(0, 255, 0, 0.05)' 
                    : 'transparent',
                  opacity: player.eliminated ? 0.6 : 1
                }}
              >
                <td style={{ 
                  padding: '0.75rem', 
                  color: '#fff',
                  fontWeight: 'bold'
                }}>
                  {getRankEmoji(index)} #{index + 1}
                </td>
                <td style={{ 
                  padding: '0.75rem', 
                  color: player.eliminated ? '#999' : '#fff',
                  fontWeight: 'bold'
                }}>
                  {player.player_name}
                  {player.eliminated && (
                    <span style={{ 
                      textDecoration: 'line-through',
                      marginLeft: '0.5rem',
                      color: '#ff4444'
                    }}>
                      ❌
                    </span>
                  )}
                </td>
                <td style={{ 
                  padding: '0.75rem', 
                  textAlign: 'center',
                  color: player.eliminated ? '#999' : '#fff'
                }}>
                  <span style={{ color: '#00ff00' }}>{player.wins}</span>
                  {' - '}
                  <span style={{ color: '#ff4444' }}>{player.losses}</span>
                </td>
                <td style={{ 
                  padding: '0.75rem', 
                  textAlign: 'center',
                  color: player.eliminated ? '#999' : '#ffc107',
                  fontWeight: 'bold'
                }}>
                  {getWinPercentage(player.wins, player.losses)}%
                </td>
                {isKingOfTheHill && (
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center',
                    color: player.eliminated ? '#999' : '#ff9800',
                    fontWeight: 'bold',
                    background: (player.koh_losses || 0) >= 2 ? 'rgba(255, 152, 0, 0.2)' : 'transparent'
                  }}>
                    {player.koh_losses || 0}
                  </td>
                )}
                <td style={{ 
                  padding: '0.75rem', 
                  textAlign: 'right',
                  color: player.eliminated ? '#999' : '#00ff00',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  {formatCurrency(player.total_payout)}
                </td>
                <td style={{ 
                  padding: '0.75rem', 
                  textAlign: 'center'
                }}>
                  {player.eliminated ? (
                    <span style={{
                      background: 'rgba(255, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 0, 0, 0.5)',
                      borderRadius: '12px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.85rem',
                      color: '#ff4444',
                      fontWeight: 'bold'
                    }}>
                      Eliminated
                    </span>
                  ) : isKingOfTheHill && (player.koh_losses || 0) === 1 ? (
                    <span style={{
                      background: 'rgba(255, 152, 0, 0.2)',
                      border: '1px solid rgba(255, 152, 0, 0.5)',
                      borderRadius: '12px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.85rem',
                      color: '#ff9800',
                      fontWeight: 'bold'
                    }}>
                      👑 1 KOH Loss Away
                    </span>
                  ) : !isKingOfTheHill && player.losses === 2 ? (
                    <span style={{
                      background: 'rgba(255, 152, 0, 0.2)',
                      border: '1px solid rgba(255, 152, 0, 0.5)',
                      borderRadius: '12px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.85rem',
                      color: '#ff9800',
                      fontWeight: 'bold'
                    }}>
                      ⚠️ 1 Loss Away
                    </span>
                  ) : !isKingOfTheHill && player.losses === 1 ? (
                    <span style={{
                      background: 'rgba(255, 193, 7, 0.2)',
                      border: '1px solid rgba(255, 193, 7, 0.5)',
                      borderRadius: '12px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.85rem',
                      color: '#ffc107',
                      fontWeight: 'bold'
                    }}>
                      ⚠️ 2 Losses Away
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(0, 255, 0, 0.2)',
                      border: '1px solid rgba(0, 255, 0, 0.5)',
                      borderRadius: '12px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.85rem',
                      color: '#00ff00',
                      fontWeight: 'bold'
                    }}>
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        textAlign: 'center',
        fontSize: '0.9rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {standings.filter(p => !p.eliminated).length}
          </div>
          <div style={{ color: '#ccc' }}>Active</div>
        </div>
        <div>
          <div style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {standings.filter(p => p.eliminated).length}
          </div>
          <div style={{ color: '#ccc' }}>Eliminated</div>
        </div>
        {tournament && (
          <>
            <div>
              <div style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {formatCurrency(tournament.total_prize_pool)}
              </div>
              <div style={{ color: '#ccc' }}>Prize Pool</div>
            </div>
            <div>
              <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {formatCurrency(tournament.first_place_prize || 0)}
              </div>
              <div style={{ color: '#ccc' }}>
                1st Place
              </div>
            </div>
            <div>
              <div style={{ color: '#ffc107', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {(() => {
                  // Only count actual payouts to players, not reserved amounts
                  const totalPaid = standings.reduce((sum, p) => sum + (p.total_payout || 0), 0);
                  return formatCurrency(totalPaid);
                })()}
              </div>
              <div style={{ color: '#ccc' }}>Total Paid</div>
            </div>
            <div>
              <div style={{ color: '#ff9800', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {(() => {
                  const totalPaid = standings.reduce((sum, p) => sum + (p.total_payout || 0), 0);
                  const base1st = tournament.first_place_prize || 0;
                  return formatCurrency(tournament.total_prize_pool - totalPaid - base1st);
                })()}
              </div>
              <div style={{ color: '#ccc' }}>Remaining</div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default TournamentStandingsTable;

