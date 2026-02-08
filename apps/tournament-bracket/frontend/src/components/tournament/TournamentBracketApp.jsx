import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSingleElimination, buildDoubleElimination } from './bracketLogic';
import BracketDisplay from './BracketDisplay';
import DoubleElimDisplay from './DoubleElimDisplay';
import CreateTournamentForm from './CreateTournamentForm';
import './TournamentBracketApp.css';

const STORAGE_KEY = 'frontrange-tournament-bracket';

export default function TournamentBracketApp() {
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const t = JSON.parse(raw);
        if (t && t.entrantNames && t.entrantNames.length >= 2) return t;
      }
    } catch (_) {}
    return null;
  });

  const persist = useCallback((t) => {
    setTournament(t);
    try {
      if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  const handleCreate = (config) => {
    if (config.type === 'single') {
      const { rounds } = buildSingleElimination(config.entrantNames);
      persist({
        name: config.name,
        type: 'single',
        entrantNames: config.entrantNames,
        entrants: config.entrants || config.entrantNames.map((n) => ({ name: n })),
        rounds,
      });
    } else {
      const { winnersRounds, loserRounds, grandFinal } = buildDoubleElimination(config.entrantNames);
      persist({
        name: config.name,
        type: 'double',
        entrantNames: config.entrantNames,
        entrants: config.entrants || config.entrantNames.map((n) => ({ name: n })),
        winnersRounds,
        loserRounds,
        grandFinal,
      });
    }
  };

  const handleBracketUpdate = (rounds) => {
    if (!tournament) return;
    if (tournament.type === 'single') {
      persist({ ...tournament, rounds });
    }
  };

  const handleDoubleElimUpdate = (data) => {
    if (!tournament || tournament.type !== 'double') return;
    persist({ ...tournament, ...data });
  };

  const handleNewTournament = () => {
    persist(null);
  };

  if (!tournament) {
    return (
      <div className="tournament-bracket-app">
        <header className="tb-header">
          <h1>Tournament Bracket</h1>
          <p>Run single or double elimination pool tournaments.</p>
        </header>
        <div className="tb-create">
          <CreateTournamentForm
            onSubmit={handleCreate}
            onCancel={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-bracket-app">
      <header className="tb-header">
        <h1>{tournament.name}</h1>
        <p>
          {tournament.type === 'single' ? 'Single elimination' : 'Double elimination'} •{' '}
          {tournament.entrantNames?.length || 0} entrants
        </p>
        <button type="button" className="tb-btn-new" onClick={handleNewTournament}>
          New tournament
        </button>
      </header>

      {tournament.type === 'single' && (
        <BracketDisplay
          rounds={tournament.rounds}
          onUpdate={handleBracketUpdate}
        />
      )}
      {tournament.type === 'double' && (
        <DoubleElimDisplay
          data={{
            winnersRounds: tournament.winnersRounds,
            loserRounds: tournament.loserRounds,
            grandFinal: tournament.grandFinal,
          }}
          onUpdate={handleDoubleElimUpdate}
        />
      )}
    </div>
  );
}
