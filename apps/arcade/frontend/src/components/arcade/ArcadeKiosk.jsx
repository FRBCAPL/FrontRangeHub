import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_MACHINE, SAMPLE_GAMES } from '../../data/sampleGames.js';
import GameFinder from './GameFinder.jsx';
import LeaderboardPanel from './LeaderboardPanel.jsx';
import SubmitScorePanel from './SubmitScorePanel.jsx';
import HowToPlayBanner from './HowToPlayBanner.jsx';
import './ArcadeKiosk.css';

const TABS = [
  { id: 'find', label: 'Find Game', icon: '🔍' },
  { id: 'submit', label: 'Submit Score', icon: '📷' },
  { id: 'leaderboards', label: 'Leaderboards', icon: '🏆' }
];

const VALID_TABS = new Set(TABS.map((tab) => tab.id));
const SEARCH_QUERY_STORAGE_KEY = 'frph-arcade-search-query';

const readStoredSearchQuery = () => {
  try {
    return sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const ArcadeKiosk = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const gameParam = searchParams.get('game');
  const initialTab = VALID_TABS.has(tabParam) ? tabParam : 'find';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState(readStoredSearchQuery);
  const [topScoreRefreshKey, setTopScoreRefreshKey] = useState(0);
  const games = SAMPLE_GAMES;

  const selectedLeaderboardGame = useMemo(() => {
    if (!gameParam) return null;
    return games.find((game) => String(game.number) === gameParam) || null;
  }, [gameParam, games]);

  useEffect(() => {
    if (VALID_TABS.has(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSearchQueryChange = (value) => {
    setSearchQuery(value);
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(SEARCH_QUERY_STORAGE_KEY, searchQuery);
    } catch {
      // ignore storage errors in kiosk browsers
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === 'find') {
      setTopScoreRefreshKey((key) => key + 1);
    }
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams();
    params.set('tab', tabId);
    if (tabId === 'leaderboards' && gameParam) {
      params.set('game', gameParam);
    }
    navigate(`/arcade/kiosk?${params.toString()}`);
  };

  const handleOpenLeaderboard = (game) => {
    setActiveTab('leaderboards');
    navigate(`/arcade/kiosk?tab=leaderboards&game=${game.number}`);
  };

  return (
    <div className="arcade-kiosk">
      <header className="arcade-kiosk-header">
        <div className="arcade-kiosk-brand">
          <span className="arcade-kiosk-icon">🎮</span>
          <div>
            <h1>{DEFAULT_MACHINE.name}</h1>
            <p>{DEFAULT_MACHINE.location}</p>
          </div>
        </div>
      </header>

      <HowToPlayBanner />

      <nav className="arcade-kiosk-tabs" aria-label="Arcade kiosk sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`arcade-kiosk-tab arcade-kiosk-tab--${tab.id} ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="arcade-kiosk-tab-icon">{tab.icon}</span>
            <span className="arcade-kiosk-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="arcade-kiosk-panel">
        <div className={activeTab === 'find' ? '' : 'arcade-kiosk-panel-hidden'}>
          <GameFinder
            games={games}
            machineId={DEFAULT_MACHINE.id}
            query={searchQuery}
            onQueryChange={handleSearchQueryChange}
            onOpenLeaderboard={handleOpenLeaderboard}
            topScoreRefreshKey={topScoreRefreshKey}
          />
        </div>
        {activeTab === 'submit' && <SubmitScorePanel />}
        {activeTab === 'leaderboards' && (
          <LeaderboardPanel
            games={games}
            machineId={DEFAULT_MACHINE.id}
            initialGame={selectedLeaderboardGame}
          />
        )}
      </main>

      <footer className="arcade-kiosk-footer">
        <span>{games.length} games</span>
      </footer>
    </div>
  );
};

export default ArcadeKiosk;
