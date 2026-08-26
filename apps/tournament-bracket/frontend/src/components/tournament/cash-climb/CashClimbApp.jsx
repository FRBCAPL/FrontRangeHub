import React, { useCallback, useState } from 'react';
import CashClimbSetup from './CashClimbSetup.jsx';
import CashClimbPlay from './CashClimbPlay.jsx';
import { createOpenTournament, startTournament, recordMatchResult } from './cashClimbEngine.js';
import { loadCashClimb, saveCashClimb, clearCashClimb } from './cashClimbStore.js';
import './CashClimb.css';

export default function CashClimbApp({ onLeave }) {
  const [tournament, setTournament] = useState(() => loadCashClimb());

  const persist = useCallback((next) => {
    setTournament(next);
    saveCashClimb(next);
  }, []);

  const handleStart = (config) => {
    try {
      const created = createOpenTournament(config);
      persist(startTournament(created));
    } catch (err) {
      alert(err.message || 'Could not start tournament');
    }
  };

  const handleRecord = (matchId, winnerId, score) => {
    try {
      persist(recordMatchResult(tournament, matchId, winnerId, score));
    } catch (err) {
      alert(err.message || 'Could not save result');
    }
  };

  const handleNew = () => {
    if (tournament && tournament.status !== 'completed') {
      const ok = window.confirm('Start a new Cash Climb? The current event on this device will be cleared.');
      if (!ok) return;
    }
    clearCashClimb();
    setTournament(null);
  };

  if (!tournament) {
    return <CashClimbSetup onStart={handleStart} onCancel={onLeave} />;
  }

  return (
    <CashClimbPlay
      tournament={tournament}
      onRecord={handleRecord}
      onNew={handleNew}
      onLeave={onLeave}
    />
  );
}
