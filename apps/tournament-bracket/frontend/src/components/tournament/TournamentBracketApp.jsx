import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createElimTournament } from './elimSeed.js';
import CreateTournamentForm from './CreateTournamentForm';
import ElimPlayScreen from './ElimPlayScreen';
import CashClimbApp from './cash-climb/CashClimbApp';
import { loadCashClimb, saveCashClimb, clearCashClimb } from './cash-climb/cashClimbStore';
import { sanitizeCashClimb } from './cash-climb/cashClimbEngine.js';
import { preferTournamentCopy, withTournamentTimestamp, tournamentTime } from './cash-climb/cashClimbSaved.js';
import { CASH_CLIMB_GUIDE_HASH } from './cash-climb/cashClimbGuideRoute.js';
import { CASH_CLIMB_SUBMIT_HASH } from './cash-climb/cashClimbSubmit.js';
import { openCashClimbTv } from './cash-climb/cashClimbTv.js';
import {
  listSavedCashClimbEvents,
  listLiveCashClimbEvents,
  loadCashClimbEventById,
  deleteCashClimbEvent,
  retireCashClimbEvent,
} from './cash-climb/cashClimbCloud.js';
import { clearLoginReturn } from './tournamentOperators.js';
import { loadElim, saveElim, clearElim } from './elimStore.js';
import { withElimStatus, elimIdsEqual, reopenEndedElim } from './elimStatus.js';
import {
  syncElimCloud,
  parkLiveElimEvent,
  loadLiveElimEvent,
  loadElimEventById,
  listSavedElimEvents,
  listLiveElimEvents,
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
    const next = t ? withTournamentTimestamp(withElimStatus(t)) : null;
    setTournament(next);
    saveElim(next);
    if (next) syncElimCloud(next);
  }, []);

  const refreshSaved = useCallback(async () => {
    const [elim, cash, elimLive, cashLive] = await Promise.all([
      listSavedElimEvents(),
      listSavedCashClimbEvents(),
      listLiveElimEvents(),
      listLiveCashClimbEvents(),
    ]);
    setSavedElim([...elimLive, ...elim]);
    setSavedCashClimb([...cashLive, ...cash]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyCopy = (local, cloud, { allowSync = false } = {}) => {
      const chosen = preferTournamentCopy(local, cloud);
      if (!chosen || cancelled) return;
      if (!local || tournamentTime(chosen) > tournamentTime(local)) {
        const restored = withElimStatus(chosen);
        setTournament(restored);
        saveElim(restored);
        return;
      }
      if (allowSync && local) syncElimCloud(local);
    };
    const hydrate = async () => {
      const local = loadElim();
      const byId = local?.id ? (await loadElimEventById(local.id)).tournament : null;
      const live = byId || (await loadLiveElimEvent()).tournament;
      if (cancelled) return;
      applyCopy(local, live, { allowSync: true });
      if (!cancelled) await refreshSaved();
    };
    hydrate();
    const pull = async () => {
      const local = loadElim();
      if (!local?.id || cancelled) return;
      const cloud = (await loadElimEventById(local.id)).tournament;
      if (cancelled || !cloud) return;
      applyCopy(local, cloud);
    };
    const timer = setInterval(pull, 10000);
    const onFocus = () => pull();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshSaved]);

  const goHome = () => {
    setCashClimbIntent('open');
    setLeaveTo('home');
    setScreen('home');
    refreshSaved();
  };

  const keepCurrentElim = async () => {
    if (!tournament?.id || tournament.status === 'completed' || tournament.status === 'ended') return true;
    const result = await parkLiveElimEvent(withTournamentTimestamp(tournament));
    if (result.error) {
      window.alert('Could not save the current elimination event first. Sign in and try again so it is not lost.');
      return false;
    }
    return true;
  };

  const handleCreate = async (config) => {
    if (!(await keepCurrentElim())) return;
    persist(createElimTournament(config));
    setScreen('elim-play');
    refreshSaved();
  };

  const leaveElimToHome = () => {
    clearElim();
    setTournament(null);
    goHome();
  };

  const handleNewElim = async () => {
    if (tournament && tournament.status === 'in-progress') {
      const ok = window.confirm(
        'Leave this bracket on this tablet? It stays in Current Tournaments so you can open it again. It will not be erased.'
      );
      if (!ok) return;
      if (!(await keepCurrentElim())) return;
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

  const handleOpenSavedElim = async (item) => {
    if (!item?.tournament && !item?.id) return;
    if (tournament && tournament.status !== 'completed' && !elimIdsEqual(tournament.id, item.id)) {
      const ok = window.confirm('Switch this tablet to that event? The one you are on stays in Current Tournaments.');
      if (!ok) return;
      if (!(await keepCurrentElim())) return;
    }
    const fresh = item.id ? (await loadElimEventById(item.id)).tournament : null;
    const payload = reopenEndedElim(fresh || item.tournament);
    if (!payload) return;
    setTournament(payload);
    saveElim(payload);
    if (payload.status === 'in-progress') syncElimCloud(payload);
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

  const handleOpenSavedCashClimb = async (item) => {
    if (!item?.tournament && !item?.id) return;
    const local = loadCashClimb();
    if (local && local.status !== 'completed' && String(local.id) !== String(item.id)) {
      const ok = window.confirm('Replace the Cash Climb on this tablet with the saved one? The current event stays in the database.');
      if (!ok) return;
      if (local.status !== 'completed') retireCashClimbEvent(local);
    }
    const fresh = item.id ? (await loadCashClimbEventById(item.id)).tournament : null;
    const payload = fresh || item.tournament;
    if (!payload) return;
    saveCashClimb(sanitizeCashClimb(payload));
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
              ? 'Start on one device, then Open here on another to keep running. Starting a new bracket does not end the others. Players submit from the homepage.'
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
