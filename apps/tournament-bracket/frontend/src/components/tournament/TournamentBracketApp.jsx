import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSingleElimination, buildDoubleElimination } from './bracketLogic';
import CreateTournamentForm from './CreateTournamentForm';
import ElimPlayScreen from './ElimPlayScreen';
import CashClimbApp from './cash-climb/CashClimbApp';
import { loadCashClimb, saveCashClimb, clearCashClimb } from './cash-climb/cashClimbStore';
import { sanitizeCashClimb } from './cash-climb/cashClimbEngine.js';
import { preferLocalTournament } from './cash-climb/cashClimbSaved.js';
import { CASH_CLIMB_GUIDE_HASH } from './cash-climb/cashClimbGuideRoute.js';
import { CASH_CLIMB_SUBMIT_HASH } from './cash-climb/cashClimbSubmit.js';
import { openCashClimbTv } from './cash-climb/cashClimbTv.js';
import {
  listSavedCashClimbEvents,
  deleteCashClimbEvent,
  retireCashClimbEvent,
} from './cash-climb/cashClimbCloud.js';
import { clearLoginReturn } from './tournamentOperators.js';
import { loadElim, saveElim, clearElim } from './elimStore.js';
import { withElimStatus, elimIdsEqual } from './elimStatus.js';
import {
  syncElimCloud,
  retireElimEvent,
  loadLiveElimEvent,
  listSavedElimEvents,
  deleteElimEvent,
} from './elimCloud.js';
import TournamentHubHome from './TournamentHubHome.jsx';
import TournamentFormatPicker from './TournamentFormatPicker.jsx';
import TournamentEventsScreen from './TournamentEventsScreen.jsx';
import {
  mergeHubEvents,
  filterCurrentEvents,
  filterCompletedEvents,
  isCashClimbHubEvent,
} from './tournamentHubEvents.js';
import './TournamentBracketApp.css';
import './cash-climb/CashClimb.css';

export default function TournamentBracketApp() {
  const navigate = useNavigate();
  useEffect(() => {
    clearLoginReturn();
  }, []);
  const [screen, setScreen] = useState('home');
  const [leaveTo, setLeaveTo] = useState('home');
  const [cashClimbIntent, setCashClimbIntent] = useState('open');
  const [elimType, setElimType] = useState('single');
  const [tournament, setTournament] = useState(loadElim);
  const [savedElim, setSavedElim] = useState([]);
  const [savedCashClimb, setSavedCashClimb] = useState([]);

  const persist = useCallback((t) => {
    const next = t ? withElimStatus(t) : null;
    setTournament(next);
    saveElim(next);
    if (next) syncElimCloud(next);
  }, []);

  const refreshSaved = useCallback(async () => {
    const [elim, cash] = await Promise.all([listSavedElimEvents(), listSavedCashClimbEvents()]);
    setSavedElim(elim);
    setSavedCashClimb(cash);
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
      if (!cancelled) await refreshSaved();
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshSaved]);

  const goHome = () => {
    setCashClimbIntent('open');
    setLeaveTo('home');
    setScreen('home');
    refreshSaved();
  };

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
    goHome();
  };

  const handleNewElim = () => {
    if (tournament && tournament.status !== 'completed') {
      const ok = window.confirm(
        'Start a new tournament? This event will be ended in the database and cleared from this tablet. You can open or remove it later from Current or Completed.'
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
    }
    refreshSaved();
  };

  const handleOpenSavedCashClimb = (item) => {
    if (!item?.tournament) return;
    const local = loadCashClimb();
    if (local && local.status !== 'completed' && String(local.id) !== String(item.id)) {
      const ok = window.confirm('Replace the Cash Climb on this tablet with the saved one? The current event stays in the database.');
      if (!ok) return;
      if (local.status !== 'completed') retireCashClimbEvent(local);
    }
    saveCashClimb(sanitizeCashClimb(item.tournament));
    setCashClimbIntent('open');
    setScreen('cash-climb');
  };

  const handleRemoveSavedCashClimb = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Remove "${item.name}" from the database? This cannot be undone.`);
    if (!ok) return;
    await deleteCashClimbEvent(item.id);
    const local = loadCashClimb();
    if (local && String(local.id) === String(item.id)) clearCashClimb();
    refreshSaved();
  };

  const handleOpenHubEvent = (item) => {
    if (isCashClimbHubEvent(item)) handleOpenSavedCashClimb(item);
    else handleOpenSavedElim(item);
  };

  const handleRemoveHubEvent = (item) => {
    if (isCashClimbHubEvent(item)) return handleRemoveSavedCashClimb(item);
    return handleRemoveSavedElim(item);
  };

  const startNewCashClimb = () => {
    setCashClimbIntent('new');
    setLeaveTo('new');
    setScreen('cash-climb');
  };

  const cashClimb = loadCashClimb();
  const elim = tournament;
  const hubEvents = mergeHubEvents({
    cashClimbSaved: savedCashClimb,
    elimSaved: savedElim,
    localCashClimb: cashClimb,
    localElim: elim,
  });
  const currentEvents = filterCurrentEvents(hubEvents);
  const completedEvents = filterCompletedEvents(hubEvents);

  if (screen === 'cash-climb') {
    return (
      <div className="tournament-bracket-app">
        <CashClimbApp
          intent={cashClimbIntent}
          onLeave={() => {
            setCashClimbIntent('open');
            setScreen(leaveTo);
            refreshSaved();
          }}
        />
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
            onCancel={() => setScreen('new')}
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

  if (screen === 'new') {
    return (
      <div className="tournament-bracket-app">
        <TournamentFormatPicker
          onCashClimb={startNewCashClimb}
          onSingleElim={() => {
            setElimType('single');
            setScreen('elim-create');
          }}
          onDoubleElim={() => {
            setElimType('double');
            setScreen('elim-create');
          }}
          onBack={goHome}
        />
      </div>
    );
  }

  if (screen === 'current' || screen === 'completed') {
    const isCurrent = screen === 'current';
    return (
      <div className="tournament-bracket-app">
        <TournamentEventsScreen
          title={isCurrent ? 'Current Tournaments' : 'Completed'}
          note={
            isCurrent
              ? 'Events still in progress on this tablet or in the database.'
              : 'Finished events you can open or remove.'
          }
          emptyMessage={
            isCurrent
              ? 'No tournaments in progress. Start a new one from the Tournaments menu.'
              : 'No completed tournaments yet.'
          }
          events={isCurrent ? currentEvents : completedEvents}
          onOpen={(item) => {
            setLeaveTo(screen);
            handleOpenHubEvent(item);
          }}
          onRemove={handleRemoveHubEvent}
          onBack={goHome}
        />
      </div>
    );
  }

  return (
    <div className="tournament-bracket-app">
      <TournamentHubHome
        currentCount={currentEvents.length}
        completedCount={completedEvents.length}
        onNew={() => setScreen('new')}
        onCurrent={() => setScreen('current')}
        onCompleted={() => setScreen('completed')}
        onTvWide={() => openCashClimbTv('landscape')}
        onTvTall={() => openCashClimbTv('portrait')}
        onGuide={() => navigate(CASH_CLIMB_GUIDE_HASH)}
        onSubmit={() => navigate(CASH_CLIMB_SUBMIT_HASH)}
        onBackHome={() => navigate('/')}
      />
    </div>
  );
}
