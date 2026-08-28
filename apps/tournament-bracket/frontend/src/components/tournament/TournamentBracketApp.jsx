import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSingleElimination, buildDoubleElimination } from './bracketLogic';
import BracketDisplay from './BracketDisplay';
import DoubleElimDisplay from './DoubleElimDisplay';
import CreateTournamentForm from './CreateTournamentForm';
import CashClimbApp from './cash-climb/CashClimbApp';
import { loadCashClimb } from './cash-climb/cashClimbStore';
import { formatTournamentDate } from './cash-climb/cashClimbEngine.js';
import { openCashClimbTv } from './cash-climb/cashClimbTv.js';
import './TournamentBracketApp.css';
import './cash-climb/CashClimb.css';

const STORAGE_KEY = 'frontrange-tournament-bracket';

function loadElim() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const t = JSON.parse(raw);
      if (t && t.entrantNames && t.entrantNames.length >= 2) return t;
    }
  } catch (_) {}
  return null;
}

export default function TournamentBracketApp() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(() => {
    if (loadCashClimb()) return 'cash-climb';
    if (loadElim()) return 'elim-play';
    return 'home';
  });
  const [elimType, setElimType] = useState('single');
  const [tournament, setTournament] = useState(loadElim);

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
    setScreen('elim-play');
  };

  const handleBracketUpdate = (rounds) => {
    if (!tournament) return;
    if (tournament.type === 'single') persist({ ...tournament, rounds });
  };

  const handleDoubleElimUpdate = (data) => {
    if (!tournament || tournament.type !== 'double') return;
    persist({ ...tournament, ...data });
  };

  const handleNewElim = () => {
    persist(null);
    setScreen('home');
  };

  const cashClimb = loadCashClimb();
  const elim = tournament;

  if (screen === 'cash-climb') {
    return (
      <div className="tournament-bracket-app">
        <CashClimbApp onLeave={() => setScreen('home')} />
      </div>
    );
  }

  if (screen === 'elim-create') {
    return (
      <div className="tournament-bracket-app">
        <header className="tb-header">
          <h1>{elimType === 'single' ? 'Single elimination' : 'Double elimination'}</h1>
          <p>Separate from the Ladder of Legends.</p>
        </header>
        <div className="tb-create">
          <CreateTournamentForm
            key={elimType}
            defaultType={elimType}
            onSubmit={handleCreate}
            onCancel={() => setScreen('home')}
          />
        </div>
      </div>
    );
  }

  if (screen === 'elim-play' && elim) {
    return (
      <div className="tournament-bracket-app">
        <header className="tb-header">
          <h1>{elim.name}</h1>
          <p>
            {elim.type === 'single' ? 'Single elimination' : 'Double elimination'} •{' '}
            {elim.entrantNames?.length || 0} entrants
          </p>
          <button type="button" className="tb-btn-new" onClick={handleNewElim}>
            New tournament
          </button>
        </header>
        {elim.type === 'single' && (
          <BracketDisplay rounds={elim.rounds} onUpdate={handleBracketUpdate} />
        )}
        {elim.type === 'double' && (
          <DoubleElimDisplay
            data={{
              winnersRounds: elim.winnersRounds,
              loserRounds: elim.loserRounds,
              grandFinal: elim.grandFinal,
            }}
            onUpdate={handleDoubleElimUpdate}
          />
        )}
      </div>
    );
  }

  return (
    <div className="tournament-bracket-app">
      <header className="tb-header">
        <h1>Open Tournament</h1>
        <p>Run an event that is not tied to the ladder. No sign-in required — the event stays in this browser. Ladder tournaments stay on the ladder.</p>
      </header>

      {(cashClimb || elim) && (
        <div className="cc-resume">
          {cashClimb && (
            <button type="button" className="cc-format-btn cc-primary" onClick={() => setScreen('cash-climb')}>
              <strong>Resume Cash Climb: {cashClimb.name}</strong>
              <span>
                {cashClimb.status === 'completed' ? 'Completed' : 'In progress'}
                {cashClimb.tournamentDate ? ` • ${formatTournamentDate(cashClimb.tournamentDate)}` : ''}
                {' '}• {cashClimb.players?.length || 0} players
              </span>
            </button>
          )}
          {elim && (
            <button type="button" className="cc-format-btn" onClick={() => setScreen('elim-play')}>
              <strong>Resume {elim.name}</strong>
              <span>{elim.type === 'single' ? 'Single elimination' : 'Double elimination'}</span>
            </button>
          )}
        </div>
      )}

      <div className="cc-format-grid">
        <button
          type="button"
          className="cc-format-btn cc-primary"
          onClick={() => setScreen('cash-climb')}
        >
          <strong>Cash Climb</strong>
          <span>Round robin, 3-loss cut, then King of the Hill at 3 players.</span>
        </button>
        <button
          type="button"
          className="cc-format-btn"
          onClick={() => {
            setElimType('single');
            setScreen('elim-create');
          }}
        >
          <strong>Single elimination</strong>
          <span>Classic bracket. Winner advances, loser is out.</span>
        </button>
        <button
          type="button"
          className="cc-format-btn"
          onClick={() => {
            setElimType('double');
            setScreen('elim-create');
          }}
        >
          <strong>Double elimination</strong>
          <span>Winners and losers brackets plus a grand final.</span>
        </button>
        <button type="button" className="tb-btn-new" onClick={() => openCashClimbTv('landscape')}>
          TV wide 16:9
        </button>
        <button type="button" className="tb-btn-new" onClick={() => openCashClimbTv('portrait')}>
          TV tall 9:16
        </button>
        <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}
