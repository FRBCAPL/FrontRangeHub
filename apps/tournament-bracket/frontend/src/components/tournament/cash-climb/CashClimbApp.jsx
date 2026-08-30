import React, { useCallback, useEffect, useState } from 'react';
import CashClimbSetup from './CashClimbSetup.jsx';
import CashClimbPlay from './CashClimbPlay.jsx';
import { createOpenTournament, startTournament, recordMatchResult, continueCashClimb } from './cashClimbEngine.js';
import { updateOpenTournament } from './cashClimbEdit.js';
import { loadCashClimb, saveCashClimb, clearCashClimb } from './cashClimbStore.js';
import {
  syncCashClimbCloud,
  retireCashClimbEvent,
  loadCashClimbPending,
  deleteCashClimbPending,
} from './cashClimbCloud.js';
import './CashClimb.css';

const PENDING_POLL_MS = 2500;

export default function CashClimbApp({ onLeave }) {
  const [tournament, setTournament] = useState(() => loadCashClimb());
  const [submissions, setSubmissions] = useState([]);

  const persist = useCallback((next) => {
    setTournament(next);
    saveCashClimb(next);
    syncCashClimbCloud(next);
  }, []);

  useEffect(() => {
    if (tournament?.id) syncCashClimbCloud(tournament);
    // Publish once on open so phones can see an event that was already running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tournament?.id || tournament.status === 'completed') {
      setSubmissions([]);
      return undefined;
    }
    let cancelled = false;
    const refresh = async () => {
      const rows = await loadCashClimbPending(tournament.id);
      if (!cancelled) setSubmissions(rows);
    };
    refresh();
    const timer = setInterval(refresh, PENDING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tournament?.id, tournament?.status, tournament?.matches]);

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

  const handleConfirmSubmit = (row) => {
    if (!row?.match_id || !row?.winner_id) return;
    try {
      persist(recordMatchResult(tournament, row.match_id, row.winner_id, row.score || null));
      deleteCashClimbPending(tournament.id, row.match_id);
    } catch (err) {
      alert(err.message || 'Could not confirm that result');
    }
  };

  const handleRejectSubmit = (row) => {
    if (!row?.match_id) return;
    deleteCashClimbPending(tournament.id, row.match_id).then(() => {
      setSubmissions((prev) => prev.filter((item) => item.match_id !== row.match_id));
    });
  };

  const handleContinue = () => {
    try {
      persist(continueCashClimb(tournament));
    } catch (err) {
      alert(err.message || 'Could not continue');
    }
  };

  const handleEdit = (patch) => {
    try {
      persist(updateOpenTournament(tournament, patch));
      return true;
    } catch (err) {
      alert(err.message || 'Could not update tournament');
      return false;
    }
  };

  const handleNew = () => {
    if (tournament && tournament.status !== 'completed') {
      const ok = window.confirm('Start a new Cash Climb? The current event on this device will be cleared.');
      if (!ok) return;
    }
    if (tournament) retireCashClimbEvent(tournament);
    clearCashClimb();
    setTournament(null);
    setSubmissions([]);
  };

  if (!tournament) {
    return <CashClimbSetup onStart={handleStart} onCancel={onLeave} />;
  }

  return (
    <CashClimbPlay
      tournament={tournament}
      submissions={submissions}
      onRecord={handleRecord}
      onConfirmSubmit={handleConfirmSubmit}
      onRejectSubmit={handleRejectSubmit}
      onContinue={handleContinue}
      onNew={handleNew}
      onEdit={handleEdit}
      onLeave={onLeave}
    />
  );
}
