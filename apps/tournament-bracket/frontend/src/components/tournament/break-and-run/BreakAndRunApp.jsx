import React, { useCallback, useEffect, useRef, useState } from 'react';
import BreakAndRunSetup from './BreakAndRunSetup.jsx';
import BreakAndRunPlay from './BreakAndRunPlay.jsx';
import {
  addPlayer,
  addToPot,
  completeEvent,
  createBreakAndRun,
  endSession,
  formatMoney,
  recordTurn,
  payRebuy,
  reopenEvent,
  sanitizeBreakAndRun,
  setReserve,
  startSession,
  undoLast,
} from './breakAndRunEngine.js';
import { loadBreakAndRun, saveBreakAndRun, clearBreakAndRun } from './breakAndRunStore.js';
import {
  syncBreakAndRunCloud,
  parkLiveBreakAndRunEvent,
  loadLiveBreakAndRunEvent,
  loadBreakAndRunEventById,
  deleteBreakAndRunEvent,
} from './breakAndRunCloud.js';
import { preferTournamentCopy, withTournamentTimestamp, tournamentTime } from '../cash-climb/cashClimbSaved.js';

export default function BreakAndRunApp({ onLeave, intent = 'open' }) {
  const [tournament, setTournament] = useState(() => (intent === 'new' ? null : loadBreakAndRun()));
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;

  const persist = useCallback((next) => {
    const stamped = withTournamentTimestamp(next);
    setTournament(stamped);
    saveBreakAndRun(stamped);
    syncBreakAndRunCloud(stamped);
  }, []);

  useEffect(() => {
    if (intent === 'new') return undefined;
    let cancelled = false;
    const applyCopy = (local, cloud, { allowSync = false } = {}) => {
      const chosen = preferTournamentCopy(local, cloud);
      if (!chosen) return;
      if (!local || tournamentTime(chosen) > tournamentTime(local)) {
        const restored = sanitizeBreakAndRun(chosen);
        setTournament(restored);
        saveBreakAndRun(restored);
        return;
      }
      if (allowSync && local) syncBreakAndRunCloud(local);
    };
    const hydrate = async () => {
      const local = loadBreakAndRun();
      const byId = local?.id ? (await loadBreakAndRunEventById(local.id)).tournament : null;
      const live = byId || (await loadLiveBreakAndRunEvent()).tournament;
      if (cancelled) return;
      applyCopy(local, live, { allowSync: true });
    };
    hydrate();
    const pull = async () => {
      const local = tournamentRef.current;
      if (!local?.id || cancelled) return;
      const cloud = (await loadBreakAndRunEventById(local.id)).tournament;
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
  }, [intent]);

  const run = (work) => {
    try {
      persist(work(tournament));
    } catch (err) {
      alert(err.message || 'Could not update the pot.');
    }
  };

  const handleStart = (config) => {
    const previous = loadBreakAndRun();
    if (previous && previous.status !== 'completed' && previous.status !== 'ended') {
      const ok = window.confirm(
        'Start this new Break and Run? The event on this tablet stays in Current Tournaments. It will not be erased.'
      );
      if (!ok) return;
      parkLiveBreakAndRunEvent(previous);
    }
    persist(createBreakAndRun(config));
  };

  const handleNew = () => {
    if (tournament && tournament.status === 'in-progress') {
      const ok = window.confirm(
        'Leave this pot on this tablet? It stays in Current Tournaments so you can open it again.'
      );
      if (!ok) return;
      parkLiveBreakAndRunEvent(tournament);
    }
    clearBreakAndRun();
    setTournament(null);
  };

  const handleRemove = async () => {
    if (!tournament?.id) return;
    const ok = window.confirm('Remove this Break and Run from the database and this tablet? This cannot be undone.');
    if (!ok) return;
    await deleteBreakAndRunEvent(tournament.id);
    clearBreakAndRun();
    setTournament(null);
  };

  if (!tournament) {
    return <BreakAndRunSetup onStart={handleStart} onCancel={onLeave} />;
  }

  return (
    <BreakAndRunPlay
      tournament={tournament}
      onAddPlayer={(player) => run((t) => addPlayer(t, player))}
      onRecord={(playerId, details) => run((t) => recordTurn(t, playerId, details))}
      onPayRebuy={(playerId) => run((t) => payRebuy(t, playerId))}
      onAddToPot={(amount, note) => run((t) => addToPot(t, amount, note))}
      onSetReserve={(amount) => run((t) => setReserve(t, amount))}
      onStartSession={() => run((t) => startSession(t))}
      onEndSession={() => run((t) => endSession(t))}
      onUndo={() => run((t) => undoLast(t))}
      onComplete={() => {
        const leftover = formatMoney(tournament.currentPot);
        const ok = window.confirm(
          `Mark this Break & Run complete? Leftover ${leftover} stays in the pot until you reopen it.`
        );
        if (!ok) return;
        run((t) => completeEvent(t));
      }}
      onReopen={() => run((t) => reopenEvent(t))}
      onNew={handleNew}
      onLeave={onLeave}
      onRemove={handleRemove}
    />
  );
}
