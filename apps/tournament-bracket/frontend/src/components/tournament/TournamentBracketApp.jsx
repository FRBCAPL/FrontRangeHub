import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createElimTournament } from './elimSeed.js';
import CreateTournamentForm from './CreateTournamentForm';
import ElimPlayScreen from './ElimPlayScreen';
import CashClimbApp from './cash-climb/CashClimbApp';
import BreakAndRunApp from './break-and-run/BreakAndRunApp.jsx';
import { loadCashClimb, saveCashClimb, clearCashClimb } from './cash-climb/cashClimbStore';
import { loadBreakAndRun, saveBreakAndRun, clearBreakAndRun } from './break-and-run/breakAndRunStore.js';
import { sanitizeBreakAndRun } from './break-and-run/breakAndRunEngine.js';
import {
  listSavedBreakAndRunEvents,
  listLiveBreakAndRunEvents,
  loadBreakAndRunEventById,
  deleteBreakAndRunEvent,
  parkLiveBreakAndRunEvent,
} from './break-and-run/breakAndRunCloud.js';
import { sanitizeCashClimb } from './cash-climb/cashClimbEngine.js';
import { preferTournamentCopy, withTournamentTimestamp, tournamentTime } from './cash-climb/cashClimbSaved.js';
import { CASH_CLIMB_GUIDE_HASH, openCashClimbGuideTv } from './cash-climb/cashClimbGuideRoute.js';
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
  isBreakAndRunHubEvent,
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
  const [breakAndRunIntent, setBreakAndRunIntent] = useState('open');
  const [elimType, setElimType] = useState('single');
  const [tournament, setTournament] = useState(loadElim);
  const [savedElim, setSavedElim] = useState([]);
  const [savedCashClimb, setSavedCashClimb] = useState([]);
  const [savedBreakAndRun, setSavedBreakAndRun] = useState([]);

  const persist = useCallback((t) => {
    const next = t ? withTournamentTimestamp(withElimStatus(t)) : null;
    setTournament(next);
    saveElim(next);
    if (next) syncElimCloud(next);
  }, []);

  const refreshSaved = useCallback(async () => {
    const [elim, cash, bnr, elimLive, cashLive, bnrLive] = await Promise.all([
      listSavedElimEvents(),
      listSavedCashClimbEvents(),
      listSavedBreakAndRunEvents(),
      listLiveElimEvents(),
      listLiveCashClimbEvents(),
      listLiveBreakAndRunEvents(),
    ]);
    setSavedElim([...elimLive, ...elim]);
    setSavedCashClimb([...cashLive, ...cash]);
    setSavedBreakAndRun([...bnrLive, ...bnr]);
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
    setBreakAndRunIntent('open');
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

  const handleOpenSavedBreakAndRun = async (item) => {
    if (!item?.tournament && !item?.id) return;
    const local = loadBreakAndRun();
    if (local && local.status !== 'completed' && String(local.id) !== String(item.id)) {
      const ok = window.confirm('Switch this tablet to that Break and Run? The one you are on stays in Current Tournaments.');
      if (!ok) return;
      if (local.status === 'in-progress') {
        const parked = await parkLiveBreakAndRunEvent(local);
        if (parked.error) {
          window.alert('Could not save the current Break and Run first. Sign in and try again so it is not lost.');
          return;
        }
      }
    }
    const fresh = item.id ? (await loadBreakAndRunEventById(item.id)).tournament : null;
    const payload = fresh || item.tournament;
    if (!payload) return;
    saveBreakAndRun(sanitizeBreakAndRun(payload));
    setBreakAndRunIntent('open');
    setScreen('break-and-run');
  };

  const handleRemoveSavedBreakAndRun = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Remove "${item.name}" from the database? This cannot be undone.`);
    if (!ok) return;
    await deleteBreakAndRunEvent(item.id);
    const local = loadBreakAndRun();
    if (local && String(local.id) === String(item.id)) clearBreakAndRun();
    refreshSaved();
  };

  const handleOpenHubEvent = (item) => {
    if (isBreakAndRunHubEvent(item)) handleOpenSavedBreakAndRun(item);
    else if (isCashClimbHubEvent(item)) handleOpenSavedCashClimb(item);
    else handleOpenSavedElim(item);
  };

  const handleRemoveHubEvent = (item) => {
    if (isBreakAndRunHubEvent(item)) return handleRemoveSavedBreakAndRun(item);
    if (isCashClimbHubEvent(item)) return handleRemoveSavedCashClimb(item);
    return handleRemoveSavedElim(item);
  };

  const startNewCashClimb = () => {
    setCashClimbIntent('new');
    setLeaveTo('new');
    setScreen('cash-climb');
  };

  const startNewBreakAndRun = () => {
    setBreakAndRunIntent('new');
    setLeaveTo('new');
    setScreen('break-and-run');
  };

  const cashClimb = loadCashClimb();
  const breakAndRun = loadBreakAndRun();
  const elim = tournament;
  const hubEvents = mergeHubEvents({
    cashClimbSaved: savedCashClimb,
    elimSaved: savedElim,
    breakAndRunSaved: savedBreakAndRun,
    localCashClimb: cashClimb,
    localElim: elim,
    localBreakAndRun: breakAndRun,
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

  if (screen === 'break-and-run') {
    return (
      <div className="tournament-bracket-app">
        <BreakAndRunApp
          intent={breakAndRunIntent}
          onLeave={() => {
            setBreakAndRunIntent('open');
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
          onBreakAndRun={startNewBreakAndRun}
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
        onGuideTv={() => openCashClimbGuideTv()}
        onGuide={() => navigate(CASH_CLIMB_GUIDE_HASH)}
        onSubmit={() => navigate(CASH_CLIMB_SUBMIT_HASH)}
        onBackHome={() => navigate('/')}
      />
    </div>
  );
}
