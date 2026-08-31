import React, { useCallback, useEffect, useRef, useState } from 'react';
import CashClimbSetup from './CashClimbSetup.jsx';
import CashClimbPlay from './CashClimbPlay.jsx';
import { createOpenTournament, sanitizeCashClimb, startTournament, recordMatchResult, continueCashClimb } from './cashClimbEngine.js';
import { updateOpenTournament } from './cashClimbEdit.js';
import { loadCashClimb, saveCashClimb, clearCashClimb } from './cashClimbStore.js';
import {
  syncCashClimbCloud,
  retireCashClimbEvent,
  loadLiveCashClimbEvent,
  loadCashClimbPending,
  deleteCashClimbPending,
  listSavedCashClimbEvents,
  deleteCashClimbEvent,
} from './cashClimbCloud.js';
import { cashClimbPublishErrorMessage } from './cashClimbPublic.js';
import { findMatchById, idsEqual, resolvePendingWinnerId } from './cashClimbSubmit.js';
import { playedGameFromPending } from './cashClimbPlayedGame.js';
import { preferLocalTournament } from './cashClimbSaved.js';
import './CashClimb.css';

const PENDING_POLL_MS = 2500;

export default function CashClimbApp({ onLeave }) {
  const [tournament, setTournament] = useState(() => loadCashClimb());
  const [submissions, setSubmissions] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  const [cloudError, setCloudError] = useState('');
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;

  const persist = useCallback((next) => {
    setTournament(next);
    saveCashClimb(next);
    syncCashClimbCloud(next).then((result) => {
      setCloudError(result?.error ? cashClimbPublishErrorMessage(result.error) : '');
    });
  }, []);

  const refreshSaved = useCallback(async () => {
    setSavedEvents(await listSavedCashClimbEvents());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const local = loadCashClimb();
      const live = await loadLiveCashClimbEvent();
      if (cancelled) return;
      const chosen = preferLocalTournament(local, live.tournament);
      if (chosen && !local) {
        const restored = sanitizeCashClimb(chosen);
        setTournament(restored);
        saveCashClimb(restored);
      } else if (local) {
        const result = await syncCashClimbCloud(local);
        if (!cancelled) {
          setCloudError(result?.error ? cashClimbPublishErrorMessage(result.error) : '');
        }
      }
      if (!cancelled) await refreshSaved();
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshSaved]);

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

  useEffect(() => {
    if (!tournament?.id || tournament.status === 'completed' || !cloudError) return undefined;
    const timer = setInterval(() => {
      const current = tournamentRef.current;
      if (!current?.id) return;
      syncCashClimbCloud(current).then((result) => {
        setCloudError(result?.error ? cashClimbPublishErrorMessage(result.error) : '');
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [tournament?.id, tournament?.status, cloudError]);

  const handleStart = (config) => {
    try {
      const created = createOpenTournament(config);
      persist(startTournament(created));
    } catch (err) {
      alert(err.message || 'Could not start tournament');
    }
  };

  const handleRecord = (matchId, winnerId, score, extras = {}) => {
    try {
      persist(recordMatchResult(tournament, matchId, winnerId, score, extras));
    } catch (err) {
      alert(err.message || 'Could not save result');
    }
  };

  const dropPending = (matchId) => {
    setSubmissions((prev) => prev.filter((item) => !idsEqual(item.match_id, matchId)));
    deleteCashClimbPending(tournament.id, matchId);
  };

  const handleConfirmSubmit = (row) => {
    const match = findMatchById(tournament, row?.match_id);
    const winnerId = resolvePendingWinnerId(match, row);
    if (!match || !winnerId) {
      alert('That submit does not match an open table. Enter the result on this tablet instead.');
      return false;
    }
    try {
      const extras = { playedGame: playedGameFromPending(row) };
      persist(recordMatchResult(tournament, match.id, winnerId, row.score || null, extras));
      dropPending(match.id);
      return true;
    } catch (err) {
      alert(err.message || 'Could not confirm that result');
      return false;
    }
  };

  const handleRejectSubmit = (row) => {
    if (!row?.match_id) return;
    dropPending(row.match_id);
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

  const leaveToSetup = () => {
    clearCashClimb();
    setTournament(null);
    setSubmissions([]);
    refreshSaved();
  };

  const handleNew = () => {
    if (tournament && tournament.status !== 'completed') {
      const ok = window.confirm(
        'Start a new Cash Climb? This event will be ended in the database and cleared from this tablet. You can open or remove it later from setup.'
      );
      if (!ok) return;
      retireCashClimbEvent(tournament);
    }
    leaveToSetup();
  };

  const handleRemove = async () => {
    if (!tournament?.id) return;
    const ok = window.confirm('Remove this tournament from the database and this tablet? This cannot be undone.');
    if (!ok) return;
    await deleteCashClimbEvent(tournament.id);
    leaveToSetup();
  };

  const handleOpenSaved = (item) => {
    if (!item?.tournament) return;
    persist(sanitizeCashClimb(item.tournament));
  };

  const handleRemoveSaved = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Remove "${item.name}" from the database? This cannot be undone.`);
    if (!ok) return;
    await deleteCashClimbEvent(item.id);
    const local = loadCashClimb();
    if (local && idsEqual(local.id, item.id)) clearCashClimb();
    refreshSaved();
  };

  if (!tournament) {
    return (
      <CashClimbSetup
        onStart={handleStart}
        onCancel={onLeave}
        savedEvents={savedEvents}
        onOpenSaved={handleOpenSaved}
        onRemoveSaved={handleRemoveSaved}
      />
    );
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
      onRemove={handleRemove}
      onEdit={handleEdit}
      onLeave={onLeave}
      cloudError={cloudError}
      onRetryCloud={() => persist(tournament)}
    />
  );
}
