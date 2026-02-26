import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

/**
 * Public TV view: ladder divisions (499/under, 500-549, 550+) and players only.
 * Styling matches StandaloneLadderModal (colors, crown, highlights).
 * When URL has ?ladder=xxx, only that ladder is shown (no division tabs).
 */
const LADDER_OPTIONS = [
  { value: '499-under', label: '499 & Under' },
  { value: '500-549', label: '500-549' },
  { value: '550-plus', label: '550+' }
];

const REFRESH_INTERVAL_MS = 60 * 1000;

const LadderTvView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ladderParam = searchParams.get('ladder') || '499-under';
  const validLadder = LADDER_OPTIONS.some(o => o.value === ladderParam) ? ladderParam : '499-under';
  const [selectedLadder, setSelectedLadder] = useState(validLadder);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSingleLadderView = searchParams.has('ladder');

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const result = await supabaseDataService.getLadderPlayersByName(selectedLadder);
      if (result.success && Array.isArray(result.data)) {
        const transformed = result.data.map((profile) => ({
          _id: profile.id,
          position: profile.position,
          firstName: profile.users?.first_name || '',
          lastName: profile.users?.last_name || '',
          wins: profile.wins || 0,
          losses: profile.losses || 0
        }));
        setPlayers(transformed.sort((a, b) => a.position - b.position));
      } else {
        setPlayers([]);
      }
    } catch (err) {
      console.error('LadderTvView fetch error:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedLadder(validLadder);
  }, [validLadder]);

  useEffect(() => {
    fetchPlayers();
    const t = setInterval(fetchPlayers, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [selectedLadder]);

  const handleLadderChange = (value) => {
    setSelectedLadder(value);
    setSearchParams({ ladder: value }, { replace: true });
  };

  const displayName = LADDER_OPTIONS.find(o => o.value === selectedLadder)?.label || selectedLadder;

  return (
    <div className="ladder-tv-view" style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(120deg, #232323 80%, #2a0909 100%)',
      color: '#fff',
      padding: 'clamp(20px, 3vw, 40px)',
      boxSizing: 'border-box',
      fontFamily: '"Bebas Neue", "Orbitron", "Exo 2", "Arial Black", sans-serif'
    }}>
      {/* Title - same as ladder modal */}
      <header style={{
        textAlign: 'center',
        marginBottom: 'clamp(16px, 2vw, 28px)',
        borderBottom: '2px solid rgba(107, 70, 193, 0.4)',
        paddingBottom: 'clamp(12px, 2vw, 20px)'
      }}>
        <h1 style={{
          margin: 0,
          color: '#000000',
          WebkitTextStroke: '0.5px #8B5CF6',
          textShadow: '0 0 20px rgba(139, 92, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4)',
          fontWeight: 'bold',
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          Ladder of Legends
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 'clamp(0.85rem, 1.8vw, 1rem)', color: '#cccccc' }}>
          Tournament Series
        </p>

        {/* Ladder selector tabs - only when NOT a single-ladder URL */}
        {!isSingleLadderView && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(12px, 2vw, 24px)',
            marginTop: 'clamp(16px, 2vw, 24px)',
            flexWrap: 'wrap'
          }}>
            {LADDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleLadderChange(opt.value)}
                style={{
                  padding: 'clamp(10px, 1.5vw, 16px) clamp(20px, 3vw, 32px)',
                  fontSize: 'clamp(1rem, 2.2vw, 1.5rem)',
                  fontWeight: 'bold',
                  color: selectedLadder === opt.value ? '#fff' : '#b8b8d0',
                  background: selectedLadder === opt.value
                    ? 'linear-gradient(135deg, #6d28d9, #8b5cf6)'
                    : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${selectedLadder === opt.value ? '#8b5cf6' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <p style={{
          margin: isSingleLadderView ? '12px 0 0 0' : '12px 0 0 0',
          fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
          color: '#000000',
          WebkitTextStroke: '0.5px #8B5CF6',
          textShadow: '0 0 12px rgba(139, 92, 246, 0.8), 0 0 24px rgba(139, 92, 246, 0.5)',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {displayName}
        </p>
      </header>

      {/* Table - same styling as StandaloneLadderModal */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(10, 10, 20, 0.98)',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 4px 20px rgba(107, 70, 193, 0.4), 0 0 0 1px rgba(107, 70, 193, 0.2)',
        borderBottom: '2px solid rgba(107, 70, 193, 0.5)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{
            padding: 'clamp(48px, 8vw, 80px)',
            textAlign: 'center',
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            color: '#b8b8d0'
          }}>
            Loading ladder…
          </div>
        ) : (
          <>
            {/* Table header - ladder colors */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 70px 70px',
              gap: '0 16px',
              padding: 'clamp(12px, 1.8vw, 16px) clamp(20px, 3vw, 32px)',
              borderBottom: '1px solid rgba(107, 70, 193, 0.3)',
              alignItems: 'center',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              fontWeight: 'bold'
            }}>
              <div style={{
                color: '#FFD700',
                textAlign: 'center',
                textShadow: '0 0 6px #FFD700, 0 0 12px #FFD700'
              }}>
                Rank
              </div>
              <div style={{
                color: '#ffffff',
                textShadow: '0 0 8px #8B5CF6, 0 0 15px #8B5CF6'
              }}>
                Player
              </div>
              <div style={{
                color: '#4CAF50',
                textAlign: 'center',
                textShadow: '0 0 8px #4CAF50, 0 0 15px #4CAF50'
              }}>
                W
              </div>
              <div style={{
                color: '#f44336',
                textAlign: 'center',
                textShadow: '0 0 8px #f44336, 0 0 15px #f44336'
              }}>
                L
              </div>
            </div>

            {players.length === 0 ? (
              <div style={{
                padding: 'clamp(32px, 5vw, 48px)',
                textAlign: 'center',
                fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                color: '#888'
              }}>
                No players on this ladder yet.
              </div>
            ) : (
              players.map((player, index) => (
                <div
                  key={player._id || index}
                  className={player.position === 1 ? 'first-place-row' : ''}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 70px 70px',
                    gap: '0 16px',
                    padding: 'clamp(12px, 1.8vw, 18px) clamp(20px, 3vw, 32px)',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(107, 70, 193, 0.1)',
                    fontSize: 'clamp(1.05rem, 2vw, 1.35rem)',
                    background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}
                >
                  <div style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: player.position === 1 ? '#FFD700' : '#ffffff',
                    textShadow: player.position === 1 ? '0 0 8px #FFD700' : 'none',
                    fontSize: player.position === 1 ? 'clamp(1.15rem, 2.2vw, 1.5rem)' : undefined
                  }}>
                    {player.position === 1 ? '🏆 ' : ''}#{player.position}
                  </div>
                  <div style={{
                    fontWeight: player.position === 1 ? '600' : 'normal',
                    color: player.position === 1 ? '#FFD700' : '#ffffff',
                    textShadow: player.position === 1 ? '0 0 5px rgba(255, 215, 0, 0.5)' : 'none',
                    position: 'relative',
                    fontSize: player.position === 1 ? 'clamp(1.1rem, 2.2vw, 1.45rem)' : undefined
                  }}>
                    {player.position === 1 && (
                      <span style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '-2px',
                        fontSize: '1.25rem',
                        transform: 'rotate(-10deg)',
                        zIndex: 10,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                      }}>
                        👑
                      </span>
                    )}
                    {player.firstName} {player.lastName ? player.lastName.charAt(0) + '.' : ''}
                  </div>
                  <div style={{
                    textAlign: 'center',
                    color: '#4CAF50',
                    fontWeight: 'bold'
                  }}>
                    {player.wins}
                  </div>
                  <div style={{
                    textAlign: 'center',
                    color: '#f44336',
                    fontWeight: 'bold'
                  }}>
                    {player.losses}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LadderTvView;
