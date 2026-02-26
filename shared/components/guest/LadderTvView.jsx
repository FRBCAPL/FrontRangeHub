import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

/**
 * Public TV view: ladder divisions (499/under, 500-549, 550+) and players only.
 * No login, no modals, no CTAs. Optimized for large screens / TV display.
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
      background: 'linear-gradient(180deg, #0f0f18 0%, #1a1a2e 50%, #0f0f18 100%)',
      color: '#fff',
      padding: 'clamp(24px, 4vw, 48px)',
      boxSizing: 'border-box',
      fontFamily: '"Bebas Neue", "Orbitron", "Exo 2", "Arial Black", sans-serif'
    }}>
      {/* Title + Ladder selector */}
      <header style={{
        textAlign: 'center',
        marginBottom: 'clamp(20px, 3vw, 40px)',
        borderBottom: '3px solid rgba(139, 92, 246, 0.5)',
        paddingBottom: 'clamp(16px, 2vw, 24px)'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          color: '#fff',
          textShadow: '0 0 24px rgba(139, 92, 246, 0.6)'
        }}>
          Ladder of Legends
        </h1>
        <p style={{ margin: '8px 0 0 0', fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#b8b8d0' }}>
          Tournament Series
        </p>
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
                  : 'rgba(255,255,255,0.08)',
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
        <p style={{
          margin: '12px 0 0 0',
          fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
          color: '#FFD700',
          fontWeight: 'bold'
        }}>
          {displayName}
        </p>
      </header>

      {/* Table */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(20, 20, 35, 0.95)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(139, 92, 246, 0.2)'
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 70px 70px',
              gap: '0 16px',
              padding: 'clamp(14px, 2vw, 20px) clamp(20px, 3vw, 32px)',
              background: 'rgba(139, 92, 246, 0.25)',
              borderBottom: '2px solid rgba(139, 92, 246, 0.4)',
              fontSize: 'clamp(1rem, 2vw, 1.35rem)',
              fontWeight: 'bold'
            }}>
              <div style={{ color: '#FFD700', textAlign: 'center' }}>Rank</div>
              <div style={{ color: '#fff' }}>Player</div>
              <div style={{ color: '#4CAF50', textAlign: 'center' }}>W</div>
              <div style={{ color: '#f44336', textAlign: 'center' }}>L</div>
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
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 70px 70px',
                    gap: '0 16px',
                    padding: 'clamp(12px, 1.8vw, 18px) clamp(20px, 3vw, 32px)',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 'clamp(1.05rem, 2vw, 1.4rem)',
                    background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}
                >
                  <div style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: player.position === 1 ? '#FFD700' : '#e0e0e0'
                  }}>
                    {player.position === 1 ? '🏆 ' : ''}#{player.position}
                  </div>
                  <div style={{
                    fontWeight: player.position === 1 ? 'bold' : 'normal',
                    color: player.position === 1 ? '#FFD700' : '#fff'
                  }}>
                    {player.firstName} {player.lastName ? player.lastName.charAt(0) + '.' : ''}
                  </div>
                  <div style={{ textAlign: 'center', color: '#4CAF50', fontWeight: 'bold' }}>
                    {player.wins}
                  </div>
                  <div style={{ textAlign: 'center', color: '#f44336', fontWeight: 'bold' }}>
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
