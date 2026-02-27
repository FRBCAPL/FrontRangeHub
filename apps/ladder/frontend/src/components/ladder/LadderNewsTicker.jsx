import React, { useState, useEffect, useRef } from 'react';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import './LadderNewsTicker.css';

// Speed = animation duration in seconds. Lower = faster. Default is 20s; user can speed up (+) or slow down (−).
const TICKER_SPEED_OPTIONS = [16, 20, 26, 34];
const TICKER_DEFAULT_SPEED_INDEX = 1; // 20s = default (was too fast at 12s)

const LadderNewsTicker = ({ userPin, isPublicView = false, isAdmin = false }) => {
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(TICKER_DEFAULT_SPEED_INDEX);
  const tickerRef = useRef(null);
  const speedChangeResumeRef = useRef(false);
  const isMobileView = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const tickerDurationSec = TICKER_SPEED_OPTIONS[speedIndex];
  const isMaxSpeed = speedIndex === 0;
  const isMinSpeed = speedIndex === TICKER_SPEED_OPTIONS.length - 1;

  // Fetch recent matches from all ladders
  const fetchRecentMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🎯 Ticker: Fetching recent matches...');

      // Fetch matches from all ladders
      const ladderNames = isAdmin ? ['499-under', '500-549', '550-plus', 'simulation'] : ['499-under', '500-549', '550-plus'];
      
      const result = await supabaseDataService.getRecentCompletedMatches(10, ladderNames);

      console.log('🎯 Ticker: Result from Supabase:', result);
      console.log('🎯 Ticker: Matches count:', result.matches?.length);

      if (result.success) {
        console.log('🎯 Ticker: Setting recent matches:', result.matches);
        setRecentMatches(result.matches);
      } else {
        console.error('🎯 Ticker: Error loading matches:', result.error);
        setError(result.error || 'Failed to load recent matches');
      }
    } catch (error) {
      console.error('🎯 Ticker: Error fetching recent matches:', error);
      setError('Failed to load recent matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentMatches();
  }, [userPin]);

  // Refetch when a match is reported/completed so ticker shows new result (any ladder)
  useEffect(() => {
    const handler = () => fetchRecentMatches();
    window.addEventListener('matchesUpdated', handler);
    return () => window.removeEventListener('matchesUpdated', handler);
  }, []);

  useEffect(() => {
    // Resume animation when the dataset changes
    setIsPaused(false);
  }, [recentMatches.length]);

  const toggleTickerPause = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setIsPaused((prev) => !prev);
  };

  const goSlower = (e) => {
    e?.stopPropagation();
    speedChangeResumeRef.current = true;
    setIsPaused(true);
    setSpeedIndex((i) => (i < TICKER_SPEED_OPTIONS.length - 1 ? i + 1 : i));
  };
  const goFaster = (e) => {
    e?.stopPropagation();
    speedChangeResumeRef.current = true;
    setIsPaused(true);
    setSpeedIndex((i) => (i > 0 ? i - 1 : i));
  };

  // When speed changed via +/-, resume after a short delay so the new duration runs from the start (avoids jump)
  useEffect(() => {
    if (!speedChangeResumeRef.current) return;
    speedChangeResumeRef.current = false;
    const t = setTimeout(() => setIsPaused(false), 120);
    return () => clearTimeout(t);
  }, [speedIndex]);


  // Format match result for display
  const formatMatchResult = (match) => {
    const winner = match.winner;
    const player1 = match.player1;
    const player2 = match.player2;
    
    if (!winner || !player1 || !player2) return null;

    const winnerName = winner.firstName && winner.lastName ? 
      `${winner.firstName} ${winner.lastName}` : 
      'Unknown Player';
    
    const loser = winner._id === player1._id ? player2 : player1;
    const loserName = loser.firstName && loser.lastName ? 
      `${loser.firstName} ${loser.lastName}` : 
      'Unknown Player';

    const gameType = match.gameType || '8-Ball';
    const raceLength = match.raceLength || '5';
    const score = (match.score != null && String(match.score).trim() !== '') ? String(match.score) : '—';
    // Crown = current #1 on that ladder (from API), not position at match time
    const isWinnerFirst = !!match.isWinnerFirst;
    const isLoserFirst = !!match.isLoserFirst;

    return {
      winner: winnerName,
      loser: loserName,
      gameType,
      raceLength,
      score,
      ladder: match.ladderDisplayName,
      date: match.completedDate,
      isWinnerFirst,
      isLoserFirst
    };
  };

  if (loading) {
    return (
      <div className="ladder-news-ticker">
        <div className="ticker-header">
          <h4>Recent Match Results</h4>
        </div>
        <div className="ticker-content loading">
          <div className="loading-spinner"></div>
          <span>Loading recent matches...</span>
        </div>
      </div>
    );
  }

  if (error || recentMatches.length === 0) {
    return (
      <div className="ladder-news-ticker">
        <div className="ticker-header">
          <h4>Recent Match Results</h4>
        </div>
        <div className="ticker-content empty">
          <span>No recent matches to display</span>
        </div>
      </div>
    );
  }

  return (
    <div className={isPublicView ? "public-news-ticker" : "ladder-news-ticker"}>
      <div className="ticker-header">
        <div className="ticker-header-spacer" aria-hidden />
        <h4>Recent Match Results</h4>
        <div className="ticker-header-controls-wrap">
          <div className="ticker-controls" style={{ display: 'flex', alignItems: 'center', gap: '65px', flexShrink: 0 }}>
          <div className="ticker-speed-group" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '6px' }}>Speed</span>
            <button
              type="button"
              className="ticker-btn"
              onClick={toggleTickerPause}
              title={isPaused ? 'Resume' : 'Pause'}
              aria-label={isPaused ? 'Resume ticker' : 'Pause ticker'}
              style={{ minWidth: '32px', height: '28px', padding: '0 6px' }}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
            <button type="button" className="ticker-btn" onClick={goSlower} disabled={isMinSpeed} title="Slower">
              −
            </button>
            <button type="button" className="ticker-btn" onClick={goFaster} disabled={isMaxSpeed} title="Faster">
              +
            </button>
          </div>
          <span
            className="ticker-controls-divider"
            aria-hidden
            style={{ width: '1px', minWidth: '1px', height: '20px', background: 'rgba(139,92,246,0.4)', marginLeft: '8px', marginRight: '12px', flexShrink: 0 }}
          />
          <button
            type="button"
            className="refresh-button ticker-btn ticker-refresh-btn"
            onClick={(e) => { e.stopPropagation(); fetchRecentMatches(); }}
            disabled={loading}
            title="Refresh recent matches"
            style={{ marginLeft: '4px', padding: '4px 16px 4px 10px', flexShrink: 0 }}
          >
            <span aria-hidden>🔄</span>
            <span className="ticker-refresh-text">Refresh</span>
          </button>
        </div>
        </div>
      </div>
      <div
        className={`ticker-content ${isPaused ? 'paused' : 'playing'}`}
        ref={tickerRef}
        role="button"
        tabIndex={0}
        aria-label={isPaused ? 'Resume ticker' : 'Pause ticker'}
        onClick={toggleTickerPause}
        onTouchEnd={toggleTickerPause}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTickerPause(e); } }}
        style={{ cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
      >
        <div
          className="ticker-track"
          style={{ '--ticker-duration': `${tickerDurationSec}s` }}
        >
          {[...recentMatches, ...recentMatches].map((match, index) => {
            const matchData = formatMatchResult(match);
            if (!matchData) return null;

            return (
              <div key={`${match._id}-${index}`} className="ticker-item">
                <div className="match-result">
                  <span className="winner">
                    🏆 {matchData.isWinnerFirst ? (() => {
                      const name = matchData.winner.split(' ')[0] || '';
                      const first = name.charAt(0);
                      const rest = name.slice(1);
                      if (!first) return name;
                      return (
                        <span style={{ position: 'relative', display: 'inline-block' }}>
                          <span style={{ position: 'absolute', top: '-10px', left: '-2px', fontSize: '1rem', transform: 'rotate(-10deg)', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>👑</span>
                          <span style={{ position: 'relative', zIndex: 1 }}>{first}</span>
                          {rest}
                        </span>
                      );
                    })() : matchData.winner.split(' ')[0]}
                  </span>
                  <span className="vs">{isMobileView ? 'beat' : 'defeated'}</span>
                  <span className="loser">
                    {matchData.isLoserFirst ? (() => {
                      const name = matchData.loser.split(' ')[0] || '';
                      const first = name.charAt(0);
                      const rest = name.slice(1);
                      if (!first) return name;
                      return (
                        <span style={{ position: 'relative', display: 'inline-block' }}>
                          <span style={{ position: 'absolute', top: '-10px', left: '-2px', fontSize: '1rem', transform: 'rotate(-10deg)', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>👑</span>
                          <span style={{ position: 'relative', zIndex: 1 }}>{first}</span>
                          {rest}
                        </span>
                      );
                    })() : matchData.loser.split(' ')[0]}
                  </span>
                  <span className="score">{isMobileView ? matchData.score : `(${matchData.score})`}</span>
                  <span className="ladder-badge">{matchData.ladder}</span>
                  <span className="match-date">
                    {new Date(matchData.date).toLocaleDateString(undefined, isMobileView
                      ? { month: 'numeric', day: 'numeric' }
                      : undefined)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LadderNewsTicker;
