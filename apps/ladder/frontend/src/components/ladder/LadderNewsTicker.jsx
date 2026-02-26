import React, { useState, useEffect, useRef } from 'react';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';

const LadderNewsTicker = ({ userPin, isPublicView = false, isAdmin = false }) => {
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const tickerRef = useRef(null);
  const isMobileView = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

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
    if (!isMobileView) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setIsPaused((prev) => !prev);
  };


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
    const score = match.score || 'N/A';
    
    return {
      winner: winnerName,
      loser: loserName,
      gameType,
      raceLength,
      score,
      ladder: match.ladderDisplayName,
      date: match.completedDate
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
        <h4>Recent Match Results</h4>
        {isMobileView && (
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginRight: '6px' }}>
            Tap ticker to {isPaused ? 'resume' : 'pause'}
          </span>
        )}
        <button 
          className="refresh-button"
          onClick={(event) => {
            event.stopPropagation();
            fetchRecentMatches();
          }}
          disabled={loading}
          title="Refresh recent matches"
          style={{ padding: 0, minWidth: '60px', height: '30px', fontSize: '1.2rem' }}
        >
          🔄
        </button>
      </div>
      <div 
        className={`ticker-content ${isPaused ? 'paused' : 'playing'}`}
        ref={tickerRef}
        role={isMobileView ? 'button' : undefined}
        aria-label={isMobileView ? (isPaused ? 'Resume ticker' : 'Pause ticker') : undefined}
        onClick={toggleTickerPause}
        onTouchEnd={toggleTickerPause}
        style={isMobileView ? { cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' } : undefined}
      >
        <div className="ticker-track">
          {[...recentMatches, ...recentMatches].map((match, index) => {
            const matchData = formatMatchResult(match);
            if (!matchData) return null;

            return (
              <div key={`${match._id}-${index}`} className="ticker-item">
                <div className="match-result">
                  <span className="winner">🏆 {matchData.winner.split(' ')[0]}</span>
                  <span className="vs">{isMobileView ? 'beat' : 'defeated'}</span>
                  <span className="loser">{matchData.loser.split(' ')[0]}</span>
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
