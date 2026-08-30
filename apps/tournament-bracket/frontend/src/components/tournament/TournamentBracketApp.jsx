import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSingleElimination, buildDoubleElimination } from './bracketLogic';
import CreateTournamentForm from './CreateTournamentForm';
import ElimPlayScreen from './ElimPlayScreen';
import CashClimbApp from './cash-climb/CashClimbApp';
import CashClimbSavedEvents from './cash-climb/CashClimbSavedEvents.jsx';
import { loadCashClimb } from './cash-climb/cashClimbStore';
import { preferLocalTournament } from './cash-climb/cashClimbSaved.js';
import { formatTournamentDate } from './cash-climb/cashClimbEngine.js';
import { CASH_CLIMB_GUIDE_HASH } from './cash-climb/cashClimbGuideRoute.js';
import { CASH_CLIMB_SUBMIT_HASH } from './cash-climb/cashClimbSubmit.js';
import { openCashClimbTv } from './cash-climb/cashClimbTv.js';
import { clearLoginReturn } from './tournamentOperators.js';
import { loadElim, saveElim, clearElim } from './elimStore.js';
import { withElimStatus, elimIdsEqual, elimFormatLabel } from './elimStatus.js';
import {
  syncElimCloud,
  retireElimEvent,
  loadLiveElimEvent,
  listSavedElimEvents,
  deleteElimEvent,
} from './elimCloud.js';
import './TournamentBracketApp.css';
import './cash-climb/CashClimb.css';

export default function TournamentBracketApp() {
  const navigate = useNavigate();
  useEffect(() => {
    clearLoginReturn();
  }, []);
  const [screen, setScreen] = useState(() => {
    if (loadCashClimb()) return 'cash-climb';
    if (loadElim()) return 'elim-play';
    return 'home';
  });
  const [elimType, setElimType] = useState('single');
  const [tournament, setTournament] = useState(loadElim);
  const [savedElim, setSavedElim] = useState([]);

  const persist = useCallback((t) => {
    const next = t ? withElimStatus(t) : null;
    setTournament(next);
    saveElim(next);
    if (next) syncElimCloud(next);
  }, []);

  const refreshSavedElim = useCallback(async () => {
    setSavedElim(await listSavedElimEvents());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const local = loadElim();
      const live = await loadLiveElimEvent();
      if (cancelled) return;
      const chosen = preferLocalTournament(local, live.tournament);
      if (chosen && !local) {
        const restored = withElimStatus(chosen);
        setTournament(restored);
        saveElim(restored);
      } else if (local) {
        syncElimCloud(local);
      }
      if (!cancelled) await refreshSavedElim();
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshSavedElim]);

  const handleCreate = (config) => {
    if (tournament && tournament.status !== 'completed') {
      retireElimEvent(withElimStatus(tournament, 'ended'));
    }
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

  const leaveElimToHome = () => {
    clearElim();
    setTournament(null);
    setScreen('home');
    refreshSavedElim();
  };

  const handleNewElim = () => {
    if (tournament && tournament.status !== 'completed') {
      const ok = window.confirm(
        'Start a new tournament? This event will be ended in the database and cleared from this tablet. You can open or remove it later from the home list.'
      );
      if (!ok) return;
      retireElimEvent(withElimStatus(tournament, 'ended'));
    }
    leaveElimToHome();
  };

  const handleRemoveElim = async () => {
    if (!tournament?.id) return;
    const ok = window.confirm('Remove this tournament from the database and this tablet? This cannot be undone.');
    if (!ok) return;
    await deleteElimEvent(tournament.id);
    leaveElimToHome();
  };

  const handleOpenSavedElim = (item) => {
    if (!item?.tournament) return;
    if (tournament && tournament.status !== 'completed' && !elimIdsEqual(tournament.id, item.id)) {
      const ok = window.confirm('Replace the event on this tablet with the saved one? The current event stays in the database.');
      if (!ok) return;
      if (tournament.status !== 'completed') retireElimEvent(withElimStatus(tournament, 'ended'));
    }
    persist(item.tournament);
    setScreen('elim-play');
  };

  const handleRemoveSavedElim = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Remove "${item.name}" from the database? This cannot be undone.`);
    if (!ok) return;
    await deleteElimEvent(item.id);
    if (tournament && elimIdsEqual(tournament.id, item.id)) {
      clearElim();
      setTournament(null);
      setScreen('home');
    }
    refreshSavedElim();
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
        <CashClimbSavedEvents
          title="Saved elimination tournaments"
          events={savedElim}
          onOpen={handleOpenSavedElim}
          onRemove={handleRemoveSavedElim}
        />
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
      <ElimPlayScreen
        tournament={elim}
        onUpdate={persist}
        onNew={handleNewElim}
        onRemove={handleRemoveElim}
      />
    );
  }

  return (
    <div className="tournament-bracket-app">
      <header className="tb-header">
        <h1>Open Tournament</h1>
        <p>Run an event that is not tied to the ladder. Events save to the database, with this tablet as backup. Ladder tournaments stay on the ladder.</p>
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
              <span>{elimFormatLabel(elim.type)}</span>
            </button>
          )}
        </div>
      )}

      <CashClimbSavedEvents
        title="Saved elimination tournaments"
        events={savedElim.filter((item) => !elim || !elimIdsEqual(item.id, elim.id))}
        onOpen={handleOpenSavedElim}
        onRemove={handleRemoveSavedElim}
      />

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
        <button type="button" className="tb-btn-new" onClick={() => navigate(CASH_CLIMB_GUIDE_HASH)}>
          How it works (public)
        </button>
        <button type="button" className="tb-btn-new" onClick={() => navigate(CASH_CLIMB_SUBMIT_HASH)}>
          Player submit (public)
        </button>
        <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}
